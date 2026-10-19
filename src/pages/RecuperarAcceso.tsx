import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { BRAND } from '../config/brand';
import { Logo } from '../components/Logo';

interface RecoveryResponse {
  success: boolean;
  message: string;
}

const RecuperarAcceso = () => {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const requestRecovery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await api.post<RecoveryResponse>('/api/academias/recuperar-acceso', {
        email: email.trim().toLowerCase(),
      });
      setMessage(result.data.message || 'Si el correo existe, recibirás instrucciones para recuperar tu cuenta.');
    } catch (unknownError: unknown) {
      const description = axios.isAxiosError<{ error?: string }>(unknownError)
        ? unknownError.response?.data?.error
        : undefined;
      setError(description || 'No fue posible solicitar la recuperación. Inténtalo de nuevo más tarde.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080c14] p-4 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1420] p-7 shadow-2xl sm:p-9" aria-labelledby="recovery-title">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#111a29] p-3">
          <Logo variant="mark" className="h-full w-full" />
        </div>
        <p className="text-center text-sm font-bold text-[#B8FF3D]">{BRAND.name}</p>
        <h1 id="recovery-title" className="mt-2 text-center text-2xl font-extrabold">Recuperar acceso</h1>
        <p className="mt-3 text-center text-sm leading-6 text-[#AAB7C9]">
          Indica el correo de tu cuenta. Si está registrado, te enviaremos un enlace temporal para crear una nueva contraseña.
        </p>
        <form className="mt-7 space-y-4" onSubmit={requestRecovery}>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Correo electrónico</span>
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy || Boolean(message)}
              placeholder="tu@academia.cl"
              className="min-h-12 w-full rounded-xl border border-white/20 bg-[#080c14] px-4 text-base text-white outline-none focus-visible:ring-2 focus-visible:ring-[#B8FF3D]"
            />
          </label>
          {message && <p role="status" className="rounded-xl border border-[#B8FF3D]/30 bg-[#B8FF3D]/10 p-4 text-sm text-[#E5FFC1]">{message}</p>}
          {error && <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">{error}</p>}
          <button type="submit" disabled={busy || Boolean(message)} className="min-h-12 w-full rounded-xl bg-[#3157FF] px-4 font-bold text-white hover:bg-[#4265FF] disabled:opacity-60">
            {busy ? 'Enviando…' : 'Enviar enlace de recuperación'}
          </button>
        </form>
        <Link className="mt-6 block text-center text-sm font-bold text-[#B8FF3D] underline-offset-4 hover:underline" to="/login">
          Volver a iniciar sesión
        </Link>
      </section>
    </main>
  );
};

export default RecuperarAcceso;
