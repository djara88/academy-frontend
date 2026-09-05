# Web Design Guidelines audit — Lestra Deportivo

Date: 2026-09-05
Scope: shared UI foundation, login, application shell, dashboard, dialogs, and progressive migration of high-frequency director workflows.
Guideline source: Vercel Web Interface Guidelines, fetched through `.agents/skills/web-design-guidelines/SKILL.md`.

## Product direction

The guidelines are being used as a product and interface quality standard, not only as a static audit checklist.

Target principle: **simple at first sight, powerful when the user goes deeper**.

For director workflows, each screen should answer quickly:

1. What is happening?
2. What requires attention?
3. What can I do now?

Deep analytics and secondary management remain available in their specialized modules instead of competing for attention on every screen.

## Foundation changes completed

- Installed `web-design-guidelines` as a repository skill and quality gate.
- Added Visual System V2 as the convergence layer for shared surfaces, focus, motion, responsive behavior, navigation, and common controls.
- Removed global `transition-all` behavior and standardized `focus-visible` treatment.
- Added reduced-motion treatment, mobile safe-area support, skip-link support, and clearer interactive states.
- Simplified the director navigation through progressive disclosure while preserving every module and plan gate.
- Rebuilt the director dashboard around decisions and high-frequency actions instead of decorative chart density.
- Simplified Login and improved autocomplete, loading, and announced error states.
- Unified dialogs/toasts and added focus trapping plus focus restoration.

## Phase 2 — Alumnos + Matrícula

### Alumnos

Migration objective: scan first, inspect second.

- Student browsing prioritizes recognition and selection over KPI-card density.
- Search and discipline filters behave as one compact toolbar.
- Secondary student metrics remain in the detailed profile instead of competing in the list.
- Removed the superseded `src/alumnos-list-modern.css` layer.

### Matrícula

Migration objective: one current decision at a time.

- Shared `DirectorHero` now behaves as a compact operational header instead of a marketing hero.
- The four-step flow remains intact: Apoderado → Alumno → Perfil deportivo → Valores y envío.
- Step navigation is compact and horizontally scannable on small screens.
- Form focus, optional sections, destructive actions, and final actions are governed by the shared Director/V2 system.
- Removed obsolete dedicated presentation locks:
  - `src/matricula-contrast-lock.css`
  - `src/matricula-step4-contrast-lock.css`
  - `src/matricula-actions-contrast-lock.css`

No enrollment API, validation, signing, finance, permission, or plan logic was changed as part of these visual migrations.

## Phase 3 — Asistencia

Migration objective: field-first and mobile-first.

- Rebuilt `AsistenciasMultirama` on shared `DirectorModule` components.
- Primary flow: Rama → Categoría → Sesión → Lista → Presente / Ausente / Justificado → Guardar.
- Reagendamiento is a focused selection-and-action flow.
- Monthly reporting remains separated from passing attendance and preserves Excel export plus family delivery.
- Attendance, suspension, rescheduling, reporting, metrics, and export API contracts remain unchanged.
- Removed `src/asistencias-multirama-fix.css` and the obsolete attendance override section from `src/operational-workflows-v2.css`.

## Phase 4 — Partidos / Eventos / Torneos

Migration objective: one event mental model from planning through result capture.

- Simplified route-level framing to `Partidos y eventos`.
- Removed the duplicate inner hero.
- Working area is Rama filter + Nuevo evento, followed immediately by the event collection.
- Event cards expose performance capture as the dominant action; citation/editing are secondary and deletion is destructive without competing visually.
- Rebuilt `DirectorSportsResponses` natively on shared V2 surfaces.
- Tournament cards were simplified and `Gestionar / Definir equipo` is now the dominant action.
- Existing event, citation, result, sport-profile, and tournament APIs remain unchanged.

Legacy styles removed:

- `src/events-card-minimal.css`
- `src/events-confirmations-contrast-lock.css`
- `src/tournament-filter-polish.css`

Still isolated pending native modal migration:

- `src/events-popup-simple.css`
- `src/performance-popup-contrast.css`

These two files protect portal-level modal behavior and sport-specific metric capture. They are being migrated at component level before deletion.

## Phase 5 — Finanzas

Migration objective: money first, action second, analytics third.

Completed:

- One route header; duplicated financial hero removed.
- Branch acts as scope rather than as another dashboard section.
- Four principal figures remain prominent: collected, due, overdue, balance.
- Students in arrears, delinquency, and payments pending review are secondary facts.
- `Cobro` is the primary creation action; `Egreso` is secondary/destructive.
- Rebuilt the advanced finance shell on V2 surfaces.
- Rebuilt the compatibility/fallback finance mode on V2 surfaces.
- Rebuilt current accounts, reported-payment validation, collection automation, payments, expenses, cash flow, and finance modals on light/shared surfaces.
- Simplified the finance dashboard to actionable analysis: cash trend, priority debtors, branch comparison, and recent movements instead of repeated KPI/chart density.
- Payment validation explicitly preserves the rule that an informed transfer does not move cash until Director validation.

Removed finance-specific compensation layers:

- `src/finance-hero-card.css`
- `src/finance-visibility-contract.css`

Financial APIs, collection automation, validation, payment, expense, and account-current logic remain unchanged.

## Phase 6 — Profesores + Familias

### Profesores

Migration objective: team management first, technical monitoring second.

- Rebuilt the page on shared `DirectorModule` components.
- Primary information is now professor capacity, branch coverage, and branch filter.
- Professor cards retain category assignments, credentials, status management, editing, and reset-password actions.
- Activity remains available but is limited to recent records so it does not dominate team management.
- Professor creation/edit modal was migrated to V2 surfaces.
- Removed obsolete dedicated styles:
  - `src/professors-polish.css`
  - `src/professors-actions-fix.css`

### Familias / Apoderados

Migration objective: status → family → action.

- Removed repeated statistics from hero + KPI strip + list header.
- Retained only active/pending access indicators before the family list.
- Editing, invitations, isolation by linked students, access state, and password reset remain unchanged.

## Phase 7 — Configuración

Migration objective: organize by director intent instead of technical module structure.

- Replaced the flat wall of configuration cards with grouped intent sections.
- Current groups: Academia y estructura, Personas y operación, Finanzas y condiciones, Comunicaciones, and Operación deportiva.
- Plan usage and onboarding were compacted into one operational summary rather than four KPI cards plus a full checklist.
- Rama principal remains a focused organization control.
- Removed `src/config-access-dark.css`, which targeted the old large dark module-card layout.

## Current cleanup status

The following high-frequency Director surfaces now converge on shared V2/Director components rather than module-specific visual patches:

- Dashboard
- Alumnos
- Matrícula
- Asistencia
- Partidos / Eventos
- Torneos
- Finanzas
- Profesores
- Familias / Apoderados
- Configuración

Remaining deliberate exceptions are limited to complex portal/modal flows that still need native markup migration before their defensive CSS can be removed.

## Next migration order

1. Migrate `Nuevo/Editar evento` modal markup natively and remove `events-popup-simple.css`.
2. Migrate `Registrar rendimiento` modal markup natively and remove `performance-popup-contrast.css`.
3. Compare branch against `main` and identify remaining dead compatibility selectors.
4. Run final keyboard, responsive, mobile-touch, loading/empty/error, and visual-hierarchy review.
5. Keep business rules, security, plan gating, billing, and API contracts unchanged unless a separate functional task explicitly requests changes.

## Quality rules going forward

- Do not add another `*-fix.css`, `*-polish.css`, or `*-contrast-lock.css` as the default solution.
- Prefer changing the component or shared V2 contract.
- A migrated module should allow obsolete legacy selectors/stylesheets to be removed.
- Preserve business rules, security, plan gating, billing, and API contracts unless a separate functional task explicitly changes them.
- Validate keyboard focus, responsive behavior, mobile touch targets, loading/empty/error states, and visual hierarchy before calling a module complete.
