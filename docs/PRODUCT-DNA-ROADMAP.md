# Lestra Deportivo — Product DNA Roadmap

Estado de referencia: **2026-09-08**

Este documento ordena la convergencia visual/operacional de Deportivo. No reemplaza `PRODUCT-DNA-DEPORTIVO.md`; traduce ese contrato a rutas concretas del producto y mantiene el estado verificable de los 19 frentes pendientes.

## Regla de cierre

Una ruta solo pasa a **✅ OK** cuando conserva la lógica existente, tiene contrato Product DNA protegido por auditoría cuando corresponde y compila/despliega correctamente. El cierre global además exige desktop, mobile, keyboard/focus, loading, empty, error, disabled, destructive, success y copy.

Estados:

- **✅ OK** — implementación terminada y verificada en build/deploy.
- **🟡 EN CURSO** — trabajo iniciado, todavía no cumple la regla de cierre.
- **⬜ PENDIENTE** — aún no iniciado dentro de esta fase.

## PASS previos / protegidos por Product DNA

- **Navegación Director** — `DirectorCommandBar`: abandona sidebar SaaS genérico y organiza por Jornada, Plantel, Competir, Operación y Academia.
- **Inicio Director** — `/dashboard`: Match Command, Season Timeline y pulso operativo.
- **Plantel** — `/alumnos`: Roster Strip, filtros por disciplina/categoría y ficha deportiva con Performance Canvas.
- **Profesor / asistencia de cancha** — `/profesor`: Training Session + Attendance Lineup con roster verificado, borrador local aislado y operación de cancha.
- **Partidos y eventos** — `/partidos`: Match Command / fixture board.
- **Finanzas** — `/finanzas`: Academy Finance Desk, estados financieros verificables e idempotencia de movimientos.
- **Comunicaciones** — `/comunicaciones`: Family Touchpoint con contexto deportista/familia y trazabilidad WhatsApp/portal.
- **Matrícula** — `/matricula`: Matrícula Handoff; preparación de academia → contexto deportivo/dorsal → valores → revisión y firma familiar.
- **Registro de competencias** — `/torneos`: Competition Record en formato ledger de temporada.
- **Analítica deportiva** — `/rendimiento/analitica`: Evolution Board con contexto de temporada, ranking, Season Timeline y PB/SB sin StatCards genéricas.

## Estado de los 19 puntos

### ✅ 1. Ciclo completo de competencia — OK
Rutas: `/torneos/:id`, `/nuevo-torneo`, `/torneos/almacen`

- `Competition Control Room` en el detalle: convocatoria, participantes, confirmaciones, pagos, próximo evento y Season Timeline.
- `Competition Intake` para crear una competencia dentro del modelo Rama → Competencia → Inscripción → Convocatoria.
- `Competition Archive` como ledger histórico, con restauración sin pérdida de trazabilidad.
- APIs de convocatoria, participantes, eventos, creación, archivo/restauración y cobros preservadas.
- Contrato propietario en `competition-record-v2.css`.
- `competition-cycle-audit.mjs` ejecutado en `prebuild`.
- Build de producción verificado.

### ✅ 2. Salud y disponibilidad — OK
Ruta: `/salud-deportiva`

- `Availability Board` orientado a la decisión operacional: quién puede entrenar o competir.
- Filtro por rama/categoría usando inscripciones deportivas reales.
- Estados explícitos: Sin evaluar, Disponible, Disponible con restricción, En recuperación y No disponible.
- Seguimientos, retorno estimado y certificados preservados.
- Antecedentes sensibles separados de la lectura rápida del plantel.
- Contexto 360 preservado: asistencia, evaluación, competencia, días fuera y PB/SB.
- Contrato propietario en `availability-board-v2.css`.
- `availability-board-audit.mjs` ejecutado en `prebuild`.
- Build de producción verificado.

### 🟡 3. Asistencia Director — EN CURSO
Ruta: `/asistencias`

Objetivo de cierre:
- convertir el resumen administrativo en lectura de plantel/categoría/fecha;
- distinguir roster/dato verificado de estado todavía no cargado;
- conectar conceptualmente con Training Session sin duplicar lógica del Profesor;
- preservar creación de sesión, lista, cancelación, recuperaciones, reportes y Excel.

### ⬜ 4. Profesores — PENDIENTE
Ruta: `/profesores`

- `Staff Board` por rama/categoría/sede.
- Carga, categorías asignadas, actividad reciente y permisos.

### ⬜ 5. Apoderados — PENDIENTE
Rutas: `/apoderados`, `/apoderados-pro`

- Relación familia ↔ deportistas ↔ estado de acceso ↔ canal.
- Evitar CRM de contactos; integrar naturalmente con Family Touchpoint.

### ⬜ 6. Uniformes y dorsales — PENDIENTE
Rutas: `/uniformes`, `/uniformes/dorsales`

- `Kit Room / Locker Board`.
- Dorsal por rama/categoría, disponibilidad, reservas y conflictos visibles.

### ⬜ 7. Inscripciones deportivas — PENDIENTE
Ruta: `/inscripciones`

- Incorporación a rama/categoría separada de identidad personal.
- Complementar Matrícula Handoff sin competir con él.

### ⬜ 8. Solicitudes / admisión — PENDIENTE
Ruta: `/solicitudes`

- `Admission Queue`: decisión, contexto, riesgo de duplicado y próximo paso.

### ⬜ 9. Portal Apoderado — PENDIENTE
Ruta: `/apoderado`

- Home familiar centrado en próximos eventos, asistencia, cobros, mensajes y cambios relevantes.
- Mobile-first.

### ⬜ 10. Academia pública y pagos — PENDIENTE
Rutas: `/a/:slug`, `/a/:slug/pagos`, `/pagar/:token`

- Coherencia de marca sin exponer estructura interna.
- Confianza, claridad de cobros y estados verificables.

### ⬜ 11. Configuración — PENDIENTE
Rutas: `/configuracion`, `/configuracion/perfil`, `/configuracion/estructura`, `/configuracion/finanzas`

- Convertir ajustes en operaciones reales de academia: sedes, ramas, categorías, reglas y finanzas.
- Reducir paneles genéricos y duplicidad.

### ⬜ 12. Puesta en marcha — PENDIENTE
Ruta: `/puesta-en-marcha`

- Revisar coherencia con Product DNA final y eliminar restos de onboarding SaaS genérico.

### ⬜ 13. Suscripción — PENDIENTE
Ruta: `/suscripcion`

- Mantener superficie comercial separada de la operación deportiva.

### ⬜ 14. Consolidación CSS — PENDIENTE

- Reducir capas legacy.
- Absorber correctamente el comportamiento de `mobile-dock-v2-1-fix.css` y eliminarlo solo cuando deje de ser necesario.
- No crear nuevas capas `*-fix`, `*-polish`, `*-contrast-lock` o `*-safety`.

### ⬜ 15. QA responsive completo — PENDIENTE

- 360/390 px, tablet y desktop.
- Scroll horizontal solo cuando el modelo de información lo justifique.
- Targets táctiles adecuados para operación de cancha.

### ⬜ 16. Accesibilidad — PENDIENTE

- Keyboard, focus-visible, nombres accesibles, `aria-live` y estados no dependientes solo del color.

### ⬜ 17. Estados de datos — PENDIENTE

- Loading, empty, error, retry, offline, stale/unverified y success coherentes.

### ⬜ 18. Regresión funcional — PENDIENTE

- Matrícula y firma.
- Dorsales.
- Finanzas/cobros/pagos.
- WhatsApp y chat.
- Asistencia offline/online.
- Partido en vivo y conflictos concurrentes.
- Evaluaciones y métricas.

### ⬜ 19. Pruebas de producto reales — PENDIENTE

- Director: jornada, plantel, partido, cobranza y matrícula.
- Profesor: llegada a cancha, asistencia, entrenamiento y partido.
- Familia: comunicación, evento, pago y firma.

## Orden de ejecución vigente

`Asistencia Director` → `Profesores` → `Apoderados` → `Uniformes/Dorsales` → `Inscripciones/Solicitudes` → `Portal Apoderado` → `Academia pública/pagos` → `Configuración` → `Puesta en marcha/Suscripción` → `Consolidación CSS` → `QA responsive` → `Accesibilidad/estados` → `Regresión` → `Pruebas reales`.
