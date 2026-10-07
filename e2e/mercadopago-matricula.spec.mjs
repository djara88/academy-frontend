import { test, expect } from '@playwright/test';

test('matrícula pendiente inicia checkout de Mercado Pago con el cobro seleccionado', async ({ page }) => {
  let checkoutPayload = null;

  await page.route('http://localhost:8080/api/cobranza/public/estado/e2e-token', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          academia: { nombre: 'Academia E2E', slug: 'academia-e2e', logo: null, colores: {} },
          jugadores: [{ id: 'player-1', nombre: 'Alumno E2E', estado_financiero: 'Pendiente' }],
          cobros: [{
            id: 'charge-matricula',
            jugador_id: 'player-1',
            concepto: 'Matrícula temporada 2026',
            tipo_concepto: 'Matrícula',
            monto: 50000,
            monto_pagado: 0,
            estado: 'Pendiente',
            fecha_vencimiento: '2026-10-30',
            saldo: 50000,
            vencido: false,
            cuotas: [],
            pagos_informados_pendientes: [],
          }],
          saldo_total: 50000,
          metodos_pago: {
            acepta_efectivo: false,
            acepta_transferencia: true,
            acepta_pago_online: true,
          },
          expira_at: '2026-10-07T23:59:00.000Z',
        },
      }),
    });
  });

  await page.route('http://localhost:8080/api/mercadopago/academy/checkout/e2e-token', async (route) => {
    checkoutPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { checkoutUrl: 'https://www.mercadopago.cl/e2e-checkout' },
      }),
    });
  });

  await page.route('https://www.mercadopago.cl/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body><h1>Mercado Pago E2E</h1></body></html>',
    });
  });

  await page.goto('/pagar/e2e-token');
  await expect(page.getByRole('heading', { name: 'Elige qué quieres pagar' })).toBeVisible();
  await expect(page.getByText('Matrícula temporada 2026')).toBeVisible();

  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Pagar selección/i }).click();

  await expect.poll(() => checkoutPayload).not.toBeNull();
  expect(checkoutPayload).toEqual({
    items: [{ cobro_id: 'charge-matricula', cuota_id: null }],
  });

  await expect(page).toHaveURL('https://www.mercadopago.cl/e2e-checkout');
  await expect(page.getByRole('heading', { name: 'Mercado Pago E2E' })).toBeVisible();
});
