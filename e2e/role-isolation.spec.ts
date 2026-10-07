import { test, expect } from '@playwright/test';
import { fulfillJson, installAuthenticatedSession } from './support/session';

const mockBackend = async (page: any) => {
  await page.route('http://localhost:8080/api/**', async (route: any) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/academias/mi-plan') {
      return fulfillJson(route, { success: true, data: { plan: { code: 'formacion', name: 'Formación', trial: false }, features: [] } });
    }
    return fulfillJson(route, { success: true, data: {} });
  });
};

test('professor cannot enter director finance routes', async ({ page }) => {
  await installAuthenticatedSession(page, {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'profesor.e2e@lestra.test',
    nombre_completo: 'Profesor E2E',
    rol: 'profesor',
    academia_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  });
  await mockBackend(page);

  await page.goto('/finanzas');
  await expect(page).toHaveURL(/\/profesor$/);
});

test('guardian cannot enter superadmin routes', async ({ page }) => {
  await installAuthenticatedSession(page, {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'apoderado.e2e@lestra.test',
    nombre_completo: 'Apoderado E2E',
    rol: 'apoderado',
    academia_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  });
  await mockBackend(page);

  await page.goto('/admin/finanzas');
  await expect(page).toHaveURL(/\/apoderado$/);
});
