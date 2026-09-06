# Web Design Guidelines audit — Lestra Deportivo

Date: 2026-09-05
Branch: `chore/web-design-guidelines`
Scope: shared UI foundation, authenticated shell, role portals, onboarding, high-frequency Director workflows, dialogs, accessibility, responsive behavior, and visual-debt removal.
Guideline source: Vercel Web Interface Guidelines through `.agents/skills/web-design-guidelines/SKILL.md`.

## Product direction

The guidelines are being used as a product quality standard, not only as a static accessibility audit.

Target principle: **simple at first sight, powerful when the user goes deeper**.

Director workflows should answer quickly:

1. What is happening?
2. What requires attention?
3. What can I do now?

Deep analytics and secondary management remain available in specialized modules instead of competing for attention on every screen.

## Visual architecture after convergence

The application originally loaded more than 40 visual layers, including multiple generations that attempted to restyle the same shell, hero, controls, and module content. This created specificity conflicts, repeated `!important`, dark/light compensation files, and route-specific repair styles.

The current branch loads 13 top-level visual contracts in `main.tsx`, including the base stylesheet. Responsibilities are now explicit:

- `index.css` — base application primitives.
- `portal-visibility.css` — Professor court visibility modes and Family portal only.
- `readability-contract.css` — typography/readability only; no colors or surfaces.
- `setup-v2.css` — Puesta en Marcha only.
- `director-brand-normalize.css` — temporary translation of historical non-semantic brand colors.
- `director-accent-cleanup.css` — temporary translation of purple/blue/teal decorative accents; semantic red/amber/green remain intact.
- `formation-friendlies.css` — plan-specific navigation behavior for Amistosos.
- `prematricula-hide-finalidades.css` — explicit public pre-enrollment content decision; retained as functional behavior, not decoration.
- `student-profile-v2.css` — deep student profile only.
- `visual-readability-final.css` — residual chat/overlay/mobile-dock helpers only.
- `visual-system-v2.css` — authenticated shell, focus, common surfaces, tables, mobile navigation, reduced motion.
- `operational-workflows-v2.css` — high-frequency Director workflows.
- `sports-dialogs-v2.css` — event and performance portal dialogs.

This is a convergence architecture: new UI changes should go into the component or the contract that owns that surface instead of adding another repair stylesheet.

## Foundation changes completed

- Installed `web-design-guidelines` as a repository skill and quality gate.
- Added Visual System V2 as the convergence layer for shared surfaces, focus, motion, responsive behavior, navigation, and common controls.
- Removed global `transition-all` behavior and standardized `focus-visible` treatment.
- Added reduced-motion treatment, mobile safe-area support, skip-link support, and clearer interactive states.
- Simplified Director navigation through progressive disclosure while preserving modules and plan gates.
- Rebuilt the Director dashboard around decisions and high-frequency actions instead of decorative chart density.
- Simplified Login and improved autocomplete, loading, and announced error states.
- Unified dialogs/toasts and added focus trapping plus focus restoration.
- Preserved one typography base and removed the duplicate Manrope import from the old New Era system.
- Preserved semantic colors: Lestra lime = action/identity, green = success, amber = pending, red = error/destructive.

## Alumnos + Matrícula

### Alumnos

Migration objective: scan first, inspect second.

- Student browsing prioritizes recognition and selection over KPI-card density.
- Search and discipline filters behave as one compact toolbar.
- Secondary student metrics remain in the detailed profile instead of competing in the list.
- Deep student profile now has its own `student-profile-v2.css` contract.
- Student report modal is native V2 and is no longer overwritten by profile readability CSS.
- Removed:
  - `src/alumnos-list-modern.css`
  - `src/alumno-profile-readability.css`
  - `src/student-report-contrast-lock.css`

### Matrícula

Migration objective: one current decision at a time.

- Shared `DirectorHero` behaves as a compact operational header instead of a marketing hero.
- Four-step flow remains intact: Apoderado → Alumno → Perfil deportivo → Valores y envío.
- Step navigation is compact and horizontally scannable on small screens.
- Form focus, optional sections, destructive actions, and final actions are governed by shared Director/V2 contracts.
- Recent pre-enrollments now render as `DirectorPanel`; the obsolete dark-aside presentation layer was removed.
- Removed:
  - `src/matricula-contrast-lock.css`
  - `src/matricula-step4-contrast-lock.css`
  - `src/matricula-actions-contrast-lock.css`
  - `src/prematriculas-recientes-lestra.css`

No enrollment API, validation, signing, finance, permission, or plan logic was changed.

## Asistencia

Migration objective: field-first and mobile-first.

- Rebuilt `AsistenciasMultirama` on shared `DirectorModule` components.
- Primary flow: Rama → Categoría → Sesión → Lista → Presente / Ausente / Justificado → Guardar.
- Reagendamiento is a focused selection-and-action flow.
- Monthly reporting remains separated from attendance capture and preserves Excel export plus family delivery.
- Attendance, suspension, rescheduling, reporting, metrics, and export API contracts remain unchanged.
- Removed `src/asistencias-multirama-fix.css` and dead attendance overrides.

## Partidos / Eventos / Torneos

Migration objective: one event mental model from planning through result capture.

- Simplified route framing to `Partidos y eventos`.
- Removed duplicate inner hero.
- Working area is Rama filter + Nuevo evento, followed by event collection.
- Event cards expose performance capture as the dominant action; citation/editing are secondary and deletion is destructive without competing visually.
- Rebuilt `DirectorSportsResponses` natively on V2 surfaces.
- Tournament cards were simplified; `Gestionar / Definir equipo` is the dominant action.
- Event/performance dialogs now share `sports-dialogs-v2.css` with safe areas, internal scroll, sticky header, focus-visible states, semantic colors, and reduced-motion support.
- Existing event, citation, result, sport-profile, and tournament APIs remain unchanged.

Removed:

- `src/events-card-minimal.css`
- `src/events-confirmations-contrast-lock.css`
- `src/tournament-filter-polish.css`
- `src/events-popup-simple.css`
- `src/performance-popup-contrast.css`
- `src/tournament-contrast-safety.css`
- `src/confirmations-readability.css`

## Finanzas

Migration objective: money first, action second, analytics third.

- One route header; duplicated finance hero removed.
- Branch acts as scope instead of another dashboard.
- Principal figures: collected, due, overdue, balance.
- Students in arrears, delinquency, and payments pending review are secondary facts.
- `Cobro` is the primary creation action; `Egreso` is secondary/destructive.
- Rebuilt advanced finance and compatibility/fallback modes on V2 surfaces.
- Rebuilt current accounts, payment validation, collection automation, payments, expenses, cash flow, and finance modals.
- Finance dashboard now prioritizes cash trend, priority debtors, branch comparison, and recent movements.
- Reported transfers still do not move cash until Director validation.

Removed:

- `src/finance-hero-card.css`
- `src/finance-visibility-contract.css`

Financial APIs and business rules remain unchanged.

## Profesores + Familias

### Profesores

- Rebuilt on shared `DirectorModule` components.
- Primary information is capacity, branch coverage, and branch filter.
- Category assignments, credentials, status management, editing, reset password, and recent activity remain intact.
- Professor creation/edit modal uses V2 surfaces.
- Removed:
  - `src/professors-polish.css`
  - `src/professors-actions-fix.css`

### Familias / Apoderados

- Hierarchy is status → family → action.
- Removed repeated hero/KPI/list statistics.
- Editing, invitations, isolation by linked students, access state, and password reset remain unchanged.

## Configuración

Migration objective: organize by Director intent instead of technical module structure.

- Replaced flat configuration-card wall with grouped intent sections.
- Groups: Academia y estructura, Personas y operación, Finanzas y condiciones, Comunicaciones, Operación deportiva.
- Plan usage and onboarding are one compact operational summary.
- Rama principal remains a focused organization control.
- Removed `src/config-access-dark.css`.

## Puesta en Marcha

Migration objective: six operational tasks, not a marketing landing.

- Consolidated five setup repair/polish styles into `src/setup-v2.css`.
- Hero is visually calm and progress-oriented instead of dark/promotional.
- Current/completed/pending steps use operational hierarchy instead of a neon dark stepper.
- Schedule controls retain large touch targets and responsive layout.
- Privacy/Ley 21.719 information remains complete but is presented as readable supporting information rather than a dominant dark feature block.
- Optional functions are clearly secondary and no longer use a dark promotional section.
- Preserved all setup APIs, status logic, choices, finance configuration, consent decisions, schedules, and team setup.

Removed:

- `src/setup-polish.css`
- `src/setup-action-fix.css`
- `src/setup-schedule-fix.css`
- `src/setup-optional-fix.css`
- `src/setup-optional-actions.css`

## Role separation

The old `revolution` and `new-era` layers mixed Director, Professor, and Family presentation rules. They were split by responsibility.

Professor and Family now use `portal-visibility.css`:

- Professor retains `court-dark` and high-contrast `court-bright` modes for field/outdoor use.
- Professor navigation and controls retain large touch targets.
- Family retains a separate private portal shell.
- Director no longer inherits those role-specific rules.

Removed:

- `src/revolution.css`
- `src/new-era.css`
- `src/new-era-bridge.css`
- `src/new-era-type.css`

## Global visual debt removed

The branch no longer loads the historical generations that competed with DirectorModule/V2:

- `src/reference-focus.css`
- `src/workspace-focus.css`
- `src/wow-system.css`
- `src/director-reference-system.css`
- `src/director-uniformity.css`
- `src/director-hero-unified.css`
- `src/director-contrast-safety.css`
- `src/production-contrast-lock.css`
- `src/dialog-readability.css`
- `src/dashboard-minimal.css`
- `src/dashboard-watermark.ts`
- `src/chat-composer-lestra.css`

`readability-contract.css` was reduced from a visual override layer to typography/readability only. `visual-readability-final.css` now contains only residual chat, overlay, mobile-dock, and overflow helpers.

## Current branch delta

At the latest comparison with `main`:

- `chore/web-design-guidelines` is **125 commits ahead and 0 behind**.
- The original `main` merge base is unchanged.
- Large legacy stylesheets have been deleted rather than hidden beneath additional overrides.
- Production remains unchanged; work stays isolated in draft PR #87 and Vercel preview deployments.

## Final validation order

1. Confirm the latest head builds successfully after setup/student-profile cleanup.
2. Run keyboard/focus review on Login, shell, dialogs, Matrícula, Puesta en Marcha, Student Report, Event/Performance dialogs.
3. Review responsive/touch behavior at mobile widths for Director dock, attendance, setup schedules, and sports dialogs.
4. Review loading, empty, error, disabled, destructive, and success states.
5. Inspect the few remaining top-level compatibility imports; remove only when their functional responsibility has been moved into markup/components.
6. Compare the preview visually on the high-frequency Director routes before considering merge.

## Quality rules going forward

- Do not add another `*-fix.css`, `*-polish.css`, `*-contrast-lock.css`, or `*-safety.css` as the default solution.
- Prefer changing the component or the contract that owns the surface.
- A migrated module should allow obsolete legacy selectors/stylesheets to be removed.
- Preserve business rules, security, plan gating, billing, and API contracts unless a separate functional task explicitly changes them.
- Semantic colors must remain semantic; brand normalization must not erase success/warning/error meaning.
- Validate keyboard focus, responsive behavior, mobile touch targets, loading/empty/error states, and visual hierarchy before calling a module complete.
