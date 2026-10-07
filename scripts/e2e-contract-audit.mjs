import fs from 'node:fs';

const requiredFiles = [
  'playwright.config.mjs',
  'e2e/onboarding.spec.mjs',
  'e2e/mercadopago-matricula.spec.mjs',
  'e2e/role-isolation.spec.mjs',
  'e2e/helpers/session.mjs',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`E2E contract audit failed: missing ${file}`);
}

const config = fs.readFileSync('playwright.config.mjs', 'utf8');
for (const expected of [
  "testDir: './e2e'",
  "VITE_SUPERADMIN_USER_ID",
  "VITE_API_URL",
  "workers: 1",
]) {
  if (!config.includes(expected)) throw new Error(`E2E contract audit failed: Playwright config missing ${expected}`);
}

const onboarding = fs.readFileSync('e2e/onboarding.spec.mjs', 'utf8');
if (!onboarding.includes('/api/academias/registro-publico') || !onboarding.includes('nombre_rama_principal')) {
  throw new Error('E2E contract audit failed: onboarding flow no longer covers academy + first branch creation.');
}

const payment = fs.readFileSync('e2e/mercadopago-matricula.spec.mjs', 'utf8');
for (const expected of [
  '/api/cobranza/public/estado/e2e-token',
  '/api/mercadopago/academy/checkout/e2e-token',
  'charge-matricula',
  'Mercado Pago E2E',
]) {
  if (!payment.includes(expected)) throw new Error(`E2E contract audit failed: matrícula/MercadoPago flow missing ${expected}`);
}

const roles = fs.readFileSync('e2e/role-isolation.spec.mjs', 'utf8');
for (const expected of [
  "role: 'director'",
  "role: 'profesor'",
  "role: 'superadmin'",
  "aal: 'aal2'",
  "d.jarazerene@gmail.com",
]) {
  if (!roles.includes(expected)) throw new Error(`E2E contract audit failed: role isolation flow missing ${expected}`);
}

const workflow = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
for (const expected of [
  'E2E Critical Flows',
  '@playwright/test@1.63.0',
  'playwright install --with-deps chromium',
  'playwright test --config=playwright.config.mjs',
]) {
  if (!workflow.includes(expected)) throw new Error(`E2E contract audit failed: CI missing ${expected}`);
}

console.log('Critical Playwright E2E contract audit passed.');
