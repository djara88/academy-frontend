import { test, expect } from '@playwright/test';
import { mockRoleApi, seedAuthenticatedUser } from './helpers/session.mjs';

for (const width of [390, 1280]) {
  test(`la oferta mensual lleva al registro a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/deportivo');
    await expect(page.getByText('$19.990', { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/\+ IVA/).first()).toBeVisible();
    await expect(page.getByText(/portal de apoderados/i).first()).toBeVisible();
    await expect(page.getByText(/precio fundador|elige tu plan/i)).toHaveCount(0);
    await page.getByRole('link', { name: 'Registrar mi academia' }).click();
    await expect(page).toHaveURL(/\/registro$/);
    await expect(page.getByText(/Luego \$19.990 al mes \+ IVA/)).toBeVisible();
  });
}

test('contratación asistida sin checkout ni selección de documento', async ({ page }) => {
  await mockRoleApi(page);
  await seedAuthenticatedUser(page, { id: '55555555-5555-4555-8555-555555555555',
    email: 'director.qa@example.com', role: 'director', academyId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
  // Incluso con el onboarding pendiente, contratar la suscripción debe ser accesible.
  await page.route('http://localhost:8080/api/consentimientos/setup', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { required: true, locked: true, operational: false, completed_once: false, progress: 0 } }),
  }));
  await page.goto('/suscripcion');
  await expect(page).toHaveURL(/\\/suscripcion$/);
  const activation = page.getByRole('button', { name: 'Solicitar activación de Lestra Deportivo' });
  await expect(activation).toBeVisible();
  await activation.click();
  await expect(page.getByRole('status')).toContainText('Solicitud de activación');
  await expect(page.getByRole('link', { name: 'Abrir solicitud por correo' })).toHaveAttribute('href', /^mailto:/);
  await expect(page.getByRole('button', { name: /Pagar|Boleta|Factura/ })).toHaveCount(0);
});
