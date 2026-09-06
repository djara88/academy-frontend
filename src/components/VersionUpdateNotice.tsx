import { useCallback, useEffect, useState } from 'react';

type BuildVersion = {
  buildId?: string;
};

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const CURRENT_BUILD_ID = import.meta.env.VITE_BUILD_ID || 'dev';

const VersionUpdateNotice = () => {
  const [latestBuildId, setLatestBuildId] = useState<string | null>(null);

  const checkForUpdate = useCallback(async () => {
    if (!CURRENT_BUILD_ID || CURRENT_BUILD_ID === 'dev') return;

    try {
      const response = await fetch(`/build-version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'cache-control': 'no-cache' },
      });
      if (!response.ok) return;

      const payload = await response.json() as BuildVersion;
      const nextBuildId = payload.buildId?.trim();
      if (nextBuildId && nextBuildId !== CURRENT_BUILD_ID) setLatestBuildId(nextBuildId);
    } catch {
      // La comprobación de versión nunca debe interrumpir el uso de la aplicación.
    }
  }, []);

  useEffect(() => {
    void checkForUpdate();
    const intervalId = window.setInterval(() => void checkForUpdate(), CHECK_INTERVAL_MS);
    const handleFocus = () => void checkForUpdate();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void checkForUpdate();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkForUpdate]);

  if (!latestBuildId) return null;

  const applyUpdate = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('_lestra_build', latestBuildId.slice(0, 12));
    window.location.replace(url.toString());
  };

  return (
    <aside
      aria-live="polite"
      aria-label="Nueva versión disponible"
      className="fixed inset-x-3 bottom-24 z-[120] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-[#c8d4ad] bg-[#f8faF2]/95 p-3 shadow-lg backdrop-blur lg:bottom-5"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-[#20261f]">Nueva versión disponible</p>
        <p className="mt-0.5 text-xs font-semibold leading-5 text-[#657064]">
          Actualiza cuando termines esta acción para cargar los últimos cambios de Lestra.
        </p>
      </div>
      <button
        type="button"
        onClick={applyUpdate}
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[#A3C63A] px-4 text-sm font-black text-[#172006] shadow-sm hover:bg-[#8FAF31] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5E751D]"
      >
        Actualizar
      </button>
    </aside>
  );
};

export default VersionUpdateNotice;
