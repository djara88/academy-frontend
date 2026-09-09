import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import { DIRECTOR_BUTTON, DIRECTOR_BUTTON_GHOST, DIRECTOR_FIELD, DIRECTOR_TEXTAREA, DirectorPage } from '../components/director/DirectorModule';

type Availability='Sin evaluar'|'Disponible'|'Disponible con restricción'|'En recuperación'|'No disponible';
type SummaryItem={id:string;nombre:string;foto?:string|null;estado_disponibilidad:Availability;restriccion?:string|null;lesiones_activas:number;retorno_estimado?:string|null;certificados_vencidos:number;certificados_por_vencer:number};
type SummaryPayload={items:SummaryItem[];resumen:{total:number;por_estado:Record<string,number>;lesiones_activas:number;certificados_vencidos:number}};
type Injury={id:string;tipo:string;zona?:string|null;descripcion?:string|null;estado:string;fecha_inicio:string;fecha_retorno_estimada?:string|null;fecha_cierre?:string|null;restriccion?:string|null;observaciones?:string|null;ramas?:{nombre?:string;disciplina?:string}|null};
type Certificate={id:string;tipo:string;fecha_emision?:string|null;fecha_vencimiento?:string|null;archivo_url?:string|null;observaciones?:string|null;estado_calculado:string};
type Enrollment={id:string;estado:string;rama_id?:string|null;categoria_id?:string|null;ramas?:{nombre?:string;disciplina?:string;activa?:boolean}|null;categorias?:{nombre?:string}|null};
type EnrollmentPlayer={id:string;nombre:string;inscripciones:Enrollment[]};
type PlayerDetail={jugador:{id:string;nombre:string;foto?:string|null;fecha_nacimiento?:string|null};salud:{estado_disponibilidad:Availability;restriccion?:string|null;grupo_sanguineo?:string|null;alergias?:string|null;medicamentos?:string|null;enfermedades_cronicas?:string|null;observaciones?:string|null;contacto_emergencia_nombre?:string|null;contacto_emergencia_telefono?:string|null;contacto_emergencia_parentesco?:string|null};lesiones:Injury[];certificados:Certificate[];inscripciones:Enrollment[];perfil_360:{asistencia:{porcentaje:number|null;registros:number;presentes:number};evaluacion:{promedio_actual:number|null;variacion:number|null;evaluaciones:number};competencia:{eventos:number;participaciones:number;titularidades:number;minutos:number;destacados:number};marcas:{pb_vigentes:number;sb_vigentes:number;recientes:any[]};salud:{estado:Availability;lesiones_activas:number;dias_fuera_temporada:number;certificados_vencidos:number;certificados_por_vencer:number}}};
type ProfileDraft={estado_disponibilidad:Availability;motivo_disponibilidad:string;restriccion:string;grupo_sanguineo:string;alergias:string;medicamentos:string;enfermedades_cronicas:string;observaciones:string;contacto_emergencia_nombre:string;contacto_emergencia_telefono:string;contacto_emergencia_parentesco:string};

const emptyProfile:ProfileDraft={estado_disponibilidad:'Sin evaluar',motivo_disponibilidad:'',restriccion:'',grupo_sanguineo:'',alergias:'',medicamentos:'',enfermedades_cronicas:'',observaciones:'',contacto_emergencia_nombre:'',contacto_emergencia_telefono:'',contacto_emergencia_parentesco:''};
const availabilityOptions:Availability[]=['Sin evaluar','Disponible','Disponible con restricción','En recuperación','No disponible'];
const injuryStates=['Activa','Recuperación','Entrenamiento parcial','Entrenamiento completo','Cerrada'];
const date=(value?:string|null)=>value?new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('es-CL'):'—';
const metric=(value:number|null|undefined,suffix='')=>value===null||value===undefined?'Sin datos':`${value}${suffix}`;
const contextKey=(enrollment:Enrollment)=>`${enrollment.rama_id||''}|${enrollment.categoria_id||''}`;

export default function SaludDisponibilidad(){
  const {notify}=useAppDialog();
  const [selectedId,setSelectedId]=useState('');
  const [search,setSearch]=useState('');
  const [contextFilter,setContextFilter]=useState('');
  const [availabilityFilter,setAvailabilityFilter]=useState<Availability|'Todos'>('Todos');
  const [profile,setProfile]=useState<ProfileDraft>(emptyProfile);
  const [saving,setSaving]=useState(false);
  const [injury,setInjury]=useState({tipo:'',zona:'',rama_id:'',fecha_inicio:new Date().toISOString().slice(0,10),fecha_retorno_estimada:'',descripcion:'',restriccion:'',observaciones:''});
  const [certificate,setCertificate]=useState({tipo:'Certificado médico',fecha_emision:'',fecha_vencimiento:'',archivo_url:'',observaciones:''});
  const [creatingInjury,setCreatingInjury]=useState(false);
  const [creatingCertificate,setCreatingCertificate]=useState(false);

  const summaryQuery=useQuery({queryKey:['salud-resumen'],queryFn:async()=>((await api.get('/api/ficha-medica/resumen')).data.data as SummaryPayload),staleTime:30_000});
  const enrollmentQuery=useQuery({queryKey:['availability-enrollment-context'],queryFn:async()=>((await api.get('/api/inscripciones/alumnos')).data.data as EnrollmentPlayer[]),staleTime:30_000});
  const detailQuery=useQuery({queryKey:['salud-jugador',selectedId],enabled:Boolean(selectedId),queryFn:async()=>((await api.get(`/api/ficha-medica/jugador/${selectedId}`)).data.data as PlayerDetail)});

  const items=summaryQuery.data?.items||[];
  const enrollmentByPlayer=useMemo(()=>new Map((enrollmentQuery.data||[]).map(player=>[String(player.id),(player.inscripciones||[]).filter(row=>row.estado==='Activa')])),[enrollmentQuery.data]);
  const contexts=useMemo(()=>{
    const map=new Map<string,string>();
    for(const rows of enrollmentByPlayer.values())for(const row of rows){
      const key=contextKey(row);
      if(!key||key==='|')continue;
      map.set(key,[row.ramas?.disciplina||row.ramas?.nombre,row.categorias?.nombre].filter(Boolean).join(' · ')||'Contexto deportivo');
    }
    return [...map.entries()].sort((a,b)=>a[1].localeCompare(b[1],'es'));
  },[enrollmentByPlayer]);
  const filtered=useMemo(()=>{
    const term=search.trim().toLowerCase();
    return items.filter(item=>{
      if(term&&!item.nombre.toLowerCase().includes(term))return false;
      if(availabilityFilter!=='Todos'&&item.estado_disponibilidad!==availabilityFilter)return false;
      if(contextFilter){
        const rows=enrollmentByPlayer.get(String(item.id))||[];
        if(!rows.some(row=>contextKey(row)===contextFilter))return false;
      }
      return true;
    });
  },[items,search,availabilityFilter,contextFilter,enrollmentByPlayer]);

  useEffect(()=>{if(!selectedId&&filtered.length)setSelectedId(filtered[0].id);},[filtered,selectedId]);
  useEffect(()=>{if(selectedId&&filtered.length&&!filtered.some(item=>item.id===selectedId))setSelectedId(filtered[0].id);},[filtered,selectedId]);
  useEffect(()=>{const h=detailQuery.data?.salud;if(!h)return;setProfile({estado_disponibilidad:h.estado_disponibilidad||'Sin evaluar',motivo_disponibilidad:'',restriccion:h.restriccion||'',grupo_sanguineo:h.grupo_sanguineo||'',alergias:h.alergias||'',medicamentos:h.medicamentos||'',enfermedades_cronicas:h.enfermedades_cronicas||'',observaciones:h.observaciones||'',contacto_emergencia_nombre:h.contacto_emergencia_nombre||'',contacto_emergencia_telefono:h.contacto_emergencia_telefono||'',contacto_emergencia_parentesco:h.contacto_emergencia_parentesco||''});},[detailQuery.data?.jugador.id]);

  const refresh=async()=>{await Promise.all([summaryQuery.refetch(),detailQuery.refetch()]);};
  const saveProfile=async()=>{if(!selectedId)return;setSaving(true);try{await api.put(`/api/ficha-medica/jugador/${selectedId}`,profile);await refresh();await notify('Disponibilidad y antecedentes actualizados.',{title:detailQuery.data?.jugador.nombre||'Deportista'});}catch(error:any){await notify(error?.response?.data?.error||'No fue posible guardar los cambios.',{title:'Salud y disponibilidad'});}finally{setSaving(false);}};
  const addInjury=async()=>{if(!selectedId||!injury.tipo.trim())return;setCreatingInjury(true);try{await api.post(`/api/ficha-medica/jugador/${selectedId}/lesiones`,injury);setInjury({tipo:'',zona:'',rama_id:'',fecha_inicio:new Date().toISOString().slice(0,10),fecha_retorno_estimada:'',descripcion:'',restriccion:'',observaciones:''});await refresh();}catch(error:any){await notify(error?.response?.data?.error||'No fue posible registrar el seguimiento.',{title:'Salud deportiva'});}finally{setCreatingInjury(false);}};
  const updateInjury=async(id:string,estado:string)=>{try{await api.patch(`/api/ficha-medica/lesiones/${id}`,{estado});await refresh();}catch(error:any){await notify(error?.response?.data?.error||'No fue posible actualizar el seguimiento.',{title:'Salud deportiva'});}};
  const addCertificate=async()=>{if(!selectedId)return;setCreatingCertificate(true);try{await api.post(`/api/ficha-medica/jugador/${selectedId}/certificados`,certificate);setCertificate({tipo:'Certificado médico',fecha_emision:'',fecha_vencimiento:'',archivo_url:'',observaciones:''});await refresh();}catch(error:any){await notify(error?.response?.data?.error||'No fue posible registrar el certificado.',{title:'Certificados'});}finally{setCreatingCertificate(false);}};

  if(summaryQuery.isLoading)return <div className="availability-board"><div className="availability-board-loading">Preparando Availability Board…</div></div>;
  if(summaryQuery.error)return <div className="availability-board"><div className="availability-board-error">No fue posible verificar la disponibilidad del plantel.</div></div>;

  const detail=detailQuery.data;
  const total=summaryQuery.data?.resumen.total||0;
  const ready=summaryQuery.data?.resumen.por_estado?.Disponible||0;
  const limited=(summaryQuery.data?.resumen.por_estado?.['Disponible con restricción']||0)+(summaryQuery.data?.resumen.por_estado?.['En recuperación']||0);
  const selectedContexts=detail?.inscripciones.filter(row=>row.estado==='Activa').map(row=>[row.ramas?.disciplina||row.ramas?.nombre,row.categorias?.nombre].filter(Boolean).join(' · ')).filter(Boolean)||[];

  return <DirectorPage className="max-w-[1500px]">
    <div className="availability-board">
      <header className="availability-board-command">
        <div className="availability-board-command-copy">
          <p className="availability-board-kicker">Availability Board · Plantel</p>
          <h1>¿Quién puede entrenar o competir?</h1>
          <p>La primera lectura es operacional: disponible, limitado, en recuperación o fuera. Los antecedentes sensibles quedan separados dentro de la ficha seleccionada y no dominan la vista de plantel.</p>
        </div>
        <div className="availability-board-command-summary" aria-label="Resumen de disponibilidad">
          <span><small>Plantel</small><strong>{total}</strong></span>
          <span className="is-ready"><small>Disponibles</small><strong>{ready}</strong></span>
          <span><small>Limitados</small><strong>{limited}</strong></span>
          <span><small>Seguimientos</small><strong>{summaryQuery.data?.resumen.lesiones_activas||0}</strong></span>
        </div>
      </header>

      <section className="availability-board-toolbar" aria-label="Filtros de disponibilidad">
        <label className="availability-board-field"><span>Buscar deportista</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Nombre" className={DIRECTOR_FIELD}/></label>
        <label className="availability-board-field"><span>Rama / categoría</span><select value={contextFilter} onChange={event=>setContextFilter(event.target.value)} className={DIRECTOR_FIELD}><option value="">Todo el plantel</option>{contexts.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <div className="availability-board-filter-states" aria-label="Filtrar por estado">{(['Todos',...availabilityOptions] as const).map(value=><button key={value} type="button" aria-pressed={availabilityFilter===value} onClick={()=>setAvailabilityFilter(value)}>{value}</button>)}</div>
        <button type="button" onClick={()=>void Promise.all([summaryQuery.refetch(),enrollmentQuery.refetch()])} className={DIRECTOR_BUTTON_GHOST}>Actualizar</button>
      </section>

      <section className="availability-board-layout">
        <aside className="availability-board-roster">
          <div className="availability-board-roster-head"><div><p className="availability-board-kicker" style={{color:'var(--ls-accent-text)'}}>Plantel operativo</p><h2>Disponibilidad hoy</h2><p>Selecciona un deportista para revisar o actualizar su contexto.</p></div><div className="availability-board-count"><strong>{filtered.length}</strong><small>visibles</small></div></div>
          <div className="availability-board-rows">{filtered.map(item=>{
            const rows=enrollmentByPlayer.get(String(item.id))||[];
            const context=rows.map(row=>[row.ramas?.disciplina||row.ramas?.nombre,row.categorias?.nombre].filter(Boolean).join(' · ')).filter(Boolean).join(' / ')||'Sin inscripción deportiva activa';
            return <button key={item.id} type="button" aria-current={selectedId===item.id?'true':undefined} onClick={()=>setSelectedId(item.id)} className="availability-board-row">
              <span className="availability-board-avatar">{item.foto?<img src={item.foto} alt=""/>:item.nombre?.slice(0,1)||'A'}</span>
              <span className="availability-board-row-copy"><strong>{item.nombre}</strong><small>{context}</small><span className="availability-status" data-state={item.estado_disponibilidad}>{item.estado_disponibilidad}</span></span>
              <span className="availability-board-row-alerts">{item.lesiones_activas?<span className="availability-alert">{item.lesiones_activas} seguimiento{item.lesiones_activas===1?'':'s'}</span>:null}{item.certificados_vencidos?<span className="availability-alert is-danger">Cert. vencido</span>:item.certificados_por_vencer?<span className="availability-alert">Cert. por vencer</span>:null}</span>
            </button>;
          })}{!filtered.length?<div className="availability-board-empty">No hay deportistas para este filtro.</div>:null}</div>
        </aside>

        <div className="availability-board-detail">
          {detailQuery.isLoading?<div className="availability-board-athlete"><div className="availability-board-loading">Verificando contexto del deportista…</div></div>:!detail?<div className="availability-board-athlete"><div className="availability-board-empty">Selecciona un deportista.</div></div>:<>
            <section className="availability-board-athlete">
              <div className="availability-board-athlete-head">
                <span className="availability-board-avatar">{detail.jugador.foto?<img src={detail.jugador.foto} alt=""/>:detail.jugador.nombre?.slice(0,1)||'A'}</span>
                <div><p className="availability-board-kicker" style={{color:'var(--ls-accent-text)'}}>Disponibilidad deportiva</p><h2>{detail.jugador.nombre}</h2><p>{selectedContexts.join(' / ')||'Sin inscripción deportiva activa'}</p></div>
                <div className="availability-board-signal"><span className="availability-status" data-state={detail.salud.estado_disponibilidad||'Sin evaluar'}>{detail.salud.estado_disponibilidad||'Sin evaluar'}</span><small>{detail.salud.restriccion||'Sin restricción operacional registrada'}</small></div>
              </div>
              <div className="availability-board-performance-strip" aria-label="Contexto deportivo del deportista">
                <span><small>Asistencia</small><strong>{metric(detail.perfil_360.asistencia.porcentaje,'%')}</strong><em>{detail.perfil_360.asistencia.presentes}/{detail.perfil_360.asistencia.registros} registros</em></span>
                <span><small>Evaluación</small><strong>{metric(detail.perfil_360.evaluacion.promedio_actual)}</strong><em>{detail.perfil_360.evaluacion.evaluaciones} evaluaciones</em></span>
                <span><small>Eventos</small><strong>{detail.perfil_360.competencia.eventos}</strong><em>{detail.perfil_360.competencia.participaciones} participaciones</em></span>
                <span><small>Días fuera</small><strong>{detail.perfil_360.salud.dias_fuera_temporada}</strong><em>temporada actual</em></span>
                <span><small>PB / SB</small><strong>{detail.perfil_360.marcas.pb_vigentes} / {detail.perfil_360.marcas.sb_vigentes}</strong><em>marcas vigentes</em></span>
              </div>
            </section>

            <section className="availability-board-operational">
              <div className="availability-board-section">
                <div className="availability-board-section-head"><div><p className="availability-board-kicker" style={{color:'var(--ls-accent-text)'}}>Decisión operacional</p><h3>Estado para entrenar o competir</h3><p>Registra el estado informado por la familia o profesional responsable. Lestra no emite indicaciones clínicas.</p></div></div>
                <div className="availability-board-operational-body">
                  <div className="availability-board-fields">
                    <label><span>Disponibilidad</span><select value={profile.estado_disponibilidad} onChange={event=>setProfile({...profile,estado_disponibilidad:event.target.value as Availability})} className={DIRECTOR_FIELD}>{availabilityOptions.map(value=><option key={value}>{value}</option>)}</select></label>
                    <label><span>Motivo del cambio</span><input value={profile.motivo_disponibilidad} onChange={event=>setProfile({...profile,motivo_disponibilidad:event.target.value})} placeholder="Indicación familiar/profesional" className={DIRECTOR_FIELD}/></label>
                    <label style={{gridColumn:'1 / -1'}}><span>Restricción operacional</span><input value={profile.restriccion} onChange={event=>setProfile({...profile,restriccion:event.target.value})} placeholder="Ej. carga parcial / evitar impacto" className={DIRECTOR_FIELD}/></label>
                  </div>
                  <div className="availability-board-save"><button disabled={saving} onClick={()=>void saveProfile()} className={DIRECTOR_BUTTON}>{saving?'Guardando…':'Guardar disponibilidad'}</button></div>
                </div>
              </div>

              <div className="availability-board-section">
                <div className="availability-board-section-head"><div><p className="availability-board-kicker" style={{color:'var(--ls-accent-text)'}}>Antecedentes protegidos</p><h3>Emergencia y salud</h3><p>Información sensible separada de la lectura rápida del plantel.</p></div></div>
                <p className="availability-board-sensitive-note">Usar solo para la finalidad deportiva y de seguridad correspondiente. Evita copiar estos datos a observaciones operativas o comunicaciones generales.</p>
                <div className="availability-sensitive-fields">
                  <label><span>Grupo sanguíneo</span><input value={profile.grupo_sanguineo} onChange={event=>setProfile({...profile,grupo_sanguineo:event.target.value})} className={DIRECTOR_FIELD}/></label>
                  <label><span>Contacto emergencia</span><input value={profile.contacto_emergencia_nombre} onChange={event=>setProfile({...profile,contacto_emergencia_nombre:event.target.value})} className={DIRECTOR_FIELD}/></label>
                  <label><span>Teléfono</span><input value={profile.contacto_emergencia_telefono} onChange={event=>setProfile({...profile,contacto_emergencia_telefono:event.target.value})} className={DIRECTOR_FIELD}/></label>
                  <label><span>Parentesco</span><input value={profile.contacto_emergencia_parentesco} onChange={event=>setProfile({...profile,contacto_emergencia_parentesco:event.target.value})} className={DIRECTOR_FIELD}/></label>
                </div>
              </div>
            </section>

            <section className="availability-board-section">
              <div className="availability-board-section-head"><div><p className="availability-board-kicker" style={{color:'var(--ls-accent-text)'}}>Antecedentes informados</p><h3>Información sensible complementaria</h3><p>No modifica por sí sola la disponibilidad operacional.</p></div></div>
              <div className="availability-sensitive-fields">
                <label><span>Alergias relevantes</span><textarea value={profile.alergias} onChange={event=>setProfile({...profile,alergias:event.target.value})} className={DIRECTOR_TEXTAREA}/></label>
                <label><span>Medicamentos informados</span><textarea value={profile.medicamentos} onChange={event=>setProfile({...profile,medicamentos:event.target.value})} className={DIRECTOR_TEXTAREA}/></label>
                <label><span>Condiciones crónicas informadas</span><textarea value={profile.enfermedades_cronicas} onChange={event=>setProfile({...profile,enfermedades_cronicas:event.target.value})} className={DIRECTOR_TEXTAREA}/></label>
                <label><span>Observaciones de salud</span><textarea value={profile.observaciones} onChange={event=>setProfile({...profile,observaciones:event.target.value})} className={DIRECTOR_TEXTAREA}/></label>
                <div className="span-2 availability-board-save"><button disabled={saving} onClick={()=>void saveProfile()} className={DIRECTOR_BUTTON}>{saving?'Guardando…':'Guardar antecedentes'}</button></div>
              </div>
            </section>

            <section className="availability-board-lower">
              <div className="availability-board-followup">
                <div className="availability-board-section-head"><div><p className="availability-board-kicker" style={{color:'var(--ls-accent-text)'}}>Return to play</p><h3>Seguimientos y retorno deportivo</h3><p>El estado describe la operación; no reemplaza diagnóstico ni alta médica.</p></div></div>
                <div className="availability-board-form">
                  <input value={injury.tipo} onChange={event=>setInjury({...injury,tipo:event.target.value})} placeholder="Tipo / motivo *" className={DIRECTOR_FIELD}/>
                  <input value={injury.zona} onChange={event=>setInjury({...injury,zona:event.target.value})} placeholder="Zona corporal" className={DIRECTOR_FIELD}/>
                  <input type="date" value={injury.fecha_inicio} onChange={event=>setInjury({...injury,fecha_inicio:event.target.value})} className={DIRECTOR_FIELD}/>
                  <input type="date" value={injury.fecha_retorno_estimada} onChange={event=>setInjury({...injury,fecha_retorno_estimada:event.target.value})} className={DIRECTOR_FIELD}/>
                  <textarea value={injury.descripcion} onChange={event=>setInjury({...injury,descripcion:event.target.value})} placeholder="Descripción informada" className={DIRECTOR_TEXTAREA}/>
                  <textarea value={injury.restriccion} onChange={event=>setInjury({...injury,restriccion:event.target.value})} placeholder="Restricción operacional" className={DIRECTOR_TEXTAREA}/>
                  <button disabled={!injury.tipo.trim()||creatingInjury} onClick={()=>void addInjury()} className={`${DIRECTOR_BUTTON} span-2`}>{creatingInjury?'Registrando…':'Registrar seguimiento'}</button>
                </div>
                <div className="availability-board-history">{detail.lesiones.map(row=><article key={row.id} className="availability-board-history-row"><div><strong>{row.tipo}{row.zona?` · ${row.zona}`:''}</strong><small>Inicio {date(row.fecha_inicio)}{row.fecha_retorno_estimada?` · retorno estimado ${date(row.fecha_retorno_estimada)}`:''}</small>{row.descripcion?<p>{row.descripcion}</p>:null}{row.restriccion?<p><strong>Restricción:</strong> {row.restriccion}</p>:null}</div>{row.estado!=='Cerrada'?<select value={row.estado} onChange={event=>void updateInjury(row.id,event.target.value)} className={DIRECTOR_FIELD}>{injuryStates.map(value=><option key={value}>{value}</option>)}</select>:<span className="availability-status" data-state="Disponible">Cerrada</span>}</article>)}{!detail.lesiones.length?<div className="availability-board-empty">Sin seguimientos registrados.</div>:null}</div>
              </div>

              <div className="availability-board-docs">
                <div className="availability-board-section-head"><div><p className="availability-board-kicker" style={{color:'var(--ls-accent-text)'}}>Documentación</p><h3>Certificados deportivos</h3><p>Vigencia documental visible sin mezclarla con el diagnóstico.</p></div></div>
                <div className="availability-board-form">
                  <input className="span-2" value={certificate.tipo} onChange={event=>setCertificate({...certificate,tipo:event.target.value})} placeholder="Tipo de certificado"/>
                  <input type="date" value={certificate.fecha_emision} onChange={event=>setCertificate({...certificate,fecha_emision:event.target.value})} className={DIRECTOR_FIELD}/>
                  <input type="date" value={certificate.fecha_vencimiento} onChange={event=>setCertificate({...certificate,fecha_vencimiento:event.target.value})} className={DIRECTOR_FIELD}/>
                  <input className={`${DIRECTOR_FIELD} span-2`} value={certificate.archivo_url} onChange={event=>setCertificate({...certificate,archivo_url:event.target.value})} placeholder="Enlace al documento (opcional)"/>
                  <textarea className={`${DIRECTOR_TEXTAREA} span-2`} value={certificate.observaciones} onChange={event=>setCertificate({...certificate,observaciones:event.target.value})} placeholder="Observaciones"/>
                  <button disabled={creatingCertificate} onClick={()=>void addCertificate()} className={`${DIRECTOR_BUTTON} span-2`}>{creatingCertificate?'Registrando…':'Registrar certificado'}</button>
                </div>
                <div className="availability-board-history">{detail.certificados.map(row=><article key={row.id} className="availability-board-history-row"><div><strong>{row.tipo}</strong><small>Emisión {date(row.fecha_emision)} · vence {date(row.fecha_vencimiento)}</small>{row.archivo_url?<p><a href={row.archivo_url} target="_blank" rel="noreferrer">Abrir documento →</a></p>:null}</div><span className={`availability-status`} data-state={row.estado_calculado==='Vigente'?'Disponible':row.estado_calculado==='Vencido'?'No disponible':'En recuperación'}>{row.estado_calculado}</span></article>)}{!detail.certificados.length?<div className="availability-board-empty">Sin certificados registrados.</div>:null}</div>
              </div>
            </section>
          </>}
        </div>
      </section>
    </div>
  </DirectorPage>;
}
