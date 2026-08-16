import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../api/axiosConfig';

type CanonicalKey = 'nombre_alumno'|'rut_alumno'|'fecha_nacimiento'|'sexo'|'posicion'|'categoria'|'nombre_apoderado'|'rut_apoderado'|'telefono_apoderado'|'email_apoderado'|'monto_matricula'|'mensualidad'|'saldo_pendiente'|'talla_uniforme'|'numero_camiseta'|'estado';

type PreviewRow = Record<string, any> & { fila: number; valido: boolean; errors: string[]; warnings: string[] };

const fields: Array<{ key: CanonicalKey; label: string; required?: boolean; aliases: string[] }> = [
  { key:'nombre_alumno', label:'Nombre del alumno', required:true, aliases:['nombre alumno','alumno','jugador','nombre jugador','nombre deportista','nombre niño','nombre nino'] },
  { key:'rut_alumno', label:'RUT / documento alumno', aliases:['rut alumno','rut jugador','rut niño','rut nino','documento alumno','dni alumno'] },
  { key:'fecha_nacimiento', label:'Fecha de nacimiento', aliases:['fecha nacimiento','f nacimiento','nacimiento','fecha nac','fnacimiento'] },
  { key:'sexo', label:'Sexo', aliases:['sexo','genero','género'] },
  { key:'posicion', label:'Posición', aliases:['posicion','posición','puesto','rol cancha'] },
  { key:'categoria', label:'Categoría', aliases:['categoria','categoría','serie','division','división'] },
  { key:'nombre_apoderado', label:'Nombre apoderado', aliases:['apoderado','nombre apoderado','tutor','nombre tutor','padre','madre'] },
  { key:'rut_apoderado', label:'RUT apoderado', aliases:['rut apoderado','rut tutor','documento apoderado','dni apoderado'] },
  { key:'telefono_apoderado', label:'Teléfono apoderado', aliases:['telefono','teléfono','celular','fono','telefono apoderado','celular apoderado'] },
  { key:'email_apoderado', label:'Correo apoderado', aliases:['email','correo','mail','correo apoderado','email apoderado'] },
  { key:'monto_matricula', label:'Valor matrícula', aliases:['matricula','matrícula','valor matricula','valor matrícula'] },
  { key:'mensualidad', label:'Mensualidad', aliases:['mensualidad','valor mensualidad','cuota mensual'] },
  { key:'saldo_pendiente', label:'Saldo pendiente actual', aliases:['saldo','saldo pendiente','deuda','deuda actual'] },
  { key:'talla_uniforme', label:'Talla uniforme', aliases:['talla','talla uniforme','talla polera'] },
  { key:'numero_camiseta', label:'Número camiseta', aliases:['numero camiseta','número camiseta','dorsal','numero','nro camiseta'] },
  { key:'estado', label:'Estado alumno', aliases:['estado','estado alumno','activo'] },
];

const normalizeHeader = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const suggestMapping = (headers: string[]) => {
  const result: Partial<Record<CanonicalKey,string>> = {};
  const normalized = headers.map((h) => ({ raw:h, norm:normalizeHeader(h) }));
  fields.forEach((field) => {
    const aliasSet = field.aliases.map(normalizeHeader);
    const exact = normalized.find((h) => aliasSet.includes(h.norm));
    if (exact) result[field.key] = exact.raw;
    else {
      const loose = normalized.find((h) => aliasSet.some((a) => h.norm.includes(a) || a.includes(h.norm)));
      if (loose) result[field.key] = loose.raw;
    }
  });
  return result;
};

const Importacion: React.FC = () => {
  const [fileName,setFileName]=useState('');
  const [headers,setHeaders]=useState<string[]>([]);
  const [rawRows,setRawRows]=useState<Record<string,any>[]>([]);
  const [mapping,setMapping]=useState<Partial<Record<CanonicalKey,string>>>({});
  const [preview,setPreview]=useState<PreviewRow[]>([]);
  const [summary,setSummary]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [history,setHistory]=useState<any[]>([]);
  const [result,setResult]=useState<any>(null);

  const downloadTemplate = () => {
    const technicalHeaders = fields.map((field) => field.key);
    const humanLabels = fields.map((field) => field.label);
    const notes = [
      'Obligatorio','Recomendado','AAAA-MM-DD','Masculino/Femenino/Otro','Arquero/Defensa/Mediocampista/Delantero','Texto libre',
      'Recomendado','Recomendado','Recomendado','Recomendado','Número CLP','Número CLP','Solo deuda real ya vencida','Talla 4-16 / S-XL','0-999','Activo/Inactivo'
    ];
    const example = [
      'Ejemplo Alumno','12.345.678-5',new Date(2014,4,20),'Masculino','Delantero','Sub-12',
      'Ejemplo Apoderado','9.876.543-2','+56 9 1234 5678','apoderado@ejemplo.cl',50000,35000,0,'Talla 12',10,'Activo'
    ];
    const book = XLSX.utils.book_new();
    const matrix = XLSX.utils.aoa_to_sheet([
      humanLabels,
      technicalHeaders,
      notes,
      example,
    ]);
    matrix['!cols'] = [24,16,16,16,18,18,26,16,20,28,16,16,20,16,14,16].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(book, matrix, 'Matriz Importación');
    const instructions = XLSX.utils.aoa_to_sheet([
      ['SYNCademia · Guía de importación'],
      ['Regla','Qué hacer'],
      ['Nombre del alumno','Obligatorio. Un alumno por fila.'],
      ['RUT alumno','No repitas RUT. Syncademia detecta alumnos ya existentes y duplicados dentro del archivo.'],
      ['Fecha nacimiento','Usa una fecha real de Excel o formato AAAA-MM-DD.'],
      ['Apoderado','Idealmente completa nombre, RUT, teléfono y correo.'],
      ['Montos','Usa números. No escribas “35 mil” ni fórmulas.'],
      ['Saldo pendiente','Solo deuda real ya existente al migrar. No uses este campo para mensualidades futuras.'],
      ['Categoría','Escribe el nombre exacto; si no existe, Syncademia la crea.'],
      ['Estado','Usa Activo o Inactivo.'],
      ['Flujo','Completa → sube → valida → corrige → importa. Máximo 3.000 filas por lote.'],
    ]);
    instructions['!cols'] = [{ wch: 24 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(book, instructions, 'Instrucciones');
    XLSX.writeFile(book, 'Matriz_Importacion_Syncademia.xlsx');
  };


  const loadHistory=()=>api.get('/api/importaciones/lotes').then(r=>setHistory(r.data?.data||[])).catch(()=>setHistory([]));
  useEffect(()=>{loadHistory();},[]);

  const onFile=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file)return;
    setError('');setPreview([]);setSummary(null);setResult(null);setFileName(file.name);
    try{
      const buffer=await file.arrayBuffer();
      const workbook=XLSX.read(buffer,{type:'array',cellDates:true});
      const sheet=workbook.Sheets[workbook.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json<Record<string,any>>(sheet,{defval:''});
      if(!rows.length)throw new Error('El archivo no contiene filas de datos.');
      const hs=Object.keys(rows[0]); setHeaders(hs);setRawRows(rows.slice(0,3000));setMapping(suggestMapping(hs));
    }catch(err:any){setError(err?.message||'No fue posible leer el archivo.');}
  };

  const mappedRows=useMemo(()=>rawRows.map(row=>{
    const out:Record<string,any>={}; fields.forEach(f=>{const source=mapping[f.key];out[f.key]=source?row[source]:'';});return out;
  }),[rawRows,mapping]);

  const runPreview=async()=>{
    if(!mapping.nombre_alumno)return setError('Debes asignar la columna que contiene el nombre del alumno.');
    setLoading(true);setError('');setResult(null);
    try{const r=await api.post('/api/importaciones/preview',{rows:mappedRows});setPreview(r.data?.data||[]);setSummary(r.data?.summary||null);}catch(err:any){setError(err?.response?.data?.error||'No fue posible validar la importación.');}finally{setLoading(false);}
  };
  const commit=async()=>{
    if(!preview.length)return;setLoading(true);setError('');
    try{const r=await api.post('/api/importaciones/commit',{file_name:fileName,rows:mappedRows});setResult(r.data);await loadHistory();}catch(err:any){setError(err?.response?.data?.error||'No fue posible importar los registros.');}finally{setLoading(false);}
  };
  const revert=async(id:string)=>{
    if(!window.confirm('Esta acción eliminará los registros creados exclusivamente por este lote de importación. ¿Continuar?'))return;
    setLoading(true);setError('');
    try{await api.post(`/api/importaciones/lotes/${id}/revertir`);await loadHistory();}catch(err:any){setError(err?.response?.data?.error||'No fue posible revertir la importación.');}finally{setLoading(false);}
  };

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="rounded-3xl border border-[#30363d] bg-gradient-to-br from-[#161b22] via-[#111827] to-[#0d1117] p-7 shadow-2xl"><span className="rounded-full border border-[#289E9D]/30 bg-[#289E9D]/10 px-3 py-1 text-xs font-black uppercase tracking-[.16em] text-[#48d8d0]">Onboarding de academias</span><h1 className="mt-4 text-3xl font-black text-white">Importar base de alumnos desde Excel o CSV</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#9ca3af]">Sube la base que ya usa la escuela, mapea sus columnas y revisa errores antes de guardar. Los saldos se migran como saldo inicial, sin inventar pagos históricos.</p></section>
    {error&&<div className="rounded-2xl border border-red-700/50 bg-red-950/25 p-4 text-sm font-semibold text-red-300">{error}</div>}
    {result&&<div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-5 text-emerald-100"><p className="font-black">Importación terminada</p><p className="mt-2 text-sm">Importados: <b>{result.summary?.imported||0}</b> · Omitidos: <b>{result.summary?.skipped||0}</b> · Con error: <b>{result.summary?.failed||0}</b></p></div>}

    <section className="rounded-3xl border border-[#30363d] bg-[#161b22] p-6"><div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#C8A96B]/20 bg-[#C8A96B]/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-white">¿La escuela no tiene una planilla estándar?</p><p className="mt-1 text-sm text-[#9ca3af]">Descarga la matriz oficial. Ya viene con los nombres exactos que Syncademia espera y una fila de ejemplo.</p></div><button type="button" onClick={downloadTemplate} className="shrink-0 rounded-xl bg-[#C8A96B] px-4 py-3 text-sm font-black text-[#111827]">Descargar matriz Syncademia</button></div><div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end"><div><label className="mb-2 block text-xs font-black uppercase tracking-[.14em] text-[#8b949e]">Archivo de la escuela</label><input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="block w-full rounded-xl border border-[#30363d] bg-[#0d1117] p-3 text-sm text-[#b1bac4] file:mr-4 file:rounded-lg file:border-0 file:bg-[#289E9D] file:px-4 file:py-2 file:font-bold file:text-white"/></div><div className="rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3 text-sm text-[#8b949e]">{rawRows.length?`${rawRows.length.toLocaleString('es-CL')} filas leídas`:'Sin archivo'}</div></div></section>

    {!!headers.length&&<section className="rounded-3xl border border-[#30363d] bg-[#161b22] p-6"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#C8A96B]">Paso 2</p><h2 className="mt-1 text-2xl font-black text-white">Relaciona las columnas</h2><p className="mt-1 text-sm text-[#8b949e]">Syncademia propone coincidencias automáticamente. Corrige solo las que no correspondan.</p></div><div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{fields.map(field=><div key={field.key} className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-4"><label className="mb-2 block text-xs font-bold text-white">{field.label}{field.required?' *':''}</label><select value={mapping[field.key]||''} onChange={e=>setMapping({...mapping,[field.key]:e.target.value||undefined})} className="w-full rounded-xl border border-[#30363d] bg-[#111827] px-3 py-2.5 text-sm text-white"><option value="">No importar</option>{headers.map(h=><option key={h} value={h}>{h}</option>)}</select></div>)}</div><button disabled={loading} onClick={runPreview} className="mt-6 rounded-xl bg-[#C8A96B] px-6 py-3 font-black text-[#111827] disabled:opacity-50">{loading?'Validando...':'Validar antes de importar'}</button></section>}

    {summary&&<section className="space-y-4">{summary.capacity_exceeded&&<div className="rounded-2xl border border-amber-600/40 bg-amber-950/25 p-4 text-sm text-amber-100"><b>El archivo supera el cupo disponible del plan.</b> Puedes incorporar {summary.available_slots ?? 0} jugador(es) más de los {summary.valid} registros válidos detectados. Reduce el archivo o actualiza el plan antes de confirmar.</div>}<div className="grid gap-3 sm:grid-cols-4">{[['Filas',summary.total],['Correctas',summary.valid],['Con error',summary.errors],['Con advertencias',summary.warnings]].map(([label,value],idx)=><div key={String(label)} className={`rounded-2xl border p-4 ${idx===1?'border-emerald-700/40 bg-emerald-950/20':idx===2?'border-red-700/40 bg-red-950/20':'border-[#30363d] bg-[#161b22]'}`}><p className="text-xs uppercase tracking-[.12em] text-[#8b949e]">{label}</p><p className="mt-1 text-2xl font-black text-white">{value}</p></div>)}</div><div className="overflow-hidden rounded-3xl border border-[#30363d] bg-[#161b22]"><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-[#0d1117] text-left text-xs uppercase tracking-wider text-[#8b949e]"><tr><th className="p-3">Fila</th><th className="p-3">Alumno</th><th className="p-3">RUT</th><th className="p-3">Apoderado</th><th className="p-3">Categoría</th><th className="p-3">Estado</th></tr></thead><tbody>{preview.slice(0,30).map(row=><tr key={row.fila} className="border-t border-[#30363d]"><td className="p-3 text-[#8b949e]">{row.fila}</td><td className="p-3 font-bold text-white">{row.nombre_alumno}</td><td className="p-3 text-[#b1bac4]">{row.rut_alumno||'-'}</td><td className="p-3 text-[#b1bac4]">{row.nombre_apoderado||'-'}</td><td className="p-3 text-[#b1bac4]">{row.categoria||'-'}</td><td className="p-3">{row.valido?<span className="text-emerald-300">Listo</span>:<span className="text-red-300" title={row.errors.join(' · ')}>{row.errors.join(' · ')}</span>}{row.valido&&row.warnings.length?<p className="mt-1 text-xs text-amber-300">{row.warnings.join(' · ')}</p>:null}</td></tr>)}</tbody></table></div></div><div className="flex justify-end"><button disabled={loading||!summary.valid||summary.capacity_exceeded} onClick={commit} className="rounded-xl bg-emerald-500 px-6 py-3 font-black text-emerald-950 disabled:opacity-50">{loading?'Importando...':`Importar ${summary.valid} registros válidos`}</button></div></section>}

    <section className="rounded-3xl border border-[#30363d] bg-[#161b22] p-6"><h2 className="text-xl font-black text-white">Historial de importaciones</h2><div className="mt-4 space-y-3">{history.map(item=><div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-[#30363d] bg-[#0d1117] p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-bold text-white">{item.nombre_archivo||'Importación sin nombre'}</p><p className="mt-1 text-xs text-[#6b7280]">{new Date(item.created_at).toLocaleString('es-CL')} · {item.filas_importadas||0} importados · {item.filas_error||0} errores</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-[#21262d] px-3 py-1 text-xs font-black uppercase text-[#b1bac4]">{item.estado}</span>{item.estado!=='revertido'&&<button disabled={loading} onClick={()=>revert(item.id)} className="rounded-lg border border-red-800/60 px-3 py-2 text-xs font-bold text-red-300">Revertir</button>}</div></div>)}{!history.length&&<p className="text-sm text-[#6b7280]">No hay importaciones anteriores.</p>}</div></section>
  </div>;
};

export default Importacion;
