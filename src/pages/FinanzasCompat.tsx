import { lazy, Suspense, useEffect, useState } from 'react';
import api from '../api/axiosConfig';

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
    return <div className="mx-auto max-w-7xl rounded-[24px] border border-white/10 bg-[#151b25] p-10 text-center font-bold text-[#70e4df]">Comprobando servicios financieros...</div>;
  }

  return <Suspense fallback={<div className="mx-auto max-w-7xl rounded-[24px] border border-white/10 bg-[#151b25] p-10 text-center font-bold text-[#70e4df]">Cargando Finanzas...</div>}>
    {mode === 'advanced' ? <FinanzasAdvanced /> : <FinanzasLegacy />}
  </Suspense>;
}
