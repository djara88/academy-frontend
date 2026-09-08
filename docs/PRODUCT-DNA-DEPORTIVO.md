# Product DNA — Lestra Deportivo

Estado: **obligatorio para UI/UX nueva y migrada**
Fecha: 2026-09-08

## Norte de producto

Lestra Deportivo debe sentirse como una herramienta deportiva profesional, no como un SaaS genérico con temática deportiva.

La interfaz debe reconocerse por su modelo mental aunque se eliminen logo y color.

## Modelo mental

Academia → Rama → Categoría → Plantel → Deportista → Entrenamiento/Evento → Temporada → Evolución.

La navegación y las pantallas deben priorizar esta estructura sobre la arquitectura técnica del software.

## Situaciones prioritarias

Todo rediseño debe partir de una situación real, por ejemplo:

- director revisa qué necesita atención hoy;
- profesor llega a cancha y pasa asistencia;
- director prepara un partido o convocatoria;
- profesor registra rendimiento;
- director revisa evolución de un deportista;
- academia prepara una matrícula y reserva dorsal;
- apoderado recibe información relevante;
- director valida pagos y morosidad.

## Firmas de producto

### Roster Strip

Banda compacta de plantel que permita reconocer deportistas, estado, asistencia y contexto sin convertir cada alumno en una card independiente.

### Training Session

Espacio de trabajo de la sesión: objetivo, plantel, asistencia, contenidos, observaciones y cierre.

### Match Command

Espacio operacional para rival, horario, convocatoria, plantel, táctica, resultado y rendimiento. Debe sentirse como preparación deportiva, no como formulario administrativo.

### Performance Canvas

Evolución del deportista mediante historia, evaluación y comparación útil. Los gráficos deben responder decisiones; no existir como decoración.

### Season Timeline

Cronología de entrenamientos, evaluaciones, partidos, hitos y reconocimientos.

## Director

Debe responder rápido:

1. ¿Qué pasa hoy?
2. ¿Qué requiere atención?
3. ¿Qué puedo hacer ahora?
4. ¿Qué cambió desde la última revisión?

No usar 4 KPI por defecto. Si una cifra no conduce a una decisión, no debe dominar la pantalla.

## Profesor

Diseño mobile-first y de terreno:

- lectura a distancia;
- alto contraste;
- targets grandes;
- pocas decisiones simultáneas;
- acciones rápidas;
- estados explícitos además del color;
- tolerancia a uso bajo luz exterior.

## Ficha del deportista

No debe parecer CRM. Debe leerse como historia deportiva:

Identidad → disciplinas/categorías → asistencia → evaluaciones → rendimiento → eventos → logros → evolución.

## Lenguaje

Preferir vocabulario deportivo real:

- Plantel
- Convocar
- Asistencia
- Entrenamiento
- Partido
- Rival
- Temporada
- Evaluar
- Rendimiento
- Dorsal
- Categoría

Evitar copy SaaS genérico como “Gestionar elemento”, “Ver detalle” o “Optimiza tu operación” cuando existe una acción concreta.

## Reglas visuales

- una zona dominante por tarea;
- asimetría controlada cuando refleje prioridad;
- sin hero promocional dentro del producto;
- sin cards decorativas;
- gráficos solo si representan una decisión;
- iconos solo si mejoran reconocimiento;
- acciones destructivas semánticamente separadas;
- superficies y texto gobernados por tokens semánticos;
- no mezclar componentes diseñados para dark mode con contratos light.

## Componentes preferidos

- `RosterStrip`
- `PlayerRow`
- `TrainingSession`
- `AttendanceLineup`
- `SquadSelection`
- `MatchCommand`
- `TacticalBoard`
- `PerformanceCanvas`
- `EvaluationHistory`
- `SeasonTimeline`
- `CompetitionRecord`

Primitivas como Panel, Dialog o Button pueden existir, pero no deben definir la identidad del producto.

## Anti-patrones

No introducir como solución por defecto:

- `DashboardCard` / `StatCard` / `FeatureCard`;
- cuatro métricas superiores sin necesidad;
- nuevas capas `*-fix.css`, `*-polish.css`, `*-contrast-lock.css`;
- hexadecimales repetidos dentro de componentes nuevos;
- gradientes promocionales dentro de flujos operacionales;
- contenido inventado para llenar espacios;
- lógica de negocio alterada para acomodar una composición visual.

## Preservación obligatoria

Rediseños deben preservar salvo requerimiento funcional explícito:

- APIs;
- datos existentes;
- multiacademia;
- multirrama;
- roles y permisos;
- planes y gating;
- matrícula;
- finanzas;
- WhatsApp;
- evaluaciones;
- asistencia;
- historial;
- seguridad.

## Definition of Done visual

Una ruta no se marca PASS hasta validar:

- flujo real;
- desktop;
- mobile;
- keyboard;
- focus-visible;
- contraste;
- loading;
- empty;
- error;
- disabled;
- destructive;
- success;
- copy;
- identidad deportiva sin depender del logo.

## Prueba final

> Si elimino logo y colores, ¿esta pantalla sigue pareciendo inequívocamente una plataforma para una academia deportiva?

Si no, no está terminada.