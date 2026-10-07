import { test, expect } from '@playwright/test';
import { SUPERADMIN_E2E_USER_ID, seedAuthenticatedUser, mockRoleApi } from './helpers/session.mjs';

test('director no puede entrar al panel maestro aunque use el antiguo correo privilegiado', async ({ page }) => {
  await mockRoleApi(page);
  await seedAuthenticatedUser(page, {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'd.jarazerene@gmail.com',
    role: 'director',
    academyId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  });

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page).not.toHaveURL(/\/admin$/);
});

test('profesor que intenta entrar a admin termina exclusivamente en su portal', async ({ page }) => {
  await mockRoleApi(page);
  await seedAuthenticatedUser(page, {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'profesor.e2e@example.com',
    role: 'profesor',
    academyId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  });

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/profesor$/);
});

test('superadmin UUID entra al boundary maestro pero AAL1 exige MFA', async ({ page }) => {
  await mockRoleApi(page);
  await seedAuthenticatedUser(page, {
    id: SUPERADMIN_E2E_USER_ID,
    email: 'superadmin.e2e@example.com',
    role: 'superadmin',
    academyId: null,
    aal: 'aal1',
  });

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Verificación en dos pasos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Tu negocio completo/i })).toHaveCount(0);
});
