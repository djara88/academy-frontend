import fs from 'node:fs';

const replaceOnce=(text,search,replacement,label)=>{if(!text.includes(search)) throw new Error(`No se encontró ${label}`); return text.replace(search,replacement);};

let app=fs.readFileSync('src/App.tsx','utf8');
app=replaceOnce(app,"const ChatCenter = lazy(() => import('./pages/ChatCenter'));","const ChatCenter = lazy(() => import('./pages/ChatCenter'));\nconst EstructuraAcademia = lazy(() => import('./pages/EstructuraAcademia'));",'lazy estructura');
app=replaceOnce(app,"<Route path=\"/configuracion/perfil\" element={<PerfilAcademia />} />","<Route path=\"/configuracion/perfil\" element={<PerfilAcademia />} />\n                    <Route path=\"/configuracion/estructura\" element={<EstructuraAcademia />} />",'route estructura');
fs.writeFileSync('src/App.tsx',app);

let config=fs.readFileSync('src/pages/Configuracion.tsx','utf8');
config=replaceOnce(config,"    { \n      titulo: 'Uniformes e Inventario',","    {\n      titulo: 'Sedes y Ramas',\n      desc: 'Gestiona ubicaciones y disciplinas deportivas de la academia',\n      icono: '🏢',\n      ruta: '/configuracion/estructura',\n      bg: 'bg-teal-900/20',\n      border: 'border-teal-500/30'\n    },\n    { \n      titulo: 'Uniformes e Inventario',",'card estructura');
fs.writeFileSync('src/pages/Configuracion.tsx',config);

let mat=fs.readFileSync('src/pages/MatriculaPreparacion.tsx','utf8');
mat=replaceOnce(mat,
"const emptyPlayer = { nombre: '', rut: '', fecha_nacimiento: '', sexo: '', posicion_cancha: '', tipo_alumno: 'Nuevo', certificado_medico: 'Pendiente', talla_uniforme: '', numero_camiseta: '', nombre_camiseta: '', talla_apoderado: 'No desea', monto_camiseta_apoderado: '' };",
"type StructureBranch = { id: string; sede_id: string; nombre: string; disciplina: string; principal: boolean; activa: boolean };\ntype StructureSite = { id: string; nombre: string; principal: boolean; activa: boolean; ramas: StructureBranch[] };\nconst emptyPlayer = { nombre: '', rut: '', fecha_nacimiento: '', sexo: '', posicion_cancha: '', tipo_alumno: 'Nuevo', certificado_medico: 'Pendiente', talla_uniforme: '', numero_camiseta: '', nombre_camiseta: '', talla_apoderado: 'No desea', monto_camiseta_apoderado: '', sede_id: '', rama_id: '' };",
'player structure type');
mat=replaceOnce(mat,
"  const [lastAction, setLastAction] = useState<'created' | 'updated'>('created');",
"  const [lastAction, setLastAction] = useState<'created' | 'updated'>('created');\n  const [structure, setStructure] = useState<StructureSite[]>([]);",
'structure state');
mat=replaceOnce(mat,
"  useEffect(() => { loadRecent(); }, []);",
"  useEffect(() => { loadRecent(); api.get('/api/estructura').then((r) => setStructure(r.data?.data || [])).catch(() => setStructure([])); }, []);\n  useEffect(() => {\n    if (jugador.sede_id || !structure.length) return;\n    const site = structure.find((item) => item.principal && item.activa) || structure.find((item) => item.activa);\n    const branch = site?.ramas.find((item) => item.principal && item.activa) || site?.ramas.find((item) => item.activa);\n    if (site) setJugador((current) => ({ ...current, sede_id: site.id, rama_id: branch?.id || '' }));\n  }, [structure, jugador.sede_id]);",
'load structure');
mat=replaceOnce(mat,
"    if (step === 1 && (!jugador.nombre.trim() || !jugador.fecha_nacimiento || !jugador.sexo || !jugador.posicion_cancha)) return setError('Completa los datos obligatorios del alumno.'), false;",
"    if (step === 1 && (!jugador.nombre.trim() || !jugador.fecha_nacimiento || !jugador.sexo || !jugador.posicion_cancha)) return setError('Completa los datos obligatorios del alumno.'), false;\n    if (step === 1 && structure.length && (!jugador.sede_id || !jugador.rama_id)) return setError('Selecciona la sede y rama deportiva del alumno.'), false;",
'validate structure');
const insertPoint='    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">';
const orgPanel=`    <section className="rounded-2xl border border-[#289E9D]/25 bg-[#289E9D]/[0.06] p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.14em] text-[#70e4df]">Ubicación y rama</p><p className="mt-1 text-sm text-[#9ca3af]">Define dónde y en qué disciplina quedará registrado el alumno.</p></div><a href="/configuracion/estructura" className="text-xs font-black text-[#D8BE87]">Administrar sedes y ramas →</a></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><select className={inputClass} value={jugador.sede_id} onChange={(e) => { const sede_id=e.target.value; const site=structure.find((s)=>s.id===sede_id); const branch=site?.ramas.find((r)=>r.principal&&r.activa)||site?.ramas.find((r)=>r.activa); setJugador({...jugador,sede_id,rama_id:branch?.id||''}); }}><option value="">Selecciona sede</option>{structure.filter((s)=>s.activa).map((s)=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select><select className={inputClass} value={jugador.rama_id} onChange={(e)=>setJugador({...jugador,rama_id:e.target.value})}><option value="">Selecciona rama</option>{(structure.find((s)=>s.id===jugador.sede_id)?.ramas||[]).filter((r)=>r.activa).map((r)=><option key={r.id} value={r.id}>{r.nombre} · {r.disciplina}</option>)}</select></div></section>\n\n`;
mat=replaceOnce(mat,insertPoint,orgPanel+insertPoint,'organization panel');
fs.writeFileSync('src/pages/MatriculaPreparacion.tsx',mat);

console.log('Frontend multisite patch applied');
