# Lestra Deportivo — Redesign Blueprint

Estado: **fuente operativa del rediseño visual 2026**

Este documento traduce `docs/PRODUCT-DNA-DEPORTIVO.md` a decisiones concretas de arquitectura visual. No reemplaza reglas de negocio ni contratos existentes.

## 1. Tesis de producto

Lestra Deportivo no es un dashboard SaaS con temática deportiva.

Es el sistema operativo de una academia deportiva.

Toda superficie debe responder a una situación real de academia y priorizar una tarea dominante. El diseño se evalúa por capacidad operativa y reconocimiento de dominio, no por cantidad de métricas, tarjetas o decoración.

## 2. Modelo mental visible

La experiencia debe hacer visible esta jerarquía:

Academia → Rama → Categoría → Plantel → Deportista → Entrenamiento / Evento → Temporada → Evolución

La navegación técnica nunca debe dominar esta estructura.

## 3. Arquitectura de experiencias

### Director — `Today Command`

Objetivo: responder en segundos qué ocurre hoy, qué necesita atención y qué acción debe ejecutar.

No usar un tablero de KPIs como portada.

Zona dominante:
- agenda deportiva del día;
- eventos, entrenamientos y partidos próximos;
- situaciones que requieren decisión;
- acciones operativas contextualizadas.

Contexto secundario:
- salud de planteles;
- pagos/cobranza que requieren intervención;
- comunicaciones pendientes;
- cambios recientes.

### Plantel — `Roster Strip`

Objetivo: trabajar con una categoría como unidad deportiva, no como tabla administrativa.

Debe permitir reconocer:
- deportistas;
- disponibilidad/asistencia;
- estado relevante;
- contexto de categoría;
- acción inmediata.

No convertir cada deportista en una card independiente por defecto.

### Profesor — `Training Session`

Objetivo: operar en cancha.

Mobile-first, alto contraste, targets táctiles grandes, pocas decisiones simultáneas y tolerancia a conectividad irregular.

Flujo principal:
Entrenamiento → Plantel → Asistencia → Trabajo → Observaciones → Cierre

### Partido — `Match Command`

Objetivo: preparar y ejecutar un partido desde una única situación operacional.

Debe integrar:
- rival;
- fecha/hora;
- convocatoria;
- plantel;
- táctica;
- estado del encuentro;
- marcador;
- rendimiento;
- cierre.

No fragmentar la preparación en formularios administrativos desconectados.

### Deportista — `Performance Canvas`

Objetivo: leer una historia deportiva, no un CRM.

Orden de lectura:
Identidad → Disciplina/categorías → Temporada → Asistencia → Evaluaciones → Rendimiento → Eventos → Logros → Evolución

La evaluación debe explicar qué se evalúa, cómo cambió y qué significa para el trabajo deportivo.

### Temporada — `Season Timeline`

Objetivo: comprender evolución en el tiempo.

Integrar cronológicamente:
- entrenamientos;
- evaluaciones;
- partidos;
- asistencia;
- hitos;
- reconocimientos.

### Finanzas — `Academy Finance Desk`

Objetivo: tomar decisiones de cobranza y caja dentro del contexto deportivo.

No comenzar con una cuadrícula de KPIs.

Zona dominante:
- situaciones financieras que requieren acción hoy;
- familias/cuentas que necesitan seguimiento;
- pagos por validar;
- vencimientos;
- movimientos recientes.

Contexto deportivo:
- rama;
- categoría cuando corresponda;
- alumno/deportista;
- familia;
- inscripción.

Las cifras consolidadas son contexto, no la identidad visual del módulo.

### Familias / WhatsApp — `Family Touchpoint`

Objetivo: comunicar una situación concreta, no operar un CRM de mensajería.

La comunicación debe aparecer contextualizada con:
- deportista;
- categoría;
- evento;
- pago;
- asistencia;
- convocatoria;
- novedad relevante.

## 4. Firmas de producto obligatorias

- `RosterStrip`
- `PlayerRow`
- `TrainingSession`
- `AttendanceLineup`
- `SquadSelection`
- `MatchCommand`
- `TacticalBoard`
- `PerformanceCanvas`
- `PerformanceRadar`
- `PerformanceHistory`
- `SeasonTimeline`
- `CompetitionRecord`
- `AcademyFinanceDesk`
- `FamilyTouchpoint`

Primitivas como `Panel`, `Dialog`, `Button`, `Field` y `Tabs` pueden existir, pero no pueden definir la identidad visual de Lestra Deportivo.

## 5. Sistema visual

### Jerarquía

Cada pantalla debe tener una zona dominante correspondiente a la tarea principal.

Evitar simetría automática. Usar asimetría controlada para reflejar prioridad real.

### Tipografía

La tipografía debe priorizar lectura rápida y jerarquía operacional. No usar títulos gigantes promocionales dentro de áreas autenticadas.

### Espacio

El espacio debe separar contexto, decisión y acción. No usar espacio vacío como sustituto de jerarquía.

### Color

Los componentes migrados deben consumir tokens semánticos:

- `surface`
- `surface-raised`
- `surface-muted`
- `text-primary`
- `text-secondary`
- `text-muted`
- `border`
- `brand`
- `success`
- `warning`
- `danger`

No repetir hexadecimales en nuevos componentes de dominio.

### Estados

El color nunca es el único indicador. Todo estado relevante debe tener texto, iconografía o estructura además del color.

WCAG AA es obligatorio.

## 6. Anti-AI Review

Rechazar una pantalla si ocurre cualquiera de estos patrones sin una justificación funcional clara:

- 4 KPIs superiores por defecto;
- hero promocional interno;
- grid simétrico de cards como estructura principal;
- cards decorativas;
- gradientes sin función;
- glassmorphism;
- iconografía redundante;
- copy SaaS genérico;
- todos los módulos con la misma composición;
- gráficos sin decisión asociada;
- datos inventados;
- navegación organizada alrededor de entidades técnicas;
- una pantalla que podría pertenecer a CRM, ERP o RRHH cambiando textos y logo.

## 7. Proceso de rediseño por módulo

Antes de modificar código:

1. Usuario.
2. Situación real.
3. Tarea principal.
4. Decisión principal.
5. Información crítica.
6. Información secundaria.
7. Acción primaria.
8. Componente(s) de dominio.
9. Estados normal/loading/empty/error/disabled/warning/success/destructive.
10. Desktop.
11. Mobile.
12. Teclado/focus.
13. Contraste.
14. Flujo real.
15. Anti-AI Review.

Solo después implementar.

## 8. Orden de migración

El rediseño se realizará por experiencias completas, no por CSS global.

### Fase A — estructura deportiva
1. Director / inicio
2. Categoría / plantel
3. Profesor / entrenamiento / asistencia

### Fase B — rendimiento
4. Ficha del deportista
5. Evaluaciones
6. Evolución / temporada

### Fase C — competencia
7. Preparación de partido
8. Convocatoria
9. Match Command / En Vivo
10. Rendimiento de partido

### Fase D — operación de academia
11. Matrícula
12. Finanzas y cobranza
13. Familias / WhatsApp
14. Profesores / configuración operacional

La prioridad funcional P0/P1 puede adelantar correcciones, pero no debe convertirlas en el patrón visual definitivo.

## 9. Preservación obligatoria

No cambiar por razones visuales:

- APIs;
- estructura y propiedad de datos;
- multiacademia;
- multirrama;
- roles/permisos;
- planes/gating;
- matrícula;
- finanzas;
- WhatsApp;
- evaluaciones;
- asistencia;
- historial;
- controles de seguridad;
- contratos de idempotencia y concurrencia.

## 10. Definition of Done

Una superficie no es PASS porque compile o despliegue.

Debe validar:
- flujo real;
- desktop;
- mobile;
- keyboard;
- focus visible;
- WCAG AA;
- loading;
- empty;
- error;
- disabled;
- warning;
- success;
- destructive;
- copy;
- identidad deportiva sin logo ni color.

## 11. Prueba final

> Si elimino el logo y los colores, ¿esta pantalla sigue pareciendo inequívocamente una herramienta para operar una academia deportiva?

Si la respuesta es no, rediseñar.

La meta no es que Lestra Deportivo parezca moderno. La meta es que su manera de organizar el trabajo deportivo sea propia, reconocible y difícil de confundir con cualquier otro SaaS.