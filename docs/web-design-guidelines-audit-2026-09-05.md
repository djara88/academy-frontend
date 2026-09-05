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

- List view is converging from a three-column KPI-card wall to a single fast-scanning collection.
- Search and discipline filters are treated as one compact toolbar.
- Per-student list cards no longer surface three secondary KPIs simultaneously; those details remain in the student profile.
- Avatar, typography, chips, borders, shadows, and hover states are quieter and optimized for recognition and selection.
- The detailed multideporte profile remains available when the director opens a student.
- Removed the superseded legacy stylesheet `src/alumnos-list-modern.css` rather than layering another override on top.

### Matrícula

Migration objective: one current decision at a time.

- The shared `DirectorHero` was converted from a dark marketing hero with oversized typography into a compact operational page header.
- The four-step flow remains intact: Apoderado → Alumno → Perfil deportivo → Valores y envío.
- Step navigation is compact and horizontally scannable on small screens.
- The active form area has stronger hierarchy than surrounding context.
- Form focus, inputs, optional sections, destructive actions, and final actions are now governed by the shared Director/V2 system.
- Removed obsolete dedicated presentation locks:
  - `src/matricula-contrast-lock.css`
  - `src/matricula-step4-contrast-lock.css`
  - `src/matricula-actions-contrast-lock.css`

No enrollment API, validation, signing, finance, permission, or plan logic was changed as part of these visual migrations.

## Phase 3 — Asistencia

Migration objective: field-first and mobile-first.

- Rebuilt `AsistenciasMultirama` on shared `DirectorModule` components instead of continuing to patch its custom presentation layer.
- The primary flow is now Rama → Categoría → Sesión → Lista → Presente / Ausente / Justificado → Guardar.
- The roster receives the majority of available workspace and remains easy to use on mobile touch targets.
- Reagendamiento is a two-step selection-and-action flow instead of another dashboard surface.
- Monthly reporting is separated from passing attendance and keeps Excel export plus family report delivery.
- Preserved the existing attendance, suspension, rescheduling, reporting, metrics and export API contracts.
- Removed `src/asistencias-multirama-fix.css` from the bundle and deleted the file.
- Removed the now-unused attendance override section from `src/operational-workflows-v2.css`.

## Phase 4 — Partidos / Eventos / Torneos

Migration objective: one event mental model from planning through result capture.

Current progress:

- Simplified the route-level header to `Partidos y eventos` with one operational description.
- Removed the visible duplicate inner hero by collapsing its remaining action into the operational toolbar.
- The top working area is converging to Rama filter + Nuevo evento, followed immediately by the event collection.
- Existing event, citation, result, sport-profile and tournament APIs remain unchanged.

Next in this phase:

- Converge event cards and their action priority.
- Unify modal language between planning and result capture.
- Align tournament navigation and event context without duplicating competition information.
- Remove superseded event-specific CSS after visual verification.

## Remaining migration order

1. Complete Partidos / Eventos / Torneos.
2. Finanzas — prioritize income, debt, and required action.
3. Profesores + Familias — role-specific experiences.
4. Configuración — group options by user intent instead of technical structure.
5. Continue removing superseded CSS layers after each module is verified.

## Quality rules going forward

- Do not add another `*-fix.css`, `*-polish.css`, or `*-contrast-lock.css` as the default solution.
- Prefer changing the component or shared V2 contract.
- A migrated module should allow obsolete legacy selectors/stylesheets to be removed.
- Preserve business rules, security, plan gating, billing, and API contracts unless a separate functional task explicitly changes them.
- Validate keyboard focus, responsive behavior, mobile touch targets, loading/empty/error states, and visual hierarchy before calling a module complete.
