const SUPABASE_ORIGIN = 'https://yihcktculicmuuzzxzik.supabase.co';
const SUPABASE_SESSION_KEY = 'sb-yihcktculicmuuzzxzik-auth-token';

export const SUPERADMIN_E2E_USER_ID = '11111111-1111-4111-8111-111111111111';

const base64url = (value) => Buffer.from(JSON.stringify(value))
  .toString('base64')
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

const jwt = ({ userId, email, aal = 'aal1' }) => {
  const now = Math.floor(Date.now() / 1000);
  return [
    base64url({ alg: 'HS256', typ: 'JWT' }),
    base64url({
      aud: 'authenticated',
      exp: now + 3600,
      iat: now,
      iss: `${SUPABASE_ORIGIN}/auth/v1`,
      sub: userId,
      email,
      role: 'authenticated',
      aal,
      session_id: 'e2e-session',
    }),
    'e2e-signature',
  ].join('.');
};

const sessionFor = ({ id, email, aal = 'aal1' }) => {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: 'Usuario E2E' },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return {
    access_token: jwt({ userId: id, email, aal }),
    refresh_token: 'e2e-refresh-token',
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: 'bearer',
    user,
  };
};

export async function seedAuthenticatedUser(page, {
  id,
  email,
  role,
  academyId = null,
  aal = 'aal1',
}) {
  const session = sessionFor({ id, email, aal });
  const appUser = {
    id,
    email,
    nombre_completo: 'Usuario E2E',
    rol: role,
    academia_id: academyId,
    requiere_cambio_password: false,
    activo: true,
  };

  await page.addInitScript(({ key, storedSession, storedUser }) => {
    sessionStorage.setItem(key, JSON.stringify(storedSession));
    sessionStorage.setItem('token', storedSession.access_token);
    sessionStorage.setItem('user', JSON.stringify(storedUser));
  }, {
    key: SUPABASE_SESSION_KEY,
    storedSession: session,
    storedUser: appUser,
  });

  await page.route(`${SUPABASE_ORIGIN}/auth/v1/user**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    });
  });

  await page.route(`${SUPABASE_ORIGIN}/rest/v1/usuarios**`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/vnd.pgrst.object+json' },
      body: JSON.stringify({
        id,
        nombre_completo: 'Usuario E2E',
        rol: role,
        academia_id: academyId,
        activo: true,
        requiere_cambio_password: false,
        academias: academyId ? { nombre: 'Academia E2E', logo: null } : null,
      }),
    });
  });

  return { session, appUser };
}

export async function mockRoleApi(page) {
  await page.route('http://localhost:8080/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === '/api/consentimientos/setup') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { required: false, locked: false, operational: true, completed_once: true, progress: 100 } }),
      });
    }

    if (path === '/api/academias/mi-plan') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { plan: { code: 'competencia', name: 'Competencia', trial: false }, features: ['amistosos', 'evaluaciones'] } }),
      });
    }

    if (path === '/api/profesores/me') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            profesor: { id: '22222222-2222-4222-8222-222222222222', nombre: 'Profesor E2E' },
            academia: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', nombre: 'Academia E2E' },
            categorias: [],
          },
        }),
      });
    }

    if (path === '/api/saas-admin/resumen') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            kpis: { academies: 1, active: 1, trials: 0, blocked: 0, mrrClpNet: 1000, mrrClpGross: 1190, income: 1190, expenses: 0, net: 1190, receivable: 0, conversionRate: 100 },
            academies: [],
            alerts: [],
            gateway: { provider: 'Mercado Pago', configured: true },
          },
        }),
      });
    }

    if (path === '/api/saas-admin/activation-funnel') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { windowDays: 30, cohort: 0, stages: [], productDepth: { evaluated: 0, evaluationRate: 0 }, academies: [] },
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {} }),
    });
  });
}
