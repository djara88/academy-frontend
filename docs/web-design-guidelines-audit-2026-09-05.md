# Auditoría y rediseño visual — Lestra Deportivo

Fecha: 2026-09-05

## Objetivo

Usar las Web Interface Guidelines de Vercel como criterio de producto, no sólo como checklist técnico. El objetivo es reducir carga cognitiva, mejorar legibilidad y convertir Deportivo en una experiencia moderna, rápida de entender y consistente.

## Diagnóstico inicial

### 1. Exceso de capas visuales

`src/main.tsx` carga más de 40 hojas CSS. Varias son capas globales de corrección (`*-fix`, `*-polish`, `*-contrast-lock`, `director-*`, `readability-*`). Esto dificulta predecir qué regla termina ganando y favorece diferencias visuales entre módulos.

### 2. Navegación con demasiadas opciones simultáneas

El director recibía Operación, Competencia y Administración completas en el sidebar. La funcionalidad era potente, pero la densidad aumentaba la carga cognitiva.

### 3. Dashboard orientado a mostrar datos, no a decidir

El dashboard combinaba KPIs, anillo de asistencia, gráfico de barras, estados, accesos rápidos, agenda, prioridades y onboarding. La información era útil, pero demasiada competía por atención en la misma pantalla.

### 4. Contrato de interacción inconsistente

- `transition-all` global.
- Uso de `focus:` en vez de una estrategia consistente `focus-visible:`.
- Falta `prefers-reduced-motion` global.
- Dock móvil sin `safe-area-inset-bottom`.
- Login con atributos de formulario incompletos.
- Falta skip link en el shell principal.

## Cambios aplicados en la rama de preview

### Visual System v2

Se agregó `src/visual-system-v2.css` como capa de convergencia temporal para definir un contrato común mientras se retiran estilos antiguos:

- Superficies claras y neutrales.
- Menos gradientes y sombras.
- Radios más contenidos.
- Estados hover/focus explícitos.
- Tipografía y números más legibles.
- Layout responsive más predecible.
- Safe areas móviles.
- Reduced motion.

### Navegación progresiva

La barra lateral ahora prioriza lo diario:

- Inicio
- Solicitudes
- Nueva matrícula
- Alumnos
- Asistencia

El resto queda agrupado en secciones progresivas:

- Equipo y familias
- Competencia
- Gestión

Los grupos se abren automáticamente cuando la ruta activa pertenece a ellos. No se eliminó ningún módulo.

### Dashboard como centro de decisiones

El dashboard fue rediseñado para responder cuatro preguntas:

1. ¿Qué debo hacer ahora?
2. ¿Qué necesita atención?
3. ¿Qué viene después?
4. ¿Cómo va la operación básica?

Se retiraron del inicio los gráficos decorativos y se mantuvo la información mediante indicadores simples y enlaces a los módulos profundos.

### Login

- Menos ruido decorativo.
- `name` y `autocomplete` correctos.
- `spellCheck={false}` en email.
- Errores anunciables con `aria-live`.
- Dimensiones explícitas en imagen externa.
- Estados de carga con `…`.

### Accesibilidad transversal

- `focus-visible` coherente.
- Skip link hacia contenido principal.
- Iconos decorativos ocultos a tecnología asistiva.
- `prefers-reduced-motion`.
- `scroll-margin-top` para encabezados con id.
- Targets táctiles y safe areas móviles.

## Principio de migración

`visual-system-v2.css` no debe transformarse en otro parche permanente. Es una capa de convergencia. Cada módulo que migremos debe:

1. Adoptar el contrato visual V2.
2. Pasar revisión de Web Interface Guidelines.
3. Eliminar dependencias de CSS correctivo antiguo cuando sea seguro.
4. Mantener lógica, permisos y contratos API intactos salvo necesidad funcional explícita.

## Próximas prioridades

1. Alumnos y matrícula.
2. Asistencia.
3. Eventos/partidos y torneos.
4. Finanzas.
5. Profesores y familias.
6. Configuración.
7. Retiro progresivo de CSS global legado.

## Criterio de éxito

La aplicación debe poder entenderse sin entrenamiento previo: una acción principal por contexto, jerarquía clara, menos elementos compitiendo por atención y el mismo comportamiento visual en todos los módulos.
