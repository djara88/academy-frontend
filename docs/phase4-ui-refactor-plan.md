# Fase 4.2 · Plan de refactor UI y CSS

## Inventario de páginas gigantes

| Página | Tamaño actual | Corte objetivo | Extracciones propuestas |
| --- | ---: | ---: | --- |
| `EventosRendimiento.tsx` | 49 KB | < 15 KB | filtros/command bar, tarjetas de evento, formulario de evento, diálogo de rendimiento, utilidades de métricas/tiempo |
| `Alumnos.tsx` | 47 KB | < 15 KB | roster, filtros, ficha 360, acciones masivas, reconocimiento/notificaciones |
| `FinanzasMultirama.tsx` | 39 KB | < 18 KB | ledger, cobranza, resumen, formularios y diálogos |
| `AcademySetup.tsx` | 33 KB | < 15 KB | stepper, formularios por etapa, resumen lateral y validadores |
| `MatriculaPreparacion.tsx` | 31 KB | < 15 KB | pasos Apoderado/Alumno/Perfil/Valores, resumen y seguimiento |

## Deuda CSS medida

Los mayores focos legacy son:

| Hoja | !important | nth-* | selector por fragmento de clase |
| --- | ---: | ---: | ---: |
| `operational-workflows-v2.css` | 309 | 14 | 34 |
| `setup-v2.css` | 183 | 0 | 29 |
| `student-profile-v2.css` | 138 | 33 | 27 |
| `visual-system-v2.css` | 91 | 4 | 34 |
| `product-design-v2-1.css` | 87 | 7 | 12 |
| `match-command-v2.css` | 86 | 4 | 2 |
| `subscription-v2.css` | 84 | 0 | 49 |
| `performance-canvas-v2.css` | 73 | 12 | 10 |

## Contrato nuevo

1. Componentes nuevos deben exponer clases semánticas estables (`lestra-*`) o variantes por props/data attributes.
2. Se prohíben nuevos `!important`, `:nth-child/:nth-of-type` y selectores `[class*=]`.
3. `mobile-dock-v2-1-fix.css`, `readability-contract.css` y `accessibility-contract-v3.css` ya están migrados a contratos semánticos y CI exige que permanezcan sin fragilidad.
4. El resto de deuda queda congelada por `scripts/css-debt-audit.mjs`: cualquier incremento rompe CI; las reducciones se aceptan automáticamente.
5. Cada extracción de página debe mover lógica de dominio a hooks/servicios y dejar el page component como orquestador.

## Orden de ejecución posterior

P0: `EventosRendimiento` + `sports-dialogs-v2`.
P0: `Alumnos` + `student-profile-v2`/bloques de `operational-workflows-v2`.
P1: `AcademySetup` + `setup-v2`.
P1: `FinanzasMultirama` + `finance-desk-v2`.
P1: `MatriculaPreparacion` + `enrollment-handoff-v2`.

Cada corte exige Lint, Typecheck, Build, Security Audit y E2E Critical Flows verdes.
