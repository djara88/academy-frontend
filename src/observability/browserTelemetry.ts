import { SpanStatusCode, type AttributeValue } from '@opentelemetry/api';
import { ExportResultCode } from '@opentelemetry/core';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  SimpleSpanProcessor,
  type ReadableSpan,
  type SpanExporter,
} from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';

type ErrorSource = 'react' | 'window' | 'promise' | 'api' | 'csp' | 'manual';
type ErrorLike = Error | string | unknown;

type OtlpValue =
  | { stringValue: string }
  | { boolValue: boolean }
  | { intValue: string }
  | { doubleValue: number }
  | { arrayValue: { values: OtlpValue[] } };

type OtlpAttribute = { key: string; value: OtlpValue };

const API_BASE = String(import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');
const SERVICE_NAME = 'lestra-deportivo-web';
const SERVICE_VERSION = String(import.meta.env.VITE_BUILD_ID || 'dev').slice(0, 120);
const ENVIRONMENT = import.meta.env.PROD ? 'production' : 'development';
const DEDUPE_WINDOW_MS = 30_000;
const MAX_EVENTS_PER_MINUTE = 20;

const seen = new Map<string, number>();
const recent: number[] = [];
let initialized = false;

const scrub = (value: unknown, max = 4000) => String(value ?? '')
  .slice(0, max)
  .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, '[REDACTED_BEARER]')
  .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_JWT]')
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
  .replace(/\b\d{1,2}[.]?\d{3}[.]?\d{3}-?[0-9Kk]\b/g, '[REDACTED_RUT]')
  .replace(/([?&](?:token|access_token|refresh_token|code|key|signature)=)[^&#\s]+/gi, '$1[REDACTED]');

const role = () => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem('user') || '{}');
    return scrub(parsed?.rol || 'anonymous', 80) || 'anonymous';
  } catch {
    return 'anonymous';
  }
};

const currentRoute = () => scrub(window.location.pathname || '/', 500);

const normalizeError = (value: ErrorLike) => {
  if (value instanceof Error) {
    return {
      type: scrub(value.name || 'Error', 160),
      message: scrub(value.message || 'Client error', 1600),
      stack: scrub(value.stack || '', 7000),
    };
  }
  if (typeof value === 'string') return { type: 'Error', message: scrub(value, 1600), stack: '' };
  try {
    return { type: 'Error', message: scrub(JSON.stringify(value), 1600), stack: '' };
  } catch {
    return { type: 'Error', message: 'Unknown client error', stack: '' };
  }
};

const canSend = (fingerprint: string) => {
  const now = Date.now();
  const previous = seen.get(fingerprint) || 0;
  if (now - previous < DEDUPE_WINDOW_MS) return false;
  seen.set(fingerprint, now);

  while (recent.length && now - recent[0] > 60_000) recent.shift();
  if (recent.length >= MAX_EVENTS_PER_MINUTE) return false;
  recent.push(now);

  if (seen.size > 100) {
    for (const [key, timestamp] of seen.entries()) {
      if (now - timestamp > DEDUPE_WINDOW_MS * 4) seen.delete(key);
    }
  }
  return true;
};

const hrTimeToUnixNano = ([seconds, nanos]: readonly [number, number]) => (
  (BigInt(seconds) * 1_000_000_000n) + BigInt(nanos)
).toString();

const otlpValue = (value: AttributeValue | undefined): OtlpValue => {
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => otlpValue(item as AttributeValue)) } };
  }
  if (typeof value === 'boolean') return { boolValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { intValue: String(value) } : { doubleValue: value };
  }
  return { stringValue: scrub(value ?? '', 7000) };
};

const toAttributes = (attributes: Readonly<Record<string, AttributeValue | undefined>>): OtlpAttribute[] => (
  Object.entries(attributes)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({ key, value: otlpValue(value) }))
);

const toOtlpSpan = (span: ReadableSpan) => {
  const context = span.spanContext();
  return {
    traceId: context.traceId,
    spanId: context.spanId,
    name: scrub(span.name, 160),
    kind: span.kind,
    startTimeUnixNano: hrTimeToUnixNano(span.startTime),
    endTimeUnixNano: hrTimeToUnixNano(span.endTime),
    attributes: toAttributes(span.attributes),
    status: {
      code: span.status.code,
      message: scrub(span.status.message || '', 500),
    },
    events: span.events.map((event) => ({
      timeUnixNano: hrTimeToUnixNano(event.time),
      name: scrub(event.name, 160),
      attributes: toAttributes(event.attributes || {}),
    })),
  };
};

const sendOtlpPayload = async (payload: unknown) => {
  if (!import.meta.env.PROD) return;
  const body = JSON.stringify(payload);
  const endpoint = `${API_BASE}/api/observability/v1/traces`;

  try {
    if (navigator.sendBeacon) {
      const accepted = navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
      if (accepted) return;
    }
  } catch {
    // Fall through to fetch. Telemetry must never affect product behavior.
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'omit',
  });
  if (!response.ok) throw new Error(`Telemetry export failed with status ${response.status}`);
};

class BrowserOtlpExporter implements SpanExporter {
  export(spans: ReadableSpan[], resultCallback: (result: { code: ExportResultCode; error?: Error }) => void): void {
    if (!import.meta.env.PROD || spans.length === 0) {
      resultCallback({ code: ExportResultCode.SUCCESS });
      return;
    }

    const resource = spans[0]?.resource?.attributes || {};
    const payload = {
      resourceSpans: [{
        resource: { attributes: toAttributes(resource) },
        scopeSpans: [{
          scope: {
            name: spans[0]?.instrumentationScope?.name || 'lestra.browser.errors',
            version: spans[0]?.instrumentationScope?.version || '1.0.0',
          },
          spans: spans.map(toOtlpSpan),
        }],
      }],
    };

    void sendOtlpPayload(payload)
      .then(() => resultCallback({ code: ExportResultCode.SUCCESS }))
      .catch((error) => resultCallback({
        code: ExportResultCode.FAILED,
        error: error instanceof Error ? error : new Error(String(error)),
      }));
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

const resource = resourceFromAttributes({
  'service.name': SERVICE_NAME,
  'service.version': SERVICE_VERSION,
  'deployment.environment': ENVIRONMENT,
});

const provider = new WebTracerProvider({
  resource,
  spanProcessors: [new SimpleSpanProcessor(new BrowserOtlpExporter())],
});

const tracer = provider.getTracer('lestra.browser.errors', '2.0.0');

export const recordClientError = (error: ErrorLike, source: ErrorSource = 'manual') => {
  if (typeof window === 'undefined') return;
  const normalized = normalizeError(error);
  const fingerprint = `${source}:${currentRoute()}:${normalized.type}:${normalized.message.slice(0, 300)}`;
  if (!canSend(fingerprint)) return;

  const span = tracer.startSpan(`client.error.${source}`, {
    attributes: {
      'app.route': currentRoute(),
      'app.role': role(),
      'app.error.source': source,
    },
  });

  span.recordException({
    name: normalized.type,
    message: normalized.message,
    stack: normalized.stack,
  });
  span.setStatus({ code: SpanStatusCode.ERROR, message: normalized.message.slice(0, 500) });
  span.end();
};

export const initBrowserObservability = () => {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  if (import.meta.env.PROD) provider.register();

  window.addEventListener('error', (event) => {
    recordClientError(event.error || event.message || 'window error', 'window');
  });

  window.addEventListener('unhandledrejection', (event) => {
    recordClientError(event.reason || 'Unhandled promise rejection', 'promise');
  });

  window.addEventListener('securitypolicyviolation', (event) => {
    const error = new Error(`CSP blocked ${event.violatedDirective || 'resource'}`);
    error.name = 'SecurityPolicyViolation';
    recordClientError(error, 'csp');
  });
};
