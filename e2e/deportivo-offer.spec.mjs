import { test, expect } from '@playwright/test';
import { mockRoleApi, seedAuthenticatedUser } from './helpers/session.mjs';

for (const width of [390, 1280]) {
  test(`la oferta mensual lleva al registro a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/deportivo');
    await expect(page.getByText('$19.990', { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/precio fundador|elige tu plan/i)).toHaveCount(0);
    await page.getByRole('link', { name: 'Registrar mi academia' }).click();
    await expect(page).toHaveURL(/\/registro$/);
    await expect(page.getByText(/Luego \$19.990 al mes/)).toBeVisible();
  });
}

test('contratación asistida sin checkout ni selección de documento', async ({ page }) => {
  await mockRoleApi(page);
  await seedAuthenticatedUser(page, { id: '55555555-5555-4555-8555-555555555555',
    email: 'director.qa@example.com', role: 'director', academyId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
  await page.goto('/suscripcion');
  await expect(page.getByRole('link', { name: 'Solicitar contratación' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Pagar|Boleta|Factura/ })).toHaveCount(0);
});
