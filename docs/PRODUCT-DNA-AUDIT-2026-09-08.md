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

## Hallazgo ya corregido P0/P1 — editor de criterios y reconocimientos

Los editores manuales relacionados con evaluación/reconocimientos utilizaban el mismo lenguaje dark histórico. Fueron migrados para eliminar el riesgo inmediato de legibilidad.

Estado: **corrección aplicada; QA funcional/visual completo pendiente**.

## Auditoría activa P0 — Pre-matrícula pública

Ruta: `/prematricula/:token`.

### Contraste corregido

Se detectaron labels y textos auxiliares pequeños con `text-slate-500` sobre superficies oscuras. En el fondo principal `#07111f`, el contraste aproximado era **3.98:1**, insuficiente para texto normal bajo WCAG AA.

Se migraron esos textos a `text-slate-400`, cuyo contraste aproximado sobre el mismo fondo es **7.39:1**. La corrección incluye etiquetas del apoderado/alumno, resumen financiero, campos de firma, ayuda de firma y evidencia final.

Commit: `3b874c8396b2fe35b4b43f5356c8c23d6faba5d3`.

### Bloqueador de accesibilidad pendiente

La firma actual depende de dibujar en un `<canvas>` mediante eventos de puntero. Un usuario que opere únicamente con teclado no puede completar ese requisito y, por tanto, no puede formalizar la matrícula.

Estado: **P0 para accesibilidad**. No se declarará PASS hasta definir e implementar una alternativa de firma accesible que preserve la evidencia e integridad del flujo.

### Pruebas aún pendientes

- enlace válido;
- token expirado/inválido;
- foto autorizada/no autorizada;
- error de carga de foto;
- decisiones obligatorias/opcionales;
- firma;
- envío;
- éxito/documento final;
- mobile real;
- keyboard completo;
- estados de backend lento/indisponible.

## Matriz inicial de rutas

| Ruta / flujo | Prioridad actual | Estado | Motivo |
|---|---|---|---|
| `/login` | P1 | REVIEW | Debe certificarse responsive, errores, loading y contraste con artefacto actual. |
| `/puesta-en-marcha` | P1 | REVIEW | Flujo crítico de activación; contrato propio de estilos. Validar todos los pasos y mobile. |
| `/dashboard` | P1 | REVIEW | Debe pasar Anti-AI Review y comprobar que las métricas correspondan a decisiones. |
| `/matricula` | P1 | REVIEW | Flujo crítico de 4 pasos + dorsal + evaluación inicial + envío. Validar legibilidad completa. |
| `/prematricula/:token` | P0 | EN AUDITORÍA | Contraste secundario corregido. Firma por canvas sigue bloqueando operación exclusivamente por teclado. |
| `/alumnos` lista | P1 | REVIEW | Validar búsqueda, filtros, estados y jerarquía sin depender de overrides. |
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
| `/comunicaciones` | P1 | REVIEW | Verificar que comunicación sea contextual, no un módulo genérico desconectado. |
| `/uniformes` + dorsales | P1 | REVIEW | Interacción operacional y nueva selección visual requieren QA mobile y estados ocupados/reservados. |
| `/salud-deportiva` | P0/P1 | REVIEW | Información sensible; claridad y estados obligatorios. |
| `/privacidad` | P0/P1 | REVIEW | Flujo legal/privacidad; exactitud y legibilidad tienen prioridad sobre estética. |
| `/admin/*` | P1 | REVIEW | Superadmin separado del Director; revisar sin heredar normalizaciones del producto. |

## Orden de auditoría operativo

### Lote A — P0 / flujos que pueden causar daño o bloqueo

1. Pre-matrícula pública completa.
2. Ficha de alumno + evaluación + categorías + salud.
3. Finanzas.
4. WhatsApp/estado de conexión.
5. Privacidad y datos sensibles.
6. Profesor en cancha.

### Lote B — alta frecuencia

1. Matrícula.
2. Asistencia.
3. Dashboard Director.
4. Profesores.
5. Partidos/eventos.

### Lote C — estructura y administración secundaria

1. Configuración/estructura.
2. Torneos.
3. Uniformes/dorsales.
4. Suscripción.
5. Comunicaciones.

## Checklist por ruta

No cambiar el estado a PASS sin evidencia de:

- [ ] carga inicial;
- [ ] datos reales;
- [ ] empty state;
- [ ] error state;
- [ ] disabled state;
- [ ] success state;
- [ ] destructive action cuando exista;
- [ ] desktop;
- [ ] mobile;
- [ ] keyboard;
- [ ] focus-visible;
- [ ] WCAG AA;
- [ ] sin overflow/cortes;
- [ ] vocabulario de dominio;
- [ ] acción primaria inequívoca;
- [ ] Anti-AI Review;
- [ ] sin conflicto evidente entre contrato visual y markup legacy.

## Criterio de avance

No se harán rediseños decorativos aislados mientras existan P0 de legibilidad u operación. Los cambios se agrupan por flujo completo y se corrigen en el componente/contrato propietario.

El producto solo recuperará el estado “visualmente certificado” cuando las rutas críticas hayan sido recorridas con el artefacto de producción vigente.