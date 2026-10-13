import fs from 'node:fs';

const telemetry = fs.readFileSync('src/observability/browserTelemetry.ts', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

for (const [name, version] of Object.entries({
  '@opentelemetry/api': '1.9.1',
  '@opentelemetry/core': '2.12.0',
  '@opentelemetry/resources': '2.12.0',
  '@opentelemetry/sdk-trace-base': '2.12.0',
  '@opentelemetry/sdk-trace-web': '2.12.0',
})) {
  if (pkg.dependencies?.[name] !== version) {
    throw new Error(`Observability audit failed: ${name} must be pinned to ${version}.`);
  }
}

for (const expected of [
  "from '@opentelemetry/api'",
  "from '@opentelemetry/sdk-trace-web'",
  'new WebTracerProvider',
  'new SimpleSpanProcessor',
  'class BrowserOtlpExporter implements SpanExporter',
  "provider.getTracer('lestra.browser.errors'",
  'span.recordException',
  'SpanStatusCode.ERROR',
  '/api/observability/v1/traces',
  'MAX_EVENTS_PER_MINUTE',
  'REDACTED_EMAIL',
  'REDACTED_JWT',
  'REDACTED_RUT',
]) {
  if (!telemetry.includes(expected)) throw new Error(`Observability audit failed: missing ${expected}.`);
}

if (/crypto\.getRandomValues|const\s+hex\s*=|traceId\s*=\s*hex/.test(telemetry)) {
  throw new Error('Observability audit failed: trace/span IDs must be created by OpenTelemetry, not handcrafted.');
}

console.log('Official OpenTelemetry browser SDK audit passed.');
