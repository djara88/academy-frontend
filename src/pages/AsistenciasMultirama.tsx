import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { useAcademyMessages } from '../hooks/useAcademyMessages';

type Branch = { id: string; nombre: string; disciplina: string; sedes?: { id: string; nombre: string } | null };
type Category = { id: string; nombre: string; rama_id?: string | null; ramas?: { id: string; nombre: string; disciplina: string } | null };
type Student = {
  id: string;
  nombre: string;
  documento?: string | null;
  fecha_nacimiento?: string | null;
  foto?: string | null;
  rol_especialidad?: string | null;
  inscripcion_id?: string | null;
  rama_id?: string | null;
  tiene_alerta_medica?: boolean;
};
type Suspended = { id: string; categoria_id: string; rama_id?: string | null; fecha: string; motivo_cancelacion?: string | null; categorias?: { id: string; nombre: string } | null; ramas?: { id: string; nombre: string; disciplina: string } | null };
type Metrics = {
  global: { totalClases: number; canceladas: number; recuperativas: number; porcentajeGlobal: number; totalPresentes: number; totalAusentes: number; totalJustificados: number };
  categorias: Array<{ nombre: string; porcentaje: number; presentes: number; total: number }>;
  jugadores: Array<{ nombre: string; porcentaje: number; presentes: number; total: number }>;
};
type AttendanceStatus = 'Presente' | 'Ausente' | 'Justificado';

const panel = 'rounded-[24px] border border-white/10 bg-[#151b25]';
const field = 'w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#289E9D]';

const ageFrom = (value?: string | null) => {
  if (!value) return null;
  const birth = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday = now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
};

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'A';

export default function AsistenciasMultirama() {
  const { confirmAction, notify } = useAcademyMessages();
  const [tab, setTab] = useState<'lista' | 'reportes' | 'reagendar'>('lista');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [studentSearch, setStudentSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('17:00');
  const [place, setPlace] = useState('');
  const [status, setStatus] = useState('Realizado');
  const [reason, setReason] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [suspended, setSuspended] = useState<Suspended[]>([]);
  const [selectedSuspended, setSelectedSuspended] = useState<Suspended | null>(null);
  const [reschedule, setReschedule] = useState({ fecha: '', hora: '18:00', lugar: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const response = await api.get('/api/academias/rama-principal');
        const data = response.data.data;
        setBranches(data?.ramas || []);
        setBranchId((current) => current || data?.rama_principal_id || data?.ramas?.[0]?.id || '');
      } catch (error) {
        console.error(error);
      }
    };
    void loadBranches();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!branchId) {
        setCategories([]);
        setMetrics(null);
        setSuspended([]);
        return;
      }
      try {
        const [catResponse, metricResponse, suspendedResponse] = await Promise.all([
          api.get('/api/jugadores/categorias', { params: { rama_id: branchId } }),
          api.get('/api/entrenamientos/metricas', { params: { rama_id: branchId, mes: month, anio: year } }),
          api.get('/api/entrenamientos/suspendidas', { params: { rama_id: branchId } }),
        ]);
        setCategories(catResponse.data.data || []);
        setMetrics(metricResponse.data.data || null);
        setSuspended(suspendedResponse.data.data || []);
        if (categoryId && categoryId !== 'TODAS' && !(catResponse.data.data || []).some((item: Category) => item.id === categoryId)) setCategoryId('');
      } catch (error: any) {
        await notify(error.response?.data?.error || 'No fue posible cargar la asistencia de la rama.');
      }
    };
    void load();
  }, [branchId, month, year]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    const loadStudents = async () => {
      setStudentSearch('');
      if (!categoryId || categoryId === 'TODAS' || status !== 'Realizado') {
        setStudents([]);
        setAttendance({});
        setLoadingStudents(false);
        return;
      }
      setLoadingStudents(true);
      try {
        const response = await api.get('/api/entrenamientos/alumnos', { params: { rama_id: branchId, categoria_id: categoryId } });
        if (cancelled) return;
        const list = (response.data?.data || []) as Student[];
        setStudents(list);
        setAttendance(Object.fromEntries(list.map((student) => [student.id, 'Presente'])) as Record<string, AttendanceStatus>);
      } catch (error: any) {
        if (!cancelled) {
          setStudents([]);
          setAttendance({});
          await notify(error.response?.data?.error || 'No fue posible cargar los alumnos de esta categoría.');
        }
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    };
    void loadStudents();
    return () => { cancelled = true; };
  }, [categoryId, branchId, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const branch = branches.find((item) => item.id === branchId) || null;
  const category = categories.find((item) => item.id === categoryId) || null;

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) => [student.nombre, student.documento, student.rol_especialidad]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)));
  }, [students, studentSearch]);

  const attendanceSummary = useMemo(() => students.reduce((summary, student) => {
    const value = attendance[student.id] || 'Presente';
    summary[value] += 1;
    return summary;
  }, { Presente: 0, Ausente: 0, Justificado: 0 } as Record<AttendanceStatus, number>), [students, attendance]);

  const setStudentAttendance = (studentId: string, value: AttendanceStatus) => {
    setAttendance((current) => ({ ...current, [studentId]: value }));
  };

  const markAllPresent = () => setAttendance(Object.fromEntries(students.map((student) => [student.id, 'Presente'])) as Record<string, AttendanceStatus>);

  const saveTraining = async () => {
    if (!branchId || !categoryId) return void notify('Selecciona una rama y una categoría.');
    setSaving(true);
    try {
      const response = await api.post('/api/entrenamientos', {
        rama_id: branchId,
        categoria_id: categoryId,
        fecha: date,
        hora: time,
        lugar: place,
        estado: status,
        es_recuperacion: recovery,
        motivo_cancelacion: reason,
        lista_asistencia: students.map((student) => ({ jugador_id: student.id, estado: attendance[student.id] || 'Presente' })),
      });
      await notify(response.data.message || `Entrenamiento ${status.toLowerCase()} registrado.`);
      setCategoryId('');
      setReason('');
      const [metricResponse, suspendedResponse] = await Promise.all([
        api.get('/api/entrenamientos/metricas', { params: { rama_id: branchId, mes: month, anio: year } }),
        api.get('/api/entrenamientos/suspendidas', { params: { rama_id: branchId } }),
      ]);
      setMetrics(metricResponse.data.data);
      setSuspended(suspendedResponse.data.data || []);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible guardar la sesión.');
    } finally {
      setSaving(false);
    }
  };

  const rescheduleClass = async () => {
    if (!selectedSuspended || !reschedule.fecha || !reschedule.hora) return void notify('Completa fecha y hora del reagendamiento.');
    const accepted = await confirmAction(`¿Reagendar ${selectedSuspended.categorias?.nombre || 'la clase'} y notificar solo a los apoderados de ${branch?.nombre || 'esta rama'}?`);
    if (!accepted) return;
    try {
      const response = await api.post('/api/entrenamientos/reagendar-notificar', {
        categoria_id: selectedSuspended.categoria_id,
        fecha: reschedule.fecha,
        hora: reschedule.hora,
        lugar: reschedule.lugar,
        clase_cancelada_id: selectedSuspended.id,
      });
      await notify(response.data.message);
      setSelectedSuspended(null);
      const suspendedResponse = await api.get('/api/entrenamientos/suspendidas', { params: { rama_id: branchId } });
      setSuspended(suspendedResponse.data.data || []);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible reagendar.');
    }
  };

  const sendReport = async () => {
    if (!categoryId || categoryId === 'TODAS') return void notify('Selecciona una categoría específica.');
    const accepted = await confirmAction(`¿Enviar reporte mensual de ${category?.nombre} en ${branch?.nombre}?`);
    if (!accepted) return;
    try {
      const response = await api.post('/api/entrenamientos/reporte-mensual', { categoria_id: categoryId, mes: month, anio: year });
      await notify(response.data.message);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible enviar reportes.');
    }
  };

  const exportExcel = () => {
    if (!metrics?.jugadores?.length) return void notify('No hay datos para exportar.');
    const sheet = XLSX.utils.json_to_sheet(metrics.jugadores.map((item, index) => ({
      Ranking: index + 1,
      Alumno: item.nombre,
      'Porcentaje (%)': item.porcentaje,
      Presentes: item.presentes,
      Registros: item.total,
      Rama: branch?.nombre || '',
    })));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Asistencias');
    XLSX.writeFile(book, `Asistencias_${branch?.nombre || 'Rama'}_${month}_${year}.xlsx`);
  };

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="rounded-[28px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,.16),transparent_38%),#151b25] p-6 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#70e4df]">Asistencia multirrama</p><h1 className="mt-2 text-3xl font-black text-white">Entrenamientos y recuperaciones</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#8b949e]">La lista identifica claramente a cada alumno y respeta todas sus categorías dentro de la rama, no solo la categoría de referencia.</p></div>
        <select value={branchId} onChange={(event) => { setBranchId(event.target.value); setCategoryId(''); }} className={`${field} lg:max-w-md`}><option value="">Selecciona rama</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}{item.sedes?.nombre ? ` · ${item.sedes.nombre}` : ''}</option>)}</select>
      </div>
    </section>

    <div className="flex rounded-xl border border-white/10 bg-[#0d1117] p-1"><button onClick={() => setTab('lista')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-black ${tab === 'lista' ? 'bg-[#289E9D] text-white' : 'text-[#8995a4]'}`}>Pasar lista</button><button onClick={() => setTab('reagendar')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-black ${tab === 'reagendar' ? 'bg-orange-600 text-white' : 'text-[#8995a4]'}`}>Reagendar ({suspended.length})</button><button onClick={() => setTab('reportes')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-black ${tab === 'reportes' ? 'bg-[#289E9D] text-white' : 'text-[#8995a4]'}`}>Dashboard</button></div>

    {tab === 'lista' ? <section className="grid gap-5 lg:grid-cols-[.72fr_1.28fr]">
      <div className={`${panel} p-5`}>
        <p className="text-xs font-black uppercase text-[#70e4df]">{branch?.disciplina || 'Rama'}</p><h2 className="mt-1 text-xl font-black text-white">Configurar sesión</h2>
        <div className="mt-4 space-y-3"><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={field}><option value="">Selecciona categoría</option><option value="TODAS">Todas las categorías de esta rama</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select><div className="grid grid-cols-2 gap-2"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={field}/><input type="time" value={time} onChange={(event) => setTime(event.target.value)} className={field}/></div><input value={place} onChange={(event) => setPlace(event.target.value)} className={field} placeholder="Lugar"/><select value={status} onChange={(event) => setStatus(event.target.value)} className={field}><option>Realizado</option><option>Cancelado</option><option>Programado</option></select>{status === 'Cancelado' ? <textarea value={reason} onChange={(event) => setReason(event.target.value)} className={`${field} min-h-20`} placeholder="Motivo de suspensión"/> : null}<label className="flex items-center gap-2 text-sm text-[#c3ccd6]"><input type="checkbox" checked={recovery} onChange={(event) => setRecovery(event.target.checked)}/>Es clase recuperativa</label><button disabled={saving} onClick={() => void saveTraining()} className="min-h-11 w-full rounded-xl bg-[#289E9D] px-4 text-sm font-black text-white disabled:opacity-40">{saving ? 'Guardando...' : 'Guardar sesión'}</button></div>
      </div>

      <div className={`${panel} overflow-hidden`}>
        <div className="border-b border-white/10 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-xs font-black uppercase text-violet-300">Lista de alumnos</p><h2 className="mt-1 text-xl font-black text-white">{category?.nombre || 'Selecciona una categoría'}</h2><p className="mt-1 text-xs text-[#778393]">Foto, nombre, documento y rol deportivo para identificar al alumno antes de marcar su asistencia.</p></div>
            <span className="self-start rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-[#aab4c1]">{students.length} alumnos</span>
          </div>

          {students.length ? <>
            <div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-center"><p className="text-[10px] font-black uppercase text-emerald-300">Presentes</p><p className="mt-1 text-xl font-black text-emerald-200">{attendanceSummary.Presente}</p></div><div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-center"><p className="text-[10px] font-black uppercase text-red-300">Ausentes</p><p className="mt-1 text-xl font-black text-red-200">{attendanceSummary.Ausente}</p></div><div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-center"><p className="text-[10px] font-black uppercase text-amber-300">Justificados</p><p className="mt-1 text-xl font-black text-amber-200">{attendanceSummary.Justificado}</p></div></div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row"><label className="relative min-w-0 flex-1"><MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-[#697586]"/><input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} className={`${field} pl-10`} placeholder="Buscar alumno, RUT o especialidad"/></label><button type="button" onClick={markAllPresent} className="min-h-11 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-xs font-black text-emerald-200">Todos presentes</button></div>
          </> : null}
        </div>

        <div className="max-h-[620px] space-y-2 overflow-y-auto p-4 sm:p-5">
          {loadingStudents ? <div className="grid min-h-40 place-items-center text-sm font-bold text-[#70e4df]">Cargando alumnos de la categoría...</div> : null}
          {!loadingStudents && filteredStudents.map((student, index) => {
            const age = ageFrom(student.fecha_nacimiento);
            const selected = attendance[student.id] || 'Presente';
            return <div key={student.id} className="rounded-2xl border border-white/10 bg-[#0d1117] p-3.5 transition hover:border-[#289E9D]/30">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="w-6 shrink-0 text-center text-[10px] font-black text-[#596575]">{String(index + 1).padStart(2, '0')}</span>
                  {student.foto ? <img src={student.foto} alt={`Foto de ${student.nombre}`} className="h-14 w-14 shrink-0 rounded-2xl border border-white/10 object-cover"/> : <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[#289E9D]/25 bg-[#289E9D]/10 text-sm font-black text-[#70e4df]">{initials(student.nombre)}</div>}
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-base font-black text-white">{student.nombre}</p>{student.tiene_alerta_medica ? <span title="El alumno tiene una alerta médica registrada" className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-amber-300"><ExclamationTriangleIcon className="h-3.5 w-3.5"/>Alerta</span> : null}</div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#7f8c9c]"><span>{student.documento || 'Sin documento'}</span>{age !== null ? <span>{age} años</span> : null}{student.rol_especialidad ? <span className="font-bold text-violet-300">{student.rol_especialidad}</span> : <span className="text-[#596575]">Sin especialidad definida</span>}</div></div>
                </div>

                <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-[#151b25] p-1 sm:w-[285px]">
                  <button type="button" onClick={() => setStudentAttendance(student.id, 'Presente')} className={`flex min-h-9 items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-black ${selected === 'Presente' ? 'bg-emerald-500 text-emerald-950' : 'text-[#8995a4] hover:bg-white/5'}`}><CheckCircleIcon className="h-4 w-4"/>Presente</button>
                  <button type="button" onClick={() => setStudentAttendance(student.id, 'Ausente')} className={`flex min-h-9 items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-black ${selected === 'Ausente' ? 'bg-red-500 text-white' : 'text-[#8995a4] hover:bg-white/5'}`}><XCircleIcon className="h-4 w-4"/>Ausente</button>
                  <button type="button" onClick={() => setStudentAttendance(student.id, 'Justificado')} className={`flex min-h-9 items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-black ${selected === 'Justificado' ? 'bg-amber-500 text-amber-950' : 'text-[#8995a4] hover:bg-white/5'}`}><UserCircleIcon className="h-4 w-4"/>Justif.</button>
                </div>
              </div>
            </div>;
          })}
          {!loadingStudents && students.length > 0 && !filteredStudents.length ? <p className="py-8 text-center text-sm text-[#697586]">No encontramos alumnos con esa búsqueda.</p> : null}
          {!loadingStudents && categoryId && categoryId !== 'TODAS' && status === 'Realizado' && !students.length ? <p className="py-8 text-center text-sm text-[#697586]">No hay alumnos con inscripción activa y pertenencia a esta categoría.</p> : null}
          {categoryId === 'TODAS' ? <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200">“Todas” se limita a <strong>{branch?.nombre}</strong>. Para pasar lista alumno por alumno selecciona una categoría específica.</p> : null}
          {status !== 'Realizado' && categoryId && categoryId !== 'TODAS' ? <p className="rounded-xl border border-sky-400/20 bg-sky-500/10 p-4 text-sm leading-6 text-sky-200">La lista individual se habilita cuando el estado de la sesión es <strong>Realizado</strong>.</p> : null}
        </div>
      </div>
    </section> : null}

    {tab === 'reagendar' ? <section className="grid gap-5 lg:grid-cols-2"><div className={`${panel} p-5`}><h2 className="text-xl font-black text-white">Clases suspendidas · {branch?.nombre}</h2><div className="mt-4 space-y-2">{suspended.map((item) => <button key={item.id} onClick={() => setSelectedSuspended(item)} className={`w-full rounded-xl border p-3 text-left ${selectedSuspended?.id === item.id ? 'border-orange-400/40 bg-orange-500/10' : 'border-white/10 bg-[#0d1117]'}`}><p className="font-black text-white">{item.categorias?.nombre || 'Categoría'} · {item.fecha}</p><p className="mt-1 text-xs text-[#8995a4]">{item.motivo_cancelacion || 'Sin motivo informado'}</p></button>)}{!suspended.length ? <p className="text-sm text-[#697586]">No hay suspensiones en esta rama.</p> : null}</div></div><div className={`${panel} p-5`}><h2 className="text-xl font-black text-white">Nueva fecha</h2>{selectedSuspended ? <div className="mt-4 space-y-3"><div className="rounded-xl border border-orange-400/20 bg-orange-500/10 p-3 text-sm text-orange-200">{selectedSuspended.categorias?.nombre} · {selectedSuspended.fecha}</div><input type="date" value={reschedule.fecha} onChange={(event) => setReschedule({ ...reschedule, fecha: event.target.value })} className={field}/><input type="time" value={reschedule.hora} onChange={(event) => setReschedule({ ...reschedule, hora: event.target.value })} className={field}/><input value={reschedule.lugar} onChange={(event) => setReschedule({ ...reschedule, lugar: event.target.value })} className={field} placeholder="Lugar"/><button onClick={() => void rescheduleClass()} className="min-h-11 w-full rounded-xl bg-orange-600 px-4 text-sm font-black text-white">Reagendar y notificar</button></div> : <p className="mt-4 text-sm text-[#697586]">Selecciona una clase suspendida.</p>}</div></section> : null}

    {tab === 'reportes' ? <section className="space-y-5"><div className={`${panel} p-5`}><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-black uppercase text-[#70e4df]">Métricas de {branch?.nombre}</p><h2 className="mt-1 text-xl font-black text-white">Asistencia mensual</h2></div><div className="flex gap-2"><select value={month} onChange={(event) => setMonth(event.target.value)} className={field}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{String(i + 1).padStart(2, '0')}</option>)}</select><input value={year} onChange={(event) => setYear(event.target.value)} className={`${field} w-28`}/><button onClick={exportExcel} className="rounded-xl border border-white/10 px-4 text-xs font-black text-[#c3ccd6]">Excel</button></div></div>{metrics ? <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4"><div className="rounded-xl bg-[#0d1117] p-4 text-center"><p className="text-[10px] uppercase text-[#697586]">Clases</p><p className="mt-1 text-2xl font-black text-white">{metrics.global.totalClases}</p></div><div className="rounded-xl bg-emerald-500/10 p-4 text-center"><p className="text-[10px] uppercase text-emerald-300">Asistencia</p><p className="mt-1 text-2xl font-black text-emerald-200">{metrics.global.porcentajeGlobal}%</p></div><div className="rounded-xl bg-orange-500/10 p-4 text-center"><p className="text-[10px] uppercase text-orange-300">Canceladas</p><p className="mt-1 text-2xl font-black text-orange-200">{metrics.global.canceladas}</p></div><div className="rounded-xl bg-violet-500/10 p-4 text-center"><p className="text-[10px] uppercase text-violet-300">Recuperativas</p><p className="mt-1 text-2xl font-black text-violet-200">{metrics.global.recuperativas}</p></div></div> : null}</div><div className="grid gap-5 lg:grid-cols-2"><div className={`${panel} p-5`}><h3 className="font-black text-white">Por categoría</h3><div className="mt-3 space-y-2">{metrics?.categorias.map((item) => <div key={item.nombre} className="flex items-center justify-between rounded-xl bg-[#0d1117] px-3 py-2"><span className="text-sm text-[#c3ccd6]">{item.nombre}</span><span className="font-black text-[#70e4df]">{item.porcentaje}%</span></div>)}</div></div><div className={`${panel} p-5`}><h3 className="font-black text-white">Reporte familiar</h3><p className="mt-2 text-sm leading-6 text-[#8b949e]">Selecciona una categoría de esta rama y envía un resumen individual a sus apoderados.</p><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={`${field} mt-4`}><option value="">Selecciona categoría</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select><button onClick={() => void sendReport()} className="mt-3 min-h-11 w-full rounded-xl bg-[#289E9D] px-4 text-sm font-black text-white">Enviar reporte mensual</button></div></div></section> : null}
  </div>;
}
