import { test, expect } from '@playwright/test';
import { installAuthenticatedSession, installBackendMocks, profile, setupStatus } from '../support/session.mjs';

test('matrícula prepara handoff y pago MercadoPago termina confirmado', async ({ page }) => {
  const director = profile();
  await installAuthenticatedSession(page, director);

  await installBackendMocks(page, {
    setup: setupStatus({ required: false, locked: false, operational: true }),
    extra: async ({ route, path, method, json }) => {
      if (path === '/api/prematriculas' && method === 'POST') {
        return json(route, {
          success: true,
          data: { id: 'pre-e2e', estado: 'enviada', expires_at: '2026-10-14T12:00:00.000Z' },
          link: 'http://127.0.0.1:4173/prematricula/pre-e2e-token',
          email_sent: true,
        }).then(() => true);
      }
      if (path === '/api/mercadopago/academy/checkout/token-e2e' && method === 'POST') {
        return json(route, {
          success: true,
          data: {
            orderId: 'order-e2e',
            amountClp: 25000,
            checkoutUrl: 'http://127.0.0.1:4173/pago-resultado?order=order-e2e&status=success',
          },
        }).then(() => true);
      }
      if (path === '/api/mercadopago/order/order-e2e' && method === 'GET') {
        return json(route, {
          success: true,
          data: {
            id: 'order-e2e',
            scope: 'academia',
            amount_expected: 25000,
            amount_approved: 25000,
            status: 'approved',
            approved_at: '2026-10-07T12:00:00.000Z',
            created_at: '2026-10-07T11:55:00.000Z',
          },
        }).then(() => true);
      }
      if (path === '/api/cobranza/public/estado/token-e2e' && method === 'GET') {
        return json(route, {
          success: true,
          data: {
            academia: {
              nombre: 'Academia E2E',
              slug: 'academia-e2e',
              logo: null,
              colores: { primario: '#289E9D', secundario: '#111111', fondo: '#ffffff' },
            },
            jugadores: [{ id: 'player-e2e', nombre: 'Alumno E2E', estado_financiero: 'Pendiente' }],
            cobros: [{
              id: 'charge-e2e',
              jugador_id: 'player-e2e',
              concepto: 'Matrícula 2026',
              tipo_concepto: 'Matrícula',
              monto: 25000,
              monto_pagado: 0,
              estado: 'Pendiente',
              fecha_vencimiento: '2026-10-15',
              saldo: 25000,
              vencido: false,
              cuotas: [],
              pagos_informados_pendientes: [],
            }],
            saldo_total: 25000,
            metodos_pago: {
              acepta_efectivo: false,
              acepta_transferencia: false,
              acepta_pago_online: true,
            },
            expira_at: '2026-10-07T18:00:00.000Z',
          },
        }).then(() => true);
      }
      return false;
    },
  });

  await page.goto('/matricula');

  await page.getByLabel('Nombre completo *').fill('Apoderado E2E');
  await page.getByLabel('RUT *').fill('12.345.678-5');
  await page.getByLabel('Teléfono *').fill('+56911111111');
  await page.getByLabel('Correo *').fill('apoderado.e2e@lestra.test');
  await page.getByRole('button', { name: 'Continuar →' }).click();

  await page.getByLabel('Nombre completo *').fill('Alumno E2E');
  await page.getByLabel('Fecha de nacimiento *').fill('2014-05-20');
  await page.getByLabel('Sexo *').selectOption({ label: 'Masculino' });
  await page.getByRole('button', { name: 'Continuar →' }).click();

  await expect(page.getByText('Perfil deportivo', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar →' }).click();

  await page.getByLabel('Matrícula').fill('25000');
  await page.getByLabel('Mensualidad').fill('15000');
  await page.getByRole('button', { name: 'Entregar a la familia' }).click();

  await expect(page.getByText('Pre-matrícula enviada', { exact: true })).toBeVisible();
  await expect(page.getByDisplayValue('http://127.0.0.1:4173/prematricula/pre-e2e-token')).toBeVisible();

  await page.goto('/pagar/token-e2e');
  await expect(page.getByRole('heading', { name: 'Elige qué quieres pagar' })).toBeVisible();
  await page.getByRole('checkbox').check();
  await expect(page.getByText('$25.000', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: /Pagar selección/ }).click();

  await expect(page).toHaveURL(/\/pago-resultado\?order=order-e2e&status=success$/);
  await expect(page.getByRole('heading', { name: 'Pago confirmado' })).toBeVisible();
  await expect(page.getByText(/Mercado Pago confirmó la operación/)).toBeVisible();
});

test('resultado MercadoPago es una ruta pública válida', async ({ page }) => {
  await installBackendMocks(page, {
    extra: async ({ route, path, method, json }) => {
      if (path === '/api/mercadopago/order/order-public' && method === 'GET') {
        return json(route, {
          success: true,
          data: {
            id: 'order-public',
            scope: 'plataforma',
            amount_expected: 9900,
            amount_approved: 9900,
            status: 'approved',
            approved_at: '2026-10-07T12:00:00.000Z',
            created_at: '2026-10-07T11:55:00.000Z',
          },
        }).then(() => true);
      }
      return false;
    },
  });

  await page.goto('/pago-resultado?order=order-public&status=success');

  await expect(page).toHaveURL(/\/pago-resultado/);
  await expect(page.getByRole('heading', { name: 'Pago confirmado' })).toBeVisible();
});
