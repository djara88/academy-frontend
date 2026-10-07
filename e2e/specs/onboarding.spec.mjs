import { test, expect } from '@playwright/test';
import { installAuthenticatedSession, installBackendMocks, profile, setupStatus } from '../support/session.mjs';

test('director con setup bloqueado es enviado a Puesta en Marcha', async ({ page }) => {
  const director = profile();
  await installAuthenticatedSession(page, director);
  await installBackendMocks(page, {
    setup: setupStatus({ required: true, locked: true, operational: false }),
  });

  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/puesta-en-marcha$/);
  await expect(page.getByText('Puesta en Marcha', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Construyamos Academia E2E/i })).toBeVisible();
  await expect(page.getByText('En preparación', { exact: true })).toBeVisible();
});
