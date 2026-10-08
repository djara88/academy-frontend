import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');

const telemetry = read('src/observability/browserTelemetry.ts');
const main = read('src/main.tsx');
const axios = read('src/api/axiosConfig.ts');
const boundary = read('src/components/ClientErrorBoundary.tsx');
const shell = read('src/components/RoleLoadingShell.tsx');
const app = read('src/App.tsx');
const index = read('src/index.css');
const a11y = read('src/accessibility-contract-v3.css');
const sports = read('src/components/SportsDialogAccessibility.tsx');
const dialogs = read('src/contexts/DialogContext.tsx');
const command = read('src/components/navigation/DirectorCommandBar.tsx');

for (const expected of [
  '/api/observability/v1/traces',
  'resourceSpans',
  'exception.stacktrace',
  'MAX_EVENTS_PER_MINUTE',
  "attr('app.route'",
  "attr('app.role'",
  "attr('app.error.source'",
]) {
  if (!telemetry.includes(expected)) throw new Error(`Phase 4 audit: telemetry missing ${expected}`);
}

const allowedTelemetryAttributes = [
  'service.name',
  'service.version',
  'deployment.environment',
  'app.route',
  'app.role',
  'app.error.source',
  'exception.type',
  'exception.message',
  'exception.stacktrace',
];
const attrCalls = Array.from(telemetry.matchAll(/attr\('([^']+)'/g)).map((match) => match[1]);
for (const key of attrCalls) {
  if (!allowedTelemetryAttributes.includes(key)) {
    throw new Error(`Phase 4 audit: telemetry attribute is not allowlisted: ${key}`);
  }
}

if (!main.includes('initBrowserObservability()') || !main.includes('<ClientErrorBoundary>')) {
  throw new Error('Phase 4 audit: browser observability is not initialized at the root.');
}
if (!axios.includes("recordClientError(failure, 'api')")) {
  throw new Error('Phase 4 audit: API server/network errors are not captured.');
}
if (!boundary.includes("recordClientError(enriched, 'react')")) {
  throw new Error('Phase 4 audit: React render failures are not captured.');
}

for (const expected of ["current.kind === 'alert' ? 'alertdialog' : 'dialog'", 'aria-modal="true"', 'focusableSelector', "event.key === 'Escape'"]) {
  if (!dialogs.includes(expected)) throw new Error(`Phase 4 audit: DialogContext missing ${expected}`);
}
for (const expected of ["setAttribute('role', 'dialog')", "setAttribute('aria-modal', 'true')", "event.key === 'Escape'", "event.key !== 'Tab'"]) {
  if (!sports.includes(expected)) throw new Error(`Phase 4 audit: sports modal guard missing ${expected}`);
}
if (!command.includes('aria-modal="true"') || !command.includes('aria-labelledby="director-nav-dialog-title"')) {
  throw new Error('Phase 4 audit: director mobile navigation dialog is not named.');
}
if (/lestra-mobile-dock[\s\S]{0,250}text-\[(?:8|9|10|11)px\]/.test(command)) {
  throw new Error('Phase 4 audit: mobile dock labels must be at least 12px.');
}
for (const expected of ['--ls-placeholder-dark: #9aa6b5', '--ls-placeholder-light: #697468']) {
  if (!a11y.includes(expected)) throw new Error(`Phase 4 audit: placeholder contract missing ${expected}`);
}

for (const expected of ["'superadmin'", "'director'", "bg-[#0b1118]", "bg-[#eef1eb]", 'bg-orange-500']) {
  if (!shell.includes(expected)) throw new Error(`Phase 4 audit: loading shell missing ${expected}`);
}
if (!app.includes('<RoleLoadingShell') || !main.includes('<RoleLoadingShell')) {
  throw new Error('Phase 4 audit: application fallbacks are not using role-aware loading shells.');
}
if (!index.includes("bg-[#eef1eb] text-[#151a16]")) {
  throw new Error('Phase 4 audit: default document paint must remain light to avoid black flash.');
}

console.log('Phase 4 observability, accessibility and loading audit passed.');
