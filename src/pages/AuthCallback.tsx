import { useEffect } from 'react';
import { Logo } from '../components/Logo';
import { BRAND } from '../config/brand';

const AuthCallback = () => {
  useEffect(() => {
    const apiUrl = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    if (!apiUrl) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10_000);
    void fetch(`${apiUrl}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    }).catch(() => undefined).finally(() => window.clearTimeout(timer));
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070B14] px-6 text-white">
      <div className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-[#3157FF]/40 bg-[#09101d] p-3 shadow-[0_18px_55px_rgba(49,87,255,.24)]">
          <Logo variant="mark" className="h-full w-full" />
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-[#B8FF3D]">{BRAND.name}</p>
        <h1 className="mt-2 text-2xl font-black">Ingresando a tu espacio...</h1>
        <p className="mt-2 text-sm text-[#8793A5]">Estamos validando tu sesión de forma segura.</p>
        <div className="mx-auto mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-[#3157FF]" />
        </div>
      </div>
    </main>
  );
};

export default AuthCallback;
