import { lazy, Suspense, useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import { DirectorHero, DirectorPage, DirectorPanel } from '../components/director/DirectorModule';

const FinanzasAdvanced = lazy(() => import('./FinanzasMultirama'));
const FinanzasLegacy = lazy(() => import('./FinanzasLegacy'));

type Mode = 'checking' | 'advanced' | 'legacy';

export default function FinanzasCompat() {
  const [mode, setMode] = useState<Mode>('checking');

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        await api.get('/api/finanzas/cobranza/configuracion');
        if (active) setMode('advanced');
      } catch (error: any) {
        const status = Number(error?.response?.status || 0);
        if (active) setMode(status === 401 || status === 403 ? 'advanced' : 'legacy');
      }
    };
    void check();
    return () => { active = false; };
  }, []);

  if (mode === 'checking') {
    return <DirectorPanel className="mx-auto max-w-6xl p-12 text-center text-sm font-bold text-[#697468]">Comprobando servicios financieros...</DirectorPanel>;
  }

  return <DirectorPage className="finance-module-scope max-w-[1500px]">
    <DirectorHero
      eyebrow="Administración financiera"
      title="Finanzas y recaudación"
      description="Controla cuentas corrientes, pagos, egresos, flujo y cobranza desde una sola vista conectada a las inscripciones deportivas y medios de pago de la academia."
      aside={
        <div className="finance-hero-connected-card rounded-[22px] border p-5 sm:p-6">
          <p className="finance-hero-connected-eyebrow text-[10px] font-black uppercase tracking-[.14em]">Operación conectada</p>
          <p className="finance-hero-connected-title mt-2 text-lg font-black tracking-[-.02em] sm:text-xl">Cobros → pagos → conciliación</p>
          <p className="finance-hero-connected-copy mt-3 text-xs font-semibold leading-5 sm:text-sm sm:leading-6">Cada movimiento se actualiza en tiempo real, sin duplicación ni tareas manuales.</p>
        </div>
      }
    />
    <Suspense fallback={<DirectorPanel className="p-12 text-center text-sm font-bold text-[#697468]">Cargando Finanzas...</DirectorPanel>}>
      {mode === 'advanced' ? <FinanzasAdvanced /> : <FinanzasLegacy />}
    </Suspense>
  </DirectorPage>;
}
