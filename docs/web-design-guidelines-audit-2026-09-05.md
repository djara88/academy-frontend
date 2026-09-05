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

Completed in the visible route surfaces:

- Simplified the route-level header to `Partidos y eventos` with one operational description.
- Removed the visible duplicate inner hero by collapsing its remaining action into the operational toolbar.
- Top working area is now Rama filter + Nuevo evento, followed immediately by the event collection.
- Event cards have a calmer information hierarchy and a single dominant action for performance capture.
- Citación and editing are secondary; deletion is visually destructive without competing with the primary action.
- Rebuilt `DirectorSportsResponses` natively on shared V2 surfaces instead of using a dark component plus contrast overrides.
- Tournament list cards were simplified: repeated explanatory blocks are suppressed, hover lift was removed, and `Gestionar / Definir equipo` is the dominant action.
- Existing event, citation, result, sport-profile and tournament APIs remain unchanged.

Legacy styles removed in this phase:

- `src/events-card-minimal.css`
- `src/events-confirmations-contrast-lock.css`
- `src/tournament-filter-polish.css`

Deliberately retained for now:

- `src/events-popup-simple.css`
- `src/performance-popup-contrast.css`

Those two files isolate viewport-level portal modals, including complex sport-specific metric capture. They will only be removed after the modal markup itself is migrated, rather than deleting defensive styles without an equivalent component contract.

## Phase 5 — Finanzas

Migration objective: money first, action second, analytics third.

Current progress:

- Reduced the route-level message to the financial decisions the director needs: collected, due, overdue and balance.
- Removed the duplicated visual hero from the advanced financial engine; its inner header now acts only as the branch scope control.
- Four principal financial figures remain prominent while students in arrears, delinquency and payments pending review become compact secondary facts.
- `Cobro` is treated as the primary creation action; `Egreso` remains clearly destructive/secondary.
- Financial navigation is converging from a dark tab strip to a compact segmented workspace control.
- Removed the obsolete finance hero accessory stylesheet `src/finance-hero-card.css` after deleting the connected-marketing card from the header.
- Financial API, collection automation, validation, payment, expense and account-current logic remains unchanged.

Next in this phase:

- Converge the dashboard and table surfaces without losing financial semantics (income green, expense red, pending amber).
- Reduce reliance on `finance-visibility-contract.css` as the advanced finance components become natively light/V2.
- Verify payment validation, account current, collection automation and modal states on mobile.

## Remaining migration order

1. Complete Finance deep surfaces.
2. Profesores + Familias — role-specific experiences.
3. Configuración — group options by user intent instead of technical structure.
4. Continue removing superseded CSS layers after each module is verified.
5. Return to Partidos portal modals for native markup migration after the primary director workflow is stable.

## Quality rules going forward

- Do not add another `*-fix.css`, `*-polish.css`, or `*-contrast-lock.css` as the default solution.
- Prefer changing the component or shared V2 contract.
- A migrated module should allow obsolete legacy selectors/stylesheets to be removed.
- Preserve business rules, security, plan gating, billing, and API contracts unless a separate functional task explicitly changes them.
- Validate keyboard focus, responsive behavior, mobile touch targets, loading/empty/error states, and visual hierarchy before calling a module complete.
