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

## Remaining migration order

1. Complete Alumnos + Matrícula visual verification and final hierarchy polish.
2. Asistencia — field-first/mobile-first interaction.
3. Eventos / Partidos / Torneos — unify event mental model and actions.
4. Finanzas — prioritize income, debt, and required action.
5. Profesores + Familias — role-specific experiences.
6. Configuración — group options by user intent instead of technical structure.
7. Continue removing superseded CSS layers after each module is verified.

## Quality rules going forward

- Do not add another `*-fix.css`, `*-polish.css`, or `*-contrast-lock.css` as the default solution.
- Prefer changing the component or shared V2 contract.
- A migrated module should allow obsolete legacy selectors/stylesheets to be removed.
- Preserve business rules, security, plan gating, billing, and API contracts unless a separate functional task explicitly changes them.
- Validate keyboard focus, responsive behavior, mobile touch targets, loading/empty/error states, and visual hierarchy before calling a module complete.
