type ErrorSource = 'react' | 'window' | 'promise' | 'api' | 'csp' | 'manual';

type OtlpAttribute = {
  key: string;
  value: { stringValue: string };
};

type ErrorLike = Error | string | unknown;

const API_BASE = String(import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');
const SERVICE_NAME = 'lestra-deportivo-web';
const SERVICE_VERSION = String(import.meta.env.VITE_BUILD_ID || 'dev').slice(0, 120);
const ENVIRONMENT = import.meta.env.PROD ? 'production' : 'development';
const DEDUPE_WINDOW_MS = 30_000;
const MAX_EVENTS_PER_MINUTE = 20;

const seen = new Map<string, number>();
const recent: number[] = [];

const hex = (bytes: number) => {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return Array.from(value, (item) => item.toString(16).padStart(2, '0')).join('');
};

const unixNano = () => (BigInt(Date.now()) * 1_000_000n).toString();

const role = () => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem('user') || '{}');
    return String(parsed?.rol || 'anonymous').trim().slice(0, 80) || 'anonymous';
  } catch {
    return 'anonymous';
  }
};

const route = () => String(window.location.pathname || '/').slice(0, 500);

const scrub = (value: unknown, max = 4000) => String(value ?? '')
  .slice(0, max)
  .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, '[REDACTED_BEARER]')
  .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_JWT]')
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
  .replace(/\b\d{1,2}[.]?\d{3}[.]?\d{3}-?[0-9Kk]\b/g, '[REDACTED_RUT]')
  .replace(/([?&](?:token|access_token|refresh_token|code|key|signature)=)[^&#\s]+/gi, '$1[REDACTED]');

const attr = (key: string, value: unknown, max = 1200): OtlpAttribute => ({
  key,
  value: { stringValue: scrub(value, max) },
});

const normalizeError = (value: ErrorLike) => {
  if (value instanceof Error) {
    return {
      type: value.name || 'Error',
      message: value.message || 'Client error',
      stack: value.stack || '',
    };
  }
  if (typeof value === 'string') return { type: 'Error', message: value, stack: '' };
  try {
    return { type: 'Error', message: JSON.stringify(value), stack: '' };
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

const exportPayload = (payload: unknown) => {
  if (!import.meta.env.PROD) return;
  const body = JSON.stringify(payload);

  try {
    if (navigator.sendBeacon) {
      const accepted = navigator.sendBeacon(
        `${API_BASE}/api/observability/v1/traces`,
        new Blob([body], { type: 'application/json' }),
      );
      if (accepted) return;
    }
  } catch {
    // Fall through to fetch. Telemetry must never affect the product flow.
  }

  void fetch(`${API_BASE}/api/observability/v1/traces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'omit',
  }).catch(() => undefined);
};

export const recordClientError = (error: ErrorLike, source: ErrorSource = 'manual') => {
  if (typeof window === 'undefined') return;
  const normalized = normalizeError(error);
  const fingerprint = `${source}:${route()}:${normalized.type}:${normalized.message.slice(0, 300)}`;
  if (!canSend(fingerprint)) return;

  const traceId = hex(16);
  const spanId = hex(8);
  const timestamp = unixNano();
  const spanAttributes = [
    attr('app.route', route(), 500),
    attr('app.role', role(), 80),
    attr('app.error.source', source, 80),
  ];
  const exceptionAttributes = [
    attr('exception.type', normalized.type, 160),
    attr('exception.message', normalized.message, 1600),
    attr('exception.stacktrace', normalized.stack, 7000),
  ];

  exportPayload({
    resourceSpans: [{
      resource: {
        attributes: [
          attr('service.name', SERVICE_NAME, 120),
          attr('service.version', SERVICE_VERSION, 120),
          attr('deployment.environment', ENVIRONMENT, 80),
        ],
      },
      scopeSpans: [{
        scope: { name: 'lestra.browser.errors', version: '1.0.0' },
        spans: [{
          traceId,
          spanId,
          name: `client.error.${source}`,
          kind: 1,
          startTimeUnixNano: timestamp,
          endTimeUnixNano: timestamp,
          attributes: spanAttributes,
          status: { code: 2, message: scrub(normalized.message, 500) },
          events: [{
            timeUnixNano: timestamp,
            name: 'exception',
            attributes: exceptionAttributes,
          }],
        }],
      }],
    }],
  });
};

let initialized = false;

export const initBrowserObservability = () => {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

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
