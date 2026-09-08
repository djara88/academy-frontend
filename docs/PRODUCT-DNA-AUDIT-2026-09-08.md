# Lestra Deportivo — Product DNA Production Audit

Fecha de inicio: 2026-09-08
Estado global: **NO CERTIFICADO visualmente**

Este documento reemplaza cualquier supuesto de que `build`, CI o deployment READY equivalen a validación visual completa.

## Escala

- **P0**: puede impedir operar, leer, verificar o completar una acción. Corregir antes de continuar expansión visual.
- **P1**: inconsistencia grave de UX/contraste/responsive/arquitectura visual. Corregir dentro de la convergencia actual.
- **P2**: refinamiento que no bloquea operación.
- **REVIEW**: todavía no existe evidencia suficiente para certificar la ruta.
- **PASS**: flujo real validado en desktop/mobile y estados relevantes.

## Hallazgo sistémico P0 — normalización legacy dark → light

`src/visual-system-v2.css` contiene un contrato transitorio que transforma globalmente múltiples clases de fondos dark históricas (`bg-[#0d1117]`, `bg-[#151b25]`, etc.) en superficies claras dentro del workspace Director.

Riesgo: los descendientes que conservan utilidades de texto diseñadas para dark mode (`text-white`, grises claros, acentos claros) pueden mantener esos colores sobre la nueva superficie clara. El incidente de `Alumnos → Nueva evaluación` fue una manifestación directa de este patrón.

Decisión:

1. No ampliar esta técnica de normalización global.
2. Migrar cada superficie a markup/tokens explícitos del sistema actual.
3. Corregir en el componente propietario, no mediante otra capa `contrast-lock`.
4. Mientras exista este contrato, cualquier componente con superficies dark históricas dentro de `.app-content` debe considerarse **riesgo de contraste** hasta revisión.

## Hallazgo sistémico P1 — demasiadas capas visuales activas

`src/main.tsx` carga actualmente 16 hojas de estilo de producto/compatibilidad además del CSS base, entre ellas:

- `visual-system-v2.css`
- `operational-workflows-v2.css`
- `student-profile-v2.css`
- `product-design-v2-1.css`
- `mobile-dock-v2-1-fix.css`
- normalizadores de marca/acento
- contratos específicos de setup, suscripción, portales y diálogos.

Esto es una mejora frente a generaciones anteriores, pero todavía permite conflictos de especificidad y hace difícil demostrar propiedad visual.

Objetivo de convergencia: cada superficie debe pertenecer a un componente/contrato claro y las capas correctivas deben desaparecer gradualmente.

## Hallazgo sistémico P1 — deuda semántica de colores

Parte del producto todavía expresa intención mediante hexadecimales y utilidades históricas dentro de componentes. Migrar a tokens semánticos y no introducir nuevas superficies con colores hard-coded como estrategia normal.

## Hallazgo ya corregido P0 — Nueva evaluación

Ruta: `/alumnos`
Flujo: ficha → radar → registrar nueva evaluación.

Problema observado en producción: fondo convertido a claro mientras el nombre de cada criterio permanecía blanco.

Estado: **CORREGIDO**, pero la ruta completa sigue en REVIEW hasta validar todos los estados y vistas.

## Hallazgo corregido P1/P0 potencial — lista de alumnos

La lista principal de `/alumnos` utiliza todavía el contrato histórico `panel` con `bg-[#151b25]` y campos `bg-[#0d1117]`. Como `visual-system-v2.css` transforma esas superficies a claro dentro del workspace Director, las tarjetas conservaban descendientes como `text-white`, grises de dark mode y chips claros de violeta/ámbar con riesgo real de legibilidad.

La corrección se realizó dentro del contrato propietario existente `student-profile-v2.css`, sin crear otra hoja `fix`:

- tarjetas de alumno con superficie clara y texto oscuro explícito;
- metadatos secundarios normalizados;
- chips de disciplina y estado con fondo/texto compatibles en light mode;
- resumen de filtros y estado vacío legibles;
- hover conservado sin depender del antiguo dark mode.

Commit: `8e4097fa6ec094e0bb9b676e4557ca38bf8eb08b`.
Deployment de producción: **READY** y asociado a `deportivo.lestra.app`.

Estado: **CORREGIDO/REVIEW**. Falta recorrido visual real desktop/mobile, búsqueda, filtros, cero resultados y selección de alumno antes de PASS.

## Hallazgo ya corregido P0/P1 — editor de criterios y reconocimientos

Los editores manuales relacionados con evaluación/reconocimientos utilizaban el mismo lenguaje dark histórico. Fueron migrados para eliminar el riesgo inmediato de legibilidad.

Estado: **corrección aplicada; QA funcional/visual completo pendiente**.

## Auditoría activa P0 — Pre-matrícula pública

Ruta: `/prematricula/:token`.

### Contraste corregido

Se detectaron labels y textos auxiliares pequeños con `text-slate-500` sobre superficies oscuras. En el fondo principal `#07111f`, el contraste aproximado era **3.98:1**, insuficiente para texto normal bajo WCAG AA.

Se migraron esos textos a `text-slate-400`, cuyo contraste aproximado sobre el mismo fondo es **7.39:1**. La corrección incluye etiquetas del apoderado/alumno, resumen financiero, campos de firma, ayuda de firma y evidencia final.

Commit: `3b874c8396b2fe35b4b43f5356c8c23d6faba5d3`.

### Bloqueador de accesibilidad P0 — corregido en implementación

La firma dependía exclusivamente de dibujar en un `<canvas>` mediante eventos de puntero. Un usuario que operara solo con teclado no podía completar la matrícula.

Se incorporó una segunda vía nativa y navegable por teclado:

- selección mediante radios entre **Dibujar mi firma** y **Firmar con teclado**;
- declaración explícita mediante la frase `ACEPTO Y FIRMO`;
- generación local de una evidencia PNG que contiene nombre, documento y la declaración;
- el backend conserva el mismo contrato de firma existente, por lo que se mantienen token, nombre, documento, fecha, IP, user-agent, huellas SHA-256 y documento final;
- el canvas deja de ser un requisito exclusivo para formalizar la matrícula.

Commit de implementación: `f39e9fbc496332b48f05a9a4dd17ed4dfa0809c0`.

Estado: **P0 corregido en código / REVIEW hasta QA real de teclado y lector de pantalla**. No se marcará PASS solo por build exitoso.

### Pruebas aún pendientes

- enlace válido;
- token expirado/inválido;
- foto autorizada/no autorizada;
- error de carga de foto;
- decisiones obligatorias/opcionales;
- firma dibujada;
- firma con teclado;
- envío;
- éxito/documento final;
- mobile real;
- recorrido completo solo teclado;
- lector de pantalla en controles de firma;
- estados de backend lento/indisponible.

## Auditoría P0 — Finanzas: degradación silenciosa corregida

Ruta: `/finanzas`.

`FinanzasCompat` usaba la disponibilidad de `/api/finanzas/cobranza/configuracion` para decidir entre el módulo avanzado y el legado. Antes de la corrección, cualquier error distinto de 401/403 —incluidos `500`, timeout o caída de red— podía enviar automáticamente al director a la vista financiera legacy.

En un dominio monetario esto es peligroso: una indisponibilidad temporal no debe convertirse en una interfaz aparentemente válida pero potencialmente incompleta.

Corrección:

- el modo legacy queda reservado para `404/405`, que representan backend sin ese módulo;
- `401/403` conserva el flujo avanzado y deja que el control de acceso real responda;
- errores de red y `5xx` muestran **Estado no verificado**;
- no se muestran cifras alternativas mientras no pueda verificarse el servicio principal;
- se incorporó reintento explícito y el mensaje aclara que no se modificó ningún dato.

Commit: `a4e3ad8c3cb9cc6004e4c2147df7192bc90a4650`.
Deployment de producción: **READY**.

Estado: **P0 de integridad de presentación corregido / REVIEW**. Falta QA de todos los tabs, operaciones monetarias, doble envío, idempotencia de cobros/egresos y estados de backend degradado.

## Auditoría P0/P1 — WhatsApp: estado intermedio corregido

Ruta: `/whatsapp`.

El backend ya expone el estado real de Evolution (`estado`) y distingue `open`, `connecting`, `not_created`, etc. El frontend, sin embargo, solo reconocía conectado o QR; una instancia en `connecting` sin QR podía ser mostrada como **Desconectado**. Además el polling automático solo continuaba mientras existiera QR.

Consecuencia potencial: durante el arranque técnico de la instancia, el director podía recibir un estado falso, volver a pulsar conectar o no llegar a ver el QR cuando apareciera.

Corrección:

- nuevo estado explícito `connecting`;
- `applyPayload` respeta `estado=connecting`;
- el polling continúa tanto en `connecting` como en `qr`;
- un error puntual de polling no convierte inmediatamente una vinculación en un falso error/desconexión;
- la interfaz comunica **Preparando código QR** y mantiene actualización manual disponible;
- conectado, QR, conectando, desconectado y error tienen texto explícito, no solo color.

Commit: `b642506f36b8daf10f4e4db6cee6629f5c829097`.
Deployment de producción: **READY** y asociado a `deportivo.lestra.app`.

Estado: **CORREGIDO/REVIEW**. Falta prueba real contra Evolution de ciclo desconectado → connecting → QR → open, cambio de número, desconexión y caída temporal del bridge.

## Auditoría P0/P1 — Profesor: asistencia offline aislada por contexto

Ruta: `/profesor`.
Flujo: Asistencia → cambio de categoría/fecha → pérdida de red / error del backend → borrador local → reconexión.

Se detectó un riesgo operativo real: al cambiar de categoría o fecha, `ProfesorPortal` podía conservar en memoria el roster anterior mientras intentaba cargar el nuevo. Si esa petición fallaba, el selector podía indicar una categoría mientras la pantalla todavía contenía alumnos de otra. El backend ya rechazaba jugadores ajenos a la categoría asignada, por lo que existía defensa de integridad del lado servidor, pero la UX podía inducir a error y contaminar el borrador local.

Corrección aplicada:

- cada carga de asistencia queda identificada por **categoría + fecha**;
- al cambiar cualquiera de esos datos se invalida la petición anterior y se retira inmediatamente el roster previo;
- respuestas HTTP antiguas no pueden sobrescribir un contexto más nuevo;
- una falla de red nunca usa alumnos de otra categoría como fallback;
- el borrador local se filtra contra el roster que el servidor acaba de verificar antes de mezclarse con la asistencia remota;
- los contadores se calculan únicamente sobre los alumnos del roster vigente;
- sin conexión o con una lista no verificada, Lestra conserva el borrador pero bloquea el envío;
- al recuperar conexión se vuelve a verificar la lista antes de permitir guardar;
- los borradores persistentes continúan almacenando solo `jugador_id → estado de asistencia`: no se agregó caché persistente de nombres, fotografías, alertas médicas ni teléfonos de emergencia;
- el estado de sincronización se comunica con texto explícito y `aria-live`, no solamente con color.

Commit funcional: `b68942baf1ea743ef70efdb8f91f5c59110c1ae0`.
Deployment funcional: **READY** en producción.

Durante la revisión del mismo flujo se comprobó además que el modo cancha claro convertía varias superficies a blanco, mientras ciertos controles operativos conservaban colores pensados para dark mode. Se reforzó el contrato propietario `portal-visibility.css` para que los estados anunciados con `aria-live`, el CTA primario y la pestaña activa tengan contraste fuerte en **Modo sol**. El teal original `#289E9D` con texto blanco tenía un contraste aproximado de **3.25:1**; para esos controles del modo claro se utiliza ahora `#0d6667`, con contraste aproximado de **6.74:1** frente a blanco.

Commit de contraste: `12a62e5993b614064ab02cf3a51fff2beeda5019`.
Deployment: **READY** y asociado a `deportivo.lestra.app`.

Estado: **CORREGIDO/REVIEW**. Antes de PASS deben probarse en dispositivo real: modo avión manteniendo una lista ya verificada, cambio de categoría offline, cambio de fecha offline, reconexión, respuestas fuera de orden, error `5xx`, reintento manual, borrador recuperado, envío correcto, Modo sol/noche y mobile táctil.

## Auditoría P0/P1 — Profesor: agenda y casos no pueden mentir con estados vacíos

Se detectaron tres variantes del mismo patrón de integridad de presentación:

1. `ProfessorAgendaPanel` convertía un error de `/me/agenda` en una lista vacía aparentemente válida.
2. `ProfessorTodayPanel` cargaba agenda + casos con `Promise.all`; la caída del servicio de casos podía hacer fallar también una agenda sana y mostrar `0` actividades.
3. `ProfessorCasesPanel` podía presentar “No tienes casos pendientes” si la consulta había fallado y, al responder un caso, podía informar “No fue posible enviar” cuando el `POST` sí había sido confirmado pero fallaba el `GET` de refresco posterior.

Correcciones:

- vacío real y **no verificado** son estados diferentes;
- agenda y casos se verifican de forma independiente;
- una cifra no verificada se representa como `—`, no como cero;
- si existe una carga anterior puede mantenerse como referencia, claramente rotulada como potencialmente desactualizada;
- las acciones operativas de agenda se bloquean cuando la fuente correspondiente no está verificada;
- el selector opcional de alumno en un caso distingue `Sin alumno específico` de `Alumnos no verificados` y ofrece reintento;
- una respuesta de caso confirmada por `POST` nunca vuelve a comunicarse como “fallida” por un error de refresco posterior;
- creación de caso confirmada + fallo al recargar bandeja conserva la verdad del side effect y deja la bandeja en estado no verificado;
- el diálogo de conversación recibió semántica `role="dialog"`, `aria-modal` y nombres accesibles básicos.

Commits:

- `a8dd4ce82f60f6e5fd36be29816afe5fef0a0cff` — agenda sin falsos vacíos;
- `a64aa69ac3ce30a294fc9a653907df8ee81f831b` — jornada desacoplada de casos;
- `644eb8e1ad9ed6e64b3fadd369181fe0a76c003b` — casos, selector de alumno y verdad de mutaciones.

Los deployments correspondientes quedaron **READY** en producción. Frontend CI para `a64aa69...` y `644eb8e...` concluyó correctamente.

Estado: **CORREGIDO/REVIEW**. Falta QA con `404/500/timeout`, datos previos en caché de estado React, creación de caso, refresco fallido después de creación, respuesta confirmada + GET fallido, teclado completo del diálogo y lector de pantalla.

## Auditoría P0 — Profesor: bitácora y preparación no abren formularios vacíos si falla la lectura

`TrainingLogPanel` y `MatchPreparationPanel` compartían un riesgo de pérdida de información: si el `GET` inicial fallaba, el estado por defecto (`EMPTY_LOG` / `EMPTY_FORM`) quedaba visible y editable después del loading. Un `PUT` posterior podía sustituir información existente por un formulario vacío o incompleto.

Corrección:

- el editor solo existe después de una lectura válida del servidor;
- error inicial muestra **Bitácora no verificada** o **Preparación no verificada**, con volver/reintentar;
- no se exponen controles de escritura sobre un estado desconocido;
- una preparación finalizada, cancelada o pasada queda visible solo para consulta;
- ante un error ambiguo de `PUT`, el frontend realiza un `GET` de verificación y compara el contenido enviado antes de recomendar reintentar;
- si el servidor ya contiene exactamente el payload, la interfaz informa que la operación quedó guardada y evita duplicar el envío;
- si tampoco puede verificarse el estado posterior, el formulario local permanece intacto y la interfaz no inventa éxito ni fracaso.

Commits:

- `3fe9d9b088d07e76c818fa5dc98fedc430a987fe` — bitácora protegida;
- `d1670f64d9f7409a3373f84cb9127f76206894b8` — preparación protegida.

Ambos cambios tienen deployment **READY** en producción y el último deployment incluye la cadena completa de cambios anteriores.

Estado: **CORREGIDO/REVIEW**. Falta QA de bitácora existente/nueva, timeout después de commit, preparación existente/nueva, partido pasado/cancelado/jugado, roster sin alumnos, borrador, estado `Lista` y navegación mobile.

## Auditoría P0/P1 — Profesor: modo en vivo falla seguro cuando pierde verificación

El modo en vivo mantenía datos antiguos y controles activos cuando fallaba un polling silencioso. Además varios side effects seguían el patrón `mutación → GET`; si la mutación quedaba confirmada pero el GET fallaba, el operador podía quedar mirando un estado viejo y repetir una acción. También el polling podía reemplazar texto de etapa o métricas que el profesor aún estaba editando.

Corrección frontend:

- el estado del encuentro pasa a **no verificado** si falla una lectura del servidor;
- marcador, etapa, estadísticas, inicio y cierre quedan bloqueados hasta recuperar una lectura válida;
- el fallo inicial ya no deja una pantalla de “Abriendo cancha…” infinita: presenta error explícito, volver y reintentar;
- polling exitoso vuelve a habilitar la operación;
- texto de etapa con cambios locales no es sobrescrito por polling;
- métricas individuales con cambios locales tampoco son reemplazadas por una actualización periódica;
- después de una mutación confirmada se aplica la respuesta autoritativa antes de refrescar la vista completa;
- si falla solo el refresco posterior, se comunica que **la operación sí fue guardada** y se bloquea hasta sincronizar;
- si `iniciar`, `actualizar`, guardar estadísticas o `finalizar` arrojan un error ambiguo, se intenta leer el servidor antes de afirmar que la operación falló;
- si la lectura posterior demuestra que el resultado esperado ya existe, no se invita al usuario a repetir el side effect.

Commit: `4015279dc0342b64639f45ed0f6e78a6624d479d`.
Deployment: **READY** en producción.

### Pendiente P0 de concurrencia real

El backend actual actualiza marcador/etapa mediante valores absolutos y todavía no exige una versión esperada (`live_updated_at`) en la escritura. Dos operadores o dos dispositivos podrían leer el mismo marcador y emitir escrituras concurrentes; en ese escenario sigue existiendo riesgo de **last-write-wins** aunque el frontend ya se bloquee cuando detecta pérdida de verificación.

No se marca este flujo como PASS hasta implementar y probar control optimista de concurrencia o una operación atómica equivalente en servidor.

Estado: **CORREGIDO parcialmente / REVIEW con P0 backend pendiente**.

## Matriz inicial de rutas

| Ruta / flujo | Prioridad actual | Estado | Motivo |
|---|---|---|---|
| `/login` | P1 | REVIEW | Debe certificarse responsive, errores, loading y contraste con artefacto actual. |
| `/puesta-en-marcha` | P1 | REVIEW | Flujo crítico de activación; contrato propio de estilos. Validar todos los pasos y mobile. |
| `/dashboard` | P1 | REVIEW | Debe pasar Anti-AI Review y comprobar que las métricas correspondan a decisiones. |
| `/matricula` | P1 | REVIEW | Flujo crítico de 4 pasos + dorsal + evaluación inicial + envío. Validar legibilidad completa. |
| `/prematricula/:token` | P0 | CORREGIDO/REVIEW | Contraste y alternativa de firma por teclado implementados; falta QA real del flujo completo y tecnologías de asistencia. |
| `/alumnos` lista | P1/P0 potencial | CORREGIDO/REVIEW | Riesgo dark→light corregido en contrato propietario; falta QA real de búsqueda, filtros, tarjetas y responsive. |
| `/alumnos` ficha | P0/P1 | REVIEW | Ya produjo un P0 de contraste. Requiere recorrido exhaustivo de ficha completa. |
| `/alumnos` evaluación | P0 | CORREGIDO/REVIEW | Fix desplegado; falta certificación de interacción completa. |
| `/asistencias` | P1 | REVIEW | Flujo de alta frecuencia y uso de terreno; mobile/targets/estados son críticos. |
| `/profesores` | P1 | REVIEW | `product-design-v2-1.css` contiene tratamiento específico; revisar propiedad y coherencia. |
| `/profesor` | P0/P1 | CORREGIDO/REVIEW · P0 backend pendiente | Asistencia, estados degradados, casos, bitácora, preparación y modo en vivo endurecidos; falta concurrencia atómica/versionada del marcador y QA real en dispositivo. |
| `/apoderados` | P1 | REVIEW | Validar jerarquía familia → estado → acción y flujos sensibles. |
| `/apoderado` | P1 | REVIEW | Portal privado; revisar mobile, estados y separación real de rol. |
| `/partidos` | P1 | REVIEW | Diálogos/portales y flujo operativo complejo. |
| `/torneos` + gestión | P1 | REVIEW | Validar colecciones, creación, gestión, equipos y destructivos. |
| `/finanzas` | P0/P1 | CORREGIDO/REVIEW | Degradación silenciosa corregida; falta idempotencia de cobros/egresos y QA monetario completo. |
| `/suscripcion` | P1 | REVIEW | Contrato visual propio; validar planes, cambios, bloqueo y copy. |
| `/configuracion` | P1 | REVIEW | Contiene múltiples subexperiencias con posible mezcla de estilos legacy. |
| `/configuracion/perfil` | P2/P1 | REVIEW | Markup más cercano al contrato V2; falta QA real. |
| `/configuracion/estructura` | P1 | REVIEW | Flujo estructural crítico para multi-sede/multirrama. |
| `/whatsapp` | P0/P1 | CORREGIDO/REVIEW | Estado `connecting` y polling corregidos; falta ciclo real completo contra Evolution. |
