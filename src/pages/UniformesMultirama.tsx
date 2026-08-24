import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../api/axiosConfig';
import { useAcademyMessages } from '../hooks/useAcademyMessages';
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_DARK,
  DIRECTOR_BUTTON_GHOST,
  DIRECTOR_FIELD,
  DirectorHero,
  DirectorPage,
  DirectorPanel,
  DirectorStat,
} from '../components/director/DirectorModule';

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

const labelClass='mb-1.5 block text-[11px] font-black uppercase tracking-[.09em] text-[#697468]';
const money=(value:number)=>`$${Math.round(Number(value)||0).toLocaleString('es-CL')}`;
const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]?.toUpperCase()).join('')||'A';
const photoOf=(value?:{foto_base64?:string|null;foto_url?:string|null;avatar_url?:string|null}|null)=>value?.foto_url||value?.avatar_url||value?.foto_base64||null;
const safeFile=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'')||'Academia';
const emptyCatalog=(ramaId=''):CatalogForm=>({nombre:'',precio:'0',tipo_operacion:'Taller',stock_disponible:'0',aplica_numero:false,aplica_nombre_estampado:false,rama_id:ramaId});
const emptyOrder=(ramaId=''):OrderForm=>({jugador_id:'',rama_id:ramaId,prenda_id:'',talla:'',numero_estampado:'',nombre_estampado:'',estado_pago:'Pendiente de Pago',generar_cobro:true});

export default function UniformesMultirama(){
  const {confirmAction,notify}=useAcademyMessages();
  const [data,setData]=useState<Payload>({ramas:[],catalogo:[],pedidos:[],alumnos:[],resumenTaller:{}});
  const [branchId,setBranchId]=useState('');
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [catalogOpen,setCatalogOpen]=useState(false);
  const [editingGarmentId,setEditingGarmentId]=useState<string|null>(null);
  const [orderOpen,setOrderOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [catalogForm,setCatalogForm]=useState<CatalogForm>(emptyCatalog());
  const [orderForm,setOrderForm]=useState<OrderForm>(emptyOrder());

  const load=useCallback(async(selectedBranch=branchId)=>{
    setLoading(true);
    try{
      const response=await api.get('/api/uniformes',{params:selectedBranch?{rama_id:selectedBranch}:undefined});
      const payload=response.data.data as Payload;
      setData(payload);
      if(!selectedBranch&&payload.ramas.length===1)setBranchId(payload.ramas[0].id);
    }catch(error:any){await notify(error.response?.data?.error||'No fue posible cargar Uniformes.');}
    finally{setLoading(false);}
  },[branchId,notify]);
  useEffect(()=>{void load(branchId);},[branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const branch=useMemo(()=>data.ramas.find((item)=>item.id===branchId)||null,[data.ramas,branchId]);
  const selectedStudent=useMemo(()=>data.alumnos.find((item)=>item.id===orderForm.jugador_id)||null,[data.alumnos,orderForm.jugador_id]);
  const eligibleGarments=useMemo(()=>data.catalogo.filter((item)=>!orderForm.rama_id||!item.rama_id||item.rama_id===orderForm.rama_id),[data.catalogo,orderForm.rama_id]);
  const selectedGarment=useMemo(()=>eligibleGarments.find((item)=>item.id===orderForm.prenda_id)||null,[eligibleGarments,orderForm.prenda_id]);
  const filteredOrders=useMemo(()=>{
    const query=search.trim().toLowerCase();
    if(!query)return data.pedidos;
    return data.pedidos.filter((order)=>[order.jugadores?.nombre,order.prenda_nombre,order.talla,order.numero_estampado,order.nombre_estampado,order.ramas?.nombre,order.ramas?.disciplina].filter(Boolean).some((value)=>String(value).toLowerCase().includes(query)));
  },[data.pedidos,search]);
  const workshopOrders=useMemo(()=>data.pedidos.filter((order)=>{
    const operation=order.prendas_catalogo?.tipo_operacion||'Taller';
    return operation!=='Stock'&&['Pendiente','En Taller'].includes(order.estado_entrega||'Pendiente');
  }),[data.pedidos]);
  const pendingPayment=data.pedidos.filter((order)=>order.estado_pago==='Pendiente de Pago').length;
  const readyOrders=data.pedidos.filter((order)=>order.estado_entrega==='Listo para Entrega').length;

  const openCreateCatalog=()=>{setEditingGarmentId(null);setCatalogForm(emptyCatalog(branchId));setCatalogOpen(true);};
  const openEditCatalog=(garment:Garment)=>{
    setEditingGarmentId(garment.id);
    setCatalogForm({nombre:garment.nombre||'',precio:String(Number(garment.precio)||0),tipo_operacion:garment.tipo_operacion==='Stock'?'Stock':'Taller',stock_disponible:String(Number(garment.stock_disponible)||0),aplica_numero:Boolean(garment.aplica_numero),aplica_nombre_estampado:Boolean(garment.aplica_nombre_estampado),rama_id:garment.rama_id||''});
    setCatalogOpen(true);
  };
  const saveCatalog=async()=>{
    if(!catalogForm.nombre.trim())return void notify('Ingresa el nombre de la prenda.');
    setSaving(true);
    const editing=Boolean(editingGarmentId);
    try{
      const payload={...catalogForm,precio:Number(catalogForm.precio)||0,stock_disponible:Number(catalogForm.stock_disponible)||0,rama_id:catalogForm.rama_id||null};
      if(editingGarmentId)await api.put(`/api/uniformes/catalogo/${editingGarmentId}`,payload);else await api.post('/api/uniformes/catalogo',payload);
      setCatalogOpen(false);setEditingGarmentId(null);await load(branchId);await notify(editing?'Prenda actualizada.':'Prenda agregada al catálogo.');
    }catch(error:any){await notify(error.response?.data?.error||'No fue posible guardar la prenda.');}
    finally{setSaving(false);}
  };
  const deleteCatalog=async(garment:Garment)=>{
    const accepted=await confirmAction(`¿Eliminar “${garment.nombre}” del catálogo? Los pedidos históricos no se modificarán.`,'danger');
    if(!accepted)return;
    try{await api.delete(`/api/uniformes/catalogo/${garment.id}`);await load(branchId);await notify('Prenda eliminada del catálogo.');}
    catch(error:any){await notify(error.response?.data?.error||'No fue posible eliminar la prenda.');}
  };

  const openOrder=(student?:Student)=>{
    const enrollment=student?.inscripciones.find((item)=>item.rama_id===branchId)||student?.inscripciones.find((item)=>item.es_principal)||student?.inscripciones[0];
    setOrderForm({jugador_id:student?.id||'',rama_id:enrollment?.rama_id||branchId||'',prenda_id:'',talla:student?.talla_uniforme||'',numero_estampado:student?.numero_camiseta?String(student.numero_camiseta):'',nombre_estampado:student?.nombre_camiseta||'',estado_pago:'Pendiente de Pago',generar_cobro:true});
    setOrderOpen(true);
  };
  const selectStudentForOrder=(studentId:string)=>{
    const student=data.alumnos.find((item)=>item.id===studentId);
    const enrollment=student?.inscripciones.find((item)=>item.rama_id===branchId)||student?.inscripciones.find((item)=>item.es_principal)||student?.inscripciones[0];
    setOrderForm((current)=>({...current,jugador_id:studentId,rama_id:enrollment?.rama_id||'',prenda_id:'',talla:student?.talla_uniforme||current.talla||'',numero_estampado:student?.numero_camiseta?String(student.numero_camiseta):'',nombre_estampado:student?.nombre_camiseta||''}));
  };
  const selectGarmentForOrder=(garmentId:string)=>{
    const garment=eligibleGarments.find((item)=>item.id===garmentId);
    setOrderForm((current)=>({...current,prenda_id:garmentId,numero_estampado:garment?.aplica_numero?current.numero_estampado:'',nombre_estampado:garment?.aplica_nombre_estampado?current.nombre_estampado:''}));
  };
  const saveOrder=async()=>{
    if(!orderForm.jugador_id||!orderForm.rama_id||!orderForm.prenda_id||!orderForm.talla.trim())return void notify('Selecciona alumno, rama, prenda y talla.');
    if(selectedGarment?.aplica_nombre_estampado&&!orderForm.nombre_estampado.trim()){
      const accepted=await confirmAction('Esta prenda permite nombre estampado y está vacío. ¿Guardar igualmente sin nombre?');if(!accepted)return;
    }
    setSaving(true);
    try{
      await api.post('/api/uniformes/pedidos',{...orderForm,numero_estampado:orderForm.numero_estampado||null,nombre_estampado:orderForm.nombre_estampado.trim().toUpperCase(),monto:selectedGarment?.precio||0,prenda_nombre:selectedGarment?.nombre,generar_cobro:orderForm.estado_pago==='Pendiente de Pago'&&orderForm.generar_cobro});
      setOrderOpen(false);setOrderForm(emptyOrder(branchId));await load(branchId);await notify('Prenda asignada a la inscripción deportiva seleccionada.');
    }catch(error:any){await notify(error.response?.data?.error||'No fue posible asignar la prenda.');}
    finally{setSaving(false);}
  };
  const updateOrder=async(order:Order,patch:Record<string,string>)=>{
    try{
      const response=await api.put(`/api/uniformes/pedidos/${order.id}/actualizar`,patch);await load(branchId);
      if(patch.estado_entrega==='Listo para Entrega')await notify('Pedido marcado listo. Si el apoderado tiene teléfono, se envió el aviso por WhatsApp.');
      else if(patch.estado_pago==='Pagado')await notify('Pago actualizado. Si existía un cobro pendiente, quedó registrado en Finanzas.');
      return response.data;
    }catch(error:any){await notify(error.response?.data?.error||'No fue posible actualizar el pedido.');return null;}
  };
  const exportWorkshop=()=>{
    if(!workshopOrders.length)return void notify('No hay pedidos pendientes de taller para exportar.');
    const detail=workshopOrders.map((order)=>({Disciplina:order.ramas?.disciplina||branch?.disciplina||'',Rama:order.ramas?.nombre||branch?.nombre||'',Alumno:order.jugadores?.nombre||'',Prenda:order.prenda_nombre,Talla:order.talla||'','Número camiseta':order.numero_estampado??'','Nombre camiseta':order.nombre_estampado||'',Estado:order.estado_entrega||'Pendiente'}));
    const summary=Object.entries(data.resumenTaller).map(([item,quantity])=>({'Prenda y talla':item,'Cantidad a fabricar':quantity}));
    const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(detail),'Detalle_Taller');XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(summary),'Resumen');
    const scope=branch?`${branch.disciplina}_${branch.nombre}`:'Toda_Academia';XLSX.writeFile(book,`Pedido_Taller_${safeFile(scope)}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if(loading)return <DirectorPanel className="mx-auto max-w-6xl p-12 text-center text-sm font-bold text-[#697468]">Cargando uniformes e inventario...</DirectorPanel>;

  return <DirectorPage className="max-w-[1500px]">
    <DirectorHero eyebrow="Indumentaria multirrama" title="Uniformes e inventario" description="Cada pedido conserva alumno, inscripción deportiva, rama, talla, estampado, pago y estado logístico. Gestiona stock y fabricación sin perder el contexto financiero." aside={<div className="grid grid-cols-2 gap-2"><div className="rounded-[18px] border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-black uppercase text-[#b7ff00]">Pedidos</p><p className="mt-2 text-2xl font-black text-white">{data.pedidos.length}</p><p className="mt-1 text-[11px] text-[#c7d0c8]">Historial del alcance</p></div><div className="rounded-[18px] border border-[#b7ff00]/25 bg-[#b7ff00]/10 p-4"><p className="text-[10px] font-black uppercase text-[#b7ff00]">Listos</p><p className="mt-2 text-2xl font-black text-white">{readyOrders}</p><p className="mt-1 text-[11px] text-[#c7d0c8]">Para entregar</p></div></div>}/>

    <section className="grid gap-3 sm:grid-cols-4"><DirectorStat label="Catálogo" value={data.catalogo.length} detail="Prendas disponibles"/><DirectorStat label="Pendientes de pago" value={pendingPayment} detail="Con saldo por gestionar"/><DirectorStat label="En taller" value={workshopOrders.length} detail="Fabricación pendiente" tone="lime"/><DirectorStat label="Listos" value={readyOrders} detail="Para retiro o entrega" tone="dark"/></section>

    <DirectorPanel className="p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Alcance de trabajo</p><h2 className="mt-1 text-xl font-black text-[#111711]">{branch?`${branch.disciplina} · ${branch.nombre}`:'Vista global de la academia'}</h2><p className="mt-1 text-sm text-[#697468]">Selecciona una rama para asignar prendas a alumnos concretos; la vista global consolida los pedidos existentes.</p></div><div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"><select value={branchId} onChange={(event)=>setBranchId(event.target.value)} className={`${DIRECTOR_FIELD} min-w-[280px]`}><option value="">Vista global de la academia</option>{data.ramas.map((item)=><option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}{item.sedes?.nombre?` · ${item.sedes.nombre}`:''}</option>)}</select><button type="button" onClick={openCreateCatalog} className={DIRECTOR_BUTTON_GHOST}>Nueva prenda</button><button type="button" onClick={()=>openOrder()} disabled={!branchId} className={DIRECTOR_BUTTON}>Asignar prenda</button></div></div></DirectorPanel>

    <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <DirectorPanel className="p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Catálogo</p><h2 className="mt-1 text-xl font-black text-[#111711]">Prendas disponibles</h2><p className="mt-1 text-sm text-[#697468]">Prendas generales y exclusivas de cada disciplina.</p></div><span className="rounded-full border border-[#dfe5dc] bg-[#f8faf6] px-3 py-1 text-xs font-black text-[#566056]">{data.catalogo.length}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{data.catalogo.map((garment)=><article key={garment.id} className="rounded-[18px] border border-[#e1e6df] bg-[#f8faf6] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#111711]">{garment.nombre}</p><p className="mt-1 text-xs font-semibold text-[#697468]">{garment.rama_id?`${garment.ramas?.disciplina||''} · ${garment.ramas?.nombre||'Rama'}`:'Toda la academia'}</p></div><span className="font-black text-[#4f6900]">{money(garment.precio)}</span></div><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase"><span className="rounded-full border border-[#dfe5dc] bg-white px-2 py-1 text-[#566056]">{garment.tipo_operacion==='Stock'?'Stock':'A pedido'}</span>{garment.tipo_operacion==='Stock'?<span className={`rounded-full border px-2 py-1 ${garment.stock_disponible>5?'border-[#cde995] bg-[#f3fadf] text-[#4f6900]':garment.stock_disponible>0?'border-amber-200 bg-amber-50 text-amber-700':'border-red-200 bg-red-50 text-red-700'}`}>Stock {garment.stock_disponible}</span>:null}</div><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-[#697468]"><span>Número: {garment.aplica_numero?'Sí':'No'}</span><span>Nombre: {garment.aplica_nombre_estampado?'Sí':'No'}</span></div><div className="mt-4 flex justify-end gap-2 border-t border-[#e5e9e2] pt-3"><button type="button" onClick={()=>openEditCatalog(garment)} className={DIRECTOR_BUTTON_GHOST}>Editar</button><button type="button" onClick={()=>void deleteCatalog(garment)} className="inline-flex min-h-10 items-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black text-red-700">Eliminar</button></div></article>)}{!data.catalogo.length?<p className="col-span-full py-8 text-center text-sm text-[#697468]">No hay prendas en este alcance.</p>:null}</div></DirectorPanel>

      <DirectorPanel className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Producción</p><h2 className="mt-1 text-xl font-black text-[#111711]">Pedido al taller</h2><p className="mt-1 text-sm leading-6 text-[#697468]">Consolida talla y estampado de todo lo pendiente.</p></div><button type="button" onClick={exportWorkshop} disabled={!workshopOrders.length} className={DIRECTOR_BUTTON_GHOST}>Descargar Excel</button></div><div className="mt-4 space-y-2">{Object.entries(data.resumenTaller).map(([key,value])=><div key={key} className="flex items-center justify-between rounded-[14px] border border-[#e1e6df] bg-[#f8faf6] px-3 py-2"><span className="text-sm font-bold text-[#566056]">{key}</span><span className="font-black text-[#4f6900]">{value}</span></div>)}{!Object.keys(data.resumenTaller).length?<p className="py-8 text-center text-sm text-[#697468]">Sin pedidos pendientes para fabricar.</p>:null}</div>{workshopOrders.length?<div className="mt-4 rounded-[14px] border border-[#cde995] bg-[#f3fadf] p-3 text-xs leading-5 text-[#566056]">El Excel incluye alumno, rama, prenda, talla, número y nombre estampado.</div>:null}</DirectorPanel>
    </section>

    <DirectorPanel className="overflow-hidden"><div className="border-b border-[#e2e7df] p-5 sm:p-6"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Operación</p><h2 className="mt-1 text-xl font-black text-[#111711]">Pedidos de alumnos</h2><p className="mt-1 text-sm text-[#697468]">Pago, fabricación, aviso y entrega conectados a la rama.</p></div><div className="flex w-full gap-2 lg:w-auto"><input value={search} onChange={(event)=>setSearch(event.target.value)} className={`${DIRECTOR_FIELD} lg:w-80`} placeholder="Buscar alumno, prenda o estampado"/><button type="button" onClick={()=>openOrder()} disabled={!branchId} className={`${DIRECTOR_BUTTON} shrink-0`}>Asignar</button></div></div></div><div className="divide-y divide-[#e7ebe4]">{filteredOrders.map((order)=>{const image=photoOf(order.jugadores);return <article key={order.id} className="grid gap-4 p-4 xl:grid-cols-[1.2fr_1.15fr_.65fr_.9fr_.95fr] xl:items-center"><div className="flex min-w-0 items-center gap-3">{image?<img src={image} alt="" className="h-11 w-11 shrink-0 rounded-[13px] object-cover"/>:<div className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[#111711] text-xs font-black text-[#b7ff00]">{initials(order.jugadores?.nombre||'Alumno')}</div>}<div className="min-w-0"><p className="truncate font-black text-[#111711]">{order.jugadores?.nombre||'Alumno'}</p><p className="mt-1 truncate text-xs font-semibold text-[#697468]">{order.ramas?.disciplina||'Histórico'} · {order.ramas?.nombre||'Sin rama'}</p></div></div><div><p className="text-sm font-black text-[#111711]">{order.prenda_nombre}</p><div className="mt-1 flex flex-wrap gap-1.5 text-[10px]"><span className="rounded bg-[#f3f6f0] px-2 py-1 text-[#566056]">Talla <strong>{order.talla||'S/T'}</strong></span>{order.numero_estampado!=null?<span className="rounded bg-[#f3f6f0] px-2 py-1 text-[#566056]">N° <strong>{order.numero_estampado}</strong></span>:null}{order.nombre_estampado?<span className="rounded border border-[#cde995] bg-[#f3fadf] px-2 py-1 text-[#4f6900]">{order.nombre_estampado}</span>:null}</div></div><div><p className="text-[10px] font-black uppercase text-[#7c867b]">Monto</p><p className="mt-1 font-black text-[#4f6900]">{money(order.monto)}</p></div><div><p className="mb-1 text-[10px] font-black uppercase text-[#7c867b]">Pago</p><select value={order.estado_pago||'Pendiente de Pago'} onChange={(event)=>void updateOrder(order,{estado_pago:event.target.value})} className={`${DIRECTOR_FIELD} min-h-10 py-2 text-xs`}><option value="Pendiente de Pago">Pendiente de Pago</option><option value="Pagado">Pagado</option><option value="Incluido en Matrícula">Incluido en Matrícula</option></select></div><div><p className="mb-1 text-[10px] font-black uppercase text-[#7c867b]">Entrega</p><select value={order.estado_entrega||'Pendiente'} onChange={(event)=>void updateOrder(order,{estado_entrega:event.target.value})} className={`${DIRECTOR_FIELD} min-h-10 py-2 text-xs`}><option value="Pendiente">Pendiente</option><option value="En Taller">En Taller</option><option value="Listo para Entrega">Listo para Entrega</option><option value="Entregado">Entregado</option></select></div></article>;})}{!filteredOrders.length?<div className="p-10 text-center text-sm text-[#697468]">No hay pedidos que coincidan con la búsqueda.</div>:null}</div></DirectorPanel>

    {catalogOpen?<div className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-[#0b100c]/70 p-4 backdrop-blur-sm"><div className="w-full max-w-2xl rounded-[28px] border border-[#d9e0d6] bg-white p-5 shadow-[0_32px_90px_rgba(13,20,14,.28)] sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Catálogo</p><h2 className="mt-1 text-2xl font-black text-[#111711]">{editingGarmentId?'Editar prenda':'Nueva prenda'}</h2></div><button type="button" onClick={()=>setCatalogOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#dfe5dc] text-[#697468]">✕</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Nombre *"><input value={catalogForm.nombre} onChange={(event)=>setCatalogForm({...catalogForm,nombre:event.target.value})} className={DIRECTOR_FIELD}/></Field><Field label="Precio"><input type="number" min="0" value={catalogForm.precio} onChange={(event)=>setCatalogForm({...catalogForm,precio:event.target.value})} className={DIRECTOR_FIELD}/></Field><Field label="Operación"><select value={catalogForm.tipo_operacion} onChange={(event)=>setCatalogForm({...catalogForm,tipo_operacion:event.target.value as 'Taller'|'Stock'})} className={DIRECTOR_FIELD}><option value="Taller">A pedido / Taller</option><option value="Stock">Stock</option></select></Field>{catalogForm.tipo_operacion==='Stock'?<Field label="Stock disponible"><input type="number" min="0" value={catalogForm.stock_disponible} onChange={(event)=>setCatalogForm({...catalogForm,stock_disponible:event.target.value})} className={DIRECTOR_FIELD}/></Field>:null}<Field label="Rama exclusiva"><select value={catalogForm.rama_id} onChange={(event)=>setCatalogForm({...catalogForm,rama_id:event.target.value})} className={DIRECTOR_FIELD}><option value="">Toda la academia</option>{data.ramas.map((item)=><option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}</option>)}</select></Field><div className="space-y-2 rounded-[15px] border border-[#e1e6df] bg-[#f8faf6] p-4"><label className="flex items-center gap-3 text-sm font-bold text-[#566056]"><input type="checkbox" checked={catalogForm.aplica_numero} onChange={(event)=>setCatalogForm({...catalogForm,aplica_numero:event.target.checked})} className="accent-[#8eb700]"/>Permite número estampado</label><label className="flex items-center gap-3 text-sm font-bold text-[#566056]"><input type="checkbox" checked={catalogForm.aplica_nombre_estampado} onChange={(event)=>setCatalogForm({...catalogForm,aplica_nombre_estampado:event.target.checked})} className="accent-[#8eb700]"/>Permite nombre estampado</label></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" onClick={()=>setCatalogOpen(false)} className={DIRECTOR_BUTTON_GHOST}>Cancelar</button><button type="button" disabled={saving} onClick={()=>void saveCatalog()} className={DIRECTOR_BUTTON_DARK}>{saving?'Guardando…':'Guardar prenda'}</button></div></div></div>:null}

    {orderOpen?<div className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-[#0b100c]/70 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-[#d9e0d6] bg-white p-5 shadow-[0_32px_90px_rgba(13,20,14,.28)] sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Nuevo pedido</p><h2 className="mt-1 text-2xl font-black text-[#111711]">Asignar prenda a un alumno</h2><p className="mt-2 text-sm text-[#697468]">El pedido queda ligado a su inscripción deportiva y, si corresponde, puede generar un cobro en Finanzas.</p></div><button type="button" onClick={()=>setOrderOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#dfe5dc] text-[#697468]">✕</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Alumno *"><select value={orderForm.jugador_id} onChange={(event)=>selectStudentForOrder(event.target.value)} className={DIRECTOR_FIELD}><option value="">Seleccionar alumno</option>{data.alumnos.map((student)=><option key={student.id} value={student.id}>{student.nombre}</option>)}</select></Field><Field label="Rama deportiva *"><select value={orderForm.rama_id} onChange={(event)=>setOrderForm({...orderForm,rama_id:event.target.value,prenda_id:''})} className={DIRECTOR_FIELD}><option value="">Seleccionar rama</option>{data.ramas.filter((item)=>!selectedStudent||selectedStudent.inscripciones.some((enrollment)=>enrollment.rama_id===item.id)).map((item)=><option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}</option>)}</select></Field><Field label="Prenda *"><select value={orderForm.prenda_id} onChange={(event)=>selectGarmentForOrder(event.target.value)} className={DIRECTOR_FIELD}><option value="">Seleccionar prenda</option>{eligibleGarments.map((garment)=><option key={garment.id} value={garment.id}>{garment.nombre} · {money(garment.precio)}{garment.tipo_operacion==='Stock'?` · stock ${garment.stock_disponible}`:''}</option>)}</select></Field><Field label="Talla *"><input value={orderForm.talla} onChange={(event)=>setOrderForm({...orderForm,talla:event.target.value})} className={DIRECTOR_FIELD}/></Field>{selectedGarment?.aplica_numero?<Field label="Número estampado"><input type="number" min="0" value={orderForm.numero_estampado} onChange={(event)=>setOrderForm({...orderForm,numero_estampado:event.target.value})} className={DIRECTOR_FIELD}/></Field>:null}{selectedGarment?.aplica_nombre_estampado?<Field label="Nombre estampado"><input value={orderForm.nombre_estampado} onChange={(event)=>setOrderForm({...orderForm,nombre_estampado:event.target.value.toUpperCase()})} className={DIRECTOR_FIELD}/></Field>:null}<Field label="Estado de pago"><select value={orderForm.estado_pago} onChange={(event)=>setOrderForm({...orderForm,estado_pago:event.target.value})} className={DIRECTOR_FIELD}><option>Pendiente de Pago</option><option>Pagado</option><option>Incluido en Matrícula</option></select></Field><div className="rounded-[15px] border border-[#e1e6df] bg-[#f8faf6] p-4"><label className="flex items-start gap-3 text-sm font-bold text-[#566056]"><input type="checkbox" checked={orderForm.generar_cobro} disabled={orderForm.estado_pago!=='Pendiente de Pago'} onChange={(event)=>setOrderForm({...orderForm,generar_cobro:event.target.checked})} className="mt-1 accent-[#8eb700]"/><span>Generar cobro en Finanzas<span className="mt-1 block text-xs font-normal text-[#697468]">Solo si el pedido queda pendiente de pago.</span></span></label></div></div>{selectedGarment?<div className="mt-5 rounded-[16px] border border-[#cde995] bg-[#f3fadf] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-black text-[#111711]">{selectedGarment.nombre}</p><p className="mt-1 text-xs text-[#566056]">{selectedGarment.tipo_operacion==='Stock'?`Stock disponible: ${selectedGarment.stock_disponible}`:'Fabricación a pedido'}</p></div><p className="text-xl font-black text-[#4f6900]">{money(selectedGarment.precio)}</p></div></div>:null}<div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" onClick={()=>setOrderOpen(false)} className={DIRECTOR_BUTTON_GHOST}>Cancelar</button><button type="button" disabled={saving} onClick={()=>void saveOrder()} className={DIRECTOR_BUTTON_DARK}>{saving?'Guardando…':'Asignar prenda'}</button></div></div></div>:null}
  </DirectorPage>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className={labelClass}>{label}</span>{children}</label>;}
