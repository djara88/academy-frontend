import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const config = fs.readFileSync('e2e/playwright.config.mjs', 'utf8');
const onboarding = fs.readFileSync('e2e/specs/onboarding.spec.mjs', 'utf8');
const payment = fs.readFileSync('e2e/specs/matricula-payment.spec.mjs', 'utf8');
const roles = fs.readFileSync('e2e/specs/role-isolation.spec.mjs', 'utf8');

if (!app.includes('path="/pago-resultado"')) {
  throw new Error('E2E audit failed: Mercado Pago result route is missing.');
}
if (!config.includes("name: 'chromium'") || !config.includes("trace: 'retain-on-failure'")) {
  throw new Error('E2E audit failed: Chromium/trace configuration is incomplete.');
}
for (const [name, source] of [['onboarding', onboarding], ['payment', payment], ['roles', roles]]) {
  if (!source.includes("from '@playwright/test'")) {
    throw new Error(`E2E audit failed: ${name} suite is not a Playwright test.`);
  }
}
if (!payment.includes('Pago confirmado') || !payment.includes('/pago-resultado')) {
  throw new Error('E2E audit failed: Mercado Pago success path is not asserted.');
}
if (!roles.includes('/admin') || !roles.includes('/profesor') || !roles.includes('/apoderado')) {
  throw new Error('E2E audit failed: role isolation coverage is incomplete.');
}

console.log('Critical E2E architecture audit passed.');
