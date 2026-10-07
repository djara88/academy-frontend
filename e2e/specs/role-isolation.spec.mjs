import { test, expect } from '@playwright/test';
import { installAuthenticatedSession, installBackendMocks, profile, setupStatus } from '../support/session.mjs';

const cases = [
  {
    name: 'profesor no puede entrar al panel admin',
    role: 'profesor',
    path: '/admin',
    destination: /\/dashboard$/,
    id: '22222222-2222-4222-8222-222222222222',
  },
  {
    name: 'apoderado no puede entrar al panel admin',
    role: 'apoderado',
    path: '/admin',
    destination: /\/apoderado$/,
    id: '33333333-3333-4333-8333-333333333333',
  },
  {
    name: 'director no puede entrar al panel superadmin',
    role: 'director',
    path: '/admin',
    destination: /\/dashboard$/,
    id: '44444444-4444-4444-8444-444444444444',
  },
];

for (const item of cases) {
  test(item.name, async ({ page }) => {
    const user = profile({
      id: item.id,
      email: `${item.role}.e2e@lestra.test`,
      role: item.role,
      name: `${item.role} E2E`,
    });
    await installAuthenticatedSession(page, user);
    await installBackendMocks(page, {
      setup: setupStatus({ required: false, locked: false, operational: true }),
    });

    await page.goto(item.path);
    await expect(page).toHaveURL(item.destination);
  });
}

test('profesor tampoco puede abrir rutas exclusivas de dirección', async ({ page }) => {
  const user = profile({
    id: '55555555-5555-4555-8555-555555555555',
    email: 'profesor.finanzas@lestra.test',
    role: 'profesor',
    name: 'Profesor E2E',
  });
  await installAuthenticatedSession(page, user);
  await installBackendMocks(page);

  await page.goto('/finanzas');

  await expect(page).toHaveURL(/\/profesor$/);
});
