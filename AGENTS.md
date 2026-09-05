# Lestra Deportivo — UI quality gate

For any change that touches user-facing UI (`src/**/*.tsx`, `src/**/*.css`, public HTML, navigation, forms, dialogs, or responsive behavior):

1. Read `.agents/skills/web-design-guidelines/SKILL.md`.
2. Fetch the fresh Vercel Web Interface Guidelines referenced by that skill before reviewing the change.
3. Review the changed UI files against the complete guideline set.
4. Report findings using `file:line` locations and address high-impact accessibility, focus, form, navigation, touch, responsive, i18n, and performance issues before considering the UI finished.
5. Do not change business rules, permissions, billing logic, security controls, or API behavior merely to satisfy a visual guideline.
6. Prefer small, reviewable fixes over broad visual rewrites. Preserve Lestra branding unless the task explicitly requests a redesign.

For legacy screens, use the guidelines as a quality gate when the screen is touched; do not perform unrelated mass refactors automatically.
