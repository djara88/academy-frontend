import { test, expect } from '@playwright/test';
import { seedAuthenticatedUser, mockRoleApi } from './helpers/session.mjs';

const ACADEMY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BASE = 'http://localhost:8080/api/whatsapp-bridge/connection/';
const IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';

const setup = async (page) => {
  await mockRoleApi(page);
  await seedAuthenticatedUser(page, {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'director-whatsapp@example.test',
    role: 'director',
    academyId: ACADEMY_ID,
  });
};

test('WhatsApp vuelve a pedir QR mientras Evolution se encuentra en connecting', async ({ page }) => {
  await setup(page);
  let started = false;
  let qrRequests = 0;

  await page.route(BASE + '**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    let data = {};
    if (pathname.endsWith('/connect') && route.request().method() === 'POST') {
      started = true;
      data = { success: true, conectado: false, estado: 'connecting', qrCode: null };
    } else if (pathname.endsWith('/qr')) {
      qrRequests += 1;
      data = qrRequests === 1
        ? { conectado: false, estado: 'connecting', qrCode: null }
        : { conectado: false, estado: 'qr', qrCode: IMAGE };
    } else {
      data = started
        ? { conectado: false, estado: 'connecting', qrCode: null }
        : { conectado: false, estado: 'not_created', qrCode: null };
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });

  await page.goto('/whatsapp');
  await expect(page.getByRole('button', { name: 'Conectar WhatsApp' })).toBeVisible();
  await page.getByRole('button', { name: 'Conectar WhatsApp' }).click();
  await expect(page.getByRole('img', { name: 'Código QR para vincular WhatsApp' }))
    .toHaveAttribute('src', /^data:image\/png;base64,/, { timeout: 14000 });
  expect(qrRequests).toBeGreaterThanOrEqual(2);
});

test('WhatsApp no solicita QR si ya está conectado', async ({ page }) => {
  await setup(page);
  let qrRequests = 0;
  await page.route(BASE + '**', async (route) => {
    if (new URL(route.request().url()).pathname.endsWith('/qr')) qrRequests += 1;
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ conectado: true, estado: 'open', numero: '56912345678', qrCode: null }),
    });
  });
  await page.goto('/whatsapp');
  await expect(page.getByRole('heading', { name: 'WhatsApp conectado' })).toBeVisible();
  expect(qrRequests).toBe(0);
});

test('WhatsApp presenta error de proveedor al director sin mostrar un QR falso', async ({ page }) => {
  await setup(page);
  await page.route(BASE + '**', async (route) => {
    if (route.request().url().endsWith('/connect')) {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, estado: 'connecting', qrCode: null }),
      });
    }
    if (route.request().url().endsWith('/qr')) {
      return route.fulfill({
        status: 502, contentType: 'application/json',
        body: JSON.stringify({ error: 'Evolution API no pudo generar el QR.' }),
      });
    }
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ estado: 'not_created', qrCode: null }),
    });
  });
  await page.goto('/whatsapp');
  await page.getByRole('button', { name: 'Conectar WhatsApp' }).click();
  await expect(page.getByText('Evolution API no pudo generar el QR.')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Código QR para vincular WhatsApp' })).toHaveCount(0);
});

test('WhatsApp conserva estable el QR mientras el teléfono intenta vincularse', async ({ page }) => {
  await setup(page);
  let started = false;
  let statusPolls = 0;
  let extraQrRequests = 0;
  await page.route(BASE + '**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    let payload;
    if (pathname.endsWith('/connect') && route.request().method() === 'POST') {
      started = true;
      payload = { conectado: false, estado: 'connecting', qrCode: IMAGE };
    } else if (pathname.endsWith('/qr')) {
      extraQrRequests += 1;
      payload = { conectado: false, estado: 'qr', qrCode: IMAGE };
    } else {
      if (started) statusPolls += 1;
      payload = { conectado: false, estado: started ? 'connecting' : 'not_created', qrCode: null };
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });

  await page.goto('/whatsapp');
  await page.getByRole('button', { name: 'Conectar WhatsApp' }).click();
  await expect(page.getByRole('img', { name: 'Código QR para vincular WhatsApp' }))
    .toHaveAttribute('src', IMAGE);
  // Confirm at least two periodic state checks passed without calling /qr
  // again during the critical phone scan window.
  await expect.poll(() => statusPolls, { timeout: 16000 }).toBeGreaterThanOrEqual(2);
  expect(extraQrRequests).toBe(0);
  await expect(page.getByRole('heading', { name: 'Esperando vinculación' })).toBeVisible();
});
