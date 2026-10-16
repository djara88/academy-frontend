import { test, expect } from '@playwright/test';
import { mockRoleApi, seedAuthenticatedUser } from './helpers/session.mjs';

// Regression: global Director headings must not override a dark module hero.
// This uses a mocked session and API responses; it does not modify production.
test('el título de Asistencia mantiene contraste legible sobre su cabecera oscura', async ({ page }) => {
  await mockRoleApi(page);
  await seedAuthenticatedUser(page, {
    id: '66666666-6666-4666-8666-666666666666',
    email: 'director.contraste.qa@example.com',
    role: 'director',
    academyId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  });

  await page.goto('/asistencias');

  const heading = page.getByRole('heading', { level: 1, name: 'Asistencia de la sesión' });
  await expect(heading).toBeVisible();

  const contrast = await heading.evaluate((element) => {
    const surface = element.closest('.attendance-command-head');
    if (!surface) throw new Error('Attendance hero surface not found');
    const headingStyle = window.getComputedStyle(element);
    const surfaceStyle = window.getComputedStyle(surface);
    const color = headingStyle.webkitTextFillColor === 'currentcolor'
      ? headingStyle.color
      : headingStyle.webkitTextFillColor || headingStyle.color;
    const toRgb = (value) => {
      const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
      if (!channels || channels.length !== 3) throw new Error('Expected opaque RGB color: ' + value);
      return channels;
    };
    const luminance = (channels) => channels
      .map((channel) => {
        const s = channel / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const foreground = luminance(toRgb(color));
    const background = luminance(toRgb(surfaceStyle.backgroundColor));
    return {
      ratio: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
      color,
      backgroundColor: surfaceStyle.backgroundColor,
    };
  });

  expect(contrast.ratio, JSON.stringify(contrast)).toBeGreaterThanOrEqual(4.5);

  // The surrounding light panel must retain its normal dark-text hierarchy.
  await expect(page.locator('.attendance-section-head h2').first()).toBeVisible();
});
