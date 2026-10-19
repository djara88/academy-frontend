import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test('Asistencia usa etiquetas legibles a ' + viewport.width + 'px', async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/login');
    await page.evaluate(() => {
      const fixture = document.createElement('main');
      fixture.className = 'lestra-director-main';
      fixture.setAttribute('data-testid', 'attendance-legibility');
      fixture.innerHTML = [
        '<div class="app-content"><div class="attendance-command">',
        '<header class="attendance-command-head">',
        '<div class="attendance-command-copy">',
        '<p class="attendance-command-kicker">Registro de asistencia</p>',
        '<h1>Asistencia de la sesión</h1></div>',
        '<div class="attendance-command-context">',
        '<label><span>Rama activa</span><select><option>Fútbol</option></select></label>',
        '</div></header>',
        '<nav class="attendance-command-modes">',
        '<button type="button">Sesión y lista</button>',
        '<button type="button">Recuperaciones</button></nav>',
        '<section class="attendance-session-setup">',
        '<div class="attendance-section-head"><div><h2>Contexto de sesión</h2>',
        '<p>Selecciona categoría</p></div></div>',
        '<div class="attendance-setup-body">',
        '<label class="attendance-field"><span>Fecha de sesión</span><input type="date"></label>',
        '<div class="attendance-setup-note">Comprueba la sesión antes de registrar.</div>',
        '</div></section></div></div>',
      ].join('');
      document.body.appendChild(fixture);
    });

    const fixture = page.getByTestId('attendance-legibility');
    for (const selector of [
      '.attendance-command-kicker',
      '.attendance-command-context label > span',
      '.attendance-command-modes button',
      '.attendance-section-head p',
      '.attendance-field > span',
      '.attendance-setup-note',
    ]) {
      const fontPx = await fixture.locator(selector).first().evaluate((element) =>
        parseFloat(getComputedStyle(element).fontSize)
      );
      expect(fontPx, 'Texto demasiado pequeño: ' + selector + ' = ' + fontPx + 'px').toBeGreaterThanOrEqual(12);
    }
    await expect(fixture.locator('.attendance-command-head h1')).toBeVisible();
    const overflow = await fixture.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left < -1 || rect.right > window.innerWidth + 1;
    });
    expect(overflow).toBe(false);
  });
}
