import { test, expect } from '@playwright/test';
import { SUPERADMIN_E2E_USER_ID, seedAuthenticatedUser, mockRoleApi } from './helpers/session.mjs';

const ACADEMY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

// All identities and API replies are local Playwright fixtures. No production account is used.
for (const route of ['/admin', '/alumnos', '/finanzas', '/profesor', '/apoderado']) {
  test(`sin sesión, ${route} exige autenticación`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
  });
}

const accessMatrix = [
  { role: 'director', path: '/profesor', destination: '/dashboard' },
  { role: 'director', path: '/apoderado', destination: '/dashboard' },
  { role: 'profesor', path: '/alumnos', destination: '/profesor' },
  { role: 'profesor', path: '/finanzas', destination: '/profesor' },
  { role: 'apoderado', path: '/admin', destination: '/apoderado' },
  { role: 'tutor', path: '/alumnos', destination: '/apoderado' },
];

for (const { role, path, destination } of accessMatrix) {
  test(`${role} no puede abrir ${path} y vuelve a ${destination}`, async ({ page }) => {
    await mockRoleApi(page);
    await seedAuthenticatedUser(page, {
      id: '55555555-5555-4555-8555-555555555555',
      email: `${role}.qa@example.com`,
      role,
      academyId: ACADEMY_ID,
    });

    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${destination.replaceAll('/', '\\/')}$`));
    await expect(page).not.toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}$`));
  });
}

test('superadmin no entra en rutas de director y sigue bloqueado por MFA AAL1', async ({ page }) => {
  await mockRoleApi(page);
  await seedAuthenticatedUser(page, {
    id: SUPERADMIN_E2E_USER_ID,
    email: 'superadmin.qa@example.com',
    role: 'superadmin',
    academyId: null,
    aal: 'aal1',
  });

  await page.goto('/finanzas');
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Verificación en dos pasos' })).toBeVisible();
});
