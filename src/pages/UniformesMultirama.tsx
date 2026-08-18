import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../api/axiosConfig';
import { useAcademyMessages } from '../hooks/useAcademyMessages';

type Branch = { id: string; nombre: string; disciplina: string; sede_id: string; sedes?: { id: string; nombre: string } | null };
type Garment = {
  id: string;
  nombre: string;
  precio: number;
  tipo_operacion: 'Stock' | 'Taller';
  stock_disponible: number;
  aplica_numero: boolean;
  aplica_nombre_estampado: boolean;
  rama_id?: string | null;
  sede_id?: string | null;
  ramas?: Branch | null;
  sedes?: { id: string; nombre: string } | null;
};
type Enrollment = { id: string; sede_id: string; rama_id: string; categoria_id?: string | null; rol_especialidad?: string | null; es_principal?: boolean };
type Student = {
  id: string;
  nombre: string;
  foto_base64?: string | null;
  foto_url?: string | null;
  avatar_url?: string | null;
  talla_uniforme?: string | null;
  numero_camiseta?: number | null;
  nombre_camiseta?: string | null;
  talla_apoderado?: string | null;
  inscripciones: Enrollment[];
};
type Order = {
  id: string;
  jugador_id: string;
  inscripcion_id?: string | null;
  rama_id?: string | null;
  sede_id?: string | null;
  prenda_id?: string | null;
  prenda_nombre: string;
  talla: string;
  monto: number;
  estado_pago: string;
  estado_entrega: string;
  numero_estampado?: number | null;
  nombre_estampado?: string | null;
  jugadores?: { id: string; nombre: string; foto_base64?: string | null; foto_url?: string | null; avatar_url?: string | null } | null;
  ramas?: { id: string; nombre: string; disciplina: string } | null;
  sedes?: { id: string; nombre: string } | null;
  prendas_catalogo?: { tipo_operacion?: string | null; rama_id?: string | null } | null;
};
type Payload = { ramas: Branch[]; rama_seleccionada_id?: string | null; catalogo: Garment[]; pedidos: Order[]; alumnos: Student[]; resumenTaller: Record<string, number> };

type CatalogForm = {
  nombre: string;
  precio: string;
  tipo_operacion: 'Taller' | 'Stock';
  stock_disponible: string;
  aplica_numero: boolean;
  aplica_nombre_estampado: boolean;
  rama_id: string;
};
type OrderForm = {
  jugador_id: string;
  rama_id: string;
  prenda_id: string;
  talla: string;
  numero_estampado: string;
  nombre_estampado: string;
  estado_pago: string;
  generar_cobro: boolean;
};

const field = 'w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#289E9D]';
const panel = 'rounded-[24px] border border-white/10 bg-[#151b25]';
const money = (value: number) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'A';
const photoOf = (value?: { foto_base64?: string | null; foto_url?: string | null; avatar_url?: string | null } | null) => value?.foto_url || value?.avatar_url || value?.foto_base64 || null;
const safeFile = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'Academia';

const emptyCatalog = (ramaId = ''): CatalogForm => ({
  nombre: '', precio: '0', tipo_operacion: 'Taller', stock_disponible: '0',
  aplica_numero: false, aplica_nombre_estampado: false, rama_id: ramaId,
});
const emptyOrder = (ramaId = ''): OrderForm => ({
  jugador_id: '', rama_id: ramaId, prenda_id: '', talla: '', numero_estampado: '', nombre_estampado: '',
  estado_pago: 'Pendiente de Pago', generar_cobro: true,
});

export default function UniformesMultirama() {
  const { confirmAction, notify } = useAcademyMessages();
  const [data, setData] = useState<Payload>({ ramas: [], catalogo: [], pedidos: [], alumnos: [], resumenTaller: {} });
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [editingGarmentId, setEditingGarmentId] = useState<string | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catalogForm, setCatalogForm] = useState<CatalogForm>(emptyCatalog());
  const [orderForm, setOrderForm] = useState<OrderForm>(emptyOrder());

  const load = useCallback(async (selectedBranch = branchId) => {
    setLoading(true);
    try {
      const response = await api.get('/api/uniformes', { params: selectedBranch ? { rama_id: selectedBranch } : undefined });
      const payload = response.data.data as Payload;
      setData(payload);
      if (!selectedBranch && payload.ramas.length === 1) setBranchId(payload.ramas[0].id);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible cargar Uniformes.');
    } finally {
      setLoading(false);
    }
  }, [branchId, notify]);

  useEffect(() => { void load(branchId); }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const branch = useMemo(() => data.ramas.find((item) => item.id === branchId) || null, [data.ramas, branchId]);
  const selectedStudent = useMemo(() => data.alumnos.find((item) => item.id === orderForm.jugador_id) || null, [data.alumnos, orderForm.jugador_id]);
  const eligibleGarments = useMemo(
    () => data.catalogo.filter((item) => !orderForm.rama_id || !item.rama_id || item.rama_id === orderForm.rama_id),
    [data.catalogo, orderForm.rama_id],
  );
  const selectedGarment = useMemo(() => eligibleGarments.find((item) => item.id === orderForm.prenda_id) || null, [eligibleGarments, orderForm.prenda_id]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.pedidos;
    return data.pedidos.filter((order) => [
      order.jugadores?.nombre,
      order.prenda_nombre,
      order.talla,
      order.numero_estampado,
      order.nombre_estampado,
      order.ramas?.nombre,
      order.ramas?.disciplina,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)));
  }, [data.pedidos, search]);

  const workshopOrders = useMemo(() => data.pedidos.filter((order) => {
    const operation = order.prendas_catalogo?.tipo_operacion || 'Taller';
    return operation !== 'Stock' && ['Pendiente', 'En Taller'].includes(order.estado_entrega || 'Pendiente');
  }), [data.pedidos]);

  const openCreateCatalog = () => {
    setEditingGarmentId(null);
    setCatalogForm(emptyCatalog(branchId));
    setCatalogOpen(true);
  };

  const openEditCatalog = (garment: Garment) => {
    setEditingGarmentId(garment.id);
    setCatalogForm({
      nombre: garment.nombre || '',
      precio: String(Number(garment.precio) || 0),
      tipo_operacion: garment.tipo_operacion === 'Stock' ? 'Stock' : 'Taller',
      stock_disponible: String(Number(garment.stock_disponible) || 0),
      aplica_numero: Boolean(garment.aplica_numero),
      aplica_nombre_estampado: Boolean(garment.aplica_nombre_estampado),
      rama_id: garment.rama_id || '',
    });
    setCatalogOpen(true);
  };

  const saveCatalog = async () => {
    if (!catalogForm.nombre.trim()) return void notify('Ingresa el nombre de la prenda.');
    setSaving(true);
    try {
      const payload = {
        ...catalogForm,
        precio: Number(catalogForm.precio) || 0,
        stock_disponible: Number(catalogForm.stock_disponible) || 0,
        rama_id: catalogForm.rama_id || null,
      };
      if (editingGarmentId) await api.put(`/api/uniformes/catalogo/${editingGarmentId}`, payload);
      else await api.post('/api/uniformes/catalogo', payload);
      setCatalogOpen(false);
      setEditingGarmentId(null);
      await load(branchId);
      await notify(editingGarmentId ? 'Prenda actualizada.' : 'Prenda agregada al catálogo.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible guardar la prenda.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCatalog = async (garment: Garment) => {
    const accepted = await confirmAction(`¿Eliminar “${garment.nombre}” del catálogo? Los pedidos históricos no se modificarán.`, 'danger');
    if (!accepted) return;
    try {
      await api.delete(`/api/uniformes/catalogo/${garment.id}`);
      await load(branchId);
      await notify('Prenda eliminada del catálogo.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible eliminar la prenda.');
    }
  };

  const openOrder = (student?: Student) => {
    const enrollment = student?.inscripciones.find((item) => item.rama_id === branchId)
      || student?.inscripciones.find((item) => item.es_principal)
      || student?.inscripciones[0];
    setOrderForm({
      jugador_id: student?.id || '',
      rama_id: enrollment?.rama_id || branchId || '',
      prenda_id: '',
      talla: student?.talla_uniforme || '',
      numero_estampado: student?.numero_camiseta ? String(student.numero_camiseta) : '',
      nombre_estampado: student?.nombre_camiseta || '',
      estado_pago: 'Pendiente de Pago',
      generar_cobro: true,
    });
    setOrderOpen(true);
  };

  const selectStudentForOrder = (studentId: string) => {
    const student = data.alumnos.find((item) => item.id === studentId);
    const enrollment = student?.inscripciones.find((item) => item.rama_id === branchId)
      || student?.inscripciones.find((item) => item.es_principal)
      || student?.inscripciones[0];
    setOrderForm((current) => ({
      ...current,
      jugador_id: studentId,
      rama_id: enrollment?.rama_id || '',
      prenda_id: '',
      talla: student?.talla_uniforme || current.talla || '',
      numero_estampado: student?.numero_camiseta ? String(student.numero_camiseta) : '',
      nombre_estampado: student?.nombre_camiseta || '',
    }));
  };

  const selectGarmentForOrder = (garmentId: string) => {
    const garment = eligibleGarments.find((item) => item.id === garmentId);
    setOrderForm((current) => ({
      ...current,
      prenda_id: garmentId,
      numero_estampado: garment?.aplica_numero ? current.numero_estampado : '',
      nombre_estampado: garment?.aplica_nombre_estampado ? current.nombre_estampado : '',
    }));
  };

  const saveOrder = async () => {
    if (!orderForm.jugador_id || !orderForm.rama_id || !orderForm.prenda_id || !orderForm.talla.trim()) {
      return void notify('Selecciona alumno, rama, prenda y talla.');
    }
    if (selectedGarment?.aplica_nombre_estampado && !orderForm.nombre_estampado.trim()) {
      const accepted = await confirmAction('Esta prenda permite nombre estampado y está vacío. ¿Guardar igualmente sin nombre?');
      if (!accepted) return;
    }
    setSaving(true);
    try {
      await api.post('/api/uniformes/pedidos', {
        ...orderForm,
        numero_estampado: orderForm.numero_estampado || null,
        nombre_estampado: orderForm.nombre_estampado.trim().toUpperCase(),
        monto: selectedGarment?.precio || 0,
        prenda_nombre: selectedGarment?.nombre,
        generar_cobro: orderForm.estado_pago === 'Pendiente de Pago' && orderForm.generar_cobro,
      });
      setOrderOpen(false);
      setOrderForm(emptyOrder(branchId));
      await load(branchId);
      await notify('Prenda asignada a la inscripción deportiva seleccionada.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible asignar la prenda.');
    } finally {
      setSaving(false);
    }
  };

  const updateOrder = async (order: Order, patch: Record<string, string>) => {
    try {
      const response = await api.put(`/api/uniformes/pedidos/${order.id}/actualizar`, patch);
      await load(branchId);
      if (patch.estado_entrega === 'Listo para Entrega') {
        await notify('Pedido marcado listo. Si el apoderado tiene teléfono, se envió el aviso por WhatsApp.');
      } else if (patch.estado_pago === 'Pagado') {
        await notify('Pago actualizado. Si existía un cobro pendiente, quedó registrado en Finanzas.');
      }
      return response.data;
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible actualizar el pedido.');
      return null;
    }
  };

  const exportWorkshop = () => {
    if (!workshopOrders.length) return void notify('No hay pedidos pendientes de taller para exportar.');

    const detail = workshopOrders.map((order) => ({
      Disciplina: order.ramas?.disciplina || branch?.disciplina || '',
      Rama: order.ramas?.nombre || branch?.nombre || '',
      Alumno: order.jugadores?.nombre || '',
      Prenda: order.prenda_nombre,
      Talla: order.talla || '',
      'Número camiseta': order.numero_estampado ?? '',
      'Nombre camiseta': order.nombre_estampado || '',
      Estado: order.estado_entrega || 'Pendiente',
    }));
    const summary = Object.entries(data.resumenTaller).map(([item, quantity]) => ({
      'Prenda y talla': item,
      'Cantidad a fabricar': quantity,
    }));

    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(detail), 'Detalle_Taller');
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(summary), 'Resumen');
    const scope = branch ? `${branch.disciplina}_${branch.nombre}` : 'Toda_Academia';
    XLSX.writeFile(book, `Pedido_Taller_${safeFile(scope)}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) return <div className="mx-auto mt-10 max-w-7xl text-center font-bold text-[#70e4df]">Cargando uniformes...</div>;

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="rounded-[28px] border border-purple-400/20 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,.16),transparent_36%),#151b25] p-6 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-purple-300">Indumentaria multirrama</p>
          <h1 className="mt-2 text-3xl font-black text-white">Uniformes e inventario</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8b949e]">Cada pedido conserva alumno, inscripción deportiva, rama, talla, número, nombre de camiseta, pago y estado logístico. Las prendas pueden ser generales o exclusivas de una disciplina.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openCreateCatalog} className="rounded-xl border border-purple-400/30 bg-purple-500/10 px-4 py-2.5 text-sm font-black text-purple-200">+ Nueva prenda</button>
          <button onClick={() => openOrder()} disabled={!branchId} className="rounded-xl bg-[#289E9D] px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">Asignar prenda</button>
        </div>
      </div>
    </section>

    <section className={`${panel} p-4`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-black uppercase text-[#70e4df]">Alcance de trabajo</p><p className="mt-1 text-sm text-[#8b949e]">Selecciona una rama para trabajar sus alumnos y pedidos. La vista global consolida toda la academia.</p></div>
        <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={`${field} sm:max-w-sm`}>
          <option value="">Vista global de la academia</option>
          {data.ramas.map((item) => <option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}{item.sedes?.nombre ? ` · ${item.sedes.nombre}` : ''}</option>)}
        </select>
      </div>
    </section>

    <section className="grid gap-4 lg:grid-cols-[1fr_.72fr]">
      <div className={`${panel} p-5`}>
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-black text-white">Catálogo disponible</h2><p className="mt-1 text-xs text-[#8b949e]">Prendas generales + {branch?.nombre || 'todas las ramas'}.</p></div><span className="rounded-full bg-white/5 px-3 py-1 text-xs font-black text-[#8995a4]">{data.catalogo.length}</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.catalogo.map((garment) => <article key={garment.id} className="rounded-2xl border border-white/10 bg-[#0d1117] p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="font-black text-white">{garment.nombre}</p><p className="mt-1 text-xs text-[#8b949e]">{garment.rama_id ? `${garment.ramas?.disciplina || ''} · ${garment.ramas?.nombre || 'Rama'}` : 'Toda la academia'}</p></div><span className="font-black text-emerald-300">{money(garment.precio)}</span></div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase"><span className="rounded-full bg-purple-500/10 px-2 py-1 text-purple-300">{garment.tipo_operacion === 'Stock' ? '📦 Stock' : '🧵 A pedido'}</span>{garment.tipo_operacion === 'Stock' ? <span className={`rounded-full px-2 py-1 ${garment.stock_disponible > 5 ? 'bg-emerald-500/10 text-emerald-300' : garment.stock_disponible > 0 ? 'bg-amber-500/10 text-amber-300' : 'bg-red-500/10 text-red-300'}`}>Stock {garment.stock_disponible}</span> : null}</div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[#8995a4]"><span>🔢 Número: <strong className="text-[#c3ccd6]">{garment.aplica_numero ? 'Sí' : 'No'}</strong></span><span>✍️ Nombre: <strong className="text-[#c3ccd6]">{garment.aplica_nombre_estampado ? 'Sí' : 'No'}</strong></span></div>
            <div className="mt-4 flex justify-end gap-2 border-t border-white/10 pt-3"><button onClick={() => openEditCatalog(garment)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-black text-[#c3ccd6] hover:bg-white/5">✏️ Editar</button><button onClick={() => void deleteCatalog(garment)} className="rounded-lg border border-red-400/20 px-2.5 py-1.5 text-xs font-black text-red-300 hover:bg-red-500/10">🗑️ Eliminar</button></div>
          </article>)}
        </div>
        {!data.catalogo.length ? <p className="mt-5 text-sm text-[#697586]">No hay prendas en este alcance.</p> : null}
      </div>

      <div className={`${panel} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black text-white">Pedido al taller</h2><p className="mt-1 text-xs leading-5 text-[#8b949e]">Recupera el flujo de fabricación: consolida pendientes y descarga un Excel con el detalle exacto de cada camiseta.</p></div><button onClick={exportWorkshop} disabled={!workshopOrders.length} className="rounded-xl border border-[#289E9D]/30 bg-[#289E9D]/10 px-3 py-2 text-xs font-black text-[#70e4df] disabled:opacity-40">📥 Descargar Excel</button></div>
        <div className="mt-4 space-y-2">{Object.entries(data.resumenTaller).map(([key, value]) => <div key={key} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0d1117] px-3 py-2"><span className="text-sm text-[#c3ccd6]">{key}</span><span className="font-black text-purple-300">{value}</span></div>)}{!Object.keys(data.resumenTaller).length ? <p className="text-sm text-[#697586]">Sin pedidos pendientes para fabricar.</p> : null}</div>
        {workshopOrders.length ? <div className="mt-4 rounded-xl border border-[#C8A96B]/20 bg-[#C8A96B]/[.06] p-3 text-xs leading-5 text-[#d9c79e]">El Excel incluye <strong>alumno, rama, prenda, talla, número y nombre que debe ir estampado</strong>. Luego puedes cambiar el estado de cada pedido a “En Taller”.</div> : null}
      </div>
    </section>

    <section className={`${panel} overflow-hidden`}>
      <div className="border-b border-white/10 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h2 className="text-xl font-black text-white">Pedidos de alumnos</h2><p className="mt-1 text-xs text-[#8b949e]">Gestiona pago, fabricación, aviso de retiro y entrega sin perder el contexto de la rama.</p></div><div className="flex w-full gap-2 md:w-auto"><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${field} md:w-72`} placeholder="Buscar alumno, prenda o estampado"/><button onClick={() => openOrder()} disabled={!branchId} className="shrink-0 rounded-xl bg-[#289E9D] px-4 text-xs font-black text-white disabled:opacity-40">+ Asignar</button></div></div>
      </div>
      <div className="divide-y divide-white/10">
        {filteredOrders.map((order) => {
          const image = photoOf(order.jugadores);
          return <article key={order.id} className="grid gap-4 p-4 xl:grid-cols-[1.15fr_1.1fr_.72fr_.9fr_.95fr] xl:items-center">
            <div className="flex min-w-0 items-center gap-3">{image ? <img src={image} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-white/10 object-cover"/> : <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#289E9D]/20 bg-[#289E9D]/10 text-xs font-black text-[#70e4df]">{initials(order.jugadores?.nombre || 'Alumno')}</div>}<div className="min-w-0"><p className="truncate font-black text-white">{order.jugadores?.nombre || 'Alumno'}</p><p className="mt-1 truncate text-xs text-violet-300">{order.ramas?.disciplina || 'Histórico'} · {order.ramas?.nombre || 'Sin rama'}</p></div></div>
            <div><p className="text-sm font-black text-[#d7dee7]">{order.prenda_nombre}</p><div className="mt-1 flex flex-wrap gap-1.5 text-[10px]"><span className="rounded bg-white/5 px-2 py-1 text-[#aab4c1]">Talla <strong className="text-white">{order.talla || 'S/T'}</strong></span>{order.numero_estampado != null ? <span className="rounded bg-white/5 px-2 py-1 text-[#aab4c1]">N° <strong className="text-white">{order.numero_estampado}</strong></span> : null}{order.nombre_estampado ? <span className="rounded border border-[#C8A96B]/20 bg-[#C8A96B]/10 px-2 py-1 text-[#D8BE87]">Nombre <strong>{order.nombre_estampado}</strong></span> : <span className="rounded bg-white/5 px-2 py-1 text-[#697586]">Sin nombre estampado</span>}</div></div>
            <div><p className="text-[10px] font-black uppercase text-[#697586]">Monto</p><p className="mt-1 font-black text-emerald-300">{money(order.monto)}</p></div>
            <div><p className="mb-1 text-[10px] font-black uppercase text-[#697586]">Finanzas / Pago</p><select value={order.estado_pago || 'Pendiente de Pago'} onChange={(event) => void updateOrder(order, { estado_pago: event.target.value })} className={`${field} py-2 text-xs font-black`}><option value="Pendiente de Pago">⏳ Pendiente de Pago</option><option value="Pagado">💳 Pagado</option><option value="Incluido en Matrícula">🎁 Incluido en Matrícula</option></select></div>
            <div><p className="mb-1 text-[10px] font-black uppercase text-[#697586]">Logística / Entrega</p><select value={order.estado_entrega || 'Pendiente'} onChange={(event) => void updateOrder(order, { estado_entrega: event.target.value })} className={`${field} py-2 text-xs font-black`}><option value="Pendiente">🔴 Pendiente / Sin pedir</option><option value="En Taller">🟡 En Taller / Importación</option><option value="Listo para Entrega">🟢 Listo para Entrega · avisa WhatsApp</option><option value="Entregado">⚪ Entregado al apoderado</option></select></div>
          </article>;
        })}
        {!filteredOrders.length ? <div className="p-8 text-center text-sm text-[#697586]">No hay pedidos para este alcance o búsqueda.</div> : null}
      </div>
    </section>

    {catalogOpen ? <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/80 p-4"><div className="my-6 w-full max-w-lg rounded-[26px] border border-white/10 bg-[#151b25] p-6"><h2 className="text-2xl font-black text-white">{editingGarmentId ? 'Editar prenda' : 'Nueva prenda'}</h2><p className="mt-1 text-xs text-[#8b949e]">Define fabricación, stock y datos de estampado sin perder su alcance por rama.</p><div className="mt-5 space-y-3"><label className="block text-xs font-bold text-[#9aa6b5]">Nombre de la prenda<input value={catalogForm.nombre} onChange={(event) => setCatalogForm({ ...catalogForm, nombre: event.target.value })} placeholder="Ej.: Kit oficial 2026" className={`${field} mt-1.5`}/></label><label className="block text-xs font-bold text-[#9aa6b5]">Precio de venta<input type="number" min="0" value={catalogForm.precio} onChange={(event) => setCatalogForm({ ...catalogForm, precio: event.target.value })} className={`${field} mt-1.5`}/></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold text-[#9aa6b5]">Operación<select value={catalogForm.tipo_operacion} onChange={(event) => setCatalogForm({ ...catalogForm, tipo_operacion: event.target.value as 'Taller' | 'Stock' })} className={`${field} mt-1.5`}><option value="Taller">🧵 A pedido / Taller</option><option value="Stock">📦 Stock físico</option></select></label>{catalogForm.tipo_operacion === 'Stock' ? <label className="block text-xs font-bold text-[#9aa6b5]">Unidades en bodega<input type="number" min="0" value={catalogForm.stock_disponible} onChange={(event) => setCatalogForm({ ...catalogForm, stock_disponible: event.target.value })} className={`${field} mt-1.5`}/></label> : <div/>}</div><label className="block text-xs font-bold text-[#9aa6b5]">Rama<select value={catalogForm.rama_id} onChange={(event) => setCatalogForm({ ...catalogForm, rama_id: event.target.value })} className={`${field} mt-1.5`}><option value="">Prenda general · toda la academia</option>{data.ramas.map((item) => <option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}</option>)}</select></label><div className="rounded-xl border border-white/10 bg-[#0d1117] p-3"><label className="flex items-center justify-between gap-3 text-sm text-[#c3ccd6]"><span>¿Permite elegir número?</span><input type="checkbox" checked={catalogForm.aplica_numero} onChange={(event) => setCatalogForm({ ...catalogForm, aplica_numero: event.target.checked })}/></label><label className="mt-3 flex items-center justify-between gap-3 text-sm text-[#c3ccd6]"><span>¿Permite nombre en espalda?</span><input type="checkbox" checked={catalogForm.aplica_nombre_estampado} onChange={(event) => setCatalogForm({ ...catalogForm, aplica_nombre_estampado: event.target.checked })}/></label></div></div><div className="mt-5 flex justify-end gap-2"><button onClick={() => setCatalogOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-[#c3ccd6]">Cancelar</button><button disabled={saving} onClick={() => void saveCatalog()} className="rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{saving ? 'Guardando...' : editingGarmentId ? 'Actualizar prenda' : 'Guardar prenda'}</button></div></div></div> : null}

    {orderOpen ? <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/80 p-4"><div className="my-6 w-full max-w-xl rounded-[26px] border border-white/10 bg-[#151b25] p-6"><h2 className="text-2xl font-black text-white">Asignar prenda</h2><p className="mt-1 text-xs text-[#8b949e]">El pedido queda asociado a la rama deportiva del alumno. Los datos de camiseta provenientes de la matrícula se proponen automáticamente.</p><div className="mt-5 space-y-3"><label className="block text-xs font-bold text-[#9aa6b5]">Alumno<select value={orderForm.jugador_id} onChange={(event) => selectStudentForOrder(event.target.value)} className={`${field} mt-1.5`}><option value="">Selecciona alumno</option>{data.alumnos.map((student) => <option key={student.id} value={student.id}>{student.nombre}</option>)}</select></label><label className="block text-xs font-bold text-[#9aa6b5]">Inscripción / rama<select value={orderForm.rama_id} onChange={(event) => setOrderForm({ ...orderForm, rama_id: event.target.value, prenda_id: '' })} className={`${field} mt-1.5`}><option value="">Selecciona rama de la inscripción</option>{selectedStudent?.inscripciones.map((enrollment) => { const b = data.ramas.find((item) => item.id === enrollment.rama_id); return <option key={enrollment.id} value={enrollment.rama_id}>{b ? `${b.disciplina} · ${b.nombre}` : enrollment.rama_id}</option>; })}</select></label><label className="block text-xs font-bold text-[#9aa6b5]">Prenda<select value={orderForm.prenda_id} onChange={(event) => selectGarmentForOrder(event.target.value)} className={`${field} mt-1.5`}><option value="">Selecciona prenda compatible</option>{eligibleGarments.map((garment) => <option key={garment.id} value={garment.id}>{garment.nombre} · {money(garment.precio)} · {garment.tipo_operacion}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-3"><label className="block text-xs font-bold text-[#9aa6b5]">Talla<input list="uniform-sizes" value={orderForm.talla} onChange={(event) => setOrderForm({ ...orderForm, talla: event.target.value })} className={`${field} mt-1.5`} placeholder="Ej.: 12 / M"/><datalist id="uniform-sizes">{['4','6','8','10','12','14','16','XS','S','M','L','XL','XXL'].map((size) => <option key={size} value={size}/>)}</datalist></label>{selectedGarment?.aplica_numero ? <label className="block text-xs font-bold text-[#9aa6b5]">N° espalda<input type="number" min="0" value={orderForm.numero_estampado} onChange={(event) => setOrderForm({ ...orderForm, numero_estampado: event.target.value })} className={`${field} mt-1.5`} placeholder="10"/></label> : <div/>}{selectedGarment?.aplica_nombre_estampado ? <label className="block text-xs font-bold text-[#D8BE87]">Nombre camiseta<input maxLength={80} value={orderForm.nombre_estampado} onChange={(event) => setOrderForm({ ...orderForm, nombre_estampado: event.target.value.toUpperCase() })} className={`${field} mt-1.5 uppercase`} placeholder="VICHO"/></label> : <div/>}</div>{selectedGarment ? <div className="rounded-xl border border-[#C8A96B]/20 bg-[#C8A96B]/[.06] p-3 text-xs leading-5 text-[#d9c79e]">Pedido: <strong>{selectedGarment.nombre}</strong> · {money(selectedGarment.precio)}{selectedGarment.aplica_nombre_estampado ? ` · Nombre: ${orderForm.nombre_estampado || 'SIN DEFINIR'}` : ''}{selectedGarment.aplica_numero ? ` · Número: ${orderForm.numero_estampado || 'SIN DEFINIR'}` : ''}</div> : null}<div className="rounded-xl border border-white/10 bg-[#0d1117] p-3"><label className="block text-xs font-bold text-[#9aa6b5]">Estado financiero<select value={orderForm.estado_pago} onChange={(event) => setOrderForm({ ...orderForm, estado_pago: event.target.value, generar_cobro: event.target.value === 'Pendiente de Pago' ? orderForm.generar_cobro : false })} className={`${field} mt-1.5`}><option value="Incluido en Matrícula">🎁 Incluido en Matrícula</option><option value="Pagado">💳 Pagado directamente</option><option value="Pendiente de Pago">⏳ Pendiente de Pago</option></select></label>{orderForm.estado_pago === 'Pendiente de Pago' ? <label className="mt-3 flex items-center gap-2 text-xs font-bold text-orange-300"><input type="checkbox" checked={orderForm.generar_cobro} onChange={(event) => setOrderForm({ ...orderForm, generar_cobro: event.target.checked })}/>Generar cobro en Finanzas por {money(selectedGarment?.precio || 0)}</label> : null}</div></div><div className="mt-5 flex justify-end gap-2"><button onClick={() => setOrderOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-[#c3ccd6]">Cancelar</button><button disabled={saving} onClick={() => void saveOrder()} className="rounded-xl bg-[#289E9D] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Confirmar asignación'}</button></div></div></div> : null}
  </div>;
}
