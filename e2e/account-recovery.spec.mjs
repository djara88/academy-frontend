import { test, expect } from '@playwright/test';

test('acceso público a recuperación desde login y respuesta sin enumerar cuentas', async ({ page }) => {
  let submittedEmail = null;
  await page.route('http://localhost:8080/api/academias/recuperar-acceso', async (route) => {
    submittedEmail = route.request().postDataJSON().email;
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Si el correo está registrado, recibirás un enlace para recuperar tu acceso.' }),
    });
  });
  await page.goto('/login');
  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
  await expect(page).toHaveURL(/\/recuperar-acceso$/);
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill('director@example.com');
  await page.getByRole('button', { name: 'Enviar enlace de recuperación' }).click();
  await expect(page.getByRole('status')).toContainText('Si el correo está registrado');
  expect(submittedEmail).toBe('director@example.com');
  await expect(page.getByRole('button', { name: 'Enviar enlace de recuperación' })).toBeDisabled();
});

test('el fallo de correo se muestra sin aparentar que se envió el enlace', async ({ page }) => {
  await page.route('http://localhost:8080/api/academias/recuperar-acceso', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Servicio de correo temporalmente no disponible.' }),
    });
  });
  await page.goto('/recuperar-acceso');
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill('director@example.com');
  await page.getByRole('button', { name: 'Enviar enlace de recuperación' }).click();
  await expect(page.getByRole('alert')).toContainText('temporalmente no disponible');
  await expect(page.getByRole('status')).toHaveCount(0);
});
