import { test, expect } from '@playwright/test';
import { fulfillJson } from './support/session';

test('matricula charge is sent to Mercado Pago checkout exactly once with the selected obligation', async ({ page }) => {
  let checkoutPayload: any = null;

  await page.route('http://localhost:8080/api/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/cobranza/public/estado/pay-token') {
      return fulfillJson(route, {
        success: true,
        data: {
          academia: {
            nombre: 'Academia E2E',
            slug: 'academia-e2e',
            logo: null,
            colores: { primario: '#93ba00', secundario: '#20261f', fondo: '#f7f8f3' },
          },
          jugadores: [{ id: 'player-1', nombre: 'Alumno E2E', estado_financiero: 'Pendiente' }],
          cobros: [{
            id: 'charge-matricula',
            jugador_id: 'player-1',
            concepto: 'Matrícula 2026',
            tipo_concepto: 'Matrícula',
            monto: 50000,
            monto_pagado: 0,
            estado: 'Pendiente',
            fecha_vencimiento: '2026-10-15',
            saldo: 50000,
            vencido: false,
            cuotas: [],
            pagos_informados_pendientes: [],
          }],
          saldo_total: 50000,
          metodos_pago: {
            acepta_efectivo: false,
            acepta_transferencia: false,
            acepta_pago_online: true,
          },
          expira_at: '2026-10-07T23:59:00.000Z',
        },
      });
    }

    if (url.pathname === '/api/mercadopago/academy/checkout/pay-token' && route.request().method() === 'POST') {
      checkoutPayload = route.request().postDataJSON();
      return fulfillJson(route, {
        success: true,
        data: { checkoutUrl: 'http://127.0.0.1:4173/?mp_mock=approved' },
      });
    }

    return fulfillJson(route, { success: true, data: {} });
  });

  await page.goto('/pagar/pay-token');
  await expect(page.getByRole('heading', { name: 'Elige qué quieres pagar' })).toBeVisible();

  const row = page.locator('.payment-obligation-ledger article').filter({ hasText: 'Matrícula 2026' });
  await expect(row).toBeVisible();
  await row.getByRole('checkbox').check();

  await page.getByRole('button', { name: 'Pagar selección' }).click();

  await expect.poll(() => checkoutPayload).toEqual({
    items: [{ cobro_id: 'charge-matricula', cuota_id: null }],
  });
  await expect(page).toHaveURL(/mp_mock=approved/);
});
