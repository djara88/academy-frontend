# Lestra Deportivo — evidencia Product DNA · Profesor + Finanzas

Fecha: 2026-09-08
Estado global del producto: **NO CERTIFICADO visualmente**.

Este documento registra evidencia técnica de correcciones P0/P1. No convierte rutas en PASS sin QA real de dispositivo, estados degradados y recorridos completos.

## `/profesor` — concurrencia de encuentro en vivo

Se cerró la brecha de last-write-wins para marcador, etapa, finalización y estadísticas individuales.

### Contrato actual

- `partidos.live_updated_at` actúa como versión optimista del encuentro.
- marcador y etapa envían `expected_live_updated_at`;
- finalizar exige la última versión confirmada;
- estadísticas individuales y MVP utilizan la misma versión del encuentro;
- una escritura con versión obsoleta responde `409 LIVE_STATE_CONFLICT` y devuelve estado actual para resincronizar;
- un cliente antiguo no puede escribir estadísticas por la ruta legacy: recibe `428 LIVE_CLIENT_UPGRADE_REQUIRED`;
- el inicio y finalización son idempotentes;
- la escritura de estadísticas se serializa mediante RPC con lock de la fila del partido;
- existe índice parcial único que impide más de un MVP por partido a nivel de base de datos;
- el RPC de estadísticas está revocado para `public`, `anon` y `authenticated`, y solo puede ejecutarlo `service_role` después de las verificaciones del backend.

Backend relevante:

- `routes/professorLiveConcurrency.js`
- `supabase/migrations/20260908190500_professor_live_stats_concurrency.sql`
- `test/professorLiveConcurrency.test.js`

Frontend relevante:

- `src/components/profesor/LiveMatchPanel.tsx`
- commit de estadísticas concurrentes: `cbe94a35f605b8dc6d27f35c351876bffd49cce9`.

Evidencia de pipeline:

- Frontend CI del commit `cbe94a35...`: **SUCCESS**.
- Vercel: **READY** y alias `deportivo.lestra.app`.
- Backend CI y validación Eventos/Rendimiento: **SUCCESS**.
- Render backend: deployment correspondiente **LIVE**.

Estado: **CORREGIDO/REVIEW**. Pendiente antes de PASS: dos sesiones reales sobre el mismo partido, conflicto marcador, conflicto etapa, conflicto estadísticas/MVP, finalización simultánea, pérdida de red, reconexión, doble toque, mobile táctil y Modo sol/noche.

## `/finanzas` — integridad de presentación

Se detectó que `FinanzasMultirama` podía terminar una carga fallida con `summary = null` y posteriormente renderizar `summary?.valor || 0`. Eso podía transformar una indisponibilidad o cambio de alcance fallido en cifras `0`, infringiendo la regla Product DNA: **estado desconocido ≠ cero**.

Corrección implementada en `src/pages/FinanzasMultirama.tsx`:

- `baseVerified` separa una lectura confirmada de una lectura fallida;
- al cambiar alcance se retiran inmediatamente las cifras del alcance anterior mientras se verifica el nuevo;
- respuestas fuera de orden no pueden sobrescribir un alcance más nuevo;
- una falla muestra `Estado financiero no verificado`, no ceros ni cifras anteriores;
- cuentas corrientes, pagos informados y configuración de cobranza tienen verificación independiente;
- sus fallos no se presentan como bandejas vacías válidas;
- acciones monetarias y operativas dependientes se bloquean mientras sus fuentes no estén verificadas.

Commit frontend: `f72adca8e02b8c5d0ba7852b4b1138f806c75cea`.

Estado: **CORREGIDO/REVIEW**. Vercel quedó READY; Frontend CI debe registrarse como SUCCESS antes de considerar cerrada la evidencia de pipeline.

## `/finanzas` — reintentos ambiguos e idempotencia

Antes, crear un cobro manual o egreso solo estaba protegido por `saving` en el navegador. Eso evita doble clic local, pero no evita duplicados cuando el servidor confirma la escritura y la respuesta se pierde, y el usuario reintenta.

Se implementó:

- columna `idempotency_key` en `cobros` y `egresos`;
- índice único parcial por `(academia_id, idempotency_key)` en ambas tablas;
- el frontend genera una clave nueva al abrir cada operación y conserva la misma clave durante reintentos;
- backend consolidado y multirrama reutilizan la operación existente cuando clave + payload coinciden;
- reutilizar la misma clave con datos diferentes devuelve `409 IDEMPOTENCY_KEY_REUSED`;
- una carrera concurrente que choque con el índice único se resuelve leyendo la operación existente, no creando otra;
- el pago real ya utilizaba `registrar_pago_cobro` con `idempotency_key` y se mantiene ese contrato.

Base de datos:

- migración aplicada en producción: `finance_manual_write_idempotency`;
- migración versionada: `supabase/migrations/20260908193000_finance_manual_write_idempotency.sql`.

Backend:

- `routes/finanzas.js`
- `routes/finanzasMultirama.js`
- `test/financeManualWriteIdempotency.test.js`
- último commit de prueba: `5a1a3bd56053ccf555d17c9455b4a612c63423ac`.

Evidencia de pipeline backend:

- Backend CI: **SUCCESS**.
- Validate Eventos y Rendimiento: **SUCCESS**.
- Render deployment `dep-dag610hqd4ss738ljvdg`: **LIVE**.

Estado: **CORREGIDO/REVIEW**. Pendiente antes de PASS: reintento real con respuesta interrumpida, doble sesión, cobro y egreso con mismo idempotency key, rechazo de clave reutilizada con payload distinto, pago real, validación de transferencia, anulación y cambio de rama durante carga.

## Criterio de continuidad

Siguiente orden:

1. cerrar evidencia de CI frontend de Finanzas;
2. QA de estados degradados y cambio de alcance financiero;
3. revisar idempotencia de validación de transferencias y anulación;
4. QA mobile/contraste de Finanzas;
5. después volver a Pre-matrícula P0 y su recorrido accesible completo.
