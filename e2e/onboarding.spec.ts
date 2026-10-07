import { test, expect } from '@playwright/test';
import { fulfillJson, installAuthenticatedSession } from './support/session';

test('onboarding blocks operations until setup is complete and then unlocks dashboard', async ({ page }) => {
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'director.e2e@lestra.test',
    nombre_completo: 'Director E2E',
    rol: 'director',
    academia_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  };
  await installAuthenticatedSession(page, user);

  const status: any = {
    required: true,
    locked: true,
    operational: false,
    completed_once: false,
    progress: 50,
    adoption_progress: 50,
    completed_at: null,
    setup: {
      billing_choice: null,
      staff_mode: null,
      terms_choice: null,
      consent_settings: {
        aviso_privacidad: true,
        datos_salud: false,
        imagen_interna: false,
        imagen_publica: false,
      },
    },
    academy: {
      nombre: 'Academia E2E',
      director: 'Director E2E',
      email: user.email,
      terms_configured: false,
    },
    structure: {
      sites: [{
        id: 'site-1',
        nombre: 'Sede Central',
        direccion: 'Cancha 1',
        ubicacion_entrenamiento: 'Cancha 1',
        horarios_config: [{ dias: 'Martes', inicio: '18:00', fin: '19:00' }],
        operation_complete: true,
        ramas: [{
          id: 'branch-1',
          nombre: 'Fútbol',
          disciplina: 'Fútbol',
          categorias: [{ id: 'cat-1', nombre: 'Sub 12', rama_id: 'branch-1' }],
        }],
      }],
      primary_branch_id: 'branch-1',
    },
    finance: { acepta_efectivo: false, acepta_transferencia: false, acepta_pago_online: false },
    team: { professors_count: 0, assigned_professors_count: 0 },
    optional: {},
    steps: [
      { key: 'identity', number: '01', title: 'Identidad', subtitle: 'Lista', complete: true, checks: {} },
      { key: 'structure', number: '02', title: 'Estructura', subtitle: 'Lista', complete: true, checks: {} },
      { key: 'operation', number: '03', title: 'Operación', subtitle: 'Lista', complete: true, checks: {} },
      { key: 'finance', number: '04', title: 'Cobros', subtitle: 'Pendiente', complete: false, checks: {} },
      { key: 'rules', number: '05', title: 'Protección', subtitle: 'Pendiente', complete: false, checks: {} },
      { key: 'team', number: '06', title: 'Equipo', subtitle: 'Pendiente', complete: false, checks: {} },
    ],
  };

  const refreshStatus = () => {
    const financeDone = typeof status.setup.billing_choice === 'boolean';
    const rulesDone = Boolean(status.setup.terms_choice);
    const teamDone = Boolean(status.setup.staff_mode);
    status.steps = status.steps.map((step: any) => ({
      ...step,
      complete: step.key === 'finance' ? financeDone : step.key === 'rules' ? rulesDone : step.key === 'team' ? teamDone : step.complete,
    }));
    status.operational = financeDone && rulesDone && teamDone;
    status.locked = !status.operational;
    status.completed_once = status.operational;
    status.progress = status.operational ? 100 : 50;
  };

  await page.route('http://localhost:8080/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/consentimientos/setup' && route.request().method() === 'GET') {
      return fulfillJson(route, { success: true, data: status });
    }
    if (url.pathname === '/api/consentimientos/setup/preferencias' && route.request().method() === 'PUT') {
      const patch = route.request().postDataJSON() as Record<string, any>;
      Object.assign(status.setup, patch);
      if (patch.consent_settings) status.setup.consent_settings = { ...status.setup.consent_settings, ...patch.consent_settings };
      refreshStatus();
      return fulfillJson(route, { success: true, data: status });
    }
    if (url.pathname === '/api/academias/mi-plan') {
      return fulfillJson(route, { success: true, data: { plan: { code: 'formacion', name: 'Formación', trial: false }, features: ['amistosos'] } });
    }
    return fulfillJson(route, { success: true, data: {} });
  });

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/puesta-en-marcha$/);
  await expect(page.getByRole('heading', { name: 'Cómo recibirá pagos tu academia' })).toBeVisible();

  await page.getByRole('button', { name: 'No por ahora' }).click();
  await page.getByRole('button', { name: 'No tengo condiciones adicionales' }).click();
  await page.getByRole('button', { name: 'La administraré yo' }).click();

  await expect(page.getByRole('heading', { name: 'Tu academia está lista. 🚀' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Entrar a Lestra' }).first().click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
