# Lestra Deportivo — Product and UI quality contract

This repository follows **Lestra Product DNA**, the product-specific contract in `docs/PRODUCT-DNA-DEPORTIVO.md`, and the executable redesign direction in `docs/REDESIGN-DEPORTIVO-BLUEPRINT.md`.

When changing UI or UX:

1. Read `docs/PRODUCT-DNA-DEPORTIVO.md` and `docs/REDESIGN-DEPORTIVO-BLUEPRINT.md` before designing or modifying a product surface.
2. Read `.agents/skills/web-design-guidelines/SKILL.md` and fetch the current Vercel Web Interface Guidelines before reviewing or finalizing UI changes.
3. Do not generate a generic SaaS screen. Start from the real sporting situation, user, decision, information criticality and primary action.
4. Prefer domain components (`RosterStrip`, `TrainingSession`, `MatchCommand`, `PerformanceCanvas`, `SeasonTimeline`, `AcademyFinanceDesk`, etc.) over generic card/dashboard compositions.
5. Treat `src/visual-system-v2.css` as a temporary convergence contract for the authenticated shell while legacy global CSS is retired.
6. Correct visual problems in the component or contract that owns the surface. Do not add another `*-fix.css`, `*-polish.css`, `*-contrast-lock.css` or similar repair layer as the default solution.
7. Preserve business logic, permissions, plan gating, API contracts, data integrity and security controls unless the task explicitly requires a functional change.
8. Keep one primary action per context whenever possible. Secondary actions must not compete visually with the operational task.
9. Never use color as the only state signal. Maintain WCAG AA contrast, focus-visible, keyboard operation, reduced motion and real mobile usability.
10. Every relevant flow must define and validate normal, loading, empty, disabled, error, warning, success and destructive states.
11. A build or deployment marked READY is not visual QA. Verify the actual flow in production/preview before declaring a module PASS.
12. Apply the Anti-AI Review before approval: if the screen could belong to any CRM/ERP/SaaS after changing logo and text, redesign it.
13. Avoid repeated hard-coded presentation colors in new or migrated components. Prefer semantic design tokens and explicit component ownership.
14. Do not invent data, testimonials, customers, usage metrics or product capabilities to make a screen look complete.
15. Do not remove valid operational complexity just to make a screen look minimal. Use progressive disclosure instead.
16. Do not default to KPI grids, promotional heroes, symmetrical card mosaics, gradients or generic sidebars. A dominant sports task must define the composition.
17. Design the product around the visible model: Academia → Rama → Categoría → Plantel → Deportista → Entrenamiento/Evento → Temporada → Evolución.
18. Migrate by complete experiences, not by global restyling. A visual change is not complete until its real user flow is coherent end-to-end.

## Definition of Done

A product surface is complete only when logic, permissions, data, desktop/mobile behavior, contrast, accessibility, copy, loading/empty/error/disabled states and product identity have all been validated.

> Do not generate a modern interface. Design the best possible tool for the specific sporting activity. If the result resembles the conventional SaaS pattern, find a more domain-specific solution.
