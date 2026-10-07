import { test, expect } from '@playwright/test';

test('onboarding crea academia, sede y rama y termina en login', async ({ page }) => {
  let submitted = null;

  await page.route('http://localhost:8080/api/academias/registro-publico', async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { academia_id: 'academy-e2e' } }),
    });
  });

  await page.goto('/registro');

  await page.getByLabel('Nombre de la academia *').fill('Academia E2E');
  await page.getByLabel('Tu nombre completo *').fill('Daniel QA');
  await page.getByLabel('Correo electrónico *').fill('director.e2e@example.com');
  await page.getByLabel('Disciplina *').selectOption({ label: 'Básquet' });
  await page.getByLabel('Nombre de la rama *').fill('Básquet');
  await page.getByLabel('Nombre de la primera sede').fill('Sede Central');
  await page.getByLabel('Contraseña segura *').fill('AcademiaE2E9!');

  await page.getByRole('button', { name: /Crear mi academia en/i }).click();

  const dialog = page.getByRole('alertdialog');
  try {
    await dialog.waitFor({ state: 'visible', timeout: 1200 });
    await dialog.getByRole('button').last().click();
  } catch {
    // Los mensajes clasificados como éxito pueden mostrarse como toast y no requieren cierre.
  }

  await expect(page).toHaveURL(/\/login$/);
  expect(submitted).toMatchObject({
    nombre_academia: 'Academia E2E',
    nombre_director: 'Daniel QA',
    email: 'director.e2e@example.com',
    disciplina_principal: 'Básquet',
    nombre_rama_principal: 'Básquet',
    nombre_sede_principal: 'Sede Central',
  });
});
