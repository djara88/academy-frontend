import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';

interface Props {
  children: ReactNode;
}

type GateMode = 'loading' | 'enroll' | 'challenge' | 'ready' | 'error';

const normalizeCode = (value: string) => value.replace(/\D/g, '').slice(0, 6);

const SuperadminMfaGate: React.FC<Props> = ({ children }) => {
  const { logout } = useAuth();
  const [mode, setMode] = useState<GateMode>('loading');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const prepareMfa = useCallback(async () => {
    setMode('loading');
    setError('');
    setCode('');

    try {
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) throw aalError;
      if (aalData.currentLevel === 'aal2') {
        setMode('ready');
        return;
      }

      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactors = factorsData?.totp || [];
      const verifiedFactor = totpFactors.find((factor) => factor.status === 'verified');

      if (verifiedFactor) {
        setFactorId(verifiedFactor.id);
        setQrCode('');
        setSecret('');
        setMode('challenge');
        return;
      }

      // Los factores incompletos no aportan seguridad y pueden acumularse si el
      // usuario recarga a mitad del enrolamiento. Intentamos retirarlos antes de
      // crear un QR nuevo; cualquier fallo de limpieza no bloquea el setup.
      const unverifiedFactors = totpFactors.filter((factor) => factor.status !== 'verified');
      await Promise.all(unverifiedFactors.map(async (factor) => {
        try {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        } catch (_error) {
          // El enrolamiento posterior decidirá si Supabase permite otro factor.
        }
      }));

      const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Syncademia Superadmin',
      });
      if (enrollError) throw enrollError;

      setFactorId(enrollData.id);
      setQrCode(enrollData.totp.qr_code);
      setSecret(enrollData.totp.secret);
      setMode('enroll');
    } catch (err) {
      console.error('MFA setup error:', err);
      setError('No fue posible preparar la verificación MFA. Vuelve a intentarlo.');
      setMode('error');
    }
  }, []);

  useEffect(() => {
    void prepareMfa();
  }, [prepareMfa]);

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!factorId || code.length !== 6) return;

    setVerifying(true);
    setError('');
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (verifyError) throw verifyError;

      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) throw aalError;
      if (aalData.currentLevel !== 'aal2') {
        throw new Error('La sesión no alcanzó AAL2');
      }

      // challengeAndVerify actualiza la sesión; refreshSession fuerza que el JWT
      // AAL2 quede disponible inmediatamente para las llamadas al backend.
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;
      if (refreshed.session?.access_token) {
        sessionStorage.setItem('token', refreshed.session.access_token);
      }

      setCode('');
      setMode('ready');
    } catch (err) {
      console.error('MFA verification error:', err);
      setError('El código no pudo verificarse. Revisa tu autenticador e inténtalo nuevamente.');
    } finally {
      setVerifying(false);
    }
  };

  if (mode === 'ready') return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#0d1117] px-4 py-10 text-[#e6edf3] flex items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border border-[#30363d] bg-[#161b22] p-7 shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-14 w-14 rounded-xl border border-[#289E9D]/50 bg-[#0d1117] p-2">
            <Logo variant="mark" className="h-full w-full" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#289E9D]">Seguridad del panel maestro</p>
            <h1 className="text-2xl font-extrabold">Verificación en dos pasos</h1>
          </div>
        </div>

        {mode === 'loading' && (
          <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-6 text-center text-[#8b949e]">
            Preparando autenticación segura…
          </div>
        )}

        {mode === 'enroll' && (
          <>
            <p className="text-sm leading-6 text-[#b1bac4] mb-5">
              Escanea este QR con tu aplicación de autenticación. Este paso se realiza una sola vez; después, cada acceso al panel maestro pedirá un código temporal de 6 dígitos.
            </p>
            <div className="mx-auto mb-5 w-fit rounded-2xl bg-white p-4 shadow-lg">
              {qrCode ? <img src={qrCode} alt="QR para configurar MFA" className="h-56 w-56" /> : null}
            </div>
            <div className="mb-5 rounded-xl border border-[#30363d] bg-[#0d1117] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">Clave manual de respaldo para enrolamiento</p>
              <code className="block break-all text-sm font-bold tracking-wider text-[#e6edf3] select-all">{secret}</code>
            </div>
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-200">
              No compartas ni guardes capturas del QR. La clave anterior permite registrar un autenticador nuevo mientras este enrolamiento está abierto.
            </div>
          </>
        )}

        {mode === 'challenge' && (
          <p className="text-sm leading-6 text-[#b1bac4] mb-5">
            Abre tu autenticador y escribe el código temporal de 6 dígitos asociado a Syncademia.
          </p>
        )}

        {(mode === 'enroll' || mode === 'challenge') && (
          <form onSubmit={verify} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold">Código de 6 dígitos</label>
              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(normalizeCode(event.target.value))}
                placeholder="000000"
                className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3 text-center text-2xl font-extrabold tracking-[0.35em] outline-none transition focus:border-[#289E9D]"
              />
            </div>
            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
            <button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="w-full rounded-xl bg-[#289E9D] px-4 py-3 font-bold text-white transition hover:bg-[#1f7a79] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {verifying ? 'Verificando…' : mode === 'enroll' ? 'Activar MFA y entrar' : 'Verificar y entrar'}
            </button>
          </form>
        )}

        {mode === 'error' && (
          <>
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
            <button onClick={() => void prepareMfa()} className="w-full rounded-xl bg-[#289E9D] px-4 py-3 font-bold text-white">Reintentar</button>
          </>
        )}

        <button onClick={() => void logout()} className="mt-5 w-full text-sm font-semibold text-[#8b949e] hover:text-white">
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};

export default SuperadminMfaGate;
