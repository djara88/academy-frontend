import type { Page } from '@playwright/test';

const SUPABASE_URL = 'https://yihcktculicmuuzzxzik.supabase.co';
const STORAGE_KEY = 'sb-yihcktculicmuuzzxzik-auth-token';

export type MockUser = {
  id: string;
  email: string;
  nombre_completo: string;
  rol: string;
  academia_id: string | null;
  activo?: boolean;
  requiere_cambio_password?: boolean;
};

const fakeAccessToken = (userId: string) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    aud: 'authenticated',
    role: 'authenticated',
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  return `${header}.${payload}.e2e-signature`;
};

export const installAuthenticatedSession = async (page: Page, user: MockUser) => {
  const accessToken = fakeAccessToken(user.id);
  const session = {
    access_token: accessToken,
    refresh_token: 'e2e-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { full_name: user.nombre_completo },
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  };

  await page.addInitScript(({ storageKey, authSession, appUser, token }) => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(authSession));
    window.sessionStorage.setItem('user', JSON.stringify(appUser));
    window.sessionStorage.setItem('token', token);
  }, {
    storageKey: STORAGE_KEY,
    authSession: session,
    appUser: user,
    token: accessToken,
  });

  await page.route(`${SUPABASE_URL}/rest/v1/usuarios*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: user.id,
        nombre_completo: user.nombre_completo,
        rol: user.rol,
        academia_id: user.academia_id,
        activo: user.activo !== false,
        requiere_cambio_password: user.requiere_cambio_password === true,
        academias: user.academia_id ? { nombre: 'Academia E2E', logo: null } : null,
      }),
    });
  });
};

export const fulfillJson = async (route: any, data: unknown, status = 200) => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  });
};
