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

  return <DirectorPage className="max-w-[1500px]">
    <DirectorHero eyebrow="Administración financiera" title="Finanzas y recaudación" description="Controla cuentas corrientes, pagos, egresos, flujo y cobranza desde una sola vista conectada a las inscripciones deportivas y medios de pago de la academia." aside={<div className="rounded-[22px] border border-white/10 bg-white/5 p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b7ff00]">Operación conectada</p><p className="mt-2 text-lg font-black text-white">Cobros → pagos → conciliación</p><p className="mt-2 text-xs leading-5 text-[#c7d0c8]">Cada movimiento mantiene el vínculo con el alumno y su inscripción deportiva.</p></div>}/>
    <Suspense fallback={<DirectorPanel className="p-12 text-center text-sm font-bold text-[#697468]">Cargando Finanzas...</DirectorPanel>}>
      {mode === 'advanced' ? <FinanzasAdvanced /> : <FinanzasLegacy />}
    </Suspense>
  </DirectorPage>;
}
