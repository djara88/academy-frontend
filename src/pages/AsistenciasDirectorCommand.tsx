import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../api/axiosConfig';
import { useAcademyMessages } from '../hooks/useAcademyMessages';
import { DIRECTOR_BUTTON, DIRECTOR_BUTTON_DARK, DIRECTOR_BUTTON_GHOST, DIRECTOR_FIELD, DirectorPage } from '../components/director/DirectorModule';

type Branch={id:string;nombre:string;disciplina:string;sedes?:{id:string;nombre:string}|null};
type Category={id:string;nombre:string;rama_id?:string|null;ramas?:{id:string;nombre:string;disciplina:string}|null};
type Student={id:string;nombre:string;documento?:string|null;fecha_nacimiento?:string|null;foto?:string|null;rol_especialidad?:string|null;inscripcion_id?:string|null;rama_id?:string|null;tiene_alerta_medica?:boolean};
type Suspended={id:string;categoria_id:string;rama_id?:string|null;fecha:string;motivo_cancelacion?:string|null;categorias?:{id:string;nombre:string}|null;ramas?:{id:string;nombre:string;disciplina:string}|null};
type Metrics={global:{totalClases:number;canceladas:number;recuperativas:number;porcentajeGlobal:number;totalPresentes:number;totalAusentes:number;totalJustificados:number};categorias:Array<{nombre:string;porcentaje:number;presentes:number;total:number}>;jugadores:Array<{nombre:string;porcentaje:number;presentes:number;total:number}>;registros?:Array<{registro_id?:string;entrenamiento_id:string;fecha:string;hora?:string|null;registrado_at?:string|null;alumno:string;jugador_id?:string;estado:'Presente'|'Ausente'|'Justificado';categoria:string;rama:string;disciplina?:string;lugar?:string|null;es_recuperacion:boolean}>};
type AttendanceStatus='Presente'|'Ausente'|'Justificado';
type Mode='sesion'|'recuperaciones'|'reportes';
type RosterState='idle'|'loading'|'verified'|'error';

const ageFrom=(value?:string|null)=>{if(!value)return null;const birth=new Date(`${String(value).slice(0,10)}T12:00:00`);if(Number.isNaN(birth.getTime()))return null;const now=new Date();let age=now.getFullYear()-birth.getFullYear();const before=now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate());if(before)age-=1;return age>=0?age:null;};
const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'A';

export default function AsistenciasDirectorCommand(){
  const {confirmAction,notify}=useAcademyMessages();
  const [mode,setMode]=useState<Mode>('sesion');
  const [branches,setBranches]=useState<Branch[]>([]);
  const [branchId,setBranchId]=useState('');
  const [categories,setCategories]=useState<Category[]>([]);
  const [categoryId,setCategoryId]=useState('');
  const [students,setStudents]=useState<Student[]>([]);
  const [attendance,setAttendance]=useState<Record<string,AttendanceStatus>>({});
  const [studentSearch,setStudentSearch]=useState('');
  const [rosterState,setRosterState]=useState<RosterState>('idle');
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const [time,setTime]=useState('17:00');
  const [place,setPlace]=useState('');
  const [sessionStatus,setSessionStatus]=useState('Realizado');
  const [reason,setReason]=useState('');
  const [recovery,setRecovery]=useState(false);
  const [metrics,setMetrics]=useState<Metrics|null>(null);
  const [month,setMonth]=useState(String(new Date().getMonth()+1).padStart(2,'0'));
  const [year,setYear]=useState(String(new Date().getFullYear()));
  const [suspended,setSuspended]=useState<Suspended[]>([]);
  const [selectedSuspended,setSelectedSuspended]=useState<Suspended|null>(null);
  const [reschedule,setReschedule]=useState({fecha:'',hora:'18:00',lugar:''});
  const [saving,setSaving]=useState(false);

  useEffect(()=>{const load=async()=>{try{const response=await api.get('/api/academias/rama-principal');const data=response.data.data;setBranches(data?.ramas||[]);setBranchId(current=>current||data?.rama_principal_id||data?.ramas?.[0]?.id||'');}catch(error){console.error(error);}};void load();},[]);

  useEffect(()=>{const load=async()=>{if(!branchId){setCategories([]);setMetrics(null);setSuspended([]);return;}try{const [catResponse,metricResponse,suspendedResponse]=await Promise.all([api.get('/api/jugadores/categorias',{params:{rama_id:branchId}}),api.get('/api/entrenamientos/metricas',{params:{rama_id:branchId,mes:month,anio:year}}),api.get('/api/entrenamientos/suspendidas',{params:{rama_id:branchId}})]);setCategories(catResponse.data.data||[]);setMetrics(metricResponse.data.data||null);setSuspended(suspendedResponse.data.data||[]);setCategoryId(current=>current&&current!=='TODAS'&&(catResponse.data.data||[]).some((item:Category)=>item.id===current)?current:current==='TODAS'?'TODAS':'');}catch(error:any){await notify(error.response?.data?.error||'No fue posible cargar la asistencia de la rama.');}};void load();},[branchId,month,year]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(()=>{let cancelled=false;const load=async()=>{setStudentSearch('');if(!categoryId||categoryId==='TODAS'||sessionStatus!=='Realizado'){setStudents([]);setAttendance({});setRosterState('idle');return;}setRosterState('loading');try{const response=await api.get('/api/entrenamientos/alumnos',{params:{rama_id:branchId,categoria_id:categoryId}});if(cancelled)return;const list=(response.data?.data||[]) as Student[];setStudents(list);setAttendance(Object.fromEntries(list.map(student=>[student.id,'Presente'])) as Record<string,AttendanceStatus>);setRosterState('verified');}catch(error:any){if(cancelled)return;setStudents([]);setAttendance({});setRosterState('error');await notify(error.response?.data?.error||'No fue posible verificar el plantel de esta categoría.');}};void load();return()=>{cancelled=true;};},[categoryId,branchId,sessionStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const branch=branches.find(item=>item.id===branchId)||null;
  const category=categories.find(item=>item.id===categoryId)||null;
  const filteredStudents=useMemo(()=>{const query=studentSearch.trim().toLowerCase();if(!query)return students;return students.filter(student=>[student.nombre,student.documento,student.rol_especialidad].filter(Boolean).some(value=>String(value).toLowerCase().includes(query)));},[students,studentSearch]);
  const attendanceSummary=useMemo(()=>students.reduce((summary,student)=>{const value=attendance[student.id]||'Presente';summary[value]+=1;return summary;},{Presente:0,Ausente:0,Justificado:0} as Record<AttendanceStatus,number>),[students,attendance]);
  const rosterVerified=rosterState==='verified';

  const markAllPresent=()=>setAttendance(Object.fromEntries(students.map(student=>[student.id,'Presente'])) as Record<string,AttendanceStatus>);
  const setStudentStatus=(id:string,value:AttendanceStatus)=>setAttendance(current=>({...current,[id]:value}));

  const saveTraining=async()=>{
    if(!branchId||!categoryId)return void notify('Selecciona una rama y una categoría.');
    if(sessionStatus==='Realizado'&&categoryId!=='TODAS'&&!rosterVerified)return void notify('La lista todavía no está verificada. Espera a que cargue el plantel antes de guardar.');
    setSaving(true);
    try{
      const response=await api.post('/api/entrenamientos',{rama_id:branchId,categoria_id:categoryId,fecha:date,hora:time,lugar:place,estado:sessionStatus,es_recuperacion:recovery,motivo_cancelacion:reason,lista_asistencia:students.map(student=>({jugador_id:student.id,estado:attendance[student.id]||'Presente'}))});
      await notify(response.data.message||`Entrenamiento ${sessionStatus.toLowerCase()} registrado.`);
      setCategoryId('');setReason('');setStudents([]);setAttendance({});setRosterState('idle');
      const [metricResponse,suspendedResponse]=await Promise.all([api.get('/api/entrenamientos/metricas',{params:{rama_id:branchId,mes:month,anio:year}}),api.get('/api/entrenamientos/suspendidas',{params:{rama_id:branchId}})]);
      setMetrics(metricResponse.data.data);setSuspended(suspendedResponse.data.data||[]);
    }catch(error:any){await notify(error.response?.data?.error||'No fue posible guardar la sesión.');}finally{setSaving(false);}
  };

  const rescheduleClass=async()=>{
    if(!selectedSuspended||!reschedule.fecha||!reschedule.hora)return void notify('Completa fecha y hora del reagendamiento.');
    const accepted=await confirmAction(`¿Reagendar ${selectedSuspended.categorias?.nombre||'la clase'} y notificar solo a los apoderados de ${branch?.nombre||'esta rama'}?`);if(!accepted)return;
    try{const response=await api.post('/api/entrenamientos/reagendar-notificar',{categoria_id:selectedSuspended.categoria_id,fecha:reschedule.fecha,hora:reschedule.hora,lugar:reschedule.lugar,clase_cancelada_id:selectedSuspended.id});await notify(response.data.message);setSelectedSuspended(null);const suspendedResponse=await api.get('/api/entrenamientos/suspendidas',{params:{rama_id:branchId}});setSuspended(suspendedResponse.data.data||[]);}catch(error:any){await notify(error.response?.data?.error||'No fue posible reagendar.');}
  };

  const sendReport=async()=>{
    if(!categoryId||categoryId==='TODAS')return void notify('Selecciona una categoría específica.');
    const accepted=await confirmAction(`¿Enviar reporte mensual de ${category?.nombre} en ${branch?.nombre}?`);if(!accepted)return;
    try{const response=await api.post('/api/entrenamientos/reporte-mensual',{categoria_id:categoryId,mes:month,anio:year});await notify(response.data.message);}catch(error:any){await notify(error.response?.data?.error||'No fue posible enviar reportes.');}
  };

  const exportExcel=()=>{
    const detail=metrics?.registros||[];
    if(!metrics?.jugadores?.length&&!detail.length)return void notify('No hay datos para exportar.');
    const summaryRows=(metrics?.jugadores||[]).map((item,index)=>({Ranking:index+1,Alumno:item.nombre,'Porcentaje (%)':item.porcentaje,Presentes:item.presentes,'Registros únicos':item.total,Rama:branch?.nombre||'',Disciplina:branch?.disciplina||'',Mes:month,Año:year}));
    const detailRows=detail.map(item=>{const sessionDate=item.fecha?new Date(`${item.fecha}T12:00:00`):null;const registeredDate=item.registrado_at?new Date(item.registrado_at):null;const valid=registeredDate&&!Number.isNaN(registeredDate.getTime());return {'Fecha sesión':sessionDate&&!Number.isNaN(sessionDate.getTime())?sessionDate.toLocaleDateString('es-CL'):item.fecha||'','Hora sesión':item.hora||'',Alumno:item.alumno,Estado:item.estado,Categoría:item.categoria,Rama:item.rama||branch?.nombre||'',Disciplina:item.disciplina||branch?.disciplina||'',Lugar:item.lugar||'','Tipo de clase':item.es_recuperacion?'Recuperación':'Regular','Fecha registro':valid?registeredDate.toLocaleDateString('es-CL',{timeZone:'America/Santiago'}):'','Hora registro':valid?registeredDate.toLocaleTimeString('es-CL',{timeZone:'America/Santiago',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}):'','ID sesión':item.entrenamiento_id};});
    const book=XLSX.utils.book_new();const summarySheet=XLSX.utils.json_to_sheet(summaryRows);if(summarySheet['!ref'])summarySheet['!autofilter']={ref:summarySheet['!ref']};XLSX.utils.book_append_sheet(book,summarySheet,'Resumen');if(detailRows.length){const detailSheet=XLSX.utils.json_to_sheet(detailRows);if(detailSheet['!ref'])detailSheet['!autofilter']={ref:detailSheet['!ref']};XLSX.utils.book_append_sheet(book,detailSheet,'Detalle');}const safeBranch=String(branch?.nombre||'Rama').replace(/[\\/:*?"<>|]+/g,'-');XLSX.writeFile(book,`Asistencias_${safeBranch}_${month}_${year}.xlsx`);
  };

  const verificationCopy=rosterState==='verified'?'Plantel verificado':rosterState==='loading'?'Verificando plantel':rosterState==='error'?'No verificado':'Pendiente de contexto';

  return <DirectorPage className="max-w-[1450px]">
    <div className="attendance-command">
      <header className="attendance-command-head">
        <div className="attendance-command-copy"><p className="attendance-command-kicker">Training Session Record · Director</p><h1>Asistencia de la sesión</h1><p>El Director trabaja sobre una sesión concreta: rama, categoría, fecha y plantel. La lista solo se habilita cuando el roster real fue verificado por el servidor.</p></div>
        <div className="attendance-command-context"><label><span>Rama activa</span><select className={DIRECTOR_FIELD} value={branchId} onChange={event=>{setBranchId(event.target.value);setCategoryId('');setRosterState('idle');}}><option value="">Selecciona rama</option>{branches.map(item=><option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}{item.sedes?.nombre?` · ${item.sedes.nombre}`:''}</option>)}</select></label></div>
      </header>

      <nav className="attendance-command-modes" aria-label="Área de asistencia">
        <button type="button" aria-pressed={mode==='sesion'} onClick={()=>setMode('sesion')}>Sesión y lista</button>
        <button type="button" aria-pressed={mode==='recuperaciones'} onClick={()=>setMode('recuperaciones')}>Recuperaciones · {suspended.length}</button>
        <button type="button" aria-pressed={mode==='reportes'} onClick={()=>setMode('reportes')}>Historial y reportes</button>
      </nav>

      {mode==='sesion'?<section className="attendance-session-shell">
        <aside className="attendance-session-setup">
          <div className="attendance-section-head"><div><p className="attendance-command-kicker" style={{color:'var(--ls-accent-text)'}}>Contexto de sesión</p><h2>{branch?.disciplina||'Entrenamiento'}</h2><p>Define la sesión antes de tocar la lista.</p></div><span className="attendance-verified" data-state={rosterState}>{verificationCopy}</span></div>
          <div className="attendance-setup-body">
            <label className="attendance-field"><span>Categoría</span><select className={DIRECTOR_FIELD} value={categoryId} onChange={event=>setCategoryId(event.target.value)}><option value="">Selecciona categoría</option><option value="TODAS">Todas las categorías</option>{categories.map(item=><option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
            <div className="attendance-field-grid"><label className="attendance-field"><span>Fecha</span><input className={DIRECTOR_FIELD} type="date" value={date} onChange={event=>setDate(event.target.value)}/></label><label className="attendance-field"><span>Hora</span><input className={DIRECTOR_FIELD} type="time" value={time} onChange={event=>setTime(event.target.value)}/></label></div>
            <label className="attendance-field"><span>Lugar</span><input className={DIRECTOR_FIELD} value={place} onChange={event=>setPlace(event.target.value)} placeholder="Cancha / gimnasio / recinto"/></label>
            <label className="attendance-field"><span>Estado de sesión</span><select className={DIRECTOR_FIELD} value={sessionStatus} onChange={event=>setSessionStatus(event.target.value)}><option>Realizado</option><option>Cancelado</option><option>Programado</option></select></label>
            {sessionStatus==='Cancelado'?<label className="attendance-field"><span>Motivo</span><textarea className={`${DIRECTOR_FIELD} min-h-24 py-3`} value={reason} onChange={event=>setReason(event.target.value)} placeholder="Lluvia, feriado, recinto no disponible…"/></label>:null}
            <label className="attendance-toggle"><input type="checkbox" checked={recovery} onChange={event=>setRecovery(event.target.checked)}/><span>Sesión recuperativa</span></label>
            <div className="attendance-setup-note">{categoryId==='TODAS'?'Registrarás una sesión general para la rama. Para marcar deportistas uno por uno selecciona una categoría específica.':sessionStatus!=='Realizado'?'La lista individual solo aplica cuando la sesión queda como Realizado.':rosterVerified?`Roster verificado: ${students.length} deportistas cargados desde la categoría.`:'La sesión todavía no tiene un roster verificado.'}</div>
            <button className={DIRECTOR_BUTTON} disabled={saving||(sessionStatus==='Realizado'&&categoryId!=='TODAS'&&Boolean(categoryId)&&!rosterVerified)} onClick={()=>void saveTraining()}>{saving?'Guardando…':'Guardar sesión'}</button>
          </div>
        </aside>

        <div className="attendance-session-roster">
          <div className="attendance-section-head"><div><p className="attendance-command-kicker" style={{color:'var(--ls-accent-text)'}}>Attendance Lineup · Director</p><h2>{category?.nombre||'Selecciona una categoría'}</h2><p>{rosterVerified?'Lista real cargada y lista para registrar.':'No convertimos un roster desconocido en una lista vacía.'}</p></div><div className="attendance-section-status"><strong>{students.length}</strong><small>deportistas</small></div></div>
          {students.length?<div className="attendance-roster-command"><div className="attendance-roster-summary"><span className="is-present"><strong>{attendanceSummary.Presente}</strong><small>Presentes</small></span><span className="is-absent"><strong>{attendanceSummary.Ausente}</strong><small>Ausentes</small></span><span className="is-justified"><strong>{attendanceSummary.Justificado}</strong><small>Justificados</small></span></div><div className="attendance-roster-tools"><input className={`${DIRECTOR_FIELD} attendance-roster-search`} value={studentSearch} onChange={event=>setStudentSearch(event.target.value)} placeholder="Buscar deportista"/><button type="button" className={DIRECTOR_BUTTON_GHOST} onClick={markAllPresent}>Todos presentes</button></div></div>:null}
          <div className="attendance-roster-list" aria-live="polite">
            {rosterState==='loading'?<div className="attendance-loading">Verificando plantel de la categoría…</div>:null}
            {rosterState==='error'?<div className="attendance-error">No fue posible verificar el plantel. Cambia de categoría o vuelve a intentarlo.</div>:null}
            {rosterVerified&&filteredStudents.map(student=>{const age=ageFrom(student.fecha_nacimiento);const current=attendance[student.id]||'Presente';return <article key={student.id} className="attendance-player-row">
              <span className="attendance-avatar">{student.foto?<img src={student.foto} alt=""/>:initials(student.nombre)}</span>
              <div className="attendance-player-copy"><strong>{student.nombre}</strong><small>{[student.documento,age!==null?`${age} años`:null,student.rol_especialidad].filter(Boolean).join(' · ')||'Sin contexto adicional'}</small>{student.tiene_alerta_medica?<span className="attendance-medical-alert">Alerta de disponibilidad registrada</span>:null}</div>
              <div className="attendance-state-group" role="group" aria-label={`Asistencia de ${student.nombre}`}>{(['Presente','Ausente','Justificado'] as AttendanceStatus[]).map(value=><button key={value} type="button" data-status={value} aria-pressed={current===value} onClick={()=>setStudentStatus(student.id,value)}>{value}</button>)}</div>
            </article>;})}
            {rosterVerified&&students.length===0?<div className="attendance-empty"><strong>Categoría sin deportistas activos.</strong><span>Revisa las inscripciones deportivas antes de registrar asistencia.</span></div>:null}
            {rosterVerified&&students.length>0&&filteredStudents.length===0?<div className="attendance-empty"><strong>Sin coincidencias.</strong><span>No encontramos deportistas con esa búsqueda.</span></div>:null}
            {rosterState==='idle'&&!categoryId?<div className="attendance-empty"><strong>Falta la categoría.</strong><span>Selecciona el contexto deportivo para verificar el plantel.</span></div>:null}
            {rosterState==='idle'&&categoryId==='TODAS'?<div className="attendance-empty"><strong>Sesión general de rama.</strong><span>Selecciona una categoría específica para pasar lista deportista por deportista.</span></div>:null}
            {rosterState==='idle'&&categoryId&&categoryId!=='TODAS'&&sessionStatus!=='Realizado'?<div className="attendance-empty"><strong>{sessionStatus}.</strong><span>La lista individual no corresponde a una sesión que todavía no está realizada.</span></div>:null}
          </div>
        </div>
      </section>:null}

      {mode==='recuperaciones'?<section className="attendance-recovery-shell">
        <div className="attendance-recovery-list"><div className="attendance-section-head"><div><p className="attendance-command-kicker" style={{color:'var(--ls-accent-text)'}}>Sesiones suspendidas</p><h2>Recuperaciones pendientes</h2><p>{branch?.nombre||'Rama seleccionada'}</p></div><div className="attendance-section-status"><strong>{suspended.length}</strong><small>pendientes</small></div></div><div className="attendance-recovery-rows">{suspended.map(item=><button key={item.id} type="button" aria-current={selectedSuspended?.id===item.id?'true':undefined} onClick={()=>setSelectedSuspended(item)} className="attendance-recovery-row"><strong>{item.categorias?.nombre||'Categoría'} · {item.fecha}</strong><small>{item.motivo_cancelacion||'Sin motivo informado'}</small></button>)}{!suspended.length?<div className="attendance-empty"><strong>Sin recuperaciones pendientes.</strong><span>No hay clases suspendidas en esta rama.</span></div>:null}</div></div>
        <div className="attendance-recovery-form"><div className="attendance-section-head"><div><p className="attendance-command-kicker" style={{color:'var(--ls-accent-text)'}}>Nueva fecha</p><h2>Reagendar y notificar</h2><p>La comunicación se mantiene dentro de la rama/categoría correspondiente.</p></div></div>{selectedSuspended?<div className="attendance-recovery-body"><div className="attendance-setup-note">{selectedSuspended.categorias?.nombre||'Categoría'} · suspendida el {selectedSuspended.fecha}</div><label className="attendance-field"><span>Fecha</span><input className={DIRECTOR_FIELD} type="date" value={reschedule.fecha} onChange={event=>setReschedule({...reschedule,fecha:event.target.value})}/></label><label className="attendance-field"><span>Hora</span><input className={DIRECTOR_FIELD} type="time" value={reschedule.hora} onChange={event=>setReschedule({...reschedule,hora:event.target.value})}/></label><label className="attendance-field"><span>Lugar</span><input className={DIRECTOR_FIELD} value={reschedule.lugar} onChange={event=>setReschedule({...reschedule,lugar:event.target.value})}/></label><button className={DIRECTOR_BUTTON} onClick={()=>void rescheduleClass()}>Reagendar y notificar</button></div>:<div className="attendance-empty"><strong>Selecciona una suspensión.</strong><span>Luego define la nueva fecha y recinto.</span></div>}</div>
      </section>:null}

      {mode==='reportes'?<section className="attendance-report">
        <div className="attendance-section-head"><div><p className="attendance-command-kicker" style={{color:'var(--ls-accent-text)'}}>Season Attendance Record</p><h2>Historial y lectura mensual</h2><p>Los indicadores describen sesiones registradas; no sustituyen el roster verificado de una sesión concreta.</p></div></div>
        <div className="attendance-report-toolbar"><label className="attendance-field"><span>Mes</span><select className={DIRECTOR_FIELD} value={month} onChange={event=>setMonth(event.target.value)}>{Array.from({length:12},(_,index)=><option key={index+1} value={String(index+1).padStart(2,'0')}>{String(index+1).padStart(2,'0')}</option>)}</select></label><label className="attendance-field"><span>Año</span><input className={DIRECTOR_FIELD} value={year} onChange={event=>setYear(event.target.value)}/></label><button type="button" className={DIRECTOR_BUTTON_DARK} onClick={exportExcel}>Exportar Excel</button><label className="attendance-field"><span>Reporte a familias</span><select className={DIRECTOR_FIELD} value={categoryId} onChange={event=>setCategoryId(event.target.value)}><option value="">Selecciona categoría</option>{categories.map(item=><option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label><button className={DIRECTOR_BUTTON} onClick={()=>void sendReport()}>Enviar reporte</button></div>
        {metrics?<><div className="attendance-report-pulse"><span><small>Sesiones</small><strong>{metrics.global.totalClases}</strong></span><span className="is-main"><small>Asistencia</small><strong>{metrics.global.porcentajeGlobal}%</strong></span><span><small>Canceladas</small><strong>{metrics.global.canceladas}</strong></span><span><small>Recuperativas</small><strong>{metrics.global.recuperativas}</strong></span></div><div className="attendance-report-body"><div className="attendance-report-ranking"><div className="attendance-section-head"><div><h3>Lectura por categoría</h3><p>Porcentaje calculado desde registros reales del período.</p></div></div>{metrics.categorias.map(item=><div key={item.nombre} className="attendance-report-row"><strong>{item.nombre} · {item.presentes}/{item.total}</strong><span>{item.porcentaje}%</span></div>)}{!metrics.categorias.length?<div className="attendance-empty">Sin datos de categorías para el período.</div>:null}</div><div className="attendance-report-family"><h3>Seguimiento individual</h3><p>Deportistas con registros en el período seleccionado.</p>{metrics.jugadores.slice(0,12).map(item=><div key={item.nombre} className="attendance-report-row"><strong>{item.nombre} · {item.presentes}/{item.total}</strong><span>{item.porcentaje}%</span></div>)}{!metrics.jugadores.length?<div className="attendance-empty">Sin registros individuales.</div>:null}</div></div></>:<div className="attendance-empty"><strong>Sin lectura verificada.</strong><span>No fue posible obtener métricas para este período.</span></div>}
      </section>:null}
    </div>
  </DirectorPage>;
}
