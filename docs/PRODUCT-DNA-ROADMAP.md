# Lestra Deportivo — Product DNA Roadmap

Estado de referencia: **2026-09-09**

Este documento ordena la convergencia visual/operacional de Deportivo. No reemplaza `PRODUCT-DNA-DEPORTIVO.md`; traduce ese contrato a rutas concretas del producto y mantiene el estado verificable de los 19 frentes pendientes.

## Regla de cierre

Una ruta solo pasa a **✅ OK** cuando conserva la lógica existente, tiene contrato Product DNA protegido por auditoría cuando corresponde y compila/despliega correctamente. El cierre global además exige desktop, mobile, keyboard/focus, loading, empty, error, disabled, destructive, success y copy.

Estados:

- **✅ OK** — implementación terminada y verificada en build/deploy.
- **🟡 EN CURSO / VALIDACIÓN** — trabajo iniciado, todavía no cumple la regla de cierre.
- **⬜ PENDIENTE** — aún no iniciado dentro de esta fase.

## PASS previos / protegidos por Product DNA

- **Navegación Director** — `DirectorCommandBar`: abandona sidebar SaaS genérico y organiza la cinta táctica en Inicio, Equipo, Competencias, Gestión y Academia. Mobile validado favorablemente por usuario; desktop queda dentro del QA responsive formal del punto 15.
- **Inicio Director** — `/dashboard`: Match Command, Season Timeline y pulso operativo.
- **Plantel** — `/alumnos`: Roster Strip, filtros por disciplina/categoría y ficha deportiva con Performance Canvas.
- **Profesor / asistencia de cancha** — `/profesor`: Training Session + Attendance Lineup con roster verificado, borrador local aislado y operación de cancha.
- **Pizarra Profesor** — `/profesor` → `Pizarra`: Tactical Board con plantel real por categoría, mover/dibujar/flechas/borrar, deshacer/rehacer, formación inicial por disciplina, persistencia, borrado y exportación PNG. El contrato queda protegido por `professor-tactical-board-audit.mjs`.
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

### ✅ 3. Asistencia Director — OK
Ruta: `/asistencias`

- `Attendance Command` convierte la asistencia en una lectura de sesión → rama → categoría → roster.
- El roster diferencia carga, dato verificado y ausencia de información antes de permitir acciones operativas.
- Preserva creación de sesión, asistencia individual, suspensión, recuperación, reportes mensuales y exportación Excel.
- Mantiene la separación con `Training Session` del Profesor: Director administra y revisa; Profesor opera en cancha.
- Contrato propietario en `attendance-command-v2.css`.
- `attendance-command-audit.mjs` ejecutado en `prebuild`.
- Build de producción verificado.

### ✅ 4. Profesores — OK
Ruta: `/profesores`

- `Staff Board` ordena el equipo técnico por rama, categoría y sede.
- Cobertura de categorías, asignaciones, cupos, acceso activo/desactivado y actividad reciente visibles como operación deportiva.
- Creación, edición, exclusividad de categoría, restablecimiento de credenciales y seguimiento de casos preservados.
- Contrato propietario en `staff-board-v2.css`.
- `staff-board-audit.mjs` ejecutado en `prebuild`.
- Build de producción verificado.

### ✅ 5. Apoderados — OK
Rutas: `/apoderados`, `/apoderados-pro`

- `Family Access Board` usa como unidad principal la relación familia ↔ deportistas, evitando un CRM genérico de contactos.
- Estado de acceso, canal, deportistas vinculados, edición, activación/desactivación y credenciales quedan preservados.
- Conexión directa con `Family Touchpoint` para comunicaciones.
- `Guardian License Board` mantiene la licencia por academia, catálogo, Mercado Pago y activación verificable por webhook.
- Contrato propietario en `family-access-v2.css`.
- `family-access-audit.mjs` ejecutado en `prebuild`.
- Build de producción verificado.

### 🟡 6. Uniformes y dorsales — EN VALIDACIÓN
Rutas: `/uniformes`, `/uniformes/dorsales`

- `Kit Room / Locker Board` implementado como espacio operativo de equipamiento.
- Pedidos del plantel, catálogo, stock/taller, pago, entrega, WhatsApp y exportación Excel preservados.
- Dorsales mantienen disponibilidad, reservas, ocupación y asignación validada por servidor dentro de rama/categoría.
- Mutaciones de equipamiento bloqueadas cuando el estado no está verificado.
- Contrato propietario `kit-room-v2.css` y auditoría `kit-room-audit.mjs` agregados.
- Pendiente: build integrado + deployment READY del HEAD actual antes de pasar a ✅.

### 🟡 7. Inscripciones deportivas — EN VALIDACIÓN
Ruta: `/inscripciones`

- `Sport Enrollment Board` separa identidad personal de pertenencia deportiva.
- Flujo: ficha existente → nueva sede/rama/categoría → impacto financiero.
- Conserva estructura multirrama, categorías, matrícula/abono/mensualidad y creación de cobros.
- Impide duplicar una inscripción activa en la misma rama y bloquea creación sobre datos no verificados.
- Contrato propietario `sport-enrollment-v2.css` y auditoría `sport-enrollment-audit.mjs` agregados.
- Se retiró la implementación legacy que quedó huérfana tras la migración.
- Pendiente: build integrado + deployment READY del HEAD actual antes de pasar a ✅.

### 🟡 8. Solicitudes / admisión — EN VALIDACIÓN
Ruta: `/solicitudes`

- `Admission Queue` implementada como cola de decisiones, no CRM de leads.
- Lectura por deportista/familia → interés deportivo → estado → próximo paso.
- Conserva contacto WhatsApp, revisión, archivo/restauración y conversión a pre-matrícula.
- Conversión reutiliza datos recibidos y conserva correo, RUT, sede, rama, valores, enlace y estado de envío.
- Decisiones bloqueadas cuando la bandeja no está verificada.
- Contrato propietario `admission-queue-v2.css` y auditoría `admission-queue-audit.mjs` agregados.
- Pendiente: build integrado + deployment READY del HEAD actual antes de pasar a ✅.

### 🟡 9. Portal Apoderado — EN VALIDACIÓN
Ruta: `/apoderado`

- `Family Home` mobile-first implementado alrededor de “qué viene ahora” para la familia.
- Prioriza próximo evento, deportistas vinculados, asistencia reciente, saldo, mensajes, confirmaciones y solicitudes deportivas.
- Mantiene estado financiero familiar y componentes existentes de pagos, respuestas y solicitudes.
- Mantiene solicitudes de privacidad y acceso a mensajería.
- Contrato propietario `guardian-home-v2.css` y auditoría `guardian-home-audit.mjs` agregados.
- Pendiente: build integrado, deployment y prueba responsive real antes de pasar a ✅.

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

- 360/390 px, tablet y desktop (incluye verificación explícita de la nueva cinta de navegación en 1280/1440/1680 px).
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
- Profesor: llegada a cancha, asistencia, entrenamiento, partido y pizarra táctica con sesión autenticada real.
- Familia: comunicación, evento, pago y firma.

## Orden de ejecución vigente

`Cerrar validación 6–9` → `Academia pública/pagos` → `Configuración` → `Puesta en marcha/Suscripción` → `Consolidación CSS` → `QA responsive` → `Accesibilidad/estados` → `Regresión` → `Pruebas reales`.
