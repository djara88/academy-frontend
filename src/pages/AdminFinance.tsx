import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosConfig';
import { useAdminTheme } from '../contexts/AdminThemeContext';
import { useAppDialog } from '../contexts/DialogContext';

type Charge = {
  id: string;
  concepto: string;
  total_clp: number;
  estado: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  pagado_at?: string | null;
  notas?: string | null;
  target_plan_code?: string | null;
  target_guardian_license?: boolean | null;
  academias?: { id: string; nombre: string } | null;
};
type Movement = { id: string; tipo: 'ingreso' | 'egreso'; categoria: string; descripcion: string; monto_clp: number; fecha: string; metodo_pago?: string | null; academias?: { nombre: string } | null };
const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value || 0);

const AdminFinance = () => {
  const { theme } = useAdminTheme();
  const light = theme === 'light';
  const { notify, confirmAction } = useAppDialog();
  const qc = useQueryClient();
  const [validating, setValidating] = useState<string | null>(null);
  const [form, setForm] = useState({ tipo: 'egreso', categoria: 'Operación', descripcion: '', monto_clp: '', fecha: new Date().toISOString().slice(0, 10), metodo_pago: 'Transferencia' });
  const { data: charges = [] } = useQuery({ queryKey: ['saas-cobros'], queryFn: async () => (await api.get('/api/saas-admin/cobros')).data.data as Charge[] });
  const { data: movements = [] } = useQuery({ queryKey: ['saas-movimientos'], queryFn: async () => (await api.get('/api/saas-admin/movimientos')).data.data as Movement[] });
  const panel = light ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#1C212D]';
  const text = light ? 'text-slate-950' : 'text-white';
  const muted = light ? 'text-slate-500' : 'text-[#91a0b2]';
  const income = movements.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto_clp), 0);
  const expenses = movements.filter((m) => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto_clp), 0);
  const receivable = charges.filter((c) => ['pendiente', 'vencido'].includes(c.estado)).reduce((s, c) => s + Number(c.total_clp), 0);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api.post('/api/saas-admin/movimientos', { ...form, monto_clp: Number(form.monto_clp) });
      setForm((v) => ({ ...v, descripcion: '', monto_clp: '' }));
      await qc.invalidateQueries({ queryKey: ['saas-movimientos'] });
      await qc.invalidateQueries({ queryKey: ['saas-resumen'] });
      await notify('Movimiento registrado.', { title: 'Finanzas Syncademia' });
    } catch (err: any) {
      await notify(err.response?.data?.error || 'No fue posible registrar.', { title: 'Finanzas Syncademia' });
    }
  };

  const markPaid = async (charge: Charge) => {
    const confirmed = await confirmAction(`¿Validar el pago de ${money(charge.total_clp)} de ${charge.academias?.nombre || 'esta academia'}? Si corresponde a una contratación, la licencia se activará inmediatamente.`, { title: 'Validar Mercado Pago' });
    if (!confirmed) return;
    setValidating(charge.id);
    try {
      const response = await api.patch(`/api/saas-admin/cobros/${charge.id}/pagado`, { metodo_pago: 'Mercado Pago' });
      await qc.invalidateQueries({ queryKey: ['saas-cobros'] });
      await qc.invalidateQueries({ queryKey: ['saas-movimientos'] });
      await qc.invalidateQueries({ queryKey: ['saas-resumen'] });
      await notify(response.data.licenseActivated ? 'Pago validado y licencia activada.' : 'Pago validado correctamente.', { title: 'Mercado Pago' });
    } catch (err: any) {
      await notify(err.response?.data?.error || 'No fue posible registrar el pago.', { title: 'Finanzas Syncademia' });
    } finally {
      setValidating(null);
    }
  };

  return <div className="space-y-6 pb-12"><header><p className="text-xs font-black uppercase tracking-[0.2em] text-[#289E9D]">Contabilidad de plataforma</p><h1 className={`mt-2 text-4xl font-black ${text}`}>Finanzas de Syncademia</h1><p className={`mt-2 ${muted}`}>Separadas completamente de la contabilidad interna de cada academia.</p></header>
    <section className="grid gap-4 md:grid-cols-3">{[['Ingresos acumulados', income, 'text-emerald-500'], ['Egresos acumulados', expenses, 'text-red-500'], ['Cuentas por cobrar', receivable, 'text-amber-500']].map(([label, value, color]) => <article key={String(label)} className={`rounded-2xl border p-5 ${panel}`}><p className={`text-xs font-black uppercase ${muted}`}>{label}</p><p className={`mt-3 text-3xl font-black ${color}`}>{money(Number(value))}</p></article>)}</section>
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"><form onSubmit={save} className={`rounded-2xl border p-6 ${panel}`}><h2 className={`text-xl font-black ${text}`}>Registrar movimiento</h2><div className="mt-5 space-y-4"><label><span className="label">Tipo</span><select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="w-full"><option value="ingreso">Ingreso extraordinario</option><option value="egreso">Egreso</option></select></label><label><span className="label">Categoría</span><input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full" /></label><label><span className="label">Descripción</span><input required value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="w-full" /></label><div className="grid gap-3 sm:grid-cols-2"><label><span className="label">Monto CLP</span><input required min="1" type="number" value={form.monto_clp} onChange={(e) => setForm({ ...form, monto_clp: e.target.value })} className="w-full" /></label><label><span className="label">Fecha</span><input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full" /></label></div><button className="btn-primary w-full">Guardar movimiento</button></div></form>
      <div className={`rounded-2xl border p-6 ${panel}`}><div className="flex items-center justify-between gap-3"><div><h2 className={`text-xl font-black ${text}`}>Cobros a academias</h2><p className={`mt-1 text-xs ${muted}`}>Las solicitudes Mercado Pago informadas por clientes quedan aquí para validación.</p></div><span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-sky-400">Mercado Pago</span></div><div className="mt-5 space-y-3">{charges.length ? charges.slice(0, 15).map((charge) => { const informed = charge.notas?.includes('Cliente informó pago Mercado Pago'); return <article key={charge.id} className={`rounded-xl border p-4 ${light ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/15'}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className={`font-black ${text}`}>{charge.academias?.nombre || 'Academia'}</p>{informed && charge.estado !== 'pagado' ? <span className="rounded-full bg-sky-500/15 px-2 py-1 text-[10px] font-black uppercase text-sky-400">Cliente informó pago</span> : null}</div><p className={`mt-1 text-sm ${muted}`}>{charge.concepto} · vence {charge.fecha_vencimiento}</p>{informed ? <p className="mt-2 max-w-xl text-xs leading-5 text-sky-400/80">{charge.notas}</p> : null}</div><div className="flex items-center gap-3"><strong className={charge.estado === 'pagado' ? 'text-emerald-500' : 'text-amber-500'}>{money(charge.total_clp)}</strong>{charge.estado !== 'pagado' && charge.estado !== 'anulado' ? <button disabled={validating !== null} onClick={() => void markPaid(charge)} className="rounded-lg border border-emerald-500/40 px-3 py-2 text-xs font-black text-emerald-500 transition hover:bg-emerald-500/10 disabled:opacity-50">{validating === charge.id ? 'Validando...' : 'Validar pago'}</button> : <span className="text-xs font-black uppercase text-emerald-500">{charge.estado}</span>}</div></div></article>; }) : <p className={`py-10 text-center ${muted}`}>Todavía no existen cobros emitidos.</p>}</div></div></section>
    <section className={`rounded-2xl border p-6 ${panel}`}><h2 className={`text-xl font-black ${text}`}>Libro de movimientos</h2><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className={muted}><tr><th className="pb-3">Fecha</th><th>Tipo</th><th>Detalle</th><th>Academia</th><th className="text-right">Monto</th></tr></thead><tbody>{movements.slice(0, 30).map((m) => <tr key={m.id} className={light ? 'border-t border-slate-100' : 'border-t border-white/10'}><td className="py-3">{m.fecha}</td><td className={m.tipo === 'ingreso' ? 'text-emerald-500' : 'text-red-500'}>{m.tipo}</td><td><strong>{m.descripcion}</strong><div className={muted}>{m.categoria}</div></td><td>{m.academias?.nombre || 'Plataforma'}</td><td className={`text-right font-black ${m.tipo === 'ingreso' ? 'text-emerald-500' : 'text-red-500'}`}>{m.tipo === 'ingreso' ? '+' : '-'}{money(m.monto_clp)}</td></tr>)}</tbody></table></div></section>
  </div>;
};

export default AdminFinance;
