# Lestra Deportivo — Product DNA Roadmap

Estado de referencia: 2026-09-08

Este documento ordena la convergencia visual/operacional de Deportivo. No reemplaza `PRODUCT-DNA-DEPORTIVO.md`; traduce ese contrato a rutas concretas del producto.

## Regla de cierre

Una ruta solo pasa a **PASS** cuando conserva la lógica existente y además valida desktop, mobile, keyboard/focus, loading, empty, error, disabled, destructive, success y copy.

## PASS / protegidas por Product DNA Audit

- **Navegación Director** — `DirectorCommandBar`: abandona sidebar SaaS genérico y organiza por Jornada, Plantel, Competir, Operación y Academia.
- **Inicio Director** — `/dashboard`: Match Command, Season Timeline y pulso operativo.
- **Plantel** — `/alumnos`: Roster Strip, filtros por disciplina/categoría y ficha deportiva con Performance Canvas.
- **Profesor / asistencia** — `/profesor`: Training Session + Attendance Lineup con roster verificado, borrador local aislado y operación de cancha.
- **Partidos y eventos** — `/partidos`: Match Command / fixture board.
- **Finanzas** — `/finanzas`: Academy Finance Desk, estados financieros verificables e idempotencia de movimientos.
- **Comunicaciones** — `/comunicaciones`: Family Touchpoint con contexto deportista/familia y trazabilidad WhatsApp/portal.
- **Matrícula** — `/matricula`: Matrícula Handoff; preparación de academia → contexto deportivo/dorsal → valores → revisión y firma familiar.

## P0 — siguientes superficies de alto impacto

1. **Competencias / torneos** — `/torneos`, `/torneos/:id`, `/nuevo-torneo`, `/torneos/almacen`
   - Convertir colección de cards/KPI en `Competition Record` + temporada/participación.
   - El torneo debe leerse como competencia, convocatoria, eventos y estado de participación.
   - Mantener archivo histórico y cobros.

2. **Analítica deportiva** — `/rendimiento/analitica`
   - Reducir resumen de StatCards.
   - Organizar por decisiones: evolución, carga competitiva, ranking contextual y PB/SB.
   - Reforzar Season Timeline y Performance Canvas; no usar gráficos decorativos.

3. **Salud y disponibilidad** — `/salud-deportiva`
   - Diseñar `Availability Board` por categoría/plantel.
   - Estados explícitos: disponible, limitado, no disponible, alerta médica.
   - Separar datos sensibles de acciones rápidas y respetar permisos.

4. **Asistencia Director** — `/asistencias`
   - Convertir resumen administrativo en lectura de plantel/categoría/fecha.
   - Distinguir dato confirmado de dato no verificado.
   - Conectar con Training Session sin duplicar lógica del Profesor.

## P1 — personas y operación de academia

5. **Profesores** — `/profesores`
   - Staff Board por rama/categoría/sede.
   - Carga, categorías asignadas, actividad reciente y permisos.

6. **Apoderados** — `/apoderados`, `/apoderados-pro`
   - Relación familia ↔ deportistas ↔ estado de acceso ↔ canal.
   - Evitar CRM de contactos; integrar naturalmente con Family Touchpoint.

7. **Uniformes y dorsales** — `/uniformes`, `/uniformes/dorsales`
   - Kit Room / Locker Board.
   - Dorsal por rama/categoría, disponibilidad, reservas y conflictos visibles.

8. **Inscripciones deportivas** — `/inscripciones`
   - Flujo de incorporación a rama/categoría separado de identidad personal.
   - Debe complementar Matrícula Handoff, no competir con ella.

9. **Solicitudes / admisión** — `/solicitudes`
   - Admission Queue: decisión, contexto, riesgo de duplicado, próximo paso.

## P2 — configuración y experiencia de familia

10. **Portal Apoderado** — `/apoderado`
    - Home familiar centrado en próximos eventos, asistencia, cobros, mensajes y cambios relevantes.
    - Mobile-first.

11. **Academia pública y pagos** — `/a/:slug`, `/a/:slug/pagos`, `/pagar/:token`
    - Coherencia de marca con Deportivo sin exponer estructura interna.
    - Confianza, claridad de cobros y estados verificables.

12. **Configuración** — `/configuracion`, `/configuracion/perfil`, `/configuracion/estructura`, `/configuracion/finanzas`
    - Convertir ajustes en operaciones de academia: sedes, ramas, categorías, reglas y finanzas.
    - Reducir paneles genéricos y duplicidad.

13. **Puesta en marcha** — `/puesta-en-marcha`
    - Revisar coherencia con Product DNA final y eliminar restos de onboarding SaaS genérico.

14. **Suscripción** — `/suscripcion`
    - Mantener comercial, pero separar claramente compra/plan de operación deportiva.

## P3 — convergencia técnica y QA final

15. **Consolidación CSS**
    - Reducir capas legacy y eliminar `mobile-dock-v2-1-fix.css` cuando el contrato propietario absorba su comportamiento.
    - Evitar nuevas capas `*-fix`, `*-polish`, `*-contrast-lock`, `*-safety`.

16. **QA responsive completo**
    - 360/390 px, tablet y desktop.
    - Scroll horizontal solo donde el modelo lo justifique.
    - Targets táctiles y navegación de cancha.

17. **Accesibilidad**
    - Keyboard, focus-visible, nombres accesibles, `aria-live`, estados no dependientes solo de color.

18. **Estados de datos**
    - Loading, empty, error, retry, offline, stale/unverified y success coherentes en todas las rutas.

19. **Regresión funcional**
    - Matrícula y firma.
    - Dorsales.
    - Finanzas/cobros/pagos.
    - WhatsApp y chat.
    - Asistencia offline/online.
    - Partido en vivo y conflictos concurrentes.
    - Evaluaciones y métricas.

20. **Pruebas de producto reales**
    - Director: jornada, plantel, partido, cobranza y matrícula.
    - Profesor: llegada a cancha, asistencia, entrenamiento y partido.
    - Familia: comunicación, evento, pago y firma.

## Orden de ejecución vigente

`Torneos / Competition Record` → `Analítica / Evolution` → `Salud / Availability Board` → `Asistencia Director` → `Profesores` → `Apoderados` → `Uniformes/Dorsales` → `Inscripciones/Solicitudes` → `Portal Apoderado` → `Configuración` → `QA y convergencia final`.
