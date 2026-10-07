import fs from 'node:fs';

const requiredFiles = [
  'playwright.config.ts',
  'e2e/onboarding.spec.ts',
  'e2e/mercadopago-matricula.spec.ts',
  'e2e/role-isolation.spec.ts',
  'e2e/support/session.ts',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Phase 3 reliability audit failed: missing ${file}.`);
}

const ci = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
for (const expected of [
  'Install pinned Playwright runner',
  '@playwright/test@1.55.1',
  'Install Chromium',
  'Critical E2E flows',
  'npx playwright test',
]) {
  if (!ci.includes(expected)) throw new Error(`Phase 3 reliability audit failed: CI missing ${expected}.`);
}

const portal = fs.readFileSync('src/pages/CollectionPortalV2.tsx', 'utf8');
if (/idempotency_key[^\n]{0,180}randomUUID\s*\(/i.test(portal)) {
  throw new Error('Phase 3 reliability audit failed: transfer idempotency must not use a random retry key.');
}

const paymentTest = fs.readFileSync('e2e/mercadopago-matricula.spec.ts', 'utf8');
for (const expected of ['Matrícula 2026', '/api/mercadopago/academy/checkout/pay-token', 'Pagar selección']) {
  if (!paymentTest.includes(expected)) throw new Error(`Phase 3 reliability audit failed: Mercado Pago E2E missing ${expected}.`);
}

const roleTest = fs.readFileSync('e2e/role-isolation.spec.ts', 'utf8');
if (!roleTest.includes("rol: 'profesor'") || !roleTest.includes("rol: 'apoderado'")) {
  throw new Error('Phase 3 reliability audit failed: role isolation E2E must cover professor and guardian.');
}

console.log('Phase 3 frontend reliability audit passed.');
