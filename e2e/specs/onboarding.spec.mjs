import { test, expect } from '@playwright/test';
import { installAuthenticatedSession, installBackendMocks, profile, setupStatus } from '../support/session.mjs';

test('director con setup bloqueado es enviado a Puesta en Marcha', async ({ page }) => {
  const director = profile();
  await installAuthenticatedSession(page, director);
  await installBackendMocks(page, {
    setup: setupStatus({ required: true, locked: true, operational: false }),
  });

  const setupRequest = page.waitForResponse((response) => response.url().includes('/api/consentimientos/setup'));
  await page.goto('/dashboard');
  await setupRequest;

  await expect(page).toHaveURL(/\/puesta-en-marcha$/);
  await expect(page.getByRole('heading', { name: /Construyamos Academia E2E/i })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('En preparación', { exact: true })).toBeVisible();
});
