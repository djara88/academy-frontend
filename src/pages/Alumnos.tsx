import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  BanknotesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  SparklesIcon,
  TrophyIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import api from '../api/axiosConfig';
import EvaluationCriteriaEditor from '../components/EvaluationCriteriaEditor';
import RecognitionCatalogEditor, { type RecognitionDefinition } from '../components/RecognitionCatalogEditor';
import EnrollmentCategoryManager from '../components/EnrollmentCategoryManager';
import RosterStrip, { type RosterStripPlayer } from '../components/roster/RosterStrip';

type Branch = { id: string; nombre: string; disciplina: string };
type Site = { id: string; nombre: string };
type Category = { id: string; nombre: string };
type Enrollment = {
  id: string;
  sede_id: string;
  rama_id: string;
  categoria_id?: string | null;
  estado: string;
  fecha_inicio: string;
  fecha_fin?: string | null;
  es_principal: boolean;
  monto_matricula: number;
  monto_mensualidad: number;
  rol_especialidad?: string | null;
  sede?: Site | null;
  rama?: Branch | null;
  categoria?: Category | null;
};
type Student = {
  id: string;
  nombre: string;
  documento?: string | null;
  rut?: string | null;
  fecha_nacimiento?: string | null;
  foto_base64?: string | null;
  foto_url?: string | null;
  avatar_url?: string | null;
  estado_financiero?: string | null;
  alerta_medica?: string | null;
  telefono_emergencia?: string | null;
  reconocimientos_total?: number;
  inscripciones: Enrollment[];
};
type Evaluation = {
  id: string;
  datos_radar: Record<string, number>;
  comentarios_profesor?: string | null;
  created_at: string;
  fecha_evaluacion?: string | null;
  perfil_evaluacion?: string | null;
  metricas_version?: number | null;
};
type EvaluationProfile = {
  code: string;
  label: string;
  icon?: string;
  roleLabel?: string;
  metrics: string[];
  profileCode: string;
  metricVersion: number;
  custom?: boolean;
  customization?: { allowed: boolean; active: boolean; version?: number | null };
};
type CompetitiveMetric = { code: string; label: string; value: number; unit?: string | null; decimals?: number };
type CompetitiveStats = {
  code: string;
  label: string;
  icon: string;
  activityLabel: string;
  participations: number;
  mvp: number;
  metrics: CompetitiveMetric[];
};
type Attendance = { total: number; presente: number; ausente: number; justificado: number; porcentaje: number | null };
type Award = {
  id: string;
  codigo?: string;
  nombre: string;
  emoji?: string;
  ambito?: string;
  descripcion?: string | null;
  origen?: string;
  rama_id?: string | null;
  fecha?: string | null;
};
type RecognitionCatalog = {
  standard: RecognitionDefinition[];
  custom: RecognitionDefinition[];
  all: RecognitionDefinition[];
  customization: { allowed: boolean; active: boolean; maxItems?: number };
};
type StudentProfilePayload = {
  alumno: Student & { posicion_cancha?: string | null };
  inscripciones: Enrollment[];
  inscripcion: Enrollment | null;
  perfil_evaluacion: EvaluationProfile | null;
  evaluaciones: Evaluation[];
  promedio_categoria: { metrics: Record<string, number>; sample_size: number };
  estadisticas_competitivas: CompetitiveStats | null;
  asistencia: Attendance;
  reconocimientos: {
    catalogo: RecognitionCatalog;
    otorgados: Award[];
    historicos_globales: Award[];
  };
  plan: { code: string; name: string; trial?: boolean };
};

type CompareMode = 'anterior' | 'categoria';

const panel = 'rounded-[26px] border border-white/10 bg-[#151b25]';
const field = 'w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#289E9D]';

const ageFrom = (date?: string | null) => {
  if (!date) return null;
  const birth = new Date(`${date}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const delta = now.getMonth() - birth.getMonth();
  if (delta < 0 || (delta === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
};

const money = (value: number) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString('es-CL') : 'Histórico';
const photoOf = (student: Student) => student.foto_url || student.avatar_url || student.foto_base64 || null;

const chooseDefaultBranch = (student: Student) => student.inscripciones.find((item) => item.estado === 'Activa' && item.es_principal)?.rama_id
  || student.inscripciones.find((item) => item.estado === 'Activa')?.rama_id
  || student.inscripciones[0]?.rama_id
  || '';

const formatCompetitiveValue = (metric: CompetitiveMetric) => {
  const decimals = Number.isInteger(metric.decimals) ? Number(metric.decimals) : 0;
  return `${Number(metric.value || 0).toLocaleString('es-CL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${metric.unit ? ` ${metric.unit}` : ''}`;
};

export default function Alumnos() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState('Todas');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [compareMode, setCompareMode] = useState<CompareMode>('anterior');
  const [evaluationOpen, setEvaluationOpen] = useState(false);
  const [evaluationValues, setEvaluationValues] = useState<Record<string, number>>({});
  const [evaluationComment, setEvaluationComment] = useState('');
  const [criteriaEditorOpen, setCriteriaEditorOpen] = useState(false);
  const [recognitionEditorOpen, setRecognitionEditorOpen] = useState(false);
  const [roleDraft, setRoleDraft] = useState('');
  const [medicalDraft, setMedicalDraft] = useState({ alerta_medica: '', telefono_emergencia: '' });
  const [notice, setNotice] = useState('');

  const studentsQuery = useQuery({
    queryKey: ['alumnos-multirrama'],
    queryFn: async () => (await api.get('/api/alumnos')).data.data as Student[],
  });

  const profileQuery = useQuery({
    queryKey: ['alumno-perfil', selectedStudentId, selectedBranchId],
    enabled: Boolean(selectedStudentId),
    queryFn: async () => (await api.get(`/api/alumnos/${selectedStudentId}/perfil`, {
      params: selectedBranchId ? { rama_id: selectedBranchId } : undefined,
    })).data.data as StudentProfilePayload,
  });

  const selectedListStudent = useMemo(
    () => (studentsQuery.data || []).find((student) => student.id === selectedStudentId) || null,
    [studentsQuery.data, selectedStudentId],
  );
  const detail = profileQuery.data;
  const enrollment = detail?.inscripcion || null;
  const evaluationProfile = detail?.perfil_evaluacion || null;

  useEffect(() => {
    if (!detail) return;
    setRoleDraft(detail.inscripcion?.rol_especialidad || '');
    setMedicalDraft({
      alerta_medica: detail.alumno.alerta_medica || '',
      telefono_emergencia: detail.alumno.telefono_emergencia || '',
    });
  }, [detail?.alumno.id, detail?.inscripcion?.rama_id, detail?.inscripcion?.rol_especialidad, detail?.alumno.alerta_medica, detail?.alumno.telefono_emergencia]);

  const disciplines = useMemo(() => {
    const names = new Set<string>();
    for (const student of studentsQuery.data || []) for (const item of student.inscripciones) if (item.rama?.disciplina) names.add(item.rama.disciplina);
    return [...names].sort((a, b) => a.localeCompare(b, 'es'));
  }, [studentsQuery.data]);

  const categories = useMemo(() => {
    const names = new Set<string>();
    for (const student of studentsQuery.data || []) {
      for (const item of student.inscripciones) {
        if (!item.categoria?.nombre) continue;
        if (disciplineFilter !== 'Todas' && item.rama?.disciplina !== disciplineFilter) continue;
        names.add(item.categoria.nombre);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'es'));
  }, [studentsQuery.data, disciplineFilter]);

  const filteredStudents = useMemo(() => {
    const text = search.trim().toLowerCase();
    return (studentsQuery.data || []).filter((student) => {
      const matchesText = !text || student.nombre.toLowerCase().includes(text) || String(student.documento || student.rut || '').toLowerCase().includes(text);
      const matchesContext = student.inscripciones.some((item) => {
        const matchesDiscipline = disciplineFilter === 'Todas' || item.rama?.disciplina === disciplineFilter;
        const matchesCategory = categoryFilter === 'Todas' || item.categoria?.nombre === categoryFilter;
        return matchesDiscipline && matchesCategory;
      });
      return matchesText && matchesContext;
    });
  }, [studentsQuery.data, search, disciplineFilter, categoryFilter]);

  const rosterPlayers = useMemo<RosterStripPlayer[]>(() => filteredStudents.map((student) => ({
    id: student.id,
    name: student.nombre,
    document: student.documento || student.rut,
    age: ageFrom(student.fecha_nacimiento),
    photo: photoOf(student),
    medicalAlert: student.alerta_medica,
    financialState: student.estado_financiero,
    recognitionCount: student.reconocimientos_total || 0,
    enrollments: student.inscripciones
      .filter((item) => item.estado === 'Activa')
      .map((item) => ({
        id: item.id,
        discipline: item.rama?.disciplina || item.rama?.nombre || 'Disciplina',
        category: item.categoria?.nombre,
        primary: item.es_principal,
      })),
  })), [filteredStudents]);

  const rosterTitle = categoryFilter !== 'Todas'
    ? categoryFilter
    : disciplineFilter !== 'Todas'
      ? disciplineFilter
      : 'Plantel general';
  const rosterContext = categoryFilter !== 'Todas'
    ? `${disciplineFilter !== 'Todas' ? disciplineFilter : 'Todas las disciplinas'} · categoría ${categoryFilter}`
    : disciplineFilter !== 'Todas'
      ? `${disciplineFilter} · todas las categorías`
      : 'Todos los deportistas activos y su contexto multideporte';

  const compatibleEvaluations = useMemo(() => {
    if (!evaluationProfile || !detail) return [];
    return detail.evaluaciones.filter((evaluation) => {
      const hasMetrics = evaluationProfile.metrics.every((metric) => Number.isFinite(Number(evaluation.datos_radar?.[metric])));
      if (!hasMetrics) return false;
      if (!evaluation.perfil_evaluacion) return true;
      return evaluation.perfil_evaluacion === evaluationProfile.profileCode
        && Number(evaluation.metricas_version || 1) === Number(evaluationProfile.metricVersion);
    });
  }, [detail, evaluationProfile]);

  const currentEvaluation = compatibleEvaluations[0] || null;
  const previousEvaluation = compatibleEvaluations[1] || null;
  const radarData = useMemo(() => {
    if (!evaluationProfile) return [];
    const comparison = compareMode === 'anterior' ? previousEvaluation?.datos_radar : detail?.promedio_categoria.metrics;
    return evaluationProfile.metrics.map((metric) => ({
      habilidad: metric,
      Actual: Number(currentEvaluation?.datos_radar?.[metric] || 0),
      Comparativa: Number(comparison?.[metric] || 0),
      fullMark: 100,
    }));
  }, [evaluationProfile, currentEvaluation, previousEvaluation, detail?.promedio_categoria.metrics, compareMode]);

  const selectStudent = (student: Student) => {
    setNotice('');
    setSelectedStudentId(student.id);
    setSelectedBranchId(chooseDefaultBranch(student));
    setCompareMode('anterior');
  };

  const selectRosterPlayer = (playerId: string) => {
    const student = (studentsQuery.data || []).find((item) => item.id === playerId);
    if (student) selectStudent(student);
  };

  const refreshDetail = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['alumno-perfil', selectedStudentId] }),
      queryClient.invalidateQueries({ queryKey: ['alumnos-multirrama'] }),
    ]);
  };

  const roleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudentId || !selectedBranchId) return;
      await api.patch(`/api/alumnos/${selectedStudentId}/ramas/${selectedBranchId}`, { rol_especialidad: roleDraft });
    },
    onSuccess: async () => { setNotice('Rol o especialidad actualizado para esta disciplina.'); await refreshDetail(); },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { error?: string } } };
      setNotice(apiError.response?.data?.error || 'No fue posible actualizar la especialidad.');
    },
  });

  const medicalMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudentId) return;
      await api.put(`/api/jugadores/${selectedStudentId}/datos-rapidos`, medicalDraft);
    },
    onSuccess: async () => { setNotice('Datos de emergencia actualizados.'); await refreshDetail(); },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { error?: string } } };
      setNotice(apiError.response?.data?.error || 'No fue posible actualizar los datos de emergencia.');
    },
  });

  const evaluationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudentId || !selectedBranchId) return;
      await api.post(`/api/alumnos/${selectedStudentId}/evaluaciones`, {
        rama_id: selectedBranchId,
        datos_radar: evaluationValues,
        comentarios_profesor: evaluationComment,
      });
    },
    onSuccess: async () => {
      setEvaluationOpen(false);
      setNotice('Evaluación guardada en la disciplina seleccionada.');
      await refreshDetail();
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { error?: string } } };
      setNotice(apiError.response?.data?.error || 'No fue posible guardar la evaluación.');
    },
  });

  const recognitionMutation = useMutation({
    mutationFn: async (recognitionCode: string) => {
      if (!selectedStudentId || !selectedBranchId) return;
      await api.post(`/api/alumnos/${selectedStudentId}/reconocimientos`, { rama_id: selectedBranchId, recognition_code: recognitionCode });
    },
    onSuccess: async () => { setNotice('Reconocimiento otorgado al alumno en esta disciplina.'); await refreshDetail(); },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { error?: string } } };
      setNotice(apiError.response?.data?.error || 'No fue posible otorgar el reconocimiento.');
    },
  });

  const removeRecognitionMutation = useMutation({
    mutationFn: async (awardId: string) => {
      if (!selectedStudentId) return;
      await api.delete(`/api/alumnos/${selectedStudentId}/reconocimientos/${awardId}`);
    },
    onSuccess: async () => { setNotice('Reconocimiento retirado.'); await refreshDetail(); },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { error?: string } } };
      setNotice(apiError.response?.data?.error || 'No fue posible retirar el reconocimiento.');
    },
  });

  const openEvaluation = () => {
    if (!evaluationProfile) return;
    const values = Object.fromEntries(evaluationProfile.metrics.map((metric) => [metric, Number(currentEvaluation?.datos_radar?.[metric] ?? 50)]));
    setEvaluationValues(values);
    setEvaluationComment('');
    setEvaluationOpen(true);
  };

  if (studentsQuery.isLoading) return <div className="grid min-h-[50vh] place-items-center" role="status"><div className="text-center"><div aria-hidden="true" className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[var(--ls-line)] border-t-[var(--ls-accent-strong)]"/><p className="mt-3 text-sm font-black text-[var(--ls-muted)]">Preparando el plantel…</p></div></div>;
  if (studentsQuery.isError) return <section className="rounded-[var(--ls-radius-lg)] border border-[var(--ls-line)] bg-[var(--ls-surface)] p-7 text-center"><ExclamationTriangleIcon aria-hidden="true" className="mx-auto h-8 w-8 text-[var(--ls-danger)]"/><h1 className="mt-3 text-xl font-black text-[var(--ls-ink)]">No pudimos abrir el plantel</h1><p className="mt-2 text-sm text-[var(--ls-muted)]">No mostraremos una lista anterior como si estuviera actualizada.</p><button type="button" onClick={() => void studentsQuery.refetch()} className="mt-4 min-h-11 rounded-xl bg-[var(--ls-ink)] px-5 text-sm font-black text-white">Reintentar</button></section>;

  if (!selectedStudentId) {
    return <main className="mx-auto max-w-[1440px] space-y-5 pb-16" aria-labelledby="roster-page-title">
      <section className="overflow-hidden rounded-[var(--ls-radius-lg)] border border-[var(--ls-line)] bg-[var(--ls-sidebar)] text-white shadow-[var(--ls-shadow-strong)]">
        <div className="border-l-[6px] border-l-[var(--ls-accent)] px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--ls-accent-on-dark)]">Plantel · vista operativa</p>
              <h1 id="roster-page-title" className="mt-2 text-3xl font-black tracking-[-.04em] text-white sm:text-4xl">Roster de la academia</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">Trabaja con deportistas dentro de su disciplina y categoría. La ficha personal sigue siendo única; el contexto deportivo cambia con cada rama sin duplicar al alumno.</p>
            </div>
            <Link to="/inscripciones" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--ls-accent)] px-5 text-sm font-black text-[var(--ls-ink)] hover:bg-[var(--ls-accent-strong)]"><PlusCircleIcon aria-hidden="true" className="h-5 w-5"/>Inscribir deportista</Link>
          </div>
        </div>
      </section>

      <section className="rounded-[var(--ls-radius-lg)] border border-[var(--ls-line)] bg-[var(--ls-surface)] p-4 shadow-[var(--ls-shadow)] sm:p-5" aria-label="Contexto del plantel">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px_auto] lg:items-end">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.1em] text-[var(--ls-muted)]">Buscar deportista</span>
            <span className="relative block"><MagnifyingGlassIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-[var(--ls-muted)]"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o documento" className="min-h-11 w-full rounded-xl border border-[var(--ls-line-strong)] bg-[var(--ls-surface)] pl-10 pr-3 text-sm font-semibold text-[var(--ls-ink)]"/></span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.1em] text-[var(--ls-muted)]">Disciplina</span>
            <select value={disciplineFilter} onChange={(event) => { setDisciplineFilter(event.target.value); setCategoryFilter('Todas'); }} className="min-h-11 w-full rounded-xl border border-[var(--ls-line-strong)] bg-[var(--ls-surface)] px-3 text-sm font-black text-[var(--ls-ink)]"><option>Todas</option>{disciplines.map((discipline) => <option key={discipline}>{discipline}</option>)}</select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.1em] text-[var(--ls-muted)]">Categoría</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--ls-line-strong)] bg-[var(--ls-surface)] px-3 text-sm font-black text-[var(--ls-ink)]"><option>Todas</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
          </label>
          <div className="flex min-h-11 items-center justify-center border-l-2 border-[var(--ls-accent)] px-4 text-sm font-black text-[var(--ls-ink)] lg:justify-start">{filteredStudents.length} en esta vista</div>
        </div>
      </section>

      <RosterStrip title={rosterTitle} context={rosterContext} players={rosterPlayers} onSelect={selectRosterPlayer} />
    </main>;
  }

  if (profileQuery.isLoading || !detail || !selectedListStudent) return <div className="grid min-h-[50vh] place-items-center"><div className="flex items-center gap-3 text-sm font-bold text-[#70e4df]"><ArrowPathIcon className="h-5 w-5 animate-spin"/>Cargando ficha del alumno...</div></div>;

  const photo = photoOf(detail.alumno);
  const age = ageFrom(detail.alumno.fecha_nacimiento);
  const activeEnrollments = detail.inscripciones.filter((item) => item.estado === 'Activa');
  const recognitionCatalog = detail.reconocimientos.catalogo;
  const formationRecognitions = recognitionCatalog.all.filter((item) => item.kind === 'formacion');
  const competitionRecognitions = recognitionCatalog.all.filter((item) => item.kind === 'competencia');
  const stats = detail.estadisticas_competitivas;
  const branchForEditors = enrollment?.rama ? { id: enrollment.rama.id, nombre: enrollment.rama.nombre, disciplina: enrollment.rama.disciplina } : null;
  const displayRole = enrollment?.rol_especialidad?.trim() || detail.alumno.posicion_cancha?.trim() || '';

  return <div className="mx-auto max-w-7xl space-y-6 pb-20">
    <div className="flex flex-wrap items-center justify-between gap-3"><button onClick={() => { setSelectedStudentId(''); setSelectedBranchId(''); setNotice(''); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#151b25] px-4 text-sm font-black text-[#c5ced8] hover:border-[#289E9D]/35 hover:text-white"><ArrowLeftIcon className="h-4 w-4"/>Volver a alumnos</button><Link to="/inscripciones" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#289E9D]/30 bg-[#289E9D]/10 px-4 text-sm font-black text-[#70e4df]"><PlusCircleIcon className="h-5 w-5"/>Agregar disciplina</Link></div>

    {notice ? <div className="rounded-2xl border border-[#289E9D]/25 bg-[#289E9D]/10 px-4 py-3 text-sm font-bold text-[#c7fffb]">{notice}</div> : null}

    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.14),transparent_35%),#151b25] p-5 sm:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        {photo ? <img src={photo} alt="" className="h-28 w-28 shrink-0 rounded-[26px] border-2 border-[#289E9D]/60 object-cover shadow-xl"/> : <div className="grid h-28 w-28 shrink-0 place-items-center rounded-[26px] border-2 border-[#289E9D]/40 bg-[#289E9D]/10 text-4xl font-black text-[#70e4df]">{detail.alumno.nombre.slice(0, 1).toUpperCase()}</div>}
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#289E9D]/25 bg-[#289E9D]/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#70e4df]">Alumno</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#9aa6b5]">Plan {detail.plan.name}</span>{detail.plan.trial ? <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase text-violet-300">Prueba Full</span> : null}</div><h1 className="mt-3 truncate text-3xl font-black text-white sm:text-4xl">{detail.alumno.nombre}</h1><p className="mt-2 text-sm text-[#8995a4]">{detail.alumno.documento || detail.alumno.rut || 'Sin documento'}{age !== null ? ` · ${age} años` : ''}</p>
          {displayRole ? <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-xl border border-[#289E9D]/25 bg-[#289E9D]/10 px-3 py-2 text-xs"><UserCircleIcon className="h-4 w-4 shrink-0 text-[#70e4df]"/><span className="shrink-0 font-black uppercase tracking-wide text-[#70e4df]">Posición</span><span className="truncate font-black text-white">{displayRole}</span></div> : null}
          <div className="mt-4 flex flex-wrap gap-2">{activeEnrollments.map((item) => <button key={item.id} onClick={() => { setSelectedBranchId(item.rama_id); setCompareMode('anterior'); setNotice(''); }} className={`rounded-xl border px-3 py-2 text-xs font-black transition ${selectedBranchId === item.rama_id ? 'border-violet-400/45 bg-violet-500/20 text-violet-100' : 'border-white/10 bg-[#0d1117] text-[#9aa6b5] hover:border-violet-400/30 hover:text-white'}`}>{item.rama?.disciplina || item.rama?.nombre || 'Disciplina'}{item.categoria?.nombre ? ` · ${item.categoria.nombre}` : ''}</button>)}</div>
        </div>
        <div className="grid min-w-[230px] grid-cols-2 gap-2 text-center"><div className="rounded-2xl border border-white/10 bg-[#0d1117] p-3"><p className="text-[10px] font-black uppercase text-[#697586]">Disciplinas activas</p><p className="mt-1 text-2xl font-black text-white">{activeEnrollments.length}</p></div><div className="rounded-2xl border border-[#C8A96B]/20 bg-[#C8A96B]/[.07] p-3"><p className="text-[10px] font-black uppercase text-[#8f8063]">Medallas</p><p className="mt-1 text-2xl font-black text-[#D8BE87]">{detail.reconocimientos.otorgados.length}</p></div></div>
      </div>
    </section>

    {!enrollment || !evaluationProfile ? <section className={`${panel} p-8 text-center`}><AcademicCapIcon className="mx-auto h-10 w-10 text-[#70e4df]"/><h2 className="mt-3 text-xl font-black text-white">Este alumno aún no tiene una rama deportiva</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#8995a4]">La ficha personal ya existe. Solo debes crear una inscripción deportiva para activar radar, estadísticas, asistencia y reconocimientos por disciplina.</p><Link to="/inscripciones" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#289E9D] px-5 font-black text-white"><PlusCircleIcon className="h-5 w-5"/>Crear inscripción deportiva</Link></section> : <>
      <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className={`${panel} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-violet-300">Disciplina seleccionada</p><h2 className="mt-1 text-2xl font-black text-white">{enrollment.rama?.disciplina || evaluationProfile.label}</h2><p className="mt-1 text-sm text-[#8995a4]">{enrollment.rama?.nombre}{enrollment.sede?.nombre ? ` · ${enrollment.sede.nombre}` : ''}{enrollment.categoria?.nombre ? ` · ${enrollment.categoria.nombre}` : ''}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${enrollment.estado === 'Activa' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'}`}>{enrollment.estado}</span></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-[#0d1117] p-4"><p className="text-[10px] font-black uppercase text-[#697586]">Inicio</p><p className="mt-1 font-black text-white">{dateLabel(enrollment.fecha_inicio)}</p></div><div className="rounded-2xl border border-white/10 bg-[#0d1117] p-4"><p className="text-[10px] font-black uppercase text-[#697586]">Mensualidad</p><p className="mt-1 font-black text-emerald-300">{money(enrollment.monto_mensualidad)}</p></div><div className="rounded-2xl border border-white/10 bg-[#0d1117] p-4"><p className="text-[10px] font-black uppercase text-[#697586]">Categoría</p><p className="mt-1 truncate font-black text-white">{enrollment.categoria?.nombre || 'Sin categoría'}</p></div></div>
          <EnrollmentCategoryManager
            studentId={selectedStudentId}
            branchId={enrollment.rama_id}
            branchLabel={enrollment.rama?.nombre || enrollment.rama?.disciplina || 'esta rama'}
            currentCategoryId={enrollment.categoria_id}
            currentCategoryName={enrollment.categoria?.nombre}
            disabled={enrollment.estado !== 'Activa'}
            onSaved={refreshDetail}
            onNotice={setNotice}
          />
          <div className="mt-5 border-t border-white/10 pt-5"><div className="flex items-center gap-2"><UserCircleIcon className="h-5 w-5 text-[#70e4df]"/><p className="font-black text-white">Rol / posición / especialidad en esta rama</p></div><p className="mt-1 text-xs leading-5 text-[#7f8c9c]">Este dato es independiente por disciplina. Ej.: Arquero, Base, Kata, Kumite, Velocista, Libero.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={roleDraft} onChange={(event) => setRoleDraft(event.target.value)} maxLength={120} placeholder={`Especialidad en ${enrollment.rama?.disciplina || 'esta rama'}`} className={field}/><button disabled={roleMutation.isPending} onClick={() => roleMutation.mutate()} className="min-h-11 shrink-0 rounded-xl bg-[#289E9D] px-4 text-sm font-black text-white disabled:opacity-50">{roleMutation.isPending ? 'Guardando...' : 'Guardar especialidad'}</button></div></div>
        </div>

        <div className={`${panel} p-5 sm:p-6`}><div className="flex items-center gap-2"><ExclamationTriangleIcon className="h-5 w-5 text-amber-300"/><h2 className="font-black text-white">Información de emergencia</h2></div><p className="mt-1 text-xs leading-5 text-[#7f8c9c]">Información personal transversal al alumno, no depende de la disciplina.</p><label className="mt-4 block text-xs font-bold text-[#9aa6b5]">Alerta médica<input maxLength={300} value={medicalDraft.alerta_medica} onChange={(event) => setMedicalDraft((current) => ({ ...current, alerta_medica: event.target.value }))} className={`${field} mt-2`} placeholder="Ej.: asma, alergia severa"/></label><label className="mt-3 block text-xs font-bold text-[#9aa6b5]">Teléfono de emergencia<input type="tel" maxLength={40} value={medicalDraft.telefono_emergencia} onChange={(event) => setMedicalDraft((current) => ({ ...current, telefono_emergencia: event.target.value }))} className={`${field} mt-2`} placeholder="+56 9 ..."/></label><button disabled={medicalMutation.isPending} onClick={() => medicalMutation.mutate()} className="mt-4 min-h-11 w-full rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 text-sm font-black text-amber-200 disabled:opacity-50">{medicalMutation.isPending ? 'Guardando...' : 'Guardar emergencia'}</button></div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className={`${panel} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><ChartBarIcon className="h-6 w-6 text-[#70e4df]"/><h2 className="text-xl font-black text-white">Radar de aptitudes</h2></div><p className="mt-1 text-xs font-bold text-[#70e4df]">{evaluationProfile.label} · {evaluationProfile.metrics.length} criterios</p></div><div className="flex flex-wrap gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${evaluationProfile.customization?.active ? 'border-violet-400/25 bg-violet-500/10 text-violet-300' : 'border-white/10 bg-white/5 text-[#9aa6b5]'}`}>{evaluationProfile.customization?.active ? `Personalizado v${evaluationProfile.metricVersion}` : 'Estándar Lestra'}</span>{evaluationProfile.customization?.allowed && branchForEditors ? <button onClick={() => setCriteriaEditorOpen(true)} className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-violet-300">Configurar radar</button> : null}</div></div>

          <div className="mt-4 flex rounded-xl border border-white/10 bg-[#0d1117] p-1 text-xs"><button onClick={() => setCompareMode('anterior')} className={`flex-1 rounded-lg px-3 py-2 font-black ${compareMode === 'anterior' ? 'bg-[#289E9D] text-white' : 'text-[#7f8c9c]'}`}>Vs evaluación anterior</button><button onClick={() => setCompareMode('categoria')} className={`flex-1 rounded-lg px-3 py-2 font-black ${compareMode === 'categoria' ? 'bg-[#289E9D] text-white' : 'text-[#7f8c9c]'}`}>Vs categoría ({detail.promedio_categoria.sample_size})</button></div>

          <div className="relative mt-4 h-[360px] w-full"><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}><PolarGrid stroke="#30363d"/><PolarAngleAxis dataKey="habilidad" tick={{ fill: '#aab4c1', fontSize: 11 }}/><PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#596575', fontSize: 10 }}/><Tooltip contentStyle={{ backgroundColor: '#151b25', borderColor: '#30363d', borderRadius: 12, color: '#fff' }}/><Legend/><Radar name="Actual" dataKey="Actual" stroke="#48d8d0" fill="#289E9D" fillOpacity={0.48}/><Radar name={compareMode === 'anterior' ? 'Anterior' : 'Promedio categoría'} dataKey="Comparativa" stroke="#a78bfa" fill="#8b5cf6" fillOpacity={0.16} strokeDasharray="4 4"/></RadarChart></ResponsiveContainer>{!currentEvaluation ? <div className="pointer-events-none absolute inset-x-6 bottom-5 rounded-xl border border-[#289E9D]/20 bg-[#0d1117]/90 px-4 py-3 text-center text-xs leading-5 text-[#9aa6b5]">Las aptitudes de <strong className="text-[#70e4df]">{evaluationProfile.label}</strong> ya están creadas. Registra la primera evaluación para dibujar el perfil del alumno.</div> : null}</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{evaluationProfile.metrics.map((metric) => <div key={metric} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0d1117] px-3 py-2"><span className="text-xs font-bold text-[#aab4c1]">{metric}</span><span className="text-sm font-black text-[#70e4df]">{currentEvaluation ? `${Math.round(Number(currentEvaluation.datos_radar[metric] || 0))}/100` : 'Pendiente'}</span></div>)}</div>
          <button disabled={enrollment.estado !== 'Activa'} onClick={openEvaluation} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#289E9D] px-5 text-sm font-black text-white disabled:opacity-40"><ClipboardDocumentCheckIcon className="h-5 w-5"/>{currentEvaluation ? 'Registrar nueva evaluación' : 'Realizar primera evaluación'}</button>
          {!evaluationProfile.customization?.allowed ? <p className="mt-3 text-center text-[11px] leading-5 text-[#697586]">Formación utiliza un radar estándar específico para cada disciplina. La personalización de criterios está disponible desde Competencia.</p> : null}
        </div>

        <div className="space-y-5">
          <div className={`${panel} p-5 sm:p-6`}><div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><TrophyIcon className="h-6 w-6 text-[#D8BE87]"/><h2 className="text-xl font-black text-white">Rendimiento competitivo</h2></div><p className="mt-1 text-xs text-[#7f8c9c]">Solo resultados de {enrollment.rama?.disciplina || stats?.label || 'esta disciplina'}.</p></div><span className="text-2xl">{stats?.icon || '🏅'}</span></div>{stats ? <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3"><div className="rounded-xl border border-white/10 bg-[#0d1117] p-3 text-center"><p className="text-[10px] font-black uppercase text-[#697586]">{stats.activityLabel}s</p><p className="mt-1 text-xl font-black text-white">{stats.participations}</p></div><div className="rounded-xl border border-[#C8A96B]/20 bg-[#C8A96B]/[.06] p-3 text-center"><p className="text-[10px] font-black uppercase text-[#8f8063]">Destacado/a</p><p className="mt-1 text-xl font-black text-[#D8BE87]">{stats.mvp}</p></div>{stats.metrics.map((metric) => <div key={metric.code} className="rounded-xl border border-white/10 bg-[#0d1117] p-3 text-center"><p className="text-[10px] font-black uppercase text-[#697586]">{metric.label}</p><p className="mt-1 text-lg font-black text-white">{formatCompetitiveValue(metric)}</p></div>)}</div> : <p className="mt-4 text-sm text-[#697586]">Aún no hay actividad competitiva registrada.</p>}</div>

          <div className={`${panel} p-5 sm:p-6`}><div className="flex items-center gap-2"><CheckCircleIcon className="h-6 w-6 text-emerald-300"/><h2 className="text-xl font-black text-white">Asistencia en esta rama</h2></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-xl border border-white/10 bg-[#0d1117] p-3 text-center"><p className="text-[10px] uppercase text-[#697586]">Total</p><p className="mt-1 text-xl font-black text-white">{detail.asistencia.total}</p></div><div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-center"><p className="text-[10px] uppercase text-emerald-300">Presente</p><p className="mt-1 text-xl font-black text-emerald-200">{detail.asistencia.presente}</p></div><div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-center"><p className="text-[10px] uppercase text-amber-300">Justificado</p><p className="mt-1 text-xl font-black text-amber-200">{detail.asistencia.justificado}</p></div><div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-center"><p className="text-[10px] uppercase text-red-300">Ausente</p><p className="mt-1 text-xl font-black text-red-200">{detail.asistencia.ausente}</p></div></div><div className="mt-3 rounded-xl border border-white/10 bg-[#0d1117] p-3"><div className="flex justify-between text-xs font-bold text-[#8f9baa]"><span>Cumplimiento</span><span>{detail.asistencia.porcentaje === null ? 'Sin datos' : `${detail.asistencia.porcentaje}%`}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#21262d]"><div className="h-full rounded-full bg-[#289E9D]" style={{ width: `${detail.asistencia.porcentaje || 0}%` }}/></div></div></div>
        </div>
      </section>

      <section className={`${panel} overflow-hidden`}>
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(200,169,107,.13),transparent_36%),#151b25] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><SparklesIcon className="h-6 w-6 text-[#D8BE87]"/><h2 className="text-xl font-black text-white">Reconocimientos y medallas</h2></div><p className="mt-1 max-w-3xl text-sm leading-6 text-[#8995a4]">Catálogo orientado a {enrollment.rama?.disciplina || evaluationProfile.label}: separa desarrollo formativo de logros competitivos. Cada medalla queda vinculada a esta rama.</p></div>{recognitionCatalog.customization.allowed && branchForEditors ? <button onClick={() => setRecognitionEditorOpen(true)} className="rounded-xl border border-[#C8A96B]/30 bg-[#C8A96B]/10 px-4 py-2 text-xs font-black text-[#D8BE87]">Personalizar medallas</button> : <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase text-[#8995a4]">Catálogo estándar · Formación</span>}</div></div>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
          <div><p className="text-xs font-black uppercase tracking-[.15em] text-emerald-300">🌱 Formación y valores</p><div className="mt-3 grid gap-2">{formationRecognitions.map((recognition) => <div key={recognition.code} className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0d1117] p-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-xl">{recognition.emoji}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-black text-white">{recognition.name}</p>{recognition.source === 'academy' ? <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-violet-300">Academia</span> : null}</div><p className="mt-1 text-xs leading-5 text-[#778393]">{recognition.description || 'Reconocimiento formativo.'}</p></div><button disabled={recognitionMutation.isPending} onClick={() => recognitionMutation.mutate(recognition.code)} className="shrink-0 rounded-lg border border-emerald-400/20 px-2.5 py-1.5 text-[10px] font-black text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40">Otorgar</button></div>)}</div></div>
          <div><p className="text-xs font-black uppercase tracking-[.15em] text-[#D8BE87]">🏆 Competencia y logros</p><div className="mt-3 grid gap-2">{competitionRecognitions.map((recognition) => <div key={recognition.code} className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0d1117] p-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#C8A96B]/10 text-xl">{recognition.emoji}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-black text-white">{recognition.name}</p>{recognition.source === 'academy' ? <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-violet-300">Academia</span> : null}</div><p className="mt-1 text-xs leading-5 text-[#778393]">{recognition.description || 'Reconocimiento competitivo.'}</p></div><button disabled={recognitionMutation.isPending} onClick={() => recognitionMutation.mutate(recognition.code)} className="shrink-0 rounded-lg border border-[#C8A96B]/25 px-2.5 py-1.5 text-[10px] font-black text-[#D8BE87] hover:bg-[#C8A96B]/10 disabled:opacity-40">Otorgar</button></div>)}</div></div>
        </div>

        <div className="border-t border-white/10 p-5 sm:p-6"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[.15em] text-[#9aa6b5]">Historial de esta disciplina</p><span className="rounded-full bg-[#0d1117] px-3 py-1 text-[10px] font-black text-[#697586]">{detail.reconocimientos.otorgados.length}</span></div>{detail.reconocimientos.otorgados.length ? <div className="mt-3 grid gap-2 md:grid-cols-2">{detail.reconocimientos.otorgados.map((award) => <div key={award.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1117] p-3"><span className="text-2xl">{award.emoji || '🏅'}</span><div className="min-w-0 flex-1"><p className="truncate font-black text-white">{award.nombre}</p><p className="mt-0.5 text-[10px] uppercase text-[#697586]">{award.ambito || 'reconocimiento'} · {dateLabel(award.fecha)}</p></div><button disabled={removeRecognitionMutation.isPending} onClick={() => removeRecognitionMutation.mutate(award.id)} className="rounded-lg border border-red-400/15 px-2 py-1 text-[10px] font-black text-red-300 hover:bg-red-500/10">Retirar</button></div>)}</div> : <p className="mt-3 text-sm text-[#697586]">Aún no se han otorgado reconocimientos en esta disciplina.</p>}
          {detail.reconocimientos.historicos_globales.length ? <details className="mt-4 rounded-xl border border-white/10 bg-[#0d1117] p-3"><summary className="cursor-pointer text-xs font-black text-[#8995a4]">Reconocimientos históricos anteriores al modelo multirrama ({detail.reconocimientos.historicos_globales.length})</summary><div className="mt-3 flex flex-wrap gap-2">{detail.reconocimientos.historicos_globales.map((award) => <span key={award.id} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#aab4c1]">{award.emoji || '🏅'} {award.nombre}</span>)}</div></details> : null}
        </div>
      </section>

      <section className={`${panel} p-5 sm:p-6`}><div className="flex items-center gap-2"><BanknotesIcon className="h-5 w-5 text-emerald-300"/><h2 className="font-black text-white">Resumen económico de esta inscripción</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/10 bg-[#0d1117] p-4"><p className="text-[10px] uppercase text-[#697586]">Matrícula</p><p className="mt-1 text-lg font-black text-white">{money(enrollment.monto_matricula)}</p></div><div className="rounded-xl border border-white/10 bg-[#0d1117] p-4"><p className="text-[10px] uppercase text-[#697586]">Mensualidad</p><p className="mt-1 text-lg font-black text-emerald-300">{money(enrollment.monto_mensualidad)}</p></div><div className="rounded-xl border border-white/10 bg-[#0d1117] p-4"><p className="text-[10px] uppercase text-[#697586]">Estado global alumno</p><p className={`mt-1 text-lg font-black ${detail.alumno.estado_financiero === 'Al Día' ? 'text-emerald-300' : 'text-amber-300'}`}>{detail.alumno.estado_financiero || 'Sin estado'}</p></div></div></section>
    </>}

    {evaluationOpen && evaluationProfile && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#151b25] p-5 shadow-2xl sm:p-7"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#70e4df]">Evaluación · {evaluationProfile.label}</p><h2 className="mt-1 text-2xl font-black text-white">{currentEvaluation ? 'Nueva evaluación' : 'Primera evaluación'} de {detail.alumno.nombre}</h2><p className="mt-2 text-sm leading-6 text-[#8995a4]">Cada criterio se registra de 0 a 100 y queda asociado exclusivamente a {enrollment?.rama?.nombre || 'esta rama'}.</p></div><div className="mt-6 space-y-4">{evaluationProfile.metrics.map((metric) => <label key={metric} className="block rounded-2xl border border-white/10 bg-[#0d1117] p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-black text-white">{metric}</span><span className="rounded-lg bg-[#289E9D]/15 px-2.5 py-1 text-sm font-black text-[#70e4df]">{evaluationValues[metric] ?? 50}</span></div><input type="range" min="0" max="100" step="1" value={evaluationValues[metric] ?? 50} onChange={(event) => setEvaluationValues((current) => ({ ...current, [metric]: Number(event.target.value) }))} className="mt-3 w-full accent-[#289E9D]"/></label>)}</div><textarea value={evaluationComment} onChange={(event) => setEvaluationComment(event.target.value)} maxLength={3000} placeholder="Observaciones del profesor o dirección..." className={`${field} mt-4 min-h-28 resize-y`}/><div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button onClick={() => setEvaluationOpen(false)} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-black text-[#c3ccd6]">Cancelar</button><button disabled={evaluationMutation.isPending} onClick={() => evaluationMutation.mutate()} className="min-h-11 rounded-xl bg-[#289E9D] px-5 text-sm font-black text-white disabled:opacity-50">{evaluationMutation.isPending ? 'Guardando...' : 'Guardar evaluación'}</button></div></div></div>}

    {criteriaEditorOpen && branchForEditors ? <EvaluationCriteriaEditor branch={branchForEditors} onClose={() => setCriteriaEditorOpen(false)} onSaved={async () => { setCriteriaEditorOpen(false); await refreshDetail(); }} /> : null}
    {recognitionEditorOpen && branchForEditors ? <RecognitionCatalogEditor branch={branchForEditors} initialItems={recognitionCatalog.custom} onClose={() => setRecognitionEditorOpen(false)} onSaved={async () => { await refreshDetail(); }} /> : null}
  </div>;
}
