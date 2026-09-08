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
| `/profesor` | P0/P1 | REVIEW | Uso de cancha, modos de visibilidad y mobile requieren QA real bajo condiciones de terreno. |
| `/apoderados` | P1 | REVIEW | Validar jerarquía familia → estado → acción y flujos sensibles. |
| `/apoderado` | P1 | REVIEW | Portal privado; revisar mobile, estados y separación real de rol. |
| `/partidos` | P1 | REVIEW | Diálogos/portales y flujo operativo complejo. |
| `/torneos` + gestión | P1 | REVIEW | Validar colecciones, creación, gestión, equipos y destructivos. |
| `/finanzas` | P0/P1 | REVIEW | Información monetaria: contraste, jerarquía, estados y destructivos requieren máxima claridad. |
| `/suscripcion` | P1 | REVIEW | Contrato visual propio; validar planes, cambios, bloqueo y copy. |
| `/configuracion` | P1 | REVIEW | Contiene múltiples subexperiencias con posible mezcla de estilos legacy. |
| `/configuracion/perfil` | P2/P1 | REVIEW | Markup más cercano al contrato V2; falta QA real. |
| `/configuracion/estructura` | P1 | REVIEW | Flujo estructural crítico para multi-sede/multirrama. |
| `/whatsapp` | P0/P1 | REVIEW | Integración externa y estados de conexión; no puede depender de color ni presentar estados ambiguos. |
