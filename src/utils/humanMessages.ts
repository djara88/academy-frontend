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
const errorPattern = /\b(no pudimos|error|fall[oó]|no existe|no encontramos|no disponible)\b/i;
const permissionPattern = /\b(no tienes permiso|sin permiso|no autorizado|no está incluido|no esta incluido)\b/i;
const warningPattern = /\b(inv[aá]lid[oa]|falta|faltan|necesitas|elige|selecciona|completa|pendiente|vencid[oa]|vence|antes de continuar|revisa)\b/i;

const actionFromQuestion = (message: string) => {
  const match = message.match(/^¿?\s*(anular|cancelar|eliminar|enviar|validar|rechazar|reagendar|guardar|registrar|quitar|desvincular|activar|crear|actualizar|continuar|cerrar)\b/i);
  if (!match) return 'Sí, continuar';
  return `Sí, ${match[1].toLowerCase()}`;
};

const confirmationTitle = (message: string, danger: boolean) => {
  if (/^¿?\s*enviar\b/i.test(message)) return '¿Enviar ahora?';
  if (/^¿?\s*validar\b/i.test(message)) return '¿Validar este pago?';
  if (/^¿?\s*rechazar\b/i.test(message)) return '¿Rechazar este pago?';
  if (/^¿?\s*reagendar\b/i.test(message)) return '¿Reagendar esta actividad?';
  if (/^¿?\s*eliminar\b/i.test(message)) return '¿Eliminar este registro?';
  if (/^¿?\s*anular\b/i.test(message)) return '¿Anular este registro?';
  if (/^¿?\s*cancelar\b/i.test(message)) return '¿Cancelar este registro?';
  if (/^¿?\s*guardar\b/i.test(message)) return '¿Guardar los cambios?';
  if (/^¿?\s*registrar\b/i.test(message)) return '¿Registrar ahora?';
  return danger ? 'Confirma esta acción' : 'Antes de continuar';
};

const successTitle = (message: string) => {
  if (/pago/i.test(message) && /registrad|pagado|validado/i.test(message)) return 'Pago registrado';
  if (/evaluaci[oó]n/i.test(message) && /guardad|registrad/i.test(message)) return 'Evaluación guardada';
  if (/asistencia/i.test(message) && /guardad|registrad/i.test(message)) return 'Asistencia guardada';
  if (/enviad/i.test(message)) return 'Enviado';
  if (/guardad/i.test(message)) return 'Cambios guardados';
  if (/actualizad/i.test(message)) return 'Actualizado';
  if (/cread/i.test(message)) return 'Creado';
  if (/registrad/i.test(message)) return 'Registro listo';
  if (/cancelad|anulad/i.test(message)) return 'Listo, quedó cancelado';
  if (/rechazad/i.test(message)) return 'Rechazo registrado';
  if (/activad/i.test(message)) return 'Activado';
  return 'Listo';
};

const errorTitle = (message: string) => {
  if (/cargar/i.test(message)) return 'No pudimos cargar la información';
  if (/guardar|actualizar/i.test(message)) return 'No pudimos guardar los cambios';
  if (/enviar/i.test(message)) return 'No pudimos enviar esto';
  if (/registrar/i.test(message)) return 'No pudimos registrar la información';
  if (/eliminar|anular|cancelar/i.test(message)) return 'No pudimos completar la acción';
  return 'No pudimos completar la acción';
};

const warningTitle = (message: string) => {
  if (/rut/i.test(message) && /inv[aá]lid/i.test(message)) return 'Revisa el RUT';
  if (/correo|email/i.test(message) && /inv[aá]lid/i.test(message)) return 'Revisa el correo';
  if (/tel[eé]fono/i.test(message) && /inv[aá]lid/i.test(message)) return 'Revisa el teléfono';
  if (/selecciona|elige/i.test(message)) return 'Falta una selección';
  if (/completa|falta|faltan|necesitas/i.test(message)) return 'Falta información';
  if (/vencid|vence/i.test(message)) return 'Hay algo pendiente';
  return 'Revisa esto';
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
      title: confirmationTitle(message, danger),
      message,
      confirmLabel: actionFromQuestion(message),
      cancelLabel: 'Volver',
      toast: false,
    };
  }

  if (successPattern.test(message) && !errorPattern.test(message)) {
    return {
      tone: 'success',
      title: successTitle(message),
      message,
      confirmLabel: 'Entendido',
      cancelLabel: 'Volver',
      toast: true,
    };
  }

  if (permissionPattern.test(message)) {
    return {
      tone: 'warning',
      title: 'Esta acción no está disponible',
      message,
      confirmLabel: 'Entendido',
      cancelLabel: 'Volver',
      toast: false,
    };
  }

  if (warningPattern.test(message)) {
    return {
      tone: 'warning',
      title: warningTitle(message),
      message,
      confirmLabel: 'Entendido',
      cancelLabel: 'Volver',
      toast: false,
    };
  }

  if (errorPattern.test(message)) {
    const retryable = /\b(no pudimos|error|fall[oó]|no disponible)\b/i.test(message);
    return {
      tone: 'error',
      title: errorTitle(message),
      message: retryable && !/intenta|reintenta/i.test(message)
        ? `${message}${/[.!?]$/.test(message) ? '' : '.'} Intenta nuevamente.`
        : message,
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
