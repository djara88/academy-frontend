# Lestra Deportivo

Gestión de academias deportivas, tu ecosistema de elite.

## UI quality gate

Los cambios de interfaz deben seguir `AGENTS.md` y la skill `.agents/skills/web-design-guidelines/SKILL.md`.

La rama `chore/web-design-guidelines` contiene la migración progresiva hacia **Visual System V2**. El objetivo es simplificar la experiencia sin eliminar capacidades ni alterar reglas de negocio. La migración se realiza por flujos de uso y, cuando un módulo queda cubierto por V2, se retiran las hojas de estilo correctivas que hayan quedado obsoletas.

Estado actual de la migración:

- Shell, navegación, dashboard, login y diálogos: migrados a la nueva dirección visual.
- Alumnos: listado convertido a una experiencia de escaneo rápido; ficha profunda conservada.
- Matrícula: cabecera operativa y flujo de cuatro pasos simplificados; eliminadas las capas de contraste dedicadas ya reemplazadas por V2.
- Siguiente flujo: Asistencia.

Producción (`main`) permanece separada hasta completar la validación de los principales flujos en preview.
