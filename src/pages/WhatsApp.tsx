import React, { useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { useAppDialog } from '../contexts/DialogContext';
import { getAcademyName } from '../config/brand';
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_DARK,
  DIRECTOR_BUTTON_GHOST,
  DirectorHero,
  DirectorPage,
  DirectorPanel,
  DirectorStat,
} from '../components/director/DirectorModule';

type ConnectionState = 'loading' | 'disconnected' | 'connecting' | 'qr' | 'connected' | 'error';
type ConnectionPayload = {
  conectado?: boolean;
  estado?: string;
  qrCode?: string | null;
  numero?: string | null;
  mensaje?: string;
  error?: string;
};

const qrImageOf = (value?: string | null) => {
  if (!value) return '';
  return value.startsWith('data:image/') ? value : `data:image/png;base64,${value}`;
};

const phoneLabel = (value?: string | null) => {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  return digits ? `+${digits}` : '';
};

const normalizeBridgeState = (value?: string) => String(value || '').trim().toLowerCase();

const WhatsApp: React.FC = () => {
  const { user } = useAuth();
  const { confirmAction, notify } = useAppDialog();
  const academyName = getAcademyName(user?.nombre_academia);
  const academyId = user?.academia_id;

  const [estado, setEstado] = useState<ConnectionState>('loading');
  const [qrCode, setQrCode] = useState('');
  const [numero, setNumero] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [busy, setBusy] = useState<'connect' | 'disconnect' | 'change' | 'refresh' | null>(null);

  const applyPayload = (data: ConnectionPayload, preserveQr = false) => {
    const bridgeState = normalizeBridgeState(data.estado);
    if (data.conectado || bridgeState === 'open') {
      setEstado('connected');
      setQrCode('');
      setNumero(phoneLabel(data.numero));
      setMensajeError('');
      return;
    }
    if (data.qrCode) {
      setQrCode(qrImageOf(data.qrCode));
      setNumero('');
      setEstado('qr');
      setMensajeError('');
      return;
    }
    if (bridgeState === 'connecting') {
      setQrCode('');
      setNumero('');
      setEstado('connecting');
      setMensajeError('');
      return;
    }
    if (preserveQr && qrCode) return;
    setQrCode('');
    setNumero('');
    setEstado('disconnected');
    setMensajeError('');
  };

  const checkWhatsAppStatus = async (showLoading = true) => {
    if (!academyId) return;
    try {
      if (showLoading) {
        setBusy('refresh');
        if (estado !== 'qr' && estado !== 'connecting') setEstado('loading');
      }
      setMensajeError('');
      const response = await api.get(`/api/whatsapp-bridge/connection/${academyId}`);
      applyPayload(response.data, !showLoading && estado === 'qr');
    } catch (error: any) {
      // Un fallo puntual durante el polling no debe transformar una vinculación
      // activa en un falso estado de error/desconexión. La comprobación manual sí
      // expone el error completo al director.
      if (!showLoading && (estado === 'qr' || estado === 'connecting')) return;
      setEstado('error');
      setMensajeError(error?.response?.data?.error || 'No fue posible verificar la conexión de WhatsApp.');
    } finally {
      if (showLoading) setBusy(null);
    }
  };

  const connectWhatsApp = async () => {
    if (!academyId) return;
    setBusy('connect');
    setMensajeError('');
    try {
      const response = await api.post(`/api/whatsapp-bridge/connection/${academyId}/connect`);
      applyPayload(response.data);
      if (!response.data?.conectado && !response.data?.qrCode) await checkWhatsAppStatus(false);
    } catch (error: any) {
      setEstado('error');
      setMensajeError(error?.response?.data?.error || 'No fue posible iniciar la vinculación con WhatsApp.');
    } finally {
      setBusy(null);
    }
  };

  const disconnectWhatsApp = async () => {
    if (!academyId) return;
    const accepted = await confirmAction(
      'Lestra dejará de usar el WhatsApp actualmente vinculado. Tus alumnos, conversaciones y configuraciones de la academia no se eliminan.',
      { title: 'Desconectar WhatsApp', confirmLabel: 'Desconectar', tone: 'danger' },
    );
    if (!accepted) return;

    setBusy('disconnect');
    try {
      await api.post(`/api/whatsapp-bridge/connection/${academyId}/disconnect`);
      setEstado('disconnected');
      setQrCode('');
      setNumero('');
      await notify('WhatsApp fue desconectado de esta academia.', { title: academyName });
    } catch (error: any) {
      await notify(error?.response?.data?.error || 'No fue posible desconectar WhatsApp.', { title: academyName });
    } finally {
      setBusy(null);
    }
  };

  const changeNumber = async () => {
    if (!academyId) return;
    const accepted = await confirmAction(
      'Se cerrará la vinculación actual y Lestra generará un QR nuevo. Luego podrás escanearlo desde cualquier otro número de WhatsApp que quieras usar para esta academia.',
      { title: 'Cambiar número de WhatsApp', confirmLabel: 'Generar nuevo QR' },
    );
    if (!accepted) return;

    setBusy('change');
    setMensajeError('');
    try {
      const response = await api.post(`/api/whatsapp-bridge/connection/${academyId}/change-number`);
      applyPayload(response.data);
      if (!response.data?.qrCode) await checkWhatsAppStatus(false);
    } catch (error: any) {
      setMensajeError(error?.response?.data?.error || 'No fue posible preparar el cambio de número.');
      setEstado('error');
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => { void checkWhatsAppStatus(true); }, [academyId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if ((estado !== 'qr' && estado !== 'connecting') || !academyId) return;
    const timer = window.setInterval(() => { void checkWhatsAppStatus(false); }, 4000);
    return () => window.clearInterval(timer);
  }, [estado, academyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const stateLabel = estado === 'connected' ? 'Conectado'
    : estado === 'qr' ? 'QR activo'
      : estado === 'connecting' ? 'Conectando'
        : estado === 'loading' ? 'Verificando'
          : estado === 'error' ? 'Revisar'
            : 'Desconectado';

  return (
    <DirectorPage>
      <DirectorHero
        eyebrow="Canal oficial de la academia"
        title="WhatsApp"
        description={`Vincula el número que usará ${academyName} para notificaciones y comunicaciones. El director puede desconectarlo o reemplazarlo cuando lo necesite.`}
        actions={<button type="button" disabled={Boolean(busy)} onClick={() => void checkWhatsAppStatus(true)} className={DIRECTOR_BUTTON_GHOST}>{busy === 'refresh' ? 'Verificando…' : '↻ Actualizar estado'}</button>}
        aside={
          <div className="rounded-[20px] border border-white/15 bg-white/[.055] p-5">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b7ff00]">Estado</p>
            <p className="mt-2 text-xl font-black text-white">{stateLabel}</p>
            <p className="mt-1 text-xs font-semibold text-[#c7d0c8]">{numero ? `Número ${numero}` : estado === 'qr' ? 'Esperando escaneo' : estado === 'connecting' ? 'Preparando código QR' : 'Canal configurable por el director'}</p>
          </div>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        <DirectorStat label="Control del director" value="Conectar / desconectar" detail="La academia decide cuándo mantener operativo el canal." tone="lime" />
        <DirectorStat label="Cambio de número" value="Sin quedar amarrado" detail="Puedes liberar una conexión y escanear otro QR." />
        <DirectorStat label="Datos de Lestra" value="La operación se conserva" detail="Desconectar no elimina alumnos, pagos ni configuraciones." tone="dark" />
      </section>

      <DirectorPanel className="overflow-hidden">
        <header className="flex flex-col gap-4 border-b border-[#e2e7df] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Estado de vinculación</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black tracking-[-.03em] text-[#111711]">
                {estado === 'connected' ? 'WhatsApp conectado' : estado === 'qr' ? 'Esperando vinculación' : estado === 'connecting' ? 'Preparando vinculación' : estado === 'loading' ? 'Verificando…' : estado === 'error' ? 'No pudimos completar la acción' : 'WhatsApp desconectado'}
              </h2>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${estado === 'connected' ? 'border-[#cde995] bg-[#f3fadf] text-[#5f7900]' : estado === 'qr' || estado === 'connecting' ? 'border-[#d8ded4] bg-[#f5f7f3] text-[#111711]' : estado === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#d8ded4] bg-[#f5f7f3] text-[#697468]'}`}>{stateLabel}</span>
            </div>
            {numero ? <p className="mt-2 text-sm text-[#697468]">Número vinculado: <strong className="text-[#111711]">{numero}</strong></p> : null}
          </div>

          {estado === 'connected' ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={Boolean(busy)} onClick={() => void changeNumber()} className={DIRECTOR_BUTTON}>{busy === 'change' ? 'Preparando…' : 'Cambiar número'}</button>
              <button type="button" disabled={Boolean(busy)} onClick={() => void disconnectWhatsApp()} className={DIRECTOR_BUTTON_DARK}>{busy === 'disconnect' ? 'Desconectando…' : 'Desconectar'}</button>
            </div>
          ) : null}
        </header>

        <div className="min-h-[390px] p-5 sm:p-8">
          {estado === 'loading' ? (
            <div className="grid min-h-[320px] place-items-center text-center"><div><div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#e1e6df] border-t-[#9fcf00]"/><p className="mt-4 text-sm font-bold text-[#697468]">Verificando la conexión…</p></div></div>
          ) : null}

          {estado === 'connecting' ? (
            <div className="grid min-h-[320px] place-items-center text-center" role="status" aria-live="polite">
              <div className="max-w-lg">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#e1e6df] border-t-[#9fcf00]"/>
                <h3 className="mt-5 text-2xl font-black text-[#111711]">Preparando el código QR</h3>
                <p className="mt-3 text-sm leading-6 text-[#697468]">La instancia de WhatsApp ya se está iniciando. Esta pantalla seguirá consultando el estado automáticamente y mostrará el QR apenas esté disponible.</p>
                <button type="button" disabled={Boolean(busy)} onClick={() => void checkWhatsAppStatus(true)} className={`${DIRECTOR_BUTTON_GHOST} mt-5`}>Comprobar ahora</button>
              </div>
            </div>
          ) : null}

          {estado === 'disconnected' ? (
            <div className="grid min-h-[320px] place-items-center">
              <div className="max-w-xl text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#111711] text-3xl">📱</div>
                <h3 className="mt-5 text-2xl font-black text-[#111711]">Conecta el número de tu academia</h3>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#697468]">Lestra generará un QR. Escanéalo desde WhatsApp → Dispositivos vinculados. El número puede cambiarse posteriormente desde esta misma pantalla.</p>
                <button type="button" disabled={Boolean(busy)} onClick={() => void connectWhatsApp()} className={`${DIRECTOR_BUTTON} mt-6`}>{busy === 'connect' ? 'Generando QR…' : 'Conectar WhatsApp'}</button>
              </div>
            </div>
          ) : null}

          {estado === 'qr' ? (
            <div className="grid gap-7 lg:grid-cols-[320px_1fr] lg:items-center">
              <div className="rounded-[24px] border border-[#d9e0d6] bg-white p-4 shadow-[0_18px_50px_rgba(15,23,16,.09)]"><img src={qrCode} alt="Código QR para vincular WhatsApp" className="aspect-square w-full object-contain" /></div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Escanea desde el número que quieras usar</p>
                <h3 className="mt-2 text-3xl font-black tracking-[-.03em] text-[#111711]">Vinculación lista</h3>
                <div className="mt-5 space-y-3 text-sm leading-6 text-[#697468]">
                  <p><strong className="text-[#111711]">1.</strong> Abre WhatsApp en el teléfono.</p>
                  <p><strong className="text-[#111711]">2.</strong> Entra a <strong className="text-[#111711]">Dispositivos vinculados</strong>.</p>
                  <p><strong className="text-[#111711]">3.</strong> Pulsa <strong className="text-[#111711]">Vincular un dispositivo</strong> y escanea este QR.</p>
                </div>
                <p className="mt-5 text-xs text-[#7a8477]">Esta pantalla detectará automáticamente cuando la conexión quede activa.</p>
                <button type="button" disabled={Boolean(busy)} onClick={() => void connectWhatsApp()} className={`${DIRECTOR_BUTTON_DARK} mt-5`}>Generar QR nuevo</button>
              </div>
            </div>
          ) : null}

          {estado === 'connected' ? (
            <div className="grid min-h-[320px] place-items-center">
              <div className="max-w-2xl text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-[#b7ff00] bg-[#f3fadf] text-4xl text-[#111711]">✓</div>
                <h3 className="mt-5 text-3xl font-black tracking-[-.03em] text-[#111711]">Canal operativo</h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#697468]">{academyName} ya puede utilizar WhatsApp para las funciones habilitadas en Lestra. Si la academia cambia de número, usa <strong className="text-[#111711]">Cambiar número</strong>; no necesitas soporte ni crear otra academia.</p>
              </div>
            </div>
          ) : null}

          {estado === 'error' ? (
            <div className="grid min-h-[320px] place-items-center">
              <div className="max-w-lg rounded-[20px] border border-red-200 bg-red-50 p-6 text-center">
                <div className="text-3xl text-red-700">!</div>
                <h3 className="mt-3 text-xl font-black text-[#111711]">No pudimos completar la acción</h3>
                <p className="mt-2 text-sm leading-6 text-red-700">{mensajeError}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={() => void checkWhatsAppStatus(true)} className={DIRECTOR_BUTTON_DARK}>Reintentar</button>
                  <button type="button" onClick={() => void connectWhatsApp()} className={DIRECTOR_BUTTON}>Conectar de nuevo</button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DirectorPanel>
    </DirectorPage>
  );
};

export default WhatsApp;