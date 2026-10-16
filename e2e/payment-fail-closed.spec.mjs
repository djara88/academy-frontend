import { test, expect } from '@playwright/test';

// Verifies fail-closed UX with mocked external calls: never use live payment credentials.
const API = 'http://localhost:8080';
const TOKEN = 'e2e-fail-closed';

const pendingStatement = {
  success: true,
  data: {
    academia: { nombre: 'Academia QA', slug: 'academia-qa', logo: null, colores: {} },
    jugadores: [{ id: 'player-qa', nombre: 'Alumno de prueba', estado_financiero: 'Pendiente' }],
    cobros: [{
      id: 'charge-qa',
      jugador_id: 'player-qa',
      concepto: 'Matrícula de prueba',
      tipo_concepto: 'Matrícula',
      monto: 30000,
      monto_pagado: 0,
      estado: 'Pendiente',
      fecha_vencimiento: '2026-10-30',
      saldo: 30000,
      vencido: false,
      cuotas: [],
      pagos_informados_pendientes: [],
    }],
    saldo_total: 30000,
    metodos_pago: { acepta_efectivo: false, acepta_transferencia: false, acepta_pago_online: true },
    expira_at: '2026-10-30T23:59:00.000Z',
  },
};

test('enlace vencido no revela jugadores ni habilita selección de cobros', async ({ page }) => {
  let attemptedCheckout = false;
  await page.route(`${API}/api/cobranza/public/estado/e2e-expired`, (route) => route.fulfill({
    status: 410,
    contentType: 'application/json',
    body: JSON.stringify({ success: false, error: 'Enlace vencido o inválido.' }),
  }));
  await page.route(`${API}/api/mercadopago/**`, (route) => {
    attemptedCheckout = true;
    return route.abort();
  });

  await page.goto('/pagar/e2e-expired');

  await expect(page.getByRole('heading', { name: 'Enlace no disponible' })).toBeVisible();
  await expect(page.getByText('Enlace vencido o inválido.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Elige qué quieres pagar' })).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  expect(attemptedCheckout).toBe(false);
});

test('error de Mercado Pago conserva la selección, muestra alerta y no redirige', async ({ page }) => {
  let checkoutCount = 0;
  let checkoutPayload = null;

  await page.route(`${API}/api/cobranza/public/estado/${TOKEN}`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(pendingStatement),
  }));
  await page.route(`${API}/api/mercadopago/academy/checkout/${TOKEN}`, (route) => {
    checkoutCount += 1;
    checkoutPayload = route.request().postDataJSON();
    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'Pasarela temporalmente no disponible.' }),
    });
  });

  await page.goto(`/pagar/${TOKEN}`);
  await expect(page.getByRole('heading', { name: 'Elige qué quieres pagar' })).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Pagar selección/i }).click();

  await expect(page.getByRole('alert')).toContainText('Pasarela temporalmente no disponible.');
  await expect(page).toHaveURL(new RegExp(`/pagar/${TOKEN}$`));
  await expect(page.getByRole('checkbox')).toBeChecked();
  await expect(page.getByRole('button', { name: /Pagar selección/i })).toBeEnabled();
  expect(checkoutCount).toBe(1);
  expect(checkoutPayload).toEqual({
    items: [{ cobro_id: 'charge-qa', cuota_id: null }],
  });
});
