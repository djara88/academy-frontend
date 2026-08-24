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
};
type AttendanceStatus = 'Presente' | 'Ausente' | 'Justificado';

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

  const setStudentAttendance = (studentId: string, value: AttendanceStatus) => {
    setAttendance((current) => ({ ...current, [studentId]: value }));
  };

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

  return (
    <div className="attendance-page">
      <section className="attendance-hero">
        <div className="attendance-hero-copy">
          <p className="attendance-eyebrow">ASISTENCIA MULTIRRAMA</p>
          <h1>Entrenamientos<br />y recuperaciones</h1>
          <p className="attendance-hero-description">
            Pasa lista con claridad, controla inasistencias y recupera clases sin mezclar categorías ni ramas.
          </p>
        </div>
        <div className="attendance-branch-control">
          <span>Rama activa</span>
          <select
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
        </div>
      </section>

      <nav className="attendance-tabs" aria-label="Secciones de asistencia">
        <button type="button" data-active={tab === 'lista'} onClick={() => setTab('lista')}>Pasar lista</button>
        <button type="button" data-active={tab === 'reagendar'} onClick={() => setTab('reagendar')}>Reagendar ({suspended.length})</button>
        <button type="button" data-active={tab === 'reportes'} onClick={() => setTab('reportes')}>Dashboard</button>
      </nav>

      {tab === 'lista' && (
        <section className="attendance-workspace">
          <aside className="attendance-session-card">
            <div className="attendance-section-heading">
              <p>{branch?.disciplina || 'RAMA'}</p>
              <h2>Configurar sesión</h2>
            </div>

            <div className="attendance-session-form">
              <label className="attendance-field-block">
                <span>Categoría</span>
                <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  <option value="">Selecciona categoría</option>
                  <option value="TODAS">Todas las categorías de esta rama</option>
                  {categories.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                </select>
              </label>

              <div className="attendance-date-time-grid">
                <label className="attendance-field-block attendance-date-field">
                  <span>Fecha</span>
                  <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                </label>
                <label className="attendance-field-block attendance-time-field">
                  <span>Hora</span>
                  <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
                </label>
              </div>

              <label className="attendance-field-block">
                <span>Lugar</span>
                <input value={place} onChange={(event) => setPlace(event.target.value)} placeholder="Ej. Cancha principal" />
              </label>

              <label className="attendance-field-block">
                <span>Estado de la sesión</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option>Realizado</option>
                  <option>Cancelado</option>
                  <option>Programado</option>
                </select>
              </label>

              {status === 'Cancelado' && (
                <label className="attendance-field-block">
                  <span>Motivo de suspensión</span>
                  <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej. lluvia, feriado o cancha no disponible" />
                </label>
              )}

              <label className="attendance-recovery-toggle">
                <input type="checkbox" checked={recovery} onChange={(event) => setRecovery(event.target.checked)} />
                <span>Es clase recuperativa</span>
              </label>

              <button className="attendance-primary-button" disabled={saving} onClick={() => void saveTraining()}>
                {saving ? 'Guardando…' : 'Guardar sesión'}
              </button>
            </div>
          </aside>

          <article className="attendance-roster-card">
            <header className="attendance-roster-header">
              <div className="attendance-roster-title-row">
                <div>
                  <p className="attendance-section-label">LISTA DE ALUMNOS</p>
                  <h2>{category?.nombre || 'Selecciona una categoría'}</h2>
                  <p className="attendance-roster-description">
                    Identifica al alumno antes de registrar su estado de asistencia.
                  </p>
                </div>
                <span className="attendance-count-pill">{students.length} {students.length === 1 ? 'alumno' : 'alumnos'}</span>
              </div>

              {students.length > 0 && (
                <>
                  <div className="attendance-summary-grid">
                    <div className="attendance-summary-card" data-tone="present">
                      <span>Presentes</span>
                      <strong>{attendanceSummary.Presente}</strong>
                    </div>
                    <div className="attendance-summary-card" data-tone="absent">
                      <span>Ausentes</span>
                      <strong>{attendanceSummary.Ausente}</strong>
                    </div>
                    <div className="attendance-summary-card" data-tone="justified">
                      <span>Justificados</span>
                      <strong>{attendanceSummary.Justificado}</strong>
                    </div>
                  </div>

                  <div className="attendance-search-row">
                    <label className="attendance-search-box">
                      <input
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                        placeholder="Buscar alumno, RUT o especialidad"
                      />
                      <MagnifyingGlassIcon aria-hidden="true" />
                    </label>
                    <button type="button" className="attendance-secondary-button" onClick={markAllPresent}>
                      Todos presentes
                    </button>
                  </div>
                </>
              )}
            </header>

            <div className="attendance-roster-list">
              {loadingStudents && <div className="attendance-empty-state">Cargando alumnos de la categoría…</div>}

              {!loadingStudents && filteredStudents.map((student, index) => {
                const age = ageFrom(student.fecha_nacimiento);
                const selected = attendance[student.id] || 'Presente';
                return (
                  <div key={student.id} className="attendance-student-row">
                    <div className="attendance-student-identity">
                      <span className="attendance-student-index">{String(index + 1).padStart(2, '0')}</span>
                      {student.foto ? (
                        <img src={student.foto} alt={`Foto de ${student.nombre}`} />
                      ) : (
                        <div className="attendance-student-avatar">{initials(student.nombre)}</div>
                      )}
                      <div className="attendance-student-copy">
                        <div className="attendance-student-name-line">
                          <strong>{student.nombre}</strong>
                          {student.tiene_alerta_medica && (
                            <span className="attendance-medical-badge" title="El alumno tiene una alerta médica registrada">
                              <ExclamationTriangleIcon /> Alerta
                            </span>
                          )}
                        </div>
                        <div className="attendance-student-meta">
                          <span>{student.documento || 'Sin documento'}</span>
                          {age !== null && <span>{age} años</span>}
                          <span>{student.rol_especialidad || 'Sin especialidad definida'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="attendance-status-control">
                      <button
                        type="button"
                        data-selected={selected === 'Presente'}
                        data-status="present"
                        onClick={() => setStudentAttendance(student.id, 'Presente')}
                      >
                        <CheckCircleIcon /> <span>Presente</span>
                      </button>
                      <button
                        type="button"
                        data-selected={selected === 'Ausente'}
                        data-status="absent"
                        onClick={() => setStudentAttendance(student.id, 'Ausente')}
                      >
                        <XCircleIcon /> <span>Ausente</span>
                      </button>
                      <button
                        type="button"
                        data-selected={selected === 'Justificado'}
                        data-status="justified"
                        onClick={() => setStudentAttendance(student.id, 'Justificado')}
                      >
                        <UserCircleIcon /> <span>Justif.</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {!loadingStudents && students.length > 0 && filteredStudents.length === 0 && (
                <div className="attendance-empty-state">No encontramos alumnos con esa búsqueda.</div>
              )}
              {!loadingStudents && categoryId && categoryId !== 'TODAS' && status === 'Realizado' && students.length === 0 && (
                <div className="attendance-empty-state">No hay alumnos con inscripción activa en esta categoría.</div>
              )}
              {!categoryId && <div className="attendance-empty-state">Selecciona una categoría para cargar la lista.</div>}
              {categoryId === 'TODAS' && (
                <div className="attendance-info-state">
                  “Todas” aplica la sesión a <strong>{branch?.nombre}</strong>. Para pasar lista alumno por alumno, selecciona una categoría específica.
                </div>
              )}
              {status !== 'Realizado' && categoryId && categoryId !== 'TODAS' && (
                <div className="attendance-info-state">La lista individual se habilita cuando el estado de la sesión es <strong>Realizado</strong>.</div>
              )}
            </div>
          </article>
        </section>
      )}

      {tab === 'reagendar' && (
        <section className="attendance-two-column">
          <article className="attendance-panel">
            <div className="attendance-section-heading">
              <p>RECUPERACIONES</p>
              <h2>Clases suspendidas</h2>
              <span>{branch?.nombre || 'Rama seleccionada'}</span>
            </div>
            <div className="attendance-suspended-list">
              {suspended.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-selected={selectedSuspended?.id === item.id}
                  onClick={() => setSelectedSuspended(item)}
                >
                  <strong>{item.categorias?.nombre || 'Categoría'}</strong>
                  <span>{item.fecha}</span>
                  <small>{item.motivo_cancelacion || 'Sin motivo informado'}</small>
                </button>
              ))}
              {!suspended.length && <div className="attendance-empty-state">No hay suspensiones pendientes en esta rama.</div>}
            </div>
          </article>

          <article className="attendance-panel">
            <div className="attendance-section-heading">
              <p>NUEVA FECHA</p>
              <h2>Programar recuperación</h2>
            </div>
            {selectedSuspended ? (
              <div className="attendance-reschedule-form">
                <div className="attendance-selected-class">
                  <strong>{selectedSuspended.categorias?.nombre}</strong>
                  <span>Suspendida el {selectedSuspended.fecha}</span>
                </div>
                <label className="attendance-field-block">
                  <span>Fecha</span>
                  <input type="date" value={reschedule.fecha} onChange={(event) => setReschedule({ ...reschedule, fecha: event.target.value })} />
                </label>
                <label className="attendance-field-block">
                  <span>Hora</span>
                  <input type="time" value={reschedule.hora} onChange={(event) => setReschedule({ ...reschedule, hora: event.target.value })} />
                </label>
                <label className="attendance-field-block">
                  <span>Lugar</span>
                  <input value={reschedule.lugar} onChange={(event) => setReschedule({ ...reschedule, lugar: event.target.value })} placeholder="Lugar" />
                </label>
                <button className="attendance-primary-button" onClick={() => void rescheduleClass()}>Reagendar y notificar</button>
              </div>
            ) : (
              <div className="attendance-empty-state">Selecciona una clase suspendida para asignar una nueva fecha.</div>
            )}
          </article>
        </section>
      )}

      {tab === 'reportes' && (
        <section className="attendance-dashboard">
          <article className="attendance-panel attendance-dashboard-overview">
            <div className="attendance-dashboard-toolbar">
              <div className="attendance-section-heading">
                <p>MÉTRICAS DE {branch?.nombre || 'LA RAMA'}</p>
                <h2>Asistencia mensual</h2>
              </div>
              <div className="attendance-dashboard-period">
                <label className="attendance-field-block">
                  <span>Mes</span>
                  <select value={month} onChange={(event) => setMonth(event.target.value)}>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{String(i + 1).padStart(2, '0')}</option>
                    ))}
                  </select>
                </label>
                <label className="attendance-field-block">
                  <span>Año</span>
                  <input value={year} onChange={(event) => setYear(event.target.value)} />
                </label>
                <button type="button" className="attendance-dark-button" onClick={exportExcel}>Excel</button>
              </div>
            </div>

            {metrics && (
              <div className="attendance-kpi-grid">
                <div className="attendance-kpi"><span>Clases</span><strong>{metrics.global.totalClases}</strong></div>
                <div className="attendance-kpi" data-accent="lime"><span>Asistencia</span><strong>{metrics.global.porcentajeGlobal}%</strong></div>
                <div className="attendance-kpi"><span>Canceladas</span><strong>{metrics.global.canceladas}</strong></div>
                <div className="attendance-kpi"><span>Recuperativas</span><strong>{metrics.global.recuperativas}</strong></div>
              </div>
            )}
          </article>

          <div className="attendance-two-column">
            <article className="attendance-panel">
              <div className="attendance-section-heading">
                <p>DETALLE</p>
                <h2>Por categoría</h2>
              </div>
              <div className="attendance-category-metrics">
                {metrics?.categorias.map((item) => (
                  <div key={item.nombre}>
                    <span>{item.nombre}</span>
                    <strong>{item.porcentaje}%</strong>
                  </div>
                ))}
                {!metrics?.categorias?.length && <div className="attendance-empty-state">No hay datos de categorías para este período.</div>}
              </div>
            </article>

            <article className="attendance-panel">
              <div className="attendance-section-heading">
                <p>FAMILIAS</p>
                <h2>Reporte mensual</h2>
                <span>Envía el resumen individual de una categoría a sus apoderados.</span>
              </div>
              <div className="attendance-report-form">
                <label className="attendance-field-block">
                  <span>Categoría</span>
                  <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                    <option value="">Selecciona categoría</option>
                    {categories.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                  </select>
                </label>
                <button className="attendance-primary-button" onClick={() => void sendReport()}>Enviar reporte mensual</button>
              </div>
            </article>
          </div>
        </section>
      )}
    </div>
  );
}
