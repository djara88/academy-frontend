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
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_DARK,
  DIRECTOR_BUTTON_GHOST,
  DIRECTOR_FIELD,
  DirectorHero,
  DirectorPage,
  DirectorPanel,
  DirectorStat,
  DirectorTabButton,
  DirectorTabs,
} from '../components/director/DirectorModule';

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
type Suspended = {
  id: string;
  categoria_id: string;
  rama_id?: string | null;
  fecha: string;
  motivo_cancelacion?: string | null;
  categorias?: { id: string; nombre: string } | null;
  ramas?: { id: string; nombre: string; disciplina: string } | null;
};
type Metrics = {
  global: {
    totalClases: number;
    canceladas: number;
    recuperativas: number;
    porcentajeGlobal: number;
    totalPresentes: number;
    totalAusentes: number;
    totalJustificados: number;
  };
  categorias: Array<{ nombre: string; porcentaje: number; presentes: number; total: number }>;
  jugadores: Array<{ nombre: string; porcentaje: number; presentes: number; total: number }>;
  registros?: Array<{
    registro_id?: string;
    entrenamiento_id: string;
    fecha: string;
    hora?: string | null;
    registrado_at?: string | null;
    alumno: string;
    jugador_id?: string;
    estado: 'Presente' | 'Ausente' | 'Justificado';
    categoria: string;
    rama: string;
    disciplina?: string;
    lugar?: string | null;
    es_recuperacion: boolean;
  }>;
};
type AttendanceStatus = 'Presente' | 'Ausente' | 'Justificado';
type Tab = 'lista' | 'reagendar' | 'reportes';

const labelClass = 'mb-1.5 block text-[11px] font-black uppercase tracking-[.08em] text-[#697468]';

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

const initials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join('') || 'A';

const statusButton = (selected: boolean, status: AttendanceStatus) => {
  if (!selected) return 'border-[#dbe2d8] bg-white text-[#667064] hover:border-[#b5c0b1] hover:bg-[#f8faf6]';
  if (status === 'Presente') return 'border-[#9bc900] bg-[#b7ff00] text-[#111711]';
  if (status === 'Ausente') return 'border-[#202820] bg-[#111711] text-white';
  return 'border-amber-300 bg-amber-50 text-amber-800';
};

export default function AsistenciasMultirama() {
  const { confirmAction, notify } = useAcademyMessages();
  const [tab, setTab] = useState<Tab>('lista');
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
        if (categoryId && categoryId !== 'TODAS' && !(catResponse.data.data || []).some((item: Category) => item.id === categoryId)) {
          setCategoryId('');
        }
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

  const markAllPresent = () => {
    setAttendance(Object.fromEntries(students.map((student) => [student.id, 'Presente'])) as Record<string, AttendanceStatus>);
  };

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
        lista_asistencia: students.map((student) => ({
          jugador_id: student.id,
          estado: attendance[student.id] || 'Presente',
        })),
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
    if (!selectedSuspended || !reschedule.fecha || !reschedule.hora) {
      return void notify('Completa fecha y hora del reagendamiento.');
    }
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
      const response = await api.post('/api/entrenamientos/reporte-mensual', {
        categoria_id: categoryId,
        mes: month,
        anio: year,
      });
      await notify(response.data.message);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible enviar reportes.');
    }
  };

  const exportExcel = () => {
    const detail = metrics?.registros || [];
    if (!metrics?.jugadores?.length && !detail.length) return void notify('No hay datos para exportar.');

    const summaryRows = (metrics?.jugadores || []).map((item, index) => ({
      Ranking: index + 1,
      Alumno: item.nombre,
      'Porcentaje (%)': item.porcentaje,
      Presentes: item.presentes,
      'Registros únicos': item.total,
      Rama: branch?.nombre || '',
      Disciplina: branch?.disciplina || '',
      Mes: month,
      Año: year,
    }));

    const detailRows = detail.map((item) => {
      const sessionDate = item.fecha ? new Date(`${item.fecha}T12:00:00`) : null;
      const registeredDate = item.registrado_at ? new Date(item.registrado_at) : null;
      const validRegistrationDate = registeredDate && !Number.isNaN(registeredDate.getTime());
      return {
        'Fecha sesión': sessionDate && !Number.isNaN(sessionDate.getTime()) ? sessionDate.toLocaleDateString('es-CL') : item.fecha || '',
        'Hora sesión': item.hora || '',
        Alumno: item.alumno,
        Estado: item.estado,
        Categoría: item.categoria,
        Rama: item.rama || branch?.nombre || '',
        Disciplina: item.disciplina || branch?.disciplina || '',
        Lugar: item.lugar || '',
        'Tipo de clase': item.es_recuperacion ? 'Recuperación' : 'Regular',
        'Fecha registro': validRegistrationDate ? registeredDate.toLocaleDateString('es-CL', { timeZone: 'America/Santiago' }) : '',
        'Hora registro': validRegistrationDate ? registeredDate.toLocaleTimeString('es-CL', {
          timeZone: 'America/Santiago',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) : '',
        'ID sesión': item.entrenamiento_id,
      };
    });

    const book = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    summarySheet['!cols'] = [
      { wch: 10 }, { wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 18 },
      { wch: 24 }, { wch: 18 }, { wch: 8 }, { wch: 8 },
    ];
    if (summarySheet['!ref']) summarySheet['!autofilter'] = { ref: summarySheet['!ref'] };
    XLSX.utils.book_append_sheet(book, summarySheet, 'Resumen');

    if (detailRows.length) {
      const detailSheet = XLSX.utils.json_to_sheet(detailRows);
      detailSheet['!cols'] = [
        { wch: 16 }, { wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 24 }, { wch: 24 },
        { wch: 18 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 38 },
      ];
      if (detailSheet['!ref']) detailSheet['!autofilter'] = { ref: detailSheet['!ref'] };
      XLSX.utils.book_append_sheet(book, detailSheet, 'Detalle');
    }

    const safeBranch = String(branch?.nombre || 'Rama').replace(/[\\/:*?"<>|]+/g, '-');
    XLSX.writeFile(book, `Asistencias_${safeBranch}_${month}_${year}.xlsx`);
  };

  return (
    <DirectorPage className="max-w-[1280px]">
      <DirectorHero
        eyebrow="Asistencia multirrama"
        title="Pasar lista"
        description="Registra una sesión, marca la asistencia y resuelve recuperaciones sin mezclar categorías ni ramas."
        aside={(
          <label className="block rounded-2xl border border-[#dce2d8] bg-[#f7f9f5] p-4">
            <span className={labelClass}>Rama activa</span>
            <select
              className={DIRECTOR_FIELD}
              value={branchId}
              onChange={(event) => {
                setBranchId(event.target.value);
                setCategoryId('');
              }}
            >
              <option value="">Selecciona rama</option>
              {branches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.disciplina} · {item.nombre}{item.sedes?.nombre ? ` · ${item.sedes.nombre}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      />

      <DirectorTabs className="grid-cols-3">
        <DirectorTabButton active={tab === 'lista'} onClick={() => setTab('lista')}>Pasar lista</DirectorTabButton>
        <DirectorTabButton active={tab === 'reagendar'} onClick={() => setTab('reagendar')}>Reagendar ({suspended.length})</DirectorTabButton>
        <DirectorTabButton active={tab === 'reportes'} onClick={() => setTab('reportes')}>Reportes</DirectorTabButton>
      </DirectorTabs>

      {tab === 'lista' ? (
        <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <DirectorPanel className="self-start p-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#75806f]">{branch?.disciplina || 'Rama'}</p>
              <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#111711]">Configurar sesión</h2>
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl border border-[#e1e6de] bg-[#f8faf6] p-3">
              <label>
                <span className={labelClass}>Categoría</span>
                <select className={DIRECTOR_FIELD} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  <option value="">Selecciona categoría</option>
                  <option value="TODAS">Todas las categorías</option>
                  {categories.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label>
                  <span className={labelClass}>Fecha</span>
                  <input className={DIRECTOR_FIELD} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                </label>
                <label>
                  <span className={labelClass}>Hora</span>
                  <input className={DIRECTOR_FIELD} type="time" value={time} onChange={(event) => setTime(event.target.value)} />
                </label>
              </div>

              <label>
                <span className={labelClass}>Lugar</span>
                <input className={DIRECTOR_FIELD} value={place} onChange={(event) => setPlace(event.target.value)} placeholder="Ej. Cancha principal" />
              </label>

              <label>
                <span className={labelClass}>Estado</span>
                <select className={DIRECTOR_FIELD} value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option>Realizado</option>
                  <option>Cancelado</option>
                  <option>Programado</option>
                </select>
              </label>

              {status === 'Cancelado' ? (
                <label>
                  <span className={labelClass}>Motivo de suspensión</span>
                  <textarea className={`${DIRECTOR_FIELD} min-h-24 py-3`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej. lluvia, feriado o cancha no disponible" />
                </label>
              ) : null}

              <label className="flex min-h-11 items-center gap-2 text-sm font-bold text-[#596456]">
                <input className="h-4 w-4 accent-[#8eb700]" type="checkbox" checked={recovery} onChange={(event) => setRecovery(event.target.checked)} />
                Clase recuperativa
              </label>

              <button className={DIRECTOR_BUTTON} disabled={saving} onClick={() => void saveTraining()}>
                {saving ? 'Guardando…' : 'Guardar sesión'}
              </button>
            </div>
          </DirectorPanel>

          <DirectorPanel className="overflow-hidden">
            <header className="border-b border-[#e4e9e1] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#75806f]">Lista de alumnos</p>
                  <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#111711]">{category?.nombre || 'Selecciona una categoría'}</h2>
                  <p className="mt-1 text-sm text-[#697468]">Marca el estado de cada alumno y guarda la sesión una sola vez.</p>
                </div>
                <span className="rounded-full border border-[#dbe2d8] bg-[#f7f9f5] px-3 py-1.5 text-xs font-black text-[#596456]">{students.length} alumnos</span>
              </div>

              {students.length > 0 ? (
                <>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <MiniCount label="Presentes" value={attendanceSummary.Presente} tone="present" />
                    <MiniCount label="Ausentes" value={attendanceSummary.Ausente} tone="absent" />
                    <MiniCount label="Justificados" value={attendanceSummary.Justificado} tone="justified" />
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <label className="relative">
                      <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-3.5 h-5 w-5 text-[#788277]" />
                      <input className={`${DIRECTOR_FIELD} pr-10`} value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Buscar alumno, RUT o especialidad" />
                    </label>
                    <button type="button" className={DIRECTOR_BUTTON_GHOST} onClick={markAllPresent}>Todos presentes</button>
                  </div>
                </>
              ) : null}
            </header>

            <div className="grid max-h-[620px] min-h-[320px] content-start gap-2 overflow-y-auto bg-[#fafbf9] p-2 sm:p-3">
              {loadingStudents ? <EmptyState>Cargando alumnos de la categoría…</EmptyState> : null}

              {!loadingStudents && filteredStudents.map((student, index) => {
                const age = ageFrom(student.fecha_nacimiento);
                const selected = attendance[student.id] || 'Presente';
                return (
                  <div key={student.id} className="grid gap-3 rounded-2xl border border-[#dfe5dc] bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-6 shrink-0 text-center text-[10px] font-black text-[#7a8478]">{String(index + 1).padStart(2, '0')}</span>
                      {student.foto ? (
                        <img src={student.foto} alt={`Foto de ${student.nombre}`} className="h-11 w-11 shrink-0 rounded-xl border border-[#dfe5dc] object-cover" />
                      ) : (
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#d6e5a8] bg-[#f0f7dc] text-xs font-black text-[#607900]">{initials(student.nombre)}</div>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="truncate text-sm font-black text-[#111711]">{student.nombre}</strong>
                          {student.tiene_alerta_medica ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-800" title="El alumno tiene una alerta médica registrada">
                              <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Alerta
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-[#778176]">
                          <span>{student.documento || 'Sin documento'}</span>
                          {age !== null ? <span>{age} años</span> : null}
                          <span>{student.rol_especialidad || 'Sin especialidad'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 rounded-xl border border-[#dfe5dc] bg-[#f7f9f5] p-1">
                      {(['Presente', 'Ausente', 'Justificado'] as AttendanceStatus[]).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setAttendance((current) => ({ ...current, [student.id]: value }))}
                          className={`inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-black transition ${statusButton(selected === value, value)}`}
                        >
                          {value === 'Presente' ? <CheckCircleIcon className="h-4 w-4" /> : value === 'Ausente' ? <XCircleIcon className="h-4 w-4" /> : <UserCircleIcon className="h-4 w-4" />}
                          <span>{value === 'Justificado' ? 'Justif.' : value}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {!loadingStudents && students.length > 0 && filteredStudents.length === 0 ? <EmptyState>No encontramos alumnos con esa búsqueda.</EmptyState> : null}
              {!loadingStudents && categoryId && categoryId !== 'TODAS' && status === 'Realizado' && students.length === 0 ? <EmptyState>No hay alumnos con inscripción activa en esta categoría.</EmptyState> : null}
              {!categoryId ? <EmptyState>Selecciona una categoría para cargar la lista.</EmptyState> : null}
              {categoryId === 'TODAS' ? <InfoState>“Todas” registra la sesión para <strong>{branch?.nombre}</strong>. Para pasar lista alumno por alumno, selecciona una categoría específica.</InfoState> : null}
              {status !== 'Realizado' && categoryId && categoryId !== 'TODAS' ? <InfoState>La lista individual se habilita cuando el estado de la sesión es <strong>Realizado</strong>.</InfoState> : null}
            </div>
          </DirectorPanel>
        </section>
      ) : null}

      {tab === 'reagendar' ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <DirectorPanel className="p-4 sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#75806f]">Recuperaciones</p>
            <h2 className="mt-1 text-xl font-black text-[#111711]">Clases suspendidas</h2>
            <p className="mt-1 text-sm text-[#697468]">{branch?.nombre || 'Rama seleccionada'}</p>

            <div className="mt-4 grid gap-2">
              {suspended.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedSuspended(item)}
                  className={`grid gap-1 rounded-2xl border p-4 text-left transition ${selectedSuspended?.id === item.id ? 'border-[#8eb700] bg-[#f3fadf]' : 'border-[#dfe5dc] bg-white hover:border-[#b9c3b6] hover:bg-[#fafbf9]'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm font-black text-[#111711]">{item.categorias?.nombre || 'Categoría'}</strong>
                    <span className="text-xs font-bold text-[#697468]">{item.fecha}</span>
                  </div>
                  <span className="text-xs text-[#697468]">{item.motivo_cancelacion || 'Sin motivo informado'}</span>
                </button>
              ))}
              {!suspended.length ? <EmptyState>No hay suspensiones pendientes en esta rama.</EmptyState> : null}
            </div>
          </DirectorPanel>

          <DirectorPanel className="self-start p-4 sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#75806f]">Nueva fecha</p>
            <h2 className="mt-1 text-xl font-black text-[#111711]">Programar recuperación</h2>

            {selectedSuspended ? (
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-[#d6e5a8] bg-[#f3fadf] p-4">
                  <strong className="block text-sm font-black text-[#111711]">{selectedSuspended.categorias?.nombre}</strong>
                  <span className="mt-1 block text-xs text-[#697468]">Suspendida el {selectedSuspended.fecha}</span>
                </div>
                <label><span className={labelClass}>Fecha</span><input className={DIRECTOR_FIELD} type="date" value={reschedule.fecha} onChange={(event) => setReschedule({ ...reschedule, fecha: event.target.value })} /></label>
                <label><span className={labelClass}>Hora</span><input className={DIRECTOR_FIELD} type="time" value={reschedule.hora} onChange={(event) => setReschedule({ ...reschedule, hora: event.target.value })} /></label>
                <label><span className={labelClass}>Lugar</span><input className={DIRECTOR_FIELD} value={reschedule.lugar} onChange={(event) => setReschedule({ ...reschedule, lugar: event.target.value })} placeholder="Lugar" /></label>
                <button className={DIRECTOR_BUTTON} onClick={() => void rescheduleClass()}>Reagendar y notificar</button>
              </div>
            ) : <EmptyState>Selecciona una clase suspendida para asignar una nueva fecha.</EmptyState>}
          </DirectorPanel>
        </section>
      ) : null}

      {tab === 'reportes' ? (
        <section className="grid gap-4">
          <DirectorPanel className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#75806f]">Métricas de {branch?.nombre || 'la rama'}</p>
                <h2 className="mt-1 text-xl font-black text-[#111711]">Asistencia mensual</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-[110px_130px_auto] sm:items-end">
                <label><span className={labelClass}>Mes</span><select className={DIRECTOR_FIELD} value={month} onChange={(event) => setMonth(event.target.value)}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{String(i + 1).padStart(2, '0')}</option>)}</select></label>
                <label><span className={labelClass}>Año</span><input className={DIRECTOR_FIELD} value={year} onChange={(event) => setYear(event.target.value)} /></label>
                <button type="button" className={DIRECTOR_BUTTON_DARK} onClick={exportExcel}>Exportar Excel</button>
              </div>
            </div>

            {metrics ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <DirectorStat label="Clases" value={metrics.global.totalClases} detail="Registradas en el período" />
                <DirectorStat label="Asistencia" value={`${metrics.global.porcentajeGlobal}%`} detail="Promedio global" tone="lime" />
                <DirectorStat label="Canceladas" value={metrics.global.canceladas} detail="Sesiones suspendidas" />
                <DirectorStat label="Recuperativas" value={metrics.global.recuperativas} detail="Clases recuperadas" />
              </div>
            ) : null}
          </DirectorPanel>

          <div className="grid gap-4 lg:grid-cols-2">
            <DirectorPanel className="p-4 sm:p-5">
              <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#75806f]">Detalle</p>
              <h2 className="mt-1 text-xl font-black text-[#111711]">Por categoría</h2>
              <div className="mt-4 grid gap-2">
                {metrics?.categorias.map((item) => (
                  <div key={item.nombre} className="flex items-center justify-between gap-4 rounded-xl border border-[#e0e5dd] bg-[#fafbf9] px-4 py-3">
                    <span className="text-sm font-bold text-[#596456]">{item.nombre}</span>
                    <strong className="text-sm font-black text-[#111711]">{item.porcentaje}%</strong>
                  </div>
                ))}
                {!metrics?.categorias?.length ? <EmptyState>No hay datos de categorías para este período.</EmptyState> : null}
              </div>
            </DirectorPanel>

            <DirectorPanel className="p-4 sm:p-5">
              <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#75806f]">Familias</p>
              <h2 className="mt-1 text-xl font-black text-[#111711]">Reporte mensual</h2>
              <p className="mt-1 text-sm text-[#697468]">Envía el resumen individual de una categoría a sus apoderados.</p>
              <div className="mt-4 grid gap-3">
                <label><span className={labelClass}>Categoría</span><select className={DIRECTOR_FIELD} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Selecciona categoría</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
                <button className={DIRECTOR_BUTTON} onClick={() => void sendReport()}>Enviar reporte mensual</button>
              </div>
            </DirectorPanel>
          </div>
        </section>
      ) : null}
    </DirectorPage>
  );
}

function MiniCount({ label, value, tone }: { label: string; value: number; tone: 'present' | 'absent' | 'justified' }) {
  const classes = tone === 'present'
    ? 'border-emerald-200 bg-emerald-50'
    : tone === 'absent'
      ? 'border-rose-200 bg-rose-50'
      : 'border-amber-200 bg-amber-50';
  return <div className={`rounded-xl border px-3 py-2 text-center ${classes}`}><span className="block text-[9px] font-black uppercase tracking-[.08em] text-[#687367]">{label}</span><strong className="mt-1 block text-lg font-black text-[#111711]">{value}</strong></div>;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-[#cfd7cc] bg-white p-6 text-center text-sm font-semibold text-[#697468]">{children}</div>;
}

function InfoState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-[#d6e5a8] bg-[#f7faed] p-5 text-sm leading-6 text-[#566056]">{children}</div>;
}
