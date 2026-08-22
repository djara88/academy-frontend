export type HumanMessageTone = 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'danger';

export type HumanMessagePresentation = {
  tone: HumanMessageTone;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  toast: boolean;
};

const normalize = (value: string) => value
  .replace(/^\s*(error|aviso|advertencia)\s*:\s*/i, '')
  .replace(/\s+/g, ' ')
  .trim();

const soften = (value: string) => normalize(value)
  .replace(/\bNo fue posible\b/gi, 'No pudimos')
  .replace(/\bNo se pudo\b/gi, 'No pudimos')
  .replace(/\bDebe seleccionar\b/gi, 'Elige')
  .replace(/\bDebes seleccionar\b/gi, 'Elige')
  .replace(/\bSeleccione\b/gi, 'Elige')
  .replace(/\bSelecciona una opción válida\b/gi, 'Elige una opción válida')
  .replace(/\bpor favor\b/gi, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

const successPattern = /\b(guardad[oa]|actualizad[oa]|cread[oa]|registrad[oa]|enviad[oa]|validado|aprobado|rechazado|anulado|cancelado|otorgado|retirado|completad[oa]|sincronizad[oa]|listo|activad[oa]|pagado)\b/i;
const errorPattern = /\b(no pudimos|error|fall[oó]|inv[aá]lid[oa]|no existe|no encontramos|no tienes permiso|sin permiso|no autorizado|no disponible)\b/i;
const warningPattern = /\b(falta|faltan|necesitas|elige|selecciona|completa|pendiente|vencid[oa]|vence|antes de continuar|revisa)\b/i;

const actionFromQuestion = (message: string) => {
  const match = message.match(/^¿?\s*(anular|cancelar|eliminar|enviar|validar|rechazar|reagendar|guardar|registrar|quitar|desvincular|activar|crear|actualizar|continuar|cerrar)\b/i);
  if (!match) return 'Sí, continuar';
  return `Sí, ${match[1].toLowerCase()}`;
};

export const humanizeMessage = (
  rawMessage: string,
  kind: 'alert' | 'confirm',
  requestedTone: 'default' | 'danger' = 'default',
): HumanMessagePresentation => {
  const message = soften(rawMessage || '');

  if (kind === 'confirm') {
    const danger = requestedTone === 'danger' || /\b(eliminar|anular|cancelar|rechazar|quitar|borrar|desvincular)\b/i.test(message);
    return {
      tone: danger ? 'danger' : 'confirm',
      title: danger ? 'Confirma esta acción' : 'Antes de continuar',
      message,
      confirmLabel: actionFromQuestion(message),
      cancelLabel: 'Volver',
      toast: false,
    };
  }

  if (successPattern.test(message) && !errorPattern.test(message)) {
    return {
      tone: 'success',
      title: 'Listo',
      message,
      confirmLabel: 'Entendido',
      cancelLabel: 'Volver',
      toast: true,
    };
  }

  if (errorPattern.test(message)) {
    return {
      tone: 'error',
      title: 'No pudimos hacerlo',
      message: /intenta|reintenta/i.test(message) ? message : `${message}${/[.!?]$/.test(message) ? '' : '.'} Intenta nuevamente.`,
      confirmLabel: 'Entendido',
      cancelLabel: 'Volver',
      toast: false,
    };
  }

  if (warningPattern.test(message)) {
    return {
      tone: 'warning',
      title: 'Revisa esto',
      message,
      confirmLabel: 'Entendido',
      cancelLabel: 'Volver',
      toast: false,
    };
  }

  return {
    tone: 'info',
    title: 'Para tener en cuenta',
    message,
    confirmLabel: 'Entendido',
    cancelLabel: 'Volver',
    toast: false,
  };
};
