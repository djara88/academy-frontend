import { test, expect } from '@playwright/test';

// Check real computed styles with the same Director DOM hierarchy.
// An isolated markup fixture avoids creating accounts, loading the academy API,
// or depending on authentication; the actual application CSS is still loaded.
test('el título de Asistencia mantiene contraste legible sobre su cabecera oscura', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => {
    const fixture = document.createElement('main');
    fixture.className = 'lestra-director-main';
    fixture.setAttribute('data-testid', 'contrast-fixture');
    fixture.innerHTML = `
      <div class="app-content">
        <div class="attendance-command">
          <header class="attendance-command-head">
            <div class="attendance-command-copy">
              <h1>Asistencia de la sesión</h1>
            </div>
          </header>
          <section class="attendance-section-head" style="background:#ffffff">
            <h2>Contexto de sesión</h2>
          </section>
        </div>
      </div>`;
    document.body.appendChild(fixture);
  });

  const heading = page.getByTestId('contrast-fixture').getByRole('heading', { level: 1, name: 'Asistencia de la sesión' });
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
  await expect(page.getByTestId('contrast-fixture').getByRole('heading', { level: 2, name: 'Contexto de sesión' })).toHaveCSS('color', 'rgb(22, 26, 23)');
});
