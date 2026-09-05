# Web Design Guidelines audit — Lestra Deportivo

Date: 2026-09-05
Scope: first-pass audit of the shared UI foundation, login, application shell, dashboard, dialogs, and commercial landing page.
Guideline source: Vercel Web Interface Guidelines, fetched through `.agents/skills/web-design-guidelines/SKILL.md`.

## Priority findings

### src/index.css

- `src/index.css:31` — global form controls use `transition-all`; list only the properties that actually animate. Replace generic `focus:` treatment with a `focus-visible` strategy where appropriate.
- `src/index.css:39` — global `button` rule uses `transition-all`, so the anti-pattern propagates to most application buttons.
- `src/index.css:66` — `.sidebar-link` also uses `transition-all`.
- `src/index.css:9` — theming does not expose an explicit `color-scheme`; keep it synchronized with the actual dark/light theme rather than hard-coding one scheme.
- `src/index.css:29` — shared controls do not establish `touch-action: manipulation`; add it intentionally to interactive controls.

### src/App.tsx

- `src/App.tsx:105` — `Cargando sistema...` → `Cargando sistema…`.
- `src/App.tsx:114` — `Comprobando sesión...` → `Comprobando sesión…`.
- `src/App.tsx:200` — Suspense fallback uses `...`; use `…` and consider a status/live region for route-loading feedback.

### src/layouts/Layout.tsx

- `src/layouts/Layout.tsx:172` — application shell has no skip link to the main content.
- `src/layouts/Layout.tsx:211` — fixed mobile dock uses a hard-coded bottom offset and does not account for `env(safe-area-inset-bottom)`.
- `src/layouts/Layout.tsx:173` — mobile navigation behaves as a drawer but does not implement complete focus containment/restoration when opened and closed.
- `src/layouts/Layout.tsx:178` — academy logo image is visually sized with CSS but lacks explicit HTML `width`/`height` dimensions; same pattern is repeated in the mobile header.

### src/pages/Login.tsx

- `src/pages/Login.tsx:87` — Google image has no explicit `width`/`height`; the adjacent text already names Google, so use a deliberately decorative alt strategy or avoid redundant accessible naming.
- `src/pages/Login.tsx:100` — email input lacks a meaningful `name`, `autocomplete="email"`, and `spellCheck={false}`.
- `src/pages/Login.tsx:113` — password input lacks a meaningful `name` and `autocomplete="current-password"`.
- `src/pages/Login.tsx:125` — asynchronous login error is not exposed through `aria-live`/alert semantics.
- `src/pages/Login.tsx:136` — `Validando...` → `Validando…`.

### src/pages/Dashboard.tsx

- `src/pages/Dashboard.tsx:161` — loading spinner has no reduced-motion variant.
- `src/pages/Dashboard.tsx:162` — `Cargando resumen...` → `Cargando resumen…`.
- Dashboard financial/date formatting already uses `Intl.NumberFormat` and `Intl.DateTimeFormat`; keep this pattern for other modules.
- Visual chart/progress values should expose equivalent accessible values instead of relying on visual bar/ring geometry or `title` alone.

### src/contexts/DialogContext.tsx

- Dialog semantics, `aria-modal`, labelled/described relationships, Escape handling, and initial focus are present.
- Complete the modal behavior with a focus trap and restoration of focus to the invoking control after close.
- Toasts already use `role="status"`; retain that behavior for asynchronous feedback.

## Architecture observation

The UI contains many cumulative CSS correction layers (`*-fix.css`, `*-polish.css`, `*-contrast-lock.css`, readability/visual contracts). This is not itself a Web Interface Guidelines violation, but it raises regression risk because multiple late-stage styles can override the same controls. Future guideline fixes should prefer a shared foundational layer and then retire redundant overrides incrementally instead of adding another global patch file.

## Recommended order

1. Shared focus/transition/touch rules in `src/index.css`.
2. Login form semantics and asynchronous feedback.
3. Mobile safe-area and keyboard navigation in `Layout.tsx`.
4. Reduced motion and accessible data visualizations.
5. Incremental consolidation of legacy CSS as each module is touched.

No business logic, API behavior, permissions, billing rules, or production deployment was changed by this audit.
