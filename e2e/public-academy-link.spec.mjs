import { test, expect } from '@playwright/test';
import { mockRoleApi, seedAuthenticatedUser } from './helpers/session.mjs';

const slug = 'academia-sol-d9da9d';
const canonicalUrl = `https://deportivo.lestra.app/a/${slug}`;

test('el enlace de la página pública utiliza el dominio de Deportivo y no lestra.app', async ({ page }) => {
  await mockRoleApi(page);
  await seedAuthenticatedUser(page, {
    id: '55555555-5555-4555-8555-555555555555',
    email: 'director.qa@example.com',
    role: 'director',
    academyId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  });
  await page.route('http://localhost:8080/api/public/page-admin', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          subdominio: slug,
          pagina_publica_activa: true,
          // La API anterior devolvía la URL obsoleta: el editor debe usar el host válido.
          url: `https://lestra.app/a/${slug}`,
          fotos: [],
        },
      }),
    });
  });

  await page.goto('/configuracion?seccion=pagina-publica');
  await expect(page.getByRole('link', { name: /abrir página/i })).toHaveAttribute('href', canonicalUrl);
  await expect(page.getByText('deportivo.lestra.app/a/')).toBeVisible();
});

test('la ruta pública de la academia funciona como entrada directa a la SPA', async ({ page }) => {
  await page.route('https://yihcktculicmuuzzxzik.supabase.co/rest/v1/rpc/get_public_academy_catalog', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        academia: { nombre: 'Academia SOL', slug, direccion: 'La Coruña 501' },
        sedes: [],
        ramas: [],
        categorias: [],
        fotos: [],
      }),
    });
  });
  await page.goto(`/a/${slug}`);
  await expect(page.getByRole('heading', { name: 'Academia SOL' })).toBeVisible();
});
