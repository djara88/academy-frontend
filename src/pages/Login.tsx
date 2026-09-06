import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { Logo } from '../components/Logo';
import { BRAND } from '../config/brand';

const GOOGLE_LOGIN_INTENT_KEY = 'lestra_google_login_intent';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      const storedUser = JSON.parse(sessionStorage.getItem('user') || '{}');

      if (storedUser.email === 'd.jarazerene@gmail.com' || storedUser.rol === 'superadmin' || storedUser.rol === 'SUPER_ADMIN') {
        navigate('/admin');
      } else if (storedUser.requiere_cambio_password) {
        navigate('/cambiar-password');
      } else if (String(storedUser.rol).toLowerCase() === 'profesor') {
        navigate('/profesor');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message === 'ACCOUNT_DISABLED'
        ? 'Tu acceso está desactivado. Contacta a la dirección de tu academia.'
        : 'Correo o contraseña incorrectos. Revisa tus datos e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    sessionStorage.setItem(GOOGLE_LOGIN_INTENT_KEY, '1');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err: any) {
      sessionStorage.removeItem(GOOGLE_LOGIN_INTENT_KEY);
      console.error('Error con Google:', err);
      setError('No se pudo conectar con Google. Intenta nuevamente o usa tu correo.');
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080c14] p-4 font-sans text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(49,87,255,.16),transparent_32%)]" />

      <main className="relative w-full max-w-md rounded-[24px] border border-white/10 bg-[#0d1420]/96 p-7 shadow-[0_24px_70px_rgba(0,0,0,.38)] sm:p-9" aria-labelledby="login-title">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[18px] border border-white/10 bg-[#111a29] p-3">
            <Logo variant="mark" className="h-full w-full" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#B8FF3D]">{BRAND.descriptor}</p>
          <h1 id="login-title" className="mt-2 text-3xl font-black tracking-tight text-white">Bienvenido a {BRAND.displayName}</h1>
          <p className="mt-2 text-sm text-[#93a1b1]">Ingresa a tu espacio de gestión deportiva.</p>
        </header>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mb-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-bold text-gray-900 hover:bg-gray-100 disabled:cursor-wait disabled:opacity-60"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="" width="20" height="20" className="h-5 w-5" />
          <span>{loading ? 'Conectando…' : 'Continuar con Google'}</span>
        </button>

        <div className="mb-6 flex items-center" aria-hidden="true">
          <div className="flex-grow border-t border-white/10" />
          <span className="px-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#687589]">O con correo</span>
          <div className="flex-grow border-t border-white/10" />
        </div>

        <form onSubmit={handleManualLogin} className="space-y-5" noValidate={false}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-[#DCE4EE]">Correo electrónico</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-[#080c14] p-3.5 text-white placeholder:text-[#536073] focus-visible:border-[#3157FF]"
              placeholder="director@academia.cl"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-[#DCE4EE]">Contraseña</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-[#080c14] p-3.5 text-white placeholder:text-[#536073] focus-visible:border-[#3157FF]"
              placeholder="Tu contraseña…"
            />
          </label>

          <div aria-live="polite" aria-atomic="true">
            {error ? (
              <div className="flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100" role="alert">
                <span aria-hidden="true">⚠️</span>
                <p>{error}</p>
              </div>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 w-full rounded-xl bg-[#3157FF] px-4 py-3 font-black text-white shadow-[0_12px_28px_rgba(49,87,255,.22)] hover:bg-[#4265FF] disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? 'Validando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#8b98a8]">
          ¿Aún no tienes una cuenta?{' '}
          <Link to="/registro" className="font-black text-[#B8FF3D] hover:text-[#d5ff76] hover:underline">
            Probar 15 días
          </Link>
        </p>
      </main>
    </div>
  );
};

export default Login;