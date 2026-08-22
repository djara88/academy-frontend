import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRightIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ClockIcon,
  Cog6ToothIcon,
  MapPinIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { Logo } from '../components/Logo';
import SetupTimePicker from '../components/SetupTimePicker';
import SetupFinanceInline from '../components/SetupFinanceInline';

type SetupStep = {
  key: 'identity' | 'structure' | 'operation' | 'finance' | 'rules' | 'team';
  number: string;
  title: string;
  subtitle: string;
  complete: boolean;
  checks: Record<string, boolean>;
};
type Category = { id: string; nombre: string; rama_id: string };
type Branch = { id: string; nombre: string; disciplina: string; categorias: Category[] };
type TrainingSchedule = { dias: string; inicio: string; fin: string };
type Site = {
  id: string;
  nombre: string;
  direccion?: string | null;
  ubicacion_entrenamiento?: string | null;
  dias_entrenamiento?: string | null;
  horarios_entrenamiento?: string | null;
  horarios_config?: TrainingSchedule[] | null;
  operation_complete: boolean;
  ramas: Branch[];
};
type SetupStatus = {
  required: boolean;
  locked: boolean;
  operational: boolean;
  completed_once: boolean;
  progress: number;
  adoption_progress: number;
  completed_at?: string | null;
  setup: {
    billing_choice: boolean | null;
    staff_mode: 'solo' | 'team' | null;
    terms_choice: 'custom' | 'none' | null;
    consent_settings: Record<string, boolean | undefined>;
  };
  academy: { nombre: string; director?: string | null; email?: string | null; terms_configured: boolean };
  structure: { sites: Site[]; primary_branch_id?: string | null };
  finance?: { acepta_efectivo?: boolean; acepta_transferencia?: boolean; acepta_pago_online?: boolean } | null;
  team: { professors_count: number; assigned_professors_count: number };
  optional: Record<string, { complete: boolean; label: string }>;
  steps: SetupStep[];
};

type OperationDraft = { ubicacion_entrenamiento: string; horarios: TrainingSchedule[] };

const emptySchedule = (): TrainingSchedule => ({ dias: '', inicio: '', fin: '' });
const normalizeHour = (hour: string, minute: string) => `${hour.padStart(2, '0')}:${minute}`;
const schedulesFromSite = (site: Site): TrainingSchedule[] => {
  if (Array.isArray(site.horarios_config) && site.horarios_config.length) {
    return site.horarios_config.map((item) => ({
      dias: String(item?.dias || ''),
      inicio: String(item?.inicio || ''),
      fin: String(item?.fin || ''),
    }));
  }

  const legacyDays = String(site.dias_entrenamiento || '').trim();
  const legacyHours = String(site.horarios_entrenamiento || '').trim();
  const match = legacyHours.match(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/);
  if (legacyDays || legacyHours) {
    return [{
      dias: legacyDays,
      inicio: match ? normalizeHour(match[1], match[2]) : '',
      fin: match ? normalizeHour(match[3], match[4]) : '',
    }];
  }
  return [emptySchedule()];
};

const choiceClass = (active: boolean) => active
  ? 'border-[#b9e937] bg-[#b9e937] text-[#11170f] shadow-[0_12px_30px_rgba(185,233,55,.18)]'
  : 'border-[#d6d9cf] bg-[#f7f8f3] text-[#333a31] hover:border-[#aeb5a4]';

const StepBadge = ({ step, active }: { step: SetupStep; active: boolean }) => (
  <div className={`rounded-[22px] border p-3 transition ${step.complete ? 'border-emerald-300/70 bg-emerald-50' : active ? 'border-[#20261f] bg-[#20261f] text-white' : 'border-[#d6d9cf] bg-[#f7f8f3]'}`}>
    <div className="flex items-center gap-3">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-black ${step.complete ? 'bg-emerald-500 text-white' : active ? 'bg-[#b9e937] text-[#11170f]' : 'bg-[#e7e9e1] text-[#596056]'}`}>
        {step.complete ? '✓' : step.number}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black">{step.title}</p>
        <p className={`truncate text-[11px] font-semibold ${active && !step.complete ? 'text-white/60' : 'text-[#747c70]'}`}>{step.subtitle}</p>
      </div>
    </div>
  </div>
);

const SectionHeader = ({ icon: Icon, eyebrow, title, description }: { icon: typeof BuildingOffice2Icon; eyebrow: string; title: string; description: string }) => (
  <div className="flex items-start gap-4">
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#20261f] text-[#b9e937]"><Icon className="h-6 w-6" /></div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#70786d]">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black tracking-tight text-[#172018] sm:text-2xl">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-[#667064]">{description}</p>
    </div>
  </div>
);

export default function AcademySetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, string>>({});
  const [operationDrafts, setOperationDrafts] = useState<Record<string, OperationDraft>>({});
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState('');

  const setupQuery = useQuery({
    queryKey: ['academy-setup'],
    queryFn: async () => (await api.get('/api/consentimientos/setup')).data.data as SetupStatus,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const status = setupQuery.data;

  useEffect(() => {
    if (!status?.structure?.sites) return;
    const next: Record<string, OperationDraft> = {};
    for (const site of status.structure.sites) {
      next[site.id] = {
        ubicacion_entrenamiento: site.ubicacion_entrenamiento || site.direccion || '',
        horarios: schedulesFromSite(site),
      };
    }
    setOperationDrafts(next);
  }, [status?.structure?.sites]);

  const updateStatusCaches = (data: SetupStatus) => {
    queryClient.setQueryData(['academy-setup'], data);
    queryClient.setQueryData(['academy-setup', undefined], data);
  };

  const preferenceMutation = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => (await api.put('/api/consentimientos/setup/preferencias', patch)).data.data as SetupStatus,
    onSuccess: (data) => { updateStatusCaches(data); setMessage('Configuración guardada.'); },
    onError: (error: any) => setMessage(error?.response?.data?.error || 'No fue posible guardar esta decisión.'),
  });

  const refresh = async () => {
    const result = await setupQuery.refetch();
    if (result.data) updateStatusCaches(result.data);
  };

  const createCategory = async (branchId: string) => {
    const name = String(categoryDrafts[branchId] || '').trim();
    if (!name) return setMessage('Escribe el nombre de la categoría.');
    setWorking(`category:${branchId}`);
    setMessage('');
    try {
      await api.post('/api/jugadores/categorias', { rama_id: branchId, nombre: name });
      setCategoryDrafts((current) => ({ ...current, [branchId]: '' }));
      await refresh();
      setMessage('Categoría creada. Puedes agregar todas las categorías que necesite esta rama.');
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'No fue posible crear la categoría.');
    } finally { setWorking(''); }
  };

  const updateSchedule = (siteId: string, index: number, patch: Partial<TrainingSchedule>) => {
    setOperationDrafts((current) => {
      const currentDraft = current[siteId] || { ubicacion_entrenamiento: '', horarios: [emptySchedule()] };
      return {
        ...current,
        [siteId]: {
          ...currentDraft,
          horarios: currentDraft.horarios.map((schedule, scheduleIndex) => scheduleIndex === index ? { ...schedule, ...patch } : schedule),
        },
      };
    });
  };

  const addSchedule = (siteId: string) => {
    setOperationDrafts((current) => {
      const currentDraft = current[siteId] || { ubicacion_entrenamiento: '', horarios: [] };
      return { ...current, [siteId]: { ...currentDraft, horarios: [...currentDraft.horarios, emptySchedule()] } };
    });
  };

  const removeSchedule = (siteId: string, index: number) => {
    setOperationDrafts((current) => {
      const currentDraft = current[siteId] || { ubicacion_entrenamiento: '', horarios: [] };
      const remaining = currentDraft.horarios.filter((_, scheduleIndex) => scheduleIndex !== index);
      return { ...current, [siteId]: { ...currentDraft, horarios: remaining.length ? remaining : [emptySchedule()] } };
    });
  };

  const saveOperation = async (siteId: string) => {
    const draft = operationDrafts[siteId];
    const schedules = draft?.horarios || [];
    if (!draft?.ubicacion_entrenamiento.trim()) return setMessage('Completa el lugar de entrenamiento de esta sede.');
    if (!schedules.length || schedules.some((item) => !item.dias.trim() || !item.inicio || !item.fin)) {
      return setMessage('Completa día, hora de inicio y hora de término de cada horario.');
    }
    if (schedules.some((item) => item.inicio >= item.fin)) {
      return setMessage('La hora de término debe ser posterior a la hora de inicio.');
    }
    const duplicateKeys = schedules.map((item) => `${item.dias.trim().toLowerCase()}|${item.inicio}|${item.fin}`);
    if (new Set(duplicateKeys).size !== duplicateKeys.length) {
      return setMessage('Hay dos horarios idénticos. Elimina el duplicado antes de guardar.');
    }

    setWorking(`site:${siteId}`);
    setMessage('');
    try {
      await api.patch(`/api/estructura/sedes/${siteId}`, {
        ubicacion_entrenamiento: draft.ubicacion_entrenamiento,
        horarios_config: schedules.map((item) => ({ dias: item.dias.trim(), inicio: item.inicio, fin: item.fin })),
      });
      await refresh();
      setMessage('Horarios de la sede guardados correctamente.');
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'No fue posible guardar los horarios de la sede.');
    } finally { setWorking(''); }
  };

  const currentStep = useMemo(() => status?.steps.find((step) => !step.complete)?.key || null, [status?.steps]);

  if (setupQuery.isLoading) return <div className="lestra-setup-page grid min-h-[75vh] place-items-center bg-[#e9ece4] text-sm font-black text-[#273026]">Construyendo tu academia…</div>;
  if (setupQuery.isError || !status) return <div className="lestra-setup-page min-h-[70vh] bg-[#e9ece4] p-6"><div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800"><p className="font-black">No pudimos cargar la Puesta en Marcha.</p><button onClick={() => void setupQuery.refetch()} className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-black text-white">Reintentar</button></div></div>;

  if (!status.required) {
    return <div className="lestra-setup-page grid min-h-[70vh] place-items-center bg-[#e9ece4] p-6"><div className="max-w-xl text-center"><CheckCircleIcon className="mx-auto h-14 w-14 text-emerald-600"/><h1 className="mt-4 text-3xl font-black text-[#172018]">Tu academia ya está operativa</h1><p className="mt-2 text-[#667064]">Este asistente es obligatorio solo para academias creadas con la nueva Puesta en Marcha.</p><button onClick={() => navigate('/dashboard')} className="mt-6 rounded-2xl bg-[#20261f] px-6 py-3 font-black text-white">Ir al centro de control</button></div></div>;
  }

  return <div className="lestra-setup-page min-h-full bg-[#e9ece4] text-[#172018]">
    <div className="mx-auto max-w-[1380px] space-y-6 p-3 pb-16 sm:p-6 lg:p-8">
      <section className="relative overflow-hidden rounded-[34px] bg-[#171d18] p-5 text-white shadow-[0_24px_70px_rgba(18,25,18,.22)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border-[42px] border-[#b9e937]/15" />
        <div className="pointer-events-none absolute bottom-0 right-[18%] h-px w-80 rotate-[-12deg] bg-[#b9e937]/35" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#b9e937] p-2 text-[#11170f]"><Logo variant="mark" className="h-full w-full" /></div><div><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#b9e937]">Lestra Setup</p><p className="text-sm font-bold text-white/55">Puesta en Marcha</p></div></div>
            <h1 className="mt-7 max-w-4xl text-3xl font-black tracking-[-.035em] sm:text-5xl lg:text-6xl">Construyamos <span className="text-[#b9e937]">{status.academy.nombre}</span> antes de salir a la cancha.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 sm:text-base">Primero dejamos la operación coherente. Después te mostramos todo Lestra. No necesitas completar funciones opcionales para comenzar.</p>
          </div>
          <div className="flex items-center gap-5 rounded-[28px] border border-white/10 bg-white/[.045] p-5 backdrop-blur sm:p-6">
            <div className="grid h-28 w-28 place-items-center rounded-full p-[9px]" style={{ background: `conic-gradient(#b9e937 ${status.progress * 3.6}deg, rgba(255,255,255,.10) 0deg)` }}>
              <div className="grid h-full w-full place-items-center rounded-full bg-[#171d18]"><div className="text-center"><p className="text-3xl font-black">{status.progress}%</p><p className="text-[9px] font-black uppercase tracking-[.15em] text-white/45">Operativa</p></div></div>
            </div>
            <div className="hidden min-w-[150px] sm:block"><p className="text-xs font-black uppercase tracking-[.16em] text-[#b9e937]">Estado</p><p className="mt-1 text-xl font-black">{status.operational ? 'Lista para operar' : 'En preparación'}</p><p className="mt-2 text-xs leading-5 text-white/50">{status.steps.filter((step) => step.complete).length} de {status.steps.length} etapas esenciales listas.</p></div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{status.steps.map((step) => <StepBadge key={step.key} step={step} active={currentStep === step.key} />)}</div>

      {message ? <div className="rounded-2xl border border-[#cbd1c5] bg-[#f7f8f3] px-4 py-3 text-sm font-bold text-[#3c4639] shadow-sm">{message}</div> : null}

      {status.operational ? <section className="overflow-hidden rounded-[32px] border border-emerald-300 bg-[linear-gradient(135deg,#eaffc8,#f7f8f3)] p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-700">Configuración validada</p><h2 className="mt-2 text-3xl font-black tracking-tight">Tu academia está lista. 🚀</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#53604f]">La estructura crítica está completa. A partir de aquí WhatsApp, página pública, alumnos y otras capacidades son mejoras de adopción, no bloqueos operativos.</p></div><button onClick={() => navigate('/dashboard')} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#172018] px-7 font-black text-white shadow-xl">Entrar a Lestra <ArrowRightIcon className="h-5 w-5" /></button></div>
      </section> : null}

      <section className="rounded-[30px] border border-[#d2d6cc] bg-[#f7f8f3] p-5 sm:p-7">
        <SectionHeader icon={BuildingOffice2Icon} eyebrow="01 · Identidad" title="Quién eres" description="Los datos esenciales vienen de la creación de la cuenta. No te hacemos escribirlos otra vez." />
        <div className="mt-6 grid gap-3 md:grid-cols-3"><Summary label="Academia" value={status.academy.nombre} ok={Boolean(status.academy.nombre)} /><Summary label="Director" value={status.academy.director || 'Pendiente'} ok={Boolean(status.academy.director)} /><Summary label="Correo" value={status.academy.email || 'Pendiente'} ok={Boolean(status.academy.email)} /></div>
      </section>

      <section className="rounded-[30px] border border-[#d2d6cc] bg-[#f7f8f3] p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><SectionHeader icon={Cog6ToothIcon} eyebrow="02 · Estructura" title="Cómo está construida tu academia" description="Cada rama activa necesita al menos una categoría para operar, pero puedes agregar todas las categorías que tu academia necesite." /><Link to="/configuracion/estructura?setup=1" className="shrink-0 rounded-xl border border-[#cbd1c5] bg-white px-4 py-3 text-xs font-black text-[#343d31]">Administrar estructura completa</Link></div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">{status.structure.sites.map((site) => <article key={site.id} className="rounded-[24px] border border-[#d9ddd3] bg-white p-4 sm:p-5"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#20261f] text-[#b9e937]"><MapPinIcon className="h-5 w-5"/></div><div><h3 className="font-black">{site.nombre}</h3><p className="text-xs text-[#7b8378]">{site.ramas.length} rama{site.ramas.length === 1 ? '' : 's'} activa{site.ramas.length === 1 ? '' : 's'}</p></div></div><div className="mt-4 space-y-3">{site.ramas.map((branch) => <div key={branch.id} className="rounded-2xl bg-[#f1f3ed] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.12em] text-[#75806f]">{branch.disciplina}</p><p className="font-black">{branch.nombre}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${branch.categorias.length ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{branch.categorias.length ? `${branch.categorias.length} categoría${branch.categorias.length === 1 ? '' : 's'}` : 'Falta categoría'}</span></div>{branch.categorias.length ? <div className="mt-3 flex flex-wrap gap-1.5">{branch.categorias.map((category) => <span key={category.id} className="rounded-full border border-[#d7dbd1] bg-white px-2.5 py-1 text-[11px] font-bold">{category.nombre}</span>)}</div> : <p className="mt-3 text-xs font-bold text-amber-700">Agrega la primera categoría para completar esta rama.</p>}<div className="mt-3 flex gap-2"><input value={categoryDrafts[branch.id] || ''} onChange={(event) => setCategoryDrafts((current) => ({ ...current, [branch.id]: event.target.value }))} placeholder={branch.categorias.length ? 'Agregar otra categoría…' : 'Ej.: Sub 12'} className="min-w-0 flex-1 rounded-xl border border-[#ccd2c6] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#77856f]"/><button title="Agregar categoría" aria-label={`Agregar categoría a ${branch.nombre}`} disabled={working === `category:${branch.id}`} onClick={() => void createCategory(branch.id)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#20261f] text-[#b9e937] transition hover:bg-[#2b3329] disabled:opacity-40"><PlusIcon className="h-5 w-5"/></button></div></div>)}</div></article>)}</div>
      </section>

      <section className="rounded-[30px] border border-[#d2d6cc] bg-[#f7f8f3] p-5 sm:p-7">
        <SectionHeader icon={ClockIcon} eyebrow="03 · Operación" title="Dónde y cuándo entrenan" description="Configura uno o varios bloques por sede. Si entrenan en días u horarios distintos, agrega cada bloque por separado." />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">{status.structure.sites.map((site) => {
          const draft = operationDrafts[site.id] || { ubicacion_entrenamiento:'', horarios:[emptySchedule()] };
          return <article key={site.id} className={`rounded-[24px] border p-5 ${site.operation_complete ? 'border-emerald-200 bg-emerald-50/60' : 'border-[#d9ddd3] bg-white'}`}>
            <div className="flex items-center justify-between gap-3"><h3 className="font-black">{site.nombre}</h3>{site.operation_complete ? <span className="text-xs font-black text-emerald-700">✓ Lista</span> : <span className="text-xs font-black text-amber-700">Pendiente</span>}</div>
            <div className="mt-4"><Field label="Lugar de entrenamiento" value={draft.ubicacion_entrenamiento} onChange={(value) => setOperationDrafts((current) => ({ ...current, [site.id]: { ...draft, ubicacion_entrenamiento:value } }))}/></div>
            <div className="mt-5 flex items-center justify-between gap-3"><div><p className="text-sm font-black text-[#20261f]">Horarios semanales</p><p className="mt-0.5 text-[11px] font-semibold text-[#6f786b]">Puedes agregar días con horarios diferentes.</p></div><button type="button" onClick={() => addSchedule(site.id)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#b9e937] px-3 py-2 text-[11px] font-black text-[#11170f] transition hover:bg-[#c8f64b]"><PlusIcon className="h-4 w-4"/> Agregar horario</button></div>
            <div className="mt-3 space-y-2">{draft.horarios.map((schedule, index) => <div key={`${site.id}-schedule-${index}`} className="grid gap-3 rounded-2xl border border-[#d9ddd3] bg-white/80 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(150px,auto)_20px_minmax(150px,auto)_auto] sm:items-end">
              <label className="block"><span className="text-[11px] font-black text-[#697266]">Día(s)</span><input value={schedule.dias} onChange={(event) => updateSchedule(site.id, index, { dias:event.target.value })} placeholder="Ej.: Martes" className="mt-1 min-h-11 w-full rounded-xl border border-[#cdd2c8] bg-[#f9faf6] px-3 text-sm text-[#20261f] outline-none placeholder:text-[#98a093] focus:border-[#7f8e77]"/></label>
              <SetupTimePicker label="Desde" value={schedule.inicio} onChange={(value) => updateSchedule(site.id, index, { inicio:value })}/>
              <div className="hidden h-11 items-center justify-center pb-0.5 text-lg font-black text-[#8a9385] sm:flex">→</div>
              <SetupTimePicker label="Hasta" value={schedule.fin} onChange={(value) => updateSchedule(site.id, index, { fin:value })}/>
              <button type="button" title="Eliminar horario" aria-label={`Eliminar horario ${index + 1}`} disabled={draft.horarios.length === 1} onClick={() => removeSchedule(site.id, index)} className="grid h-11 w-11 place-items-center rounded-xl border border-[#d7dbd1] bg-white text-[#6f786b] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"><TrashIcon className="h-4 w-4"/></button>
            </div>)}</div>
            <button disabled={working === `site:${site.id}`} onClick={() => void saveOperation(site.id)} className="!mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl !bg-[#172018] px-5 py-2.5 text-xs font-black !text-white shadow-[0_8px_20px_rgba(23,32,24,.16)] transition hover:!bg-[#273329] disabled:opacity-40"><CheckCircleIcon className="h-4 w-4"/>{working === `site:${site.id}` ? 'Guardando…' : 'Guardar horarios'}</button>
          </article>;
        })}</div>
      </section>

      <section className="rounded-[30px] border border-[#d2d6cc] bg-[#f7f8f3] p-5 sm:p-7">
        <SectionHeader icon={BanknotesIcon} eyebrow="04 · Cobros" title="Cómo recibirá pagos tu academia" description="Decide y configura los medios de pago sin salir de esta Puesta en Marcha. Los valores de matrícula y mensualidad permanecen exactamente en la lógica actual y pueden variar." />
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><button onClick={() => preferenceMutation.mutate({ billing_choice: true })} className={`rounded-2xl border p-5 text-left transition ${choiceClass(status.setup.billing_choice === true)}`}><p className="font-black">Sí, gestionar cobros con Lestra</p><p className="mt-1 text-xs opacity-70">Configuraré al menos un medio de recaudación aquí mismo.</p></button><button onClick={() => preferenceMutation.mutate({ billing_choice: false })} className={`rounded-2xl border p-5 text-left transition ${choiceClass(status.setup.billing_choice === false)}`}><p className="font-black">No por ahora</p><p className="mt-1 text-xs opacity-70">Podré activarlo después sin afectar la operación deportiva.</p></button></div>
        {status.setup.billing_choice === true ? <SetupFinanceInline onSaved={refresh} /> : null}
      </section>

      <section className="rounded-[30px] border border-[#d2d6cc] bg-[#f7f8f3] p-5 sm:p-7">
        <SectionHeader icon={ShieldCheckIcon} eyebrow="05 · Reglas" title="Tus términos y las autorizaciones de Lestra" description="Tus términos son tuyos. Los consentimientos estándar de Lestra no se editan: tú eliges cuáles opcionales presentar al apoderado." />
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><button onClick={() => preferenceMutation.mutate({ terms_choice: 'custom' })} className={`rounded-2xl border p-5 text-left transition ${choiceClass(status.setup.terms_choice === 'custom')}`}><p className="font-black">Tengo términos propios</p><p className="mt-1 text-xs opacity-70">Los escribiré y Lestra guardará una copia por matrícula.</p></button><button onClick={() => preferenceMutation.mutate({ terms_choice: 'none' })} className={`rounded-2xl border p-5 text-left transition ${choiceClass(status.setup.terms_choice === 'none')}`}><p className="font-black">No tengo condiciones adicionales</p><p className="mt-1 text-xs opacity-70">Continuaré solo con las autorizaciones estándar.</p></button></div>
        {status.setup.terms_choice === 'custom' ? <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#d9ddd3] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black">Términos de la academia</p><p className="mt-1 text-xs text-[#70796c]">{status.academy.terms_configured ? 'Tus términos ya están guardados.' : 'Todavía falta escribir tus términos.'}</p></div><Link to="/terminos?setup=1" className="rounded-xl bg-[#20261f] px-4 py-2.5 text-center text-xs font-black text-white">{status.academy.terms_configured ? 'Revisar términos' : 'Escribir términos'}</Link></div> : null}
        <div className="mt-5 space-y-2"><ConsentRow title="Aviso de privacidad y tratamiento operativo" description="Siempre incluido. Es el consentimiento base obligatorio." value={true} locked onChange={() => undefined}/><ConsentRow title="Información mínima de emergencia" description="Permite que el apoderado decida si autoriza registrar información mínima de seguridad." value={status.setup.consent_settings.datos_salud} onChange={(value) => preferenceMutation.mutate({ consent_settings: { datos_salud: value } })}/><ConsentRow title="Uso interno de fotografía" description="Identificación interna, ficha deportiva e informes privados." value={status.setup.consent_settings.imagen_interna} onChange={(value) => preferenceMutation.mutate({ consent_settings: { imagen_interna: value } })}/><ConsentRow title="Difusión pública de imagen" description="Uso voluntario en canales institucionales, sitio web o redes sociales." value={status.setup.consent_settings.imagen_publica} onChange={(value) => preferenceMutation.mutate({ consent_settings: { imagen_publica: value } })}/></div>
      </section>

      <section className="rounded-[30px] border border-[#d2d6cc] bg-[#f7f8f3] p-5 sm:p-7">
        <SectionHeader icon={UserGroupIcon} eyebrow="06 · Equipo" title="Quién trabaja contigo" description="Una academia pequeña puede operar solo con su director. Si eliges trabajar con equipo técnico, dejamos al menos un profesor realmente asignado." />
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><button onClick={() => preferenceMutation.mutate({ staff_mode: 'solo' })} className={`rounded-2xl border p-5 text-left transition ${choiceClass(status.setup.staff_mode === 'solo')}`}><p className="font-black">La administraré yo</p><p className="mt-1 text-xs opacity-70">No necesito crear un profesor ficticio para completar el proceso.</p></button><button onClick={() => preferenceMutation.mutate({ staff_mode: 'team' })} className={`rounded-2xl border p-5 text-left transition ${choiceClass(status.setup.staff_mode === 'team')}`}><p className="font-black">Trabajo con profesores</p><p className="mt-1 text-xs opacity-70">Crearé al menos un profesor y lo asignaré a una categoría.</p></button></div>
        {status.setup.staff_mode === 'team' ? <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#d9ddd3] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black">Equipo técnico</p><p className="mt-1 text-xs text-[#70796c]">{status.team.professors_count} profesor(es) activos · {status.team.assigned_professors_count} con asignación</p></div><Link to="/profesores?setup=1" className="rounded-xl bg-[#20261f] px-4 py-2.5 text-center text-xs font-black text-white">Configurar profesores</Link></div> : null}
      </section>

      <section className="rounded-[30px] bg-[#20261f] p-5 text-white sm:p-7">
        <div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#b9e937] text-[#11170f]"><SparklesIcon className="h-6 w-6"/></div><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#b9e937]">Después de abrir</p><h2 className="mt-1 text-2xl font-black">Potencia Lestra sin bloquear tu operación</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">Estas capacidades no forman parte del 100% operativo. Puedes activarlas cuando tengan sentido para tu academia.</p></div></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">{Object.entries(status.optional).map(([key,item]) => <div key={key} className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><div className="flex items-center justify-between"><p className="text-sm font-black">{item.label}</p><span className={item.complete ? 'text-emerald-300' : 'text-white/35'}>{item.complete ? '✓' : '○'}</span></div><p className="mt-2 text-xs text-white/45">{item.complete ? 'Ya está activo.' : 'Disponible después de la Puesta en Marcha.'}</p></div>)}</div>
      </section>
    </div>
  </div>;
}

function Summary({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <div className="rounded-2xl border border-[#d9ddd3] bg-white p-4"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#7a8276]">{label}</p><span className={`text-xs font-black ${ok ? 'text-emerald-600' : 'text-amber-700'}`}>{ok ? '✓' : '!'}</span></div><p className="mt-2 truncate text-sm font-black text-[#20261f]">{value}</p></div>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block"><span className="text-[11px] font-black text-[#697266]">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1 min-h-11 w-full rounded-xl border border-[#cdd2c8] bg-[#f9faf6] px-3 text-sm text-[#20261f] outline-none placeholder:text-[#98a093] focus:border-[#7f8e77]"/></label>;
}

function ConsentRow({ title, description, value, locked = false, onChange }: { title: string; description: string; value?: boolean; locked?: boolean; onChange: (value: boolean) => void }) {
  const decided = typeof value === 'boolean';
  return <div className="flex flex-col gap-3 rounded-2xl border border-[#d9ddd3] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><p className="text-sm font-black">{title}</p>{locked ? <span className="rounded-full bg-[#20261f] px-2 py-0.5 text-[9px] font-black uppercase text-[#b9e937]">Siempre activo</span> : null}</div><p className="mt-1 max-w-3xl text-xs leading-5 text-[#70796c]">{description}</p></div>{locked ? <span className="text-sm font-black text-emerald-700">Incluido ✓</span> : <div className="grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-[#eef0e9] p-1"><button onClick={() => onChange(true)} className={`rounded-lg px-3 py-2 text-[11px] font-black ${value === true ? 'bg-[#20261f] text-[#b9e937]' : 'text-[#6d7668]'}`}>Incluir</button><button onClick={() => onChange(false)} className={`rounded-lg px-3 py-2 text-[11px] font-black ${value === false ? 'bg-white text-[#20261f] shadow-sm' : 'text-[#6d7668]'}`}>No incluir</button>{!decided ? <span className="col-span-2 pt-1 text-center text-[9px] font-black uppercase tracking-wider text-amber-700">Decisión pendiente</span> : null}</div>}</div>;
}
