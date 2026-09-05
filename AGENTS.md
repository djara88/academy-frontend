# Lestra Deportivo — UI quality contract

When changing UI or UX in this repository:

1. Read `.agents/skills/web-design-guidelines/SKILL.md` and fetch the current Vercel Web Interface Guidelines before reviewing or finalizing UI changes.
2. Treat `src/visual-system-v2.css` as the temporary convergence contract for the authenticated product shell while legacy global CSS is retired.
3. Prefer simplifying hierarchy and removing obsolete corrective styles over adding another `*-fix.css`, `*-polish.css` or `*-contrast-lock.css` layer.
4. Preserve business logic, permissions, plan gating, API contracts and security controls unless the task explicitly requires a functional change.
5. Every migrated module must be usable on mobile, keyboard-accessible, respect reduced motion and expose clear loading, empty and error states.
6. Keep one primary action per context whenever possible; secondary actions should not compete visually with the primary workflow.
7. Verify preview builds before proposing production merge.
