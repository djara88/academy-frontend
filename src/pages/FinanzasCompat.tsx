import { lazy, Suspense, useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import { DIRECTOR_BUTTON, DirectorHero, DirectorPage, DirectorPanel } from '../components/director/DirectorModule';

const FinanzasAdvanced = lazy(() => import('./FinanzasMultirama'));
const FinanzasLegacy = lazy(() => import('./FinanzasLegacy'));

type Mode = 'checking' | 'advanced' | 'legacy' | 'unavailable';

export default function FinanzasCompat() {
  const [mode, setMode] = useState<Mode>('checking');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    const check = async () => {
      setMode('checking');
      try {
        await api.get('/api/finanzas/cobranza/configuracion');
        if (active) setMode('advanced');
      } catch (error: any) {
        const status = Number(error?.response?.status || 0);
        if (!active) return;

        // El modo legacy existe únicamente para instalaciones cuyo backend aún no
        // expone el módulo de cobranza. Un 5xx, timeout o caída de red NO debe
        // degradar silenciosamente a otra vista financiera porque podría hacer
        // creer al director que está viendo el estado completo y vigente.
        if (status === 404 || status === 405) setMode('legacy');
        else if (status === 401 || status === 403) setMode('advanced');
        else setMode('unavailable');
      }
    };
    void check();
    return () => { active = false; };
  }, [retryKey]);

  if (mode === 'checking') {
    return <DirectorPanel className="mx-auto max-w-6xl p-12 text-center text-sm font-bold text-[#697468]" role="status" aria-live="polite">Comprobando servicios financieros...</DirectorPanel>;
  }

  if (mode === 'unavailable') {
    return <DirectorPage className="finance-module-scope max-w-[1500px]">
      <DirectorHero
        eyebrow="Administración financiera"
        title="Finanzas"
        description="No mostramos cifras parciales cuando no podemos verificar el servicio financiero principal."
      />
      <DirectorPanel className="mx-auto max-w-3xl p-6 sm:p-8" role="alert">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.12em] text-rose-700">Estado no verificado</p>
            <h2 className="mt-2 text-xl font-black text-[#111711]">No fue posible confirmar el estado financiero actual</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#596456]">Para evitar mostrar saldos incompletos o una vista antigua, Finanzas queda temporalmente bloqueado hasta recuperar la conexión con el servicio principal. No se ha modificado ningún dato.</p>
          </div>
          <button type="button" onClick={() => setRetryKey((value) => value + 1)} className={`${DIRECTOR_BUTTON} shrink-0`}>Reintentar</button>
        </div>
      </DirectorPanel>
    </DirectorPage>;
  }

  return <DirectorPage className="finance-module-scope max-w-[1500px]">
    <DirectorHero
      eyebrow="Administración financiera"
      title="Finanzas"
      description="Revisa lo recaudado, la deuda pendiente y los movimientos que requieren acción."
    />
    <Suspense fallback={<DirectorPanel className="p-12 text-center text-sm font-bold text-[#697468]" role="status">Cargando Finanzas...</DirectorPanel>}>
      {mode === 'advanced' ? <FinanzasAdvanced /> : <FinanzasLegacy />}
    </Suspense>
  </DirectorPage>;
}
