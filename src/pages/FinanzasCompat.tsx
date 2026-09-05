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
      title="Finanzas"
      description="Revisa lo recaudado, la deuda pendiente y los movimientos que requieren acción."
    />
    <Suspense fallback={<DirectorPanel className="p-12 text-center text-sm font-bold text-[#697468]">Cargando Finanzas...</DirectorPanel>}>
      {mode === 'advanced' ? <FinanzasAdvanced /> : <FinanzasLegacy />}
    </Suspense>
  </DirectorPage>;
}
