import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  ArrowDownTrayIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
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
type CatalogForm = { nombre: string; precio: string; tipo_operacion: 'Taller' | 'Stock'; stock_disponible: string; aplica_numero: boolean; aplica_nombre_estampado: boolean; rama_id: string };
type OrderForm = { jugador_id: string; rama_id: string; prenda_id: string; talla: string; numero_estampado: string; nombre_estampado: string; estado_pago: string; generar_cobro: boolean };
type LoadState = 'loading' | 'verified' | 'error';

const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0));
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'A';
const photoOf = (value?: { foto_base64?: string | null; foto_url?: string | null; avatar_url?: string | null } | null) => value?.foto_url || value?.avatar_url || value?.foto_base64 || null;
const safeFile = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'Academia';
const emptyCatalog = (ramaId = ''): CatalogForm => ({ nombre: '', precio: '0', tipo_operacion: 'Taller', stock_disponible: '0', aplica_numero: false, aplica_nombre_estampado: false, rama_id: ramaId });
const emptyOrder = (ramaId = ''): OrderForm => ({ jugador_id: '', rama_id: ramaId, prenda_id: '', talla: '', numero_estampado: '', nombre_estampado: '', estado_pago: 'Pendiente de Pago', generar_cobro: true });

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="kit-field"><span>{label}</span>{children}</label>;
}

function Modal({ open, onClose, title, eyebrow, children }: { open: boolean; onClose: () => void; title: string; eyebrow: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} className="kit-dialog">
      <div className="kit-dialog-head">
        <div><p>{eyebrow}</p><h2>{title}</h2></div>
        <button type="button" onClick={onClose} aria-label="Cerrar"><XMarkIcon aria-hidden="true" /></button>
      </div>
      {children}
    </dialog>
  );
}

export default function UniformesKitRoom() {
  const { confirmAction, notify } = useAcademyMessages();
  const [data, setData] = useState<Payload>({ ramas: [], catalogo: [], pedidos: [], alumnos: [], resumenTaller: {} });
  const [branchId, setBranchId] = useState('');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [editingGarmentId, setEditingGarmentId] = useState<string | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catalogForm, setCatalogForm] = useState<CatalogForm>(emptyCatalog());
  const [orderForm, setOrderForm] = useState<OrderForm>(emptyOrder());

  const load = useCallback(async (selectedBranch = branchId) => {
    setLoadState('loading');
    setLoadError('');
    try {
      const response = await api.get('/api/uniformes', { params: selectedBranch ? { rama_id: selectedBranch } : undefined });
      const payload = response.data.data as Payload;
      setData(payload);
      if (!selectedBranch && payload.ramas.length === 1) setBranchId(payload.ramas[0].id);
      setLoadState('verified');
    } catch (error: any) {
      setLoadState('error');
      setLoadError(error.response?.data?.error || 'No fue posible verificar uniformes e inventario.');
    }
  }, [branchId]);

  useEffect(() => { void load(branchId); }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const branch = useMemo(() => data.ramas.find((item) => item.id === branchId) || null, [data.ramas, branchId]);
  const selectedStudent = useMemo(() => data.alumnos.find((item) => item.id === orderForm.jugador_id) || null, [data.alumnos, orderForm.jugador_id]);
  const eligibleGarments = useMemo(() => data.catalogo.filter((item) => !orderForm.rama_id || !item.rama_id || item.rama_id === orderForm.rama_id), [data.catalogo, orderForm.rama_id]);
  const selectedGarment = useMemo(() => eligibleGarments.find((item) => item.id === orderForm.prenda_id) || null, [eligibleGarments, orderForm.prenda_id]);
  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.pedidos;
    return data.pedidos.filter((order) => [order.jugadores?.nombre, order.prenda_nombre, order.talla, order.numero_estampado, order.nombre_estampado, order.ramas?.nombre, order.ramas?.disciplina].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)));
  }, [data.pedidos, search]);
  const workshopOrders = useMemo(() => data.pedidos.filter((order) => {
    const operation = order.prendas_catalogo?.tipo_operacion || 'Taller';
    return operation !== 'Stock' && ['Pendiente', 'En Taller'].includes(order.estado_entrega || 'Pendiente');
  }), [data.pedidos]);

  const pendingPayment = data.pedidos.filter((order) => order.estado_pago === 'Pendiente de Pago').length;
  const readyOrders = data.pedidos.filter((order) => order.estado_entrega === 'Listo para Entrega').length;
  const inWorkshop = data.pedidos.filter((order) => order.estado_entrega === 'En Taller').length;
  const delivered = data.pedidos.filter((order) => order.estado_entrega === 'Entregado').length;
  const verified = loadState === 'verified';
  const scopeLabel = branch ? `${branch.disciplina} · ${branch.nombre}` : 'Toda la academia';

  const openCreateCatalog = () => { setEditingGarmentId(null); setCatalogForm(emptyCatalog(branchId)); setCatalogOpen(true); };
  const openEditCatalog = (garment: Garment) => {
    setEditingGarmentId(garment.id);
    setCatalogForm({ nombre: garment.nombre || '', precio: String(Number(garment.precio) || 0), tipo_operacion: garment.tipo_operacion === 'Stock' ? 'Stock' : 'Taller', stock_disponible: String(Number(garment.stock_disponible) || 0), aplica_numero: Boolean(garment.aplica_numero), aplica_nombre_estampado: Boolean(garment.aplica_nombre_estampado), rama_id: garment.rama_id || '' });
    setCatalogOpen(true);
  };
  const saveCatalog = async () => {
    if (!catalogForm.nombre.trim()) return void notify('Ingresa el nombre de la prenda.');
    if (!verified) return void notify('Primero recupera un estado verificado del inventario.');
    setSaving(true);
    const editing = Boolean(editingGarmentId);
    try {
      const payload = { ...catalogForm, precio: Number(catalogForm.precio) || 0, stock_disponible: Number(catalogForm.stock_disponible) || 0, rama_id: catalogForm.rama_id || null };
      if (editingGarmentId) await api.put(`/api/uniformes/catalogo/${editingGarmentId}`, payload);
      else await api.post('/api/uniformes/catalogo', payload);
      setCatalogOpen(false); setEditingGarmentId(null); await load(branchId); await notify(editing ? 'Prenda actualizada.' : 'Prenda agregada al catálogo.');
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible guardar la prenda.'); }
    finally { setSaving(false); }
  };
  const deleteCatalog = async (garment: Garment) => {
    if (!verified) return void notify('Primero recupera un estado verificado del inventario.');
    const accepted = await confirmAction(`¿Eliminar “${garment.nombre}” del catálogo? Los pedidos históricos no se modificarán.`, 'danger');
    if (!accepted) return;
    try { await api.delete(`/api/uniformes/catalogo/${garment.id}`); await load(branchId); await notify('Prenda eliminada del catálogo.'); }
    catch (error: any) { await notify(error.response?.data?.error || 'No fue posible eliminar la prenda.'); }
  };

  const openOrder = (student?: Student) => {
    const enrollment = student?.inscripciones.find((item) => item.rama_id === branchId) || student?.inscripciones.find((item) => item.es_principal) || student?.inscripciones[0];
    setOrderForm({ jugador_id: student?.id || '', rama_id: enrollment?.rama_id || branchId || '', prenda_id: '', talla: student?.talla_uniforme || '', numero_estampado: student?.numero_camiseta ? String(student.numero_camiseta) : '', nombre_estampado: student?.nombre_camiseta || '', estado_pago: 'Pendiente de Pago', generar_cobro: true });
    setOrderOpen(true);
  };
  const selectStudentForOrder = (studentId: string) => {
    const student = data.alumnos.find((item) => item.id === studentId);
    const enrollment = student?.inscripciones.find((item) => item.rama_id === branchId) || student?.inscripciones.find((item) => item.es_principal) || student?.inscripciones[0];
    setOrderForm((current) => ({ ...current, jugador_id: studentId, rama_id: enrollment?.rama_id || '', prenda_id: '', talla: student?.talla_uniforme || current.talla || '', numero_estampado: student?.numero_camiseta ? String(student.numero_camiseta) : '', nombre_estampado: student?.nombre_camiseta || '' }));
  };
  const selectGarmentForOrder = (garmentId: string) => {
    const garment = eligibleGarments.find((item) => item.id === garmentId);
    setOrderForm((current) => ({ ...current, prenda_id: garmentId, numero_estampado: garment?.aplica_numero ? current.numero_estampado : '', nombre_estampado: garment?.aplica_nombre_estampado ? current.nombre_estampado : '' }));
  };
  const saveOrder = async () => {
    if (!orderForm.jugador_id || !orderForm.rama_id || !orderForm.prenda_id || !orderForm.talla.trim()) return void notify('Selecciona alumno, rama, prenda y talla.');
    if (!verified) return void notify('Primero recupera un estado verificado del inventario.');
    if (selectedGarment?.aplica_nombre_estampado && !orderForm.nombre_estampado.trim()) {
      const accepted = await confirmAction('Esta prenda permite nombre estampado y está vacío. ¿Guardar igualmente sin nombre?');
      if (!accepted) return;
    }
    setSaving(true);
    try {
      await api.post('/api/uniformes/pedidos', { ...orderForm, numero_estampado: orderForm.numero_estampado || null, nombre_estampado: orderForm.nombre_estampado.trim().toUpperCase(), monto: selectedGarment?.precio || 0, prenda_nombre: selectedGarment?.nombre, generar_cobro: orderForm.estado_pago === 'Pendiente de Pago' && orderForm.generar_cobro });
      setOrderOpen(false); setOrderForm(emptyOrder(branchId)); await load(branchId); await notify('Prenda asignada a la inscripción deportiva seleccionada.');
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible asignar la prenda.'); }
    finally { setSaving(false); }
  };
  const updateOrder = async (order: Order, patch: Record<string, string>) => {
    if (!verified) return void notify('Primero recupera un estado verificado del inventario.');
    try {
      const response = await api.put(`/api/uniformes/pedidos/${order.id}/actualizar`, patch);
      await load(branchId);
      if (patch.estado_entrega === 'Listo para Entrega') await notify('Pedido marcado listo. Si el apoderado tiene teléfono, se envió el aviso por WhatsApp.');
      else if (patch.estado_pago === 'Pagado') await notify('Pago actualizado. Si existía un cobro pendiente, quedó registrado en Finanzas.');
      return response.data;
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible actualizar el pedido.'); return null; }
  };
  const exportWorkshop = () => {
    if (!workshopOrders.length) return void notify('No hay pedidos pendientes de taller para exportar.');
    const detail = workshopOrders.map((order) => ({ Disciplina: order.ramas?.disciplina || branch?.disciplina || '', Rama: order.ramas?.nombre || branch?.nombre || '', Alumno: order.jugadores?.nombre || '', Prenda: order.prenda_nombre, Talla: order.talla || '', 'Número camiseta': order.numero_estampado ?? '', 'Nombre camiseta': order.nombre_estampado || '', Estado: order.estado_entrega || 'Pendiente' }));
    const summary = Object.entries(data.resumenTaller).map(([item, quantity]) => ({ 'Prenda y talla': item, 'Cantidad a fabricar': quantity }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(detail), 'Detalle_Taller');
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(summary), 'Resumen');
    const scope = branch ? `${branch.disciplina}_${branch.nombre}` : 'Toda_Academia';
    XLSX.writeFile(book, `Pedido_Taller_${safeFile(scope)}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <main className="kit-room" data-load-state={loadState}>
      <header className="kit-room-hero">
        <div>
          <p className="kit-eyebrow">Kit Room · Equipamiento</p>
          <h1>Equipamiento del plantel</h1>
          <p>Prendas, taller, pagos, entregas y dorsales conectados al deportista y su rama.</p>
        </div>
        <div className="kit-room-scope">
          <span>Alcance actual</span>
          <strong>{scopeLabel}</strong>
          <small>{verified ? 'Datos verificados' : loadState === 'loading' ? 'Verificando…' : 'Estado no verificado'}</small>
        </div>
      </header>

      {loadState === 'error' ? (
        <section className="kit-room-alert" role="alert">
          <ExclamationTriangleIcon aria-hidden="true" />
          <div><strong>No pudimos verificar el equipamiento.</strong><p>{loadError}</p></div>
          <button type="button" onClick={() => void load(branchId)}>Reintentar</button>
        </section>
      ) : null}

      <section className="kit-room-command" aria-label="Estado operativo del equipamiento">
        <div className="kit-command-primary">
          <span className="kit-command-kicker">Requiere atención</span>
          <strong>{workshopOrders.length + pendingPayment + readyOrders}</strong>
          <p>acciones abiertas entre taller, cobros y entregas.</p>
        </div>
        <div className="kit-command-rail">
          <div><span>Taller</span><strong>{inWorkshop}</strong></div>
          <div><span>Por cobrar</span><strong>{pendingPayment}</strong></div>
          <div><span>Por entregar</span><strong>{readyOrders}</strong></div>
          <div><span>Entregados</span><strong>{delivered}</strong></div>
        </div>
        <div className="kit-command-actions">
          <button type="button" onClick={() => openOrder()} disabled={!verified}><PlusIcon aria-hidden="true" />Asignar prenda</button>
          <Link to="/uniformes/dorsales">Dorsales<ArrowRightIcon aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="kit-room-filters" aria-label="Filtros de equipamiento">
        <label><span>Rama</span><select value={branchId} onChange={(event) => setBranchId(event.target.value)} disabled={loadState === 'loading'}><option value="">Toda la academia</option>{data.ramas.map((item) => <option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}</option>)}</select></label>
        <label className="kit-search"><span>Buscar pedido</span><div><MagnifyingGlassIcon aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Deportista, prenda, talla o estampado" /></div></label>
        <button type="button" onClick={openCreateCatalog} disabled={!verified}><PlusIcon aria-hidden="true" />Nueva prenda</button>
      </section>

      <div className="kit-room-grid">
        <section className="kit-orders" aria-labelledby="kit-orders-title">
          <div className="kit-section-head">
            <div><p>Locker Board</p><h2 id="kit-orders-title">Pedidos del plantel</h2><span>{filteredOrders.length} en este alcance</span></div>
          </div>
          <div className="kit-order-ledger">
            {filteredOrders.map((order) => {
              const image = photoOf(order.jugadores);
              return (
                <article className="kit-order-row" key={order.id}>
                  <div className="kit-player-cell">
                    {image ? <img src={image} alt="" /> : <span className="kit-avatar">{initials(order.jugadores?.nombre || 'Alumno')}</span>}
                    <div><strong>{order.jugadores?.nombre || 'Alumno'}</strong><span>{order.ramas?.disciplina || 'Histórico'} · {order.ramas?.nombre || 'Sin rama'}</span></div>
                  </div>
                  <div className="kit-garment-cell">
                    <strong>{order.prenda_nombre}</strong>
                    <span>Talla {order.talla || 'S/T'}{order.numero_estampado != null ? ` · #${order.numero_estampado}` : ''}{order.nombre_estampado ? ` · ${order.nombre_estampado}` : ''}</span>
                  </div>
                  <div className="kit-money-cell"><span>Monto</span><strong>{money(order.monto)}</strong></div>
                  <label className="kit-status-cell"><span>Pago</span><select value={order.estado_pago || 'Pendiente de Pago'} onChange={(event) => void updateOrder(order, { estado_pago: event.target.value })} disabled={!verified}><option value="Pendiente de Pago">Pendiente</option><option value="Pagado">Pagado</option><option value="Incluido en Matrícula">En matrícula</option></select></label>
                  <label className="kit-status-cell"><span>Entrega</span><select value={order.estado_entrega || 'Pendiente'} onChange={(event) => void updateOrder(order, { estado_entrega: event.target.value })} disabled={!verified}><option value="Pendiente">Pendiente</option><option value="En Taller">En taller</option><option value="Listo para Entrega">Listo</option><option value="Entregado">Entregado</option></select></label>
                </article>
              );
            })}
            {!filteredOrders.length ? <div className="kit-empty"><ShoppingBagIcon aria-hidden="true" /><strong>Sin pedidos en este alcance</strong><p>Ajusta la búsqueda o asigna una prenda al plantel.</p></div> : null}
          </div>
        </section>

        <aside className="kit-room-side">
          <section className="kit-workshop" aria-labelledby="kit-workshop-title">
            <div className="kit-section-head compact">
              <div><p>Taller</p><h2 id="kit-workshop-title">Producción pendiente</h2><span>{workshopOrders.length} pedidos por fabricar</span></div>
              <button type="button" onClick={exportWorkshop} disabled={!workshopOrders.length || !verified} aria-label="Descargar pedido de taller"><ArrowDownTrayIcon aria-hidden="true" /></button>
            </div>
            <div className="kit-workshop-list">
              {Object.entries(data.resumenTaller).map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}
              {!Object.keys(data.resumenTaller).length ? <p>No hay fabricación pendiente.</p> : null}
            </div>
          </section>

          <section className="kit-catalog" aria-labelledby="kit-catalog-title">
            <div className="kit-section-head compact"><div><p>Catálogo</p><h2 id="kit-catalog-title">Prendas disponibles</h2><span>{data.catalogo.length} artículos</span></div></div>
            <div className="kit-catalog-list">
              {data.catalogo.map((garment) => (
                <article key={garment.id}>
                  <div><strong>{garment.nombre}</strong><span>{garment.rama_id ? `${garment.ramas?.disciplina || ''} · ${garment.ramas?.nombre || 'Rama'}` : 'Toda la academia'}</span></div>
                  <div className="kit-catalog-price"><strong>{money(garment.precio)}</strong><span>{garment.tipo_operacion === 'Stock' ? `Stock ${garment.stock_disponible}` : 'A pedido'}</span></div>
                  <div className="kit-catalog-actions"><button type="button" onClick={() => openEditCatalog(garment)} disabled={!verified} aria-label={`Editar ${garment.nombre}`}><PencilSquareIcon aria-hidden="true" /></button><button type="button" onClick={() => void deleteCatalog(garment)} disabled={!verified} aria-label={`Eliminar ${garment.nombre}`} className="danger"><TrashIcon aria-hidden="true" /></button></div>
                </article>
              ))}
              {!data.catalogo.length ? <p className="kit-catalog-empty">Todavía no hay prendas configuradas.</p> : null}
            </div>
          </section>
        </aside>
      </div>

      <Modal open={catalogOpen} onClose={() => setCatalogOpen(false)} eyebrow="Kit Room · Catálogo" title={editingGarmentId ? 'Editar prenda' : 'Nueva prenda'}>
        <div className="kit-dialog-grid">
          <Field label="Nombre *"><input value={catalogForm.nombre} onChange={(event) => setCatalogForm({ ...catalogForm, nombre: event.target.value })} /></Field>
          <Field label="Precio"><input type="number" min="0" value={catalogForm.precio} onChange={(event) => setCatalogForm({ ...catalogForm, precio: event.target.value })} /></Field>
          <Field label="Operación"><select value={catalogForm.tipo_operacion} onChange={(event) => setCatalogForm({ ...catalogForm, tipo_operacion: event.target.value as 'Taller' | 'Stock' })}><option value="Taller">A pedido / Taller</option><option value="Stock">Stock</option></select></Field>
          {catalogForm.tipo_operacion === 'Stock' ? <Field label="Stock disponible"><input type="number" min="0" value={catalogForm.stock_disponible} onChange={(event) => setCatalogForm({ ...catalogForm, stock_disponible: event.target.value })} /></Field> : null}
          <Field label="Rama exclusiva"><select value={catalogForm.rama_id} onChange={(event) => setCatalogForm({ ...catalogForm, rama_id: event.target.value })}><option value="">Toda la academia</option>{data.ramas.map((item) => <option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}</option>)}</select></Field>
          <div className="kit-checks"><label><input type="checkbox" checked={catalogForm.aplica_numero} onChange={(event) => setCatalogForm({ ...catalogForm, aplica_numero: event.target.checked })} />Permite número estampado</label><label><input type="checkbox" checked={catalogForm.aplica_nombre_estampado} onChange={(event) => setCatalogForm({ ...catalogForm, aplica_nombre_estampado: event.target.checked })} />Permite nombre estampado</label></div>
        </div>
        <div className="kit-dialog-actions"><button type="button" onClick={() => setCatalogOpen(false)}>Cancelar</button><button type="button" className="primary" disabled={saving || !verified} onClick={() => void saveCatalog()}>{saving ? 'Guardando…' : 'Guardar prenda'}</button></div>
      </Modal>

      <Modal open={orderOpen} onClose={() => setOrderOpen(false)} eyebrow="Locker Board" title="Asignar prenda al deportista">
        <p className="kit-dialog-copy">El pedido queda ligado a la inscripción deportiva y puede generar un cobro en Finanzas.</p>
        <div className="kit-dialog-grid">
          <Field label="Deportista *"><select value={orderForm.jugador_id} onChange={(event) => selectStudentForOrder(event.target.value)}><option value="">Seleccionar deportista</option>{data.alumnos.map((student) => <option key={student.id} value={student.id}>{student.nombre}</option>)}</select></Field>
          <Field label="Rama deportiva *"><select value={orderForm.rama_id} onChange={(event) => setOrderForm({ ...orderForm, rama_id: event.target.value, prenda_id: '' })}><option value="">Seleccionar rama</option>{data.ramas.filter((item) => !selectedStudent || selectedStudent.inscripciones.some((enrollment) => enrollment.rama_id === item.id)).map((item) => <option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}</option>)}</select></Field>
          <Field label="Prenda *"><select value={orderForm.prenda_id} onChange={(event) => selectGarmentForOrder(event.target.value)}><option value="">Seleccionar prenda</option>{eligibleGarments.map((garment) => <option key={garment.id} value={garment.id}>{garment.nombre} · {money(garment.precio)}{garment.tipo_operacion === 'Stock' ? ` · stock ${garment.stock_disponible}` : ''}</option>)}</select></Field>
          <Field label="Talla *"><input value={orderForm.talla} onChange={(event) => setOrderForm({ ...orderForm, talla: event.target.value })} /></Field>
          {selectedGarment?.aplica_numero ? <Field label="Número estampado"><input type="number" min="0" value={orderForm.numero_estampado} onChange={(event) => setOrderForm({ ...orderForm, numero_estampado: event.target.value })} /></Field> : null}
          {selectedGarment?.aplica_nombre_estampado ? <Field label="Nombre estampado"><input value={orderForm.nombre_estampado} onChange={(event) => setOrderForm({ ...orderForm, nombre_estampado: event.target.value.toUpperCase() })} /></Field> : null}
          <Field label="Estado de pago"><select value={orderForm.estado_pago} onChange={(event) => setOrderForm({ ...orderForm, estado_pago: event.target.value })}><option>Pendiente de Pago</option><option>Pagado</option><option>Incluido en Matrícula</option></select></Field>
          <div className="kit-charge-check"><label><input type="checkbox" checked={orderForm.generar_cobro} disabled={orderForm.estado_pago !== 'Pendiente de Pago'} onChange={(event) => setOrderForm({ ...orderForm, generar_cobro: event.target.checked })} /><span>Generar cobro en Finanzas<small>Solo si queda pendiente de pago.</small></span></label></div>
        </div>
        {selectedGarment ? <div className="kit-order-preview"><div><strong>{selectedGarment.nombre}</strong><span>{selectedGarment.tipo_operacion === 'Stock' ? `Stock disponible: ${selectedGarment.stock_disponible}` : 'Fabricación a pedido'}</span></div><strong>{money(selectedGarment.precio)}</strong></div> : null}
        <div className="kit-dialog-actions"><button type="button" onClick={() => setOrderOpen(false)}>Cancelar</button><button type="button" className="primary" disabled={saving || !verified} onClick={() => void saveOrder()}>{saving ? 'Guardando…' : 'Asignar prenda'}</button></div>
      </Modal>
    </main>
  );
}
