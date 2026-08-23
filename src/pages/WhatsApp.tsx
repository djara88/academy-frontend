import React, { useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { useAppDialog } from '../contexts/DialogContext';
import { getAcademyName } from '../config/brand';

type ConnectionState = 'loading' | 'disconnected' | 'qr' | 'connected' | 'error';

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
    if (data.conectado) {
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
        if (estado !== 'qr') setEstado('loading');
      }
      setMensajeError('');
      const response = await api.get(`/api/whatsapp-bridge/connection/${academyId}`);
      applyPayload(response.data, !showLoading && estado === 'qr');
    } catch (error: any) {
      if (!showLoading && estado === 'qr') return;
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
      if (!response.data?.conectado && !response.data?.qrCode) {
        await checkWhatsAppStatus(false);
      }
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

  useEffect(() => {
    void checkWhatsAppStatus(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academyId]);

  useEffect(() => {
    if (estado !== 'qr' || !academyId) return;
    const timer = window.setInterval(() => { void checkWhatsAppStatus(false); }, 4000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, academyId]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#0b110d] p-6 shadow-[0_24px_60px_rgba(11,17,13,.16)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[34px] border-[#caff00]/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] !text-[#caff00]">Canal oficial de la academia</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.045em] !text-white sm:text-5xl">WhatsApp</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 !text-[#c4cdc5] sm:text-base">
              Vincula el número que usará {academyName} para notificaciones y comunicaciones. El director puede desconectarlo o reemplazarlo cuando lo necesite.
            </p>
          </div>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void checkWhatsAppStatus(true)}
            className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-black !text-white transition hover:border-[#caff00]/50 hover:bg-white/10 disabled:opacity-50"
          >
            {busy === 'refresh' ? 'Verificando…' : '↻ Actualizar estado'}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#293229] !bg-[#0b110d] shadow-[0_18px_45px_rgba(11,17,13,.10)]">
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] !text-[#caff00]">Estado de vinculación</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black !text-white">
                {estado === 'connected' ? 'WhatsApp conectado' : estado === 'qr' ? 'Esperando vinculación' : estado === 'loading' ? 'Verificando…' : 'WhatsApp desconectado'}
              </h2>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${estado === 'connected' ? 'border-[#caff00]/35 bg-[#caff00]/10 !text-[#caff00]' : estado === 'qr' ? 'border-white/20 bg-white/5 !text-white' : 'border-white/15 bg-white/[.03] !text-[#aeb8ae]'}`}>
                {estado === 'connected' ? 'Activo' : estado === 'qr' ? 'QR activo' : 'Sin conexión'}
              </span>
            </div>
            {numero ? <p className="mt-2 text-sm !text-[#c4cdc5]">Número vinculado: <strong className="!text-white">{numero}</strong></p> : null}
          </div>

          {estado === 'connected' ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void changeNumber()}
                className="min-h-11 rounded-xl border border-[#caff00]/35 bg-[#caff00]/10 px-4 text-sm font-black !text-[#caff00] transition hover:bg-[#caff00]/15 disabled:opacity-50"
              >
                {busy === 'change' ? 'Preparando…' : 'Cambiar número'}
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void disconnectWhatsApp()}
                className="min-h-11 rounded-xl border border-red-400/35 bg-red-500/10 px-4 text-sm font-black !text-red-300 transition hover:bg-red-500/15 disabled:opacity-50"
              >
                {busy === 'disconnect' ? 'Desconectando…' : 'Desconectar'}
              </button>
            </div>
          ) : null}
        </div>

        <div className="min-h-[390px] p-5 sm:p-8">
          {estado === 'loading' ? (
            <div className="grid min-h-[320px] place-items-center text-center">
              <div><div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-[#caff00]" /><p className="mt-4 text-sm font-bold !text-[#c4cdc5]">Verificando la conexión…</p></div>
            </div>
          ) : null}

          {estado === 'disconnected' ? (
            <div className="grid min-h-[320px] place-items-center">
              <div className="max-w-xl text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#caff00] text-3xl">📱</div>
                <h3 className="mt-5 text-2xl font-black !text-white">Conecta el número de tu academia</h3>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 !text-[#aeb8ae]">Lestra generará un QR. Escanéalo desde WhatsApp → Dispositivos vinculados. El número puede cambiarse posteriormente desde esta misma pantalla.</p>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void connectWhatsApp()}
                  className="mt-6 min-h-12 rounded-xl !bg-[#caff00] px-6 text-sm font-black !text-[#0b110d] shadow-[0_10px_24px_rgba(202,255,0,.14)] transition hover:!bg-[#b9e937] disabled:opacity-50"
                >
                  {busy === 'connect' ? 'Generando QR…' : 'Conectar WhatsApp'}
                </button>
              </div>
            </div>
          ) : null}

          {estado === 'qr' ? (
            <div className="grid gap-7 lg:grid-cols-[320px_1fr] lg:items-center">
              <div className="rounded-[24px] bg-white p-4 shadow-2xl">
                <img src={qrCode} alt="Código QR para vincular WhatsApp" className="aspect-square w-full object-contain" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[.16em] !text-[#caff00]">Escanea desde el número que quieras usar</p>
                <h3 className="mt-2 text-3xl font-black !text-white">Vinculación lista</h3>
                <div className="mt-5 space-y-3 text-sm leading-6 !text-[#c4cdc5]">
                  <p><strong className="!text-white">1.</strong> Abre WhatsApp en el teléfono.</p>
                  <p><strong className="!text-white">2.</strong> Entra a <strong className="!text-white">Dispositivos vinculados</strong>.</p>
                  <p><strong className="!text-white">3.</strong> Pulsa <strong className="!text-white">Vincular un dispositivo</strong> y escanea este QR.</p>
                </div>
                <p className="mt-5 text-xs !text-[#899389]">Esta pantalla detectará automáticamente cuando la conexión quede activa.</p>
                <button type="button" disabled={Boolean(busy)} onClick={() => void connectWhatsApp()} className="mt-5 min-h-11 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-black !text-white hover:border-[#caff00]/40 disabled:opacity-50">Generar QR nuevo</button>
              </div>
            </div>
          ) : null}

          {estado === 'connected' ? (
            <div className="grid min-h-[320px] place-items-center">
              <div className="max-w-2xl text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-[#caff00]/50 bg-[#caff00]/10 text-4xl">✓</div>
                <h3 className="mt-5 text-3xl font-black !text-white">Canal operativo</h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 !text-[#c4cdc5]">{academyName} ya puede utilizar WhatsApp para las funciones habilitadas en Lestra. Si la academia cambia de número, usa <strong className="!text-white">Cambiar número</strong>; no necesitas soporte ni crear otra academia.</p>
              </div>
            </div>
          ) : null}

          {estado === 'error' ? (
            <div className="grid min-h-[320px] place-items-center">
              <div className="max-w-lg rounded-2xl border border-red-400/25 bg-red-500/10 p-6 text-center">
                <div className="text-3xl">!</div>
                <h3 className="mt-3 text-xl font-black !text-white">No pudimos completar la acción</h3>
                <p className="mt-2 text-sm leading-6 !text-red-200">{mensajeError}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={() => void checkWhatsAppStatus(true)} className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-black !text-white">Reintentar</button>
                  <button type="button" onClick={() => void connectWhatsApp()} className="min-h-11 rounded-xl !bg-[#caff00] px-4 text-sm font-black !text-[#0b110d]">Conectar de nuevo</button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[#d3dad0] bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#789600]">Control del director</p><h3 className="mt-2 font-black text-[#11170f]">Conectar y desconectar</h3><p className="mt-2 text-sm leading-5 text-[#687168]">La academia decide cuándo mantener operativo el canal.</p></div>
        <div className="rounded-2xl border border-[#d3dad0] bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#789600]">Cambio de número</p><h3 className="mt-2 font-black text-[#11170f]">Sin quedar amarrado</h3><p className="mt-2 text-sm leading-5 text-[#687168]">El director puede liberar la vinculación anterior y escanear un QR con otro número.</p></div>
        <div className="rounded-2xl border border-[#d3dad0] bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#789600]">Datos de Lestra</p><h3 className="mt-2 font-black text-[#11170f]">La operación se conserva</h3><p className="mt-2 text-sm leading-5 text-[#687168]">Desconectar WhatsApp no elimina alumnos, pagos, torneos ni configuraciones.</p></div>
      </section>
    </div>
  );
};

export default WhatsApp;
