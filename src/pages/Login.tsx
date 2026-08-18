import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { Logo } from '../components/Logo';
import { BRAND } from '../config/brand';

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
        : 'Correo o contraseña incorrectos. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Error con Google:', err);
      setError('No se pudo conectar con Google. Intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070B14] p-4 font-sans text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(49,87,255,.24),transparent_30%),radial-gradient(circle_at_84%_78%,rgba(184,255,61,.08),transparent_28%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.18] [background-image:linear-gradient(rgba(255,255,255,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.055)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-[#0B1220]/95 p-7 shadow-[0_32px_100px_rgba(0,0,0,.5)] backdrop-blur-xl sm:p-9">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] border border-[#3157FF]/40 bg-[#09101d] p-3 shadow-[0_18px_55px_rgba(49,87,255,.28)]">
            <Logo variant="mark" className="h-full w-full" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#B8FF3D]">{BRAND.descriptor}</p>
          <h1 className="mt-2 text-3xl font-black tracking-[0.08em] text-white">{BRAND.displayName}</h1>
          <p className="mt-2 text-sm font-semibold text-[#9CA9BA]">{BRAND.tagline}</p>
          <p className="mt-4 text-sm text-[#7F8B9D]">Accede a tu espacio de trabajo</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mb-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-bold text-gray-900 transition hover:bg-gray-100 disabled:opacity-50"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
          <span>Continuar con Google</span>
        </button>

        <div className="mb-6 flex items-center">
          <div className="flex-grow border-t border-white/10" />
          <span className="px-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#687589]">O con tu correo</span>
          <div className="flex-grow border-t border-white/10" />
        </div>

        <form onSubmit={handleManualLogin} className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-[#DCE4EE]">Correo electrónico</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-[#070B14] p-3.5 text-white outline-none transition placeholder:text-[#536073] focus:border-[#3157FF] focus:ring-2 focus:ring-[#3157FF]/15"
              placeholder="director@academia.com"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-[#DCE4EE]">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-[#070B14] p-3.5 text-white outline-none transition placeholder:text-[#536073] focus:border-[#3157FF] focus:ring-2 focus:ring-[#3157FF]/15"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-200">
              <span aria-hidden="true">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 w-full rounded-xl bg-[#3157FF] px-4 py-3 font-black text-white shadow-[0_16px_35px_rgba(49,87,255,.25)] transition hover:bg-[#4265FF] disabled:opacity-50"
          >
            {loading ? 'Validando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#7F8B9D]">
          ¿No tienes una cuenta?{' '}
          <Link to="/registro" className="font-black text-[#B8FF3D] hover:underline">
            Probar Lestra 15 días
          </Link>
        </p>

        <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#485467]">{BRAND.domain}</p>
      </div>
    </div>
  );
};

export default Login;