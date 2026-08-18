import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../api/axiosConfig';

type CanonicalKey =
  | 'nombre_alumno'
  | 'rut_alumno'
  | 'fecha_nacimiento'
  | 'sexo'
  | 'posicion'
  | 'categoria'
  | 'nombre_apoderado'
  | 'rut_apoderado'
  | 'telefono_apoderado'
  | 'email_apoderado'
  | 'monto_matricula'
  | 'mensualidad'
  | 'saldo_pendiente'
  | 'talla_uniforme'
  | 'numero_camiseta'
  | 'estado';

type Branch = {
  id: string;
  sede_id: string;
  nombre: string;
  disciplina: string;
  principal?: boolean;
  sedes?: { id: string; nombre: string; principal?: boolean; activa?: boolean } | null;
};

type PreviewRow = Record<string, any> & {
  fila: number;
  valido: boolean;
  errors: string[];
  warnings: string[];
  modo?: 'crear_alumno' | 'inscribir_existente';
  jugador_existente_id?: string | null;
  jugador_existente_nombre?: string | null;
};

const fields: Array<{ key: CanonicalKey; label: string; required?: boolean; aliases: string[] }> = [
  { key:'nombre_alumno', label:'Nombre del alumno', required:true, aliases:['nombre alumno','alumno','jugador','nombre jugador','nombre deportista','nombre niño','nombre nino'] },
  { key:'rut_alumno', label:'RUT / documento alumno', aliases:['rut alumno','rut jugador','rut niño','rut nino','documento alumno','dni alumno'] },
  { key:'fecha_nacimiento', label:'Fecha de nacimiento', aliases:['fecha nacimiento','f nacimiento','nacimiento','fecha nac','fnacimiento'] },
  { key:'sexo', label:'Sexo', aliases:['sexo','genero','género'] },
  { key:'posicion', label:'Posición / especialidad', aliases:['posicion','posición','puesto','rol cancha','especialidad','rol','grado'] },
  { key:'categoria', label:'Categoría', aliases:['categoria','categoría','serie','division','división','grupo','nivel'] },
  { key:'nombre_apoderado', label:'Nombre apoderado', aliases:['apoderado','nombre apoderado','tutor','nombre tutor','padre','madre'] },
  { key:'rut_apoderado', label:'RUT apoderado', aliases:['rut apoderado','rut tutor','documento apoderado','dni apoderado'] },
  { key:'telefono_apoderado', label:'Teléfono apoderado', aliases:['telefono','teléfono','celular','fono','telefono apoderado','celular apoderado'] },
  { key:'email_apoderado', label:'Correo apoderado', aliases:['email','correo','mail','correo apoderado','email apoderado'] },
  { key:'monto_matricula', label:'Valor matrícula', aliases:['matricula','matrícula','valor matricula','valor matrícula'] },
  { key:'mensualidad', label:'Mensualidad', aliases:['mensualidad','valor mensualidad','cuota mensual'] },
  { key:'saldo_pendiente', label:'Saldo pendiente actual', aliases:['saldo','saldo pendiente','deuda','deuda actual'] },
  { key:'talla_uniforme', label:'Talla uniforme', aliases:['talla','talla uniforme','talla polera'] },
  { key:'numero_camiseta', label:'Número / dorsal', aliases:['numero camiseta','número camiseta','dorsal','numero','nro camiseta','número','numero dorsal'] },
  { key:'estado', label:'Estado alumno', aliases:['estado','estado alumno','activo'] },
];

const normalizeHeader = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

const suggestMapping = (headers: string[]) => {
  const result: Partial<Record<CanonicalKey,string>> = {};
  const normalized = headers.map((h) => ({ raw:h, norm:normalizeHeader(h) }));
  fields.forEach((field) => {
    const aliasSet = [field.label, ...field.aliases].map(normalizeHeader);
    const exact = normalized.find((h) => aliasSet.includes(h.norm));
    if (exact) result[field.key] = exact.raw;
    else {
      const loose = normalized.find((h) => aliasSet.some((a) => h.norm.includes(a) || a.includes(h.norm)));
      if (loose) result[field.key] = loose.raw;
    }
  });
  return result;
};

const branchLabel = (branch?: Branch | null) => {
  if (!branch) return '';
  const site = branch.sedes?.nombre ? ` · ${branch.sedes.nombre}` : '';
  const discipline = branch.disciplina && branch.disciplina !== branch.nombre ? ` · ${branch.disciplina}` : '';
  return `${branch.nombre}${discipline}${site}`;
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
  const [branches,setBranches]=useState<Branch[]>([]);
  const [selectedBranchId,setSelectedBranchId]=useState('');
  const [contextLoading,setContextLoading]=useState(true);

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === selectedBranchId) || null,
    [branches, selectedBranchId],
  );

  const downloadTemplate = () => {
    const humanLabels = fields.map((field) => field.label);
    const example = [
      'Ejemplo Alumno','12.345.678-5',new Date(2014,4,20),'Masculino','Delantero / Cinturón amarillo','Sub-12 / Infantil',
      'Ejemplo Apoderado','9.876.543-2','+56 9 1234 5678','apoderado@ejemplo.cl',50000,35000,0,'Talla 12',10,'Activo'
    ];
    const book = XLSX.utils.book_new();
    const matrix = XLSX.utils.aoa_to_sheet([humanLabels, example]);
    matrix['!cols'] = [24,18,18,16,26,22,26,18,20,28,16,16,20,16,16,16].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(book, matrix, 'Alumnos');

    const instructions = XLSX.utils.aoa_to_sheet([
      ['LESTRA · Guía de importación multirrama'],
      ['Regla','Qué hacer'],
      ['Rama deportiva','Antes de subir el archivo, selecciona en Lestra una sola rama destino. Cada lote pertenece a una rama y sede.'],
      ['Nombre del alumno','Obligatorio. Un alumno por fila.'],
      ['RUT alumno','Recomendado. Si el alumno ya existe en la academia, Lestra reutiliza su ficha y agrega la nueva rama sin duplicarlo.'],
      ['Fecha nacimiento','Usa una fecha real de Excel o formato AAAA-MM-DD.'],
      ['Posición / especialidad','Es el rol dentro de la rama seleccionada: posición, grado, especialidad, modalidad, etc.'],
      ['Apoderado','Para alumnos nuevos, idealmente completa nombre, RUT, teléfono y correo. En alumnos existentes no se sobrescriben datos personales.'],
      ['Montos','Usa números. No escribas “35 mil” ni fórmulas. Los valores quedan asociados a la inscripción deportiva de la rama.'],
      ['Saldo pendiente','Solo deuda real ya existente al migrar. El cobro se crea dentro de la rama seleccionada.'],
      ['Categoría','Escribe el nombre de la categoría dentro de la rama. Si no existe, Lestra la crea en esa misma sede y rama.'],
      ['Estado','Usa Activo, Inactivo o Retirado.'],
      ['Flujo','Selecciona rama → completa → sube → valida → corrige → importa. Máximo 3.000 filas por lote.'],
    ]);
    instructions['!cols'] = [{ wch: 26 }, { wch: 100 }];
    XLSX.utils.book_append_sheet(book, instructions, 'Instrucciones');
    XLSX.writeFile(book, 'Matriz_Importacion_Multirrama_Lestra.xlsx');
  };

  const loadHistory = () =>
    api.get('/api/importaciones/lotes')
      .then((response) => setHistory(response.data?.data || []))
      .catch(() => setHistory([]));

  const loadContext = async () => {
    setContextLoading(true);
    try {
      const response = await api.get('/api/importaciones/contexto');
      const data = response.data?.data || {};
      const nextBranches: Branch[] = data.ramas || [];
      setBranches(nextBranches);
      setSelectedBranchId((current) => {
        if (current && nextBranches.some((branch) => branch.id === current)) return current;
        const preferred = data.rama_principal_id && nextBranches.find((branch) => branch.id === data.rama_principal_id);
        return preferred?.id || nextBranches[0]?.id || '';
      });
    } catch (err:any) {
      setError(err?.response?.data?.error || 'No fue posible cargar las ramas de la academia.');
      setBranches([]);
    } finally {
      setContextLoading(false);
    }
  };

  useEffect(() => {
    loadContext();
    loadHistory();
  }, []);

  const resetValidation = () => {
    setPreview([]);
    setSummary(null);
    setResult(null);
    setError('');
  };

  const onBranchChange = (branchId:string) => {
    setSelectedBranchId(branchId);
    resetValidation();
  };

  const onFile = async (event:React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setPreview([]);
    setSummary(null);
    setResult(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer,{type:'array',cellDates:true});
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string,any>>(sheet,{defval:''});
      if (!rows.length) throw new Error('El archivo no contiene filas de datos.');
      if (rows.length > 3000) throw new Error(`El archivo contiene ${rows.length.toLocaleString('es-CL')} filas. El máximo permitido por lote es 3.000.`);
      const hs = Object.keys(rows[0]);
      setHeaders(hs);
      setRawRows(rows);
      setMapping(suggestMapping(hs));
    } catch (err:any) {
      setHeaders([]);
      setRawRows([]);
      setMapping({});
      setError(err?.message || 'No fue posible leer el archivo.');
    }
  };

  const mappedRows = useMemo(
    () => rawRows.map((row) => {
      const out:Record<string,any> = {};
      fields.forEach((field) => {
        const source = mapping[field.key];
        out[field.key] = source ? row[source] : '';
      });
      return out;
    }),
    [rawRows,mapping],
  );

  const runPreview = async () => {
    if (!selectedBranchId) return setError('Selecciona primero la rama deportiva de destino.');
    if (!mapping.nombre_alumno) return setError('Debes asignar la columna que contiene el nombre del alumno.');
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await api.post('/api/importaciones/preview',{
        rama_id:selectedBranchId,
        rows:mappedRows,
      });
      setPreview(response.data?.data || []);
      setSummary(response.data?.summary || null);
    } catch (err:any) {
      setError(err?.response?.data?.error || 'No fue posible validar la importación.');
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    if (!preview.length || !selectedBranchId) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/api/importaciones/commit',{
        rama_id:selectedBranchId,
        file_name:fileName,
        rows:mappedRows,
      });
      setResult(response.data);
      await loadHistory();
    } catch (err:any) {
      setError(err?.response?.data?.error || 'No fue posible importar los registros.');
    } finally {
      setLoading(false);
    }
  };

  const revert = async (id:string) => {
    if (!window.confirm('Se eliminarán las inscripciones, cobros y vínculos creados por este lote. Los alumnos que ya existían antes de importar conservarán su ficha personal. ¿Continuar?')) return;
    setLoading(true);
    setError('');
    try {
      await api.post(`/api/importaciones/lotes/${id}/revertir`);
      await loadHistory();
    } catch (err:any) {
      setError(err?.response?.data?.error || 'No fue posible revertir la importación.');
    } finally {
      setLoading(false);
    }
  };

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="rounded-3xl border border-[#30363d] bg-gradient-to-br from-[#161b22] via-[#111827] to-[#0d1117] p-7 shadow-2xl">
      <span className="rounded-full border border-[#289E9D]/30 bg-[#289E9D]/10 px-3 py-1 text-xs font-black uppercase tracking-[.16em] text-[#48d8d0]">Migración multirrama</span>
      <h1 className="mt-4 text-3xl font-black text-white">Importar alumnos por rama deportiva</h1>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-[#9ca3af]">
        Cada lote se importa a una rama concreta. Si el RUT ya existe en la academia, Lestra reutiliza la ficha del alumno y crea únicamente su nueva inscripción deportiva; nunca duplica a la persona.
      </p>
    </section>

    {error && <div className="rounded-2xl border border-red-700/50 bg-red-950/25 p-4 text-sm font-semibold text-red-300">{error}</div>}

    {result && <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-5 text-emerald-100">
      <p className="font-black">Importación terminada · {result.scope?.rama_nombre || selectedBranch?.nombre}</p>
      <p className="mt-2 text-sm">
        Procesados: <b>{result.summary?.imported || 0}</b> · Alumnos nuevos: <b>{result.summary?.created_players || 0}</b> · Alumnos existentes incorporados a la rama: <b>{result.summary?.enrolled_existing || 0}</b> · Omitidos: <b>{result.summary?.skipped || 0}</b> · Con error: <b>{result.summary?.failed || 0}</b>
      </p>
    </div>}

    <section className="rounded-3xl border border-[#30363d] bg-[#161b22] p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[.16em] text-[#C8A96B]">Paso 1</p>
        <h2 className="mt-1 text-2xl font-black text-white">Define el destino del lote</h2>
        <p className="mt-1 text-sm text-[#8b949e]">La rama determina la disciplina, la sede, las categorías y el contexto financiero de todos los registros de este archivo.</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-[.14em] text-[#8b949e]">Rama deportiva de destino</label>
          <select
            value={selectedBranchId}
            disabled={contextLoading || !branches.length}
            onChange={(event) => onBranchChange(event.target.value)}
            className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {!branches.length && <option value="">{contextLoading ? 'Cargando ramas...' : 'No hay ramas activas'}</option>}
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branchLabel(branch)}</option>)}
          </select>
        </div>
        {selectedBranch && <div className="rounded-xl border border-[#289E9D]/30 bg-[#289E9D]/10 px-4 py-3 text-sm text-[#9ee7e2]">
          <span className="font-black">{selectedBranch.disciplina}</span>
          <span className="text-[#7dd3cf]"> · {selectedBranch.sedes?.nombre || 'Sede asociada'}</span>
        </div>}
      </div>

      {!contextLoading && !branches.length && <div className="mt-4 rounded-2xl border border-amber-600/40 bg-amber-950/20 p-4 text-sm text-amber-100">
        La academia todavía no tiene una rama deportiva activa. Créala en <b>Estructura</b> antes de importar alumnos.
      </div>}
    </section>

    <section className="rounded-3xl border border-[#30363d] bg-[#161b22] p-6">
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#C8A96B]/20 bg-[#C8A96B]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-black text-white">¿La escuela no tiene una planilla estándar?</p>
          <p className="mt-1 text-sm text-[#9ca3af]">Descarga la matriz multirrama. La rama no se escribe en cada fila: se selecciona una sola vez arriba para evitar cruces entre deportes.</p>
        </div>
        <button type="button" onClick={downloadTemplate} className="shrink-0 rounded-xl bg-[#C8A96B] px-4 py-3 text-sm font-black text-[#111827]">Descargar matriz Lestra</button>
      </div>
      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-[.14em] text-[#8b949e]">Archivo de la escuela</label>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="block w-full rounded-xl border border-[#30363d] bg-[#0d1117] p-3 text-sm text-[#b1bac4] file:mr-4 file:rounded-lg file:border-0 file:bg-[#289E9D] file:px-4 file:py-2 file:font-bold file:text-white"/>
        </div>
        <div className="rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3 text-sm text-[#8b949e]">{rawRows.length ? `${rawRows.length.toLocaleString('es-CL')} filas leídas` : 'Sin archivo'}</div>
      </div>
    </section>

    {!!headers.length && <section className="rounded-3xl border border-[#30363d] bg-[#161b22] p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[.16em] text-[#C8A96B]">Paso 2</p>
        <h2 className="mt-1 text-2xl font-black text-white">Relaciona las columnas</h2>
        <p className="mt-1 text-sm text-[#8b949e]">Lestra propone coincidencias automáticamente. Posición / especialidad y categoría quedarán vinculadas a <b className="text-[#b1bac4]">{selectedBranch?.nombre || 'la rama seleccionada'}</b>.</p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => <div key={field.key} className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-4">
          <label className="mb-2 block text-xs font-bold text-white">{field.label}{field.required ? ' *' : ''}</label>
          <select
            value={mapping[field.key] || ''}
            onChange={(event) => setMapping({...mapping,[field.key]:event.target.value || undefined})}
            className="w-full rounded-xl border border-[#30363d] bg-[#111827] px-3 py-2.5 text-sm text-white"
          >
            <option value="">No importar</option>
            {headers.map((header) => <option key={header} value={header}>{header}</option>)}
          </select>
        </div>)}
      </div>
      <button disabled={loading || !selectedBranchId} onClick={runPreview} className="mt-6 rounded-xl bg-[#C8A96B] px-6 py-3 font-black text-[#111827] disabled:opacity-50">{loading ? 'Validando...' : 'Validar antes de importar'}</button>
    </section>}

    {summary && <section className="space-y-4">
      {summary.capacity_exceeded && <div className="rounded-2xl border border-amber-600/40 bg-amber-950/25 p-4 text-sm text-amber-100">
        <b>El lote supera el cupo disponible del plan.</b> Se necesitan crear {summary.new_players || 0} alumnos nuevos y quedan {summary.available_slots ?? 0} cupos. Los {summary.existing_players_to_enroll || 0} alumnos ya existentes que solo reciben esta nueva rama no consumen cupos adicionales.
      </div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          ['Filas',summary.total],
          ['Válidas',summary.valid],
          ['Nuevos',summary.new_players || 0],
          ['Ya existen',summary.existing_players_to_enroll || 0],
          ['Con error',summary.errors],
          ['Advertencias',summary.warnings],
        ].map(([label,value],idx) => <div key={String(label)} className={`rounded-2xl border p-4 ${idx===1?'border-emerald-700/40 bg-emerald-950/20':idx===4?'border-red-700/40 bg-red-950/20':'border-[#30363d] bg-[#161b22]'}`}>
          <p className="text-xs uppercase tracking-[.12em] text-[#8b949e]">{label}</p>
          <p className="mt-1 text-2xl font-black text-white">{value}</p>
        </div>)}
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#30363d] bg-[#161b22]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#0d1117] text-left text-xs uppercase tracking-wider text-[#8b949e]">
              <tr>
                <th className="p-3">Fila</th>
                <th className="p-3">Alumno</th>
                <th className="p-3">RUT</th>
                <th className="p-3">Acción</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Validación</th>
              </tr>
            </thead>
            <tbody>
              {preview.slice(0,30).map((row) => <tr key={row.fila} className="border-t border-[#30363d]">
                <td className="p-3 text-[#8b949e]">{row.fila}</td>
                <td className="p-3 font-bold text-white">{row.nombre_alumno}</td>
                <td className="p-3 text-[#b1bac4]">{row.rut_alumno || '-'}</td>
                <td className="p-3">
                  {row.modo === 'inscribir_existente'
                    ? <span className="rounded-full border border-sky-700/40 bg-sky-950/30 px-2.5 py-1 text-xs font-bold text-sky-300">Agregar rama</span>
                    : <span className="rounded-full border border-emerald-700/40 bg-emerald-950/30 px-2.5 py-1 text-xs font-bold text-emerald-300">Crear alumno</span>}
                </td>
                <td className="p-3 text-[#b1bac4]">{row.categoria || 'Sin categoría'}</td>
                <td className="p-3">
                  {row.valido
                    ? <span className="text-emerald-300">Listo</span>
                    : <span className="text-red-300" title={row.errors.join(' · ')}>{row.errors.join(' · ')}</span>}
                  {row.valido && row.warnings.length ? <p className="mt-1 max-w-md text-xs text-amber-300">{row.warnings.join(' · ')}</p> : null}
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {preview.length > 30 && <p className="text-xs text-[#6b7280]">Se muestran las primeras 30 filas de {preview.length.toLocaleString('es-CL')} validadas.</p>}

      <div className="flex flex-col gap-3 rounded-2xl border border-[#30363d] bg-[#0d1117] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-[#9ca3af]">
          Destino: <b className="text-white">{branchLabel(selectedBranch)}</b>. Las categorías nuevas, saldos e inscripciones se guardarán dentro de este contexto.
        </div>
        <button
          disabled={loading || !summary.valid || summary.capacity_exceeded || !selectedBranchId}
          onClick={commit}
          className="shrink-0 rounded-xl bg-emerald-500 px-6 py-3 font-black text-emerald-950 disabled:opacity-50"
        >
          {loading ? 'Importando...' : `Importar ${summary.valid} registros válidos`}
        </button>
      </div>
    </section>}

    <section className="rounded-3xl border border-[#30363d] bg-[#161b22] p-6">
      <h2 className="text-xl font-black text-white">Historial de importaciones</h2>
      <p className="mt-1 text-sm text-[#8b949e]">Cada lote conserva la rama y sede donde fue cargado para mantener trazabilidad y permitir una reversión segura.</p>
      <div className="mt-4 space-y-3">
        {history.map((item) => {
          const ramaNombre = item.ramas?.nombre || item.resumen?.rama || 'Importación histórica sin rama';
          const disciplina = item.ramas?.disciplina || item.resumen?.disciplina || '';
          const sedeNombre = item.sedes?.nombre || item.resumen?.sede || '';
          return <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-[#30363d] bg-[#0d1117] p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-bold text-white">{item.nombre_archivo || 'Importación sin nombre'}</p>
              <p className="mt-1 text-sm font-semibold text-[#7dd3cf]">{ramaNombre}{disciplina && disciplina !== ramaNombre ? ` · ${disciplina}` : ''}{sedeNombre ? ` · ${sedeNombre}` : ''}</p>
              <p className="mt-1 text-xs text-[#6b7280]">
                {new Date(item.created_at).toLocaleString('es-CL')} · {item.filas_importadas || 0} procesados · {item.resumen?.created_players ?? item.filas_importadas ?? 0} alumnos nuevos · {item.resumen?.enrolled_existing || 0} alumnos existentes incorporados · {item.filas_error || 0} errores
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#21262d] px-3 py-1 text-xs font-black uppercase text-[#b1bac4]">{item.estado}</span>
              {item.estado !== 'revertido' && <button disabled={loading} onClick={() => revert(item.id)} className="rounded-lg border border-red-800/60 px-3 py-2 text-xs font-bold text-red-300">Revertir</button>}
            </div>
          </div>;
        })}
        {!history.length && <p className="text-sm text-[#6b7280]">No hay importaciones anteriores.</p>}
      </div>
    </section>
  </div>;
};

export default Importacion;
