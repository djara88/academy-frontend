const PROJECT_REF = 'yihcktculicmuuzzxzik';
const SUPABASE_ORIGIN = `https://${PROJECT_REF}.supabase.co`;

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

export const profile = ({
  id = '11111111-1111-4111-8111-111111111111',
  email = 'director.e2e@lestra.test',
  role = 'director',
  academyId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name = 'Director E2E',
} = {}) => ({
  id,
  email,
  nombre_completo: name,
  rol: role,
  academia_id: academyId,
  nombre_academia: 'Academia E2E',
  logo_url: null,
  requiere_cambio_password: false,
  activo: true,
});

export const createSession = (userProfile) => {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: userProfile.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: userProfile.email,
    email_confirmed_at: new Date((now - 3600) * 1000).toISOString(),
    phone: '',
    confirmed_at: new Date((now - 3600) * 1000).toISOString(),
    last_sign_in_at: new Date((now - 60) * 1000).toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: userProfile.nombre_completo },
    identities: [],
    created_at: new Date((now - 86400) * 1000).toISOString(),
    updated_at: new Date((now - 60) * 1000).toISOString(),
    is_anonymous: false,
  };
  const accessToken = [
    b64url({ alg: 'HS256', typ: 'JWT' }),
    b64url({
      aud: 'authenticated',
      exp: now + 3600,
      iat: now,
      iss: `${SUPABASE_ORIGIN}/auth/v1`,
      sub: user.id,
      role: 'authenticated',
      aal: 'aal1',
      email: user.email,
    }),
    'e2e-signature',
  ].join('.');

  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: 'e2e-refresh-token',
    user,
  };
};

export const installAuthenticatedSession = async (page, userProfile) => {
  const session = createSession(userProfile);
  await page.addInitScript(({ projectRef, sessionValue, localUser }) => {
    sessionStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(sessionValue));
    sessionStorage.setItem('token', sessionValue.access_token);
    sessionStorage.setItem('user', JSON.stringify(localUser));
  }, { projectRef: PROJECT_REF, sessionValue: session, localUser: userProfile });

  // Playwright evalúa primero la última ruta registrada: deja los fallbacks antes
  // y registra las respuestas específicas al final.
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/usuarios**`, async (route) => {
    const dbProfile = {
      id: userProfile.id,
      nombre_completo: userProfile.nombre_completo,
      rol: userProfile.rol,
      academia_id: userProfile.academia_id,
      requiere_cambio_password: false,
      activo: true,
      academias: userProfile.academia_id ? { nombre: userProfile.nombre_academia || 'Academia E2E', logo: null } : null,
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([dbProfile]) });
  });
  await page.route(`${SUPABASE_ORIGIN}/auth/v1/token**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) });
  });
  await page.route(`${SUPABASE_ORIGIN}/auth/v1/user**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session.user) });
  });
};

export const setupStatus = ({
  required = false,
  locked = false,
  operational = true,
} = {}) => ({
  required,
  locked,
  operational,
  completed_once: operational,
  progress: operational ? 100 : 20,
  adoption_progress: operational ? 100 : 20,
  completed_at: operational ? '2026-10-07T12:00:00.000Z' : null,
  setup: {
    billing_choice: false,
    staff_mode: 'solo',
    terms_choice: 'none',
    consent_settings: {
      datos_salud: false,
      imagen_interna: false,
      imagen_publica: false,
    },
  },
  academy: {
    nombre: 'Academia E2E',
    director: 'Director E2E',
    email: 'director.e2e@lestra.test',
    terms_configured: false,
  },
  structure: { sites: [], primary_branch_id: null },
  finance: {
    acepta_efectivo: true,
    acepta_transferencia: false,
    acepta_pago_online: true,
  },
  team: { professors_count: 0, assigned_professors_count: 0 },
  optional: {},
  steps: [
    { key: 'identity', number: 1, title: 'Identidad', subtitle: 'Datos de la academia', complete: true },
    { key: 'structure', number: 2, title: 'Estructura', subtitle: 'Sedes y ramas', complete: false },
    { key: 'operation', number: 3, title: 'Operación', subtitle: 'Horarios', complete: false },
    { key: 'billing', number: 4, title: 'Cobros', subtitle: 'Medios de pago', complete: false },
    { key: 'privacy', number: 5, title: 'Protección', subtitle: 'Privacidad', complete: false },
    { key: 'staff', number: 6, title: 'Equipo', subtitle: 'Profesores', complete: false },
  ],
});

const json = (route, body, status = 200) => route.fulfill({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

export const installBackendMocks = async (page, {
  setup = setupStatus(),
  extra = null,
} = {}) => {
  await page.route('http://127.0.0.1:4173/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (extra) {
      const handled = await extra({ route, request, url, path, method, json });
      if (handled) return;
    }

    if (path === '/api/consentimientos/setup') {
      return json(route, { success: true, data: setup });
    }
    if (path === '/api/academias/mi-plan') {
      return json(route, {
        success: true,
        data: { plan: { code: 'formacion', name: 'Formación', trial: false }, features: [] },
      });
    }
    if (path === '/api/presence/heartbeat') return json(route, { success: true });
    if (path === '/api/prematriculas' && method === 'GET') return json(route, { success: true, data: [] });
    if (path === '/api/estructura' && method === 'GET') return json(route, { success: true, data: [] });

    return json(route, { success: true, data: [] });
  });
};
