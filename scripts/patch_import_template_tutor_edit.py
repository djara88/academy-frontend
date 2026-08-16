from pathlib import Path

# Importacion.tsx
p=Path('src/pages/Importacion.tsx')
s=p.read_text()

state_anchor="  const [result,setResult]=useState<any>(null);\n"
helper=r'''  const downloadTemplate = () => {
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

'''
if "const downloadTemplate" not in s:
    s=s.replace(state_anchor,state_anchor+"\n"+helper,1)

old_upload='<section className="rounded-3xl border border-[#30363d] bg-[#161b22] p-6"><div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end"><div><label className="mb-2 block text-xs font-black uppercase tracking-[.14em] text-[#8b949e]">Archivo de la escuela</label><input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="block w-full rounded-xl border border-[#30363d] bg-[#0d1117] p-3 text-sm text-[#b1bac4] file:mr-4 file:rounded-lg file:border-0 file:bg-[#289E9D] file:px-4 file:py-2 file:font-bold file:text-white"/></div><div className="rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3 text-sm text-[#8b949e]">{rawRows.length?`${rawRows.length.toLocaleString(\'es-CL\')} filas leídas`:\'Sin archivo\'}</div></div></section>'
new_upload='<section className="rounded-3xl border border-[#30363d] bg-[#161b22] p-6"><div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#C8A96B]/20 bg-[#C8A96B]/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-white">¿La escuela no tiene una planilla estándar?</p><p className="mt-1 text-sm text-[#9ca3af]">Descarga la matriz oficial. Ya viene con los nombres exactos que Syncademia espera y una fila de ejemplo.</p></div><button type="button" onClick={downloadTemplate} className="shrink-0 rounded-xl bg-[#C8A96B] px-4 py-3 text-sm font-black text-[#111827]">Descargar matriz Syncademia</button></div><div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end"><div><label className="mb-2 block text-xs font-black uppercase tracking-[.14em] text-[#8b949e]">Archivo de la escuela</label><input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="block w-full rounded-xl border border-[#30363d] bg-[#0d1117] p-3 text-sm text-[#b1bac4] file:mr-4 file:rounded-lg file:border-0 file:bg-[#289E9D] file:px-4 file:py-2 file:font-bold file:text-white"/></div><div className="rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3 text-sm text-[#8b949e]">{rawRows.length?`${rawRows.length.toLocaleString(\'es-CL\')} filas leídas`:\'Sin archivo\'}</div></div></section>'
if old_upload not in s:
    raise SystemExit('upload section not found')
s=s.replace(old_upload,new_upload,1)
p.write_text(s)

# Apoderados.tsx
p=Path('src/pages/Apoderados.tsx')
s=p.read_text()
s=s.replace("import { KeyIcon, LockClosedIcon, UserPlusIcon, UsersIcon } from '@heroicons/react/24/outline';",
            "import { KeyIcon, LockClosedIcon, PencilSquareIcon, UserPlusIcon, UsersIcon } from '@heroicons/react/24/outline';")
s=s.replace("  id: string; nombre_completo: string; email?: string | null; telefono?: string | null;\n  usuario_id?: string | null; acceso_activo: boolean; jugadores: { id: string; nombre: string }[];",
            "  id: string; nombre_completo: string; rut?: string | null; email?: string | null; telefono?: string | null; parentesco?: string | null; direccion?: string | null;\n  usuario_id?: string | null; acceso_activo: boolean; jugadores: { id: string; nombre: string }[];")

state_anchor="  const [saving, setSaving] = useState(false);\n"
extra="  const [editing, setEditing] = useState<Guardian | null>(null);\n  const [editForm, setEditForm] = useState({ nombre_completo: '', rut: '', telefono: '', email: '', parentesco: '', direccion: '' });\n"
if extra not in s:
    s=s.replace(state_anchor,state_anchor+extra,1)

invite_anchor="  const invite = async () => {\n"
edit_helpers=r'''  const openEdit = (guardian: Guardian) => {
    setEditing(guardian);
    setEditForm({
      nombre_completo: guardian.nombre_completo || '',
      rut: guardian.rut || '',
      telefono: guardian.telefono || '',
      email: guardian.email || '',
      parentesco: guardian.parentesco || '',
      direccion: guardian.direccion || '',
    });
  };

  const saveEdit = async () => {
    if (!editing || !editForm.nombre_completo.trim()) return;
    setSaving(true);
    try {
      const response = await api.patch(`/api/apoderados/${editing.id}`, editForm);
      setEditing(null);
      await query.refetch();
      await notify(response.data?.message || 'Datos del apoderado actualizados.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible actualizar los datos del apoderado.');
    } finally {
      setSaving(false);
    }
  };

'''
if "const openEdit" not in s:
    s=s.replace(invite_anchor,edit_helpers+invite_anchor,1)

old_actions="<div className=\"flex flex-wrap items-center gap-2\"><span className={`rounded-full px-3 py-1 text-xs font-black ${guardian.usuario_id ? guardian.acceso_activo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>{guardian.usuario_id ? guardian.acceso_activo ? 'Activo' : 'Desactivado' : 'Sin acceso'}</span>"
new_actions="<div className=\"flex flex-wrap items-center gap-2\"><span className={`rounded-full px-3 py-1 text-xs font-black ${guardian.usuario_id ? guardian.acceso_activo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>{guardian.usuario_id ? guardian.acceso_activo ? 'Activo' : 'Desactivado' : 'Sin acceso'}</span><button type=\"button\" onClick={() => openEdit(guardian)} className=\"min-h-11 rounded-xl border border-sky-400/20 px-4 text-sm font-black text-sky-200\"><PencilSquareIcon className=\"mr-1 inline h-4 w-4\"/>Editar</button>"
if old_actions not in s:
    raise SystemExit('guardian actions anchor not found')
s=s.replace(old_actions,new_actions,1)

modal_anchor="    {selected ? <div className=\"fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4\">"
edit_modal=r'''    {editing ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#151b25] p-6 shadow-2xl"><p className="text-xs font-black uppercase tracking-wider text-sky-300">Editar apoderado</p><h2 className="mt-2 text-2xl font-black text-white">Información de contacto y vínculo</h2><p className="mt-2 text-sm text-[#8995a4]">Si el apoderado ya tiene acceso y cambias su correo, Syncademia actualizará también su cuenta de inicio de sesión.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className="label">Nombre completo *</span><input value={editForm.nombre_completo} onChange={(e)=>setEditForm({...editForm,nombre_completo:e.target.value})} className="w-full"/></label><label><span className="label">RUT</span><input value={editForm.rut} onChange={(e)=>setEditForm({...editForm,rut:e.target.value})} className="w-full"/></label><label><span className="label">Teléfono</span><input value={editForm.telefono} onChange={(e)=>setEditForm({...editForm,telefono:e.target.value})} className="w-full"/></label><label><span className="label">Correo</span><input type="email" value={editForm.email} onChange={(e)=>setEditForm({...editForm,email:e.target.value})} className="w-full"/></label><label><span className="label">Parentesco</span><input placeholder="Madre, padre, tutor legal..." value={editForm.parentesco} onChange={(e)=>setEditForm({...editForm,parentesco:e.target.value})} className="w-full"/></label><label><span className="label">Dirección</span><input value={editForm.direccion} onChange={(e)=>setEditForm({...editForm,direccion:e.target.value})} className="w-full"/></label></div><div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={()=>setEditing(null)} className="min-h-11 rounded-xl border border-white/10 font-black text-[#9aa6b5]">Cancelar</button><button type="button" onClick={()=>void saveEdit()} disabled={saving || !editForm.nombre_completo.trim()} className="btn-primary min-h-11 disabled:opacity-50">{saving?'Guardando...':'Guardar cambios'}</button></div></div></div> : null}
'''
if edit_modal not in s:
    if modal_anchor not in s: raise SystemExit('modal anchor not found')
    s=s.replace(modal_anchor,edit_modal+modal_anchor,1)
p.write_text(s)
