import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Lead = {
  id: string; estado: string; apoderado_nombre: string; telefono: string; email?: string | null; alumno_nombre: string; fecha_nacimiento?: string | null; mensaje?: string | null; created_at: string; prematricula_id?: string | null; sede_id?: string | null; rama_id?: string | null; categoria_id?: string | null;
  sedes?: { nombre?: string } | null; ramas?: { nombre?: string; disciplina?: string } | null; categorias?: { nombre?: string } | null; prematriculas?: { estado?: string; expires_at?: string; sent_at?: string; signed_at?: string } | null;
};
type Branch = { id: string; sede_id: string; nombre: string; disciplina: string; principal?: boolean; activa?: boolean };
type Site = { id: string; nombre: string; principal?: boolean; activa?: boolean; ramas: Branch[] };
type Draft = { email: string; rut_apoderado: string; rut_alumno: string; fecha_nacimiento: string; sexo: string; sede_id: string; rama_id: string; monto_matricula: string; abono_matricula: string; monto_mensualidad: string };
type LoadState = 'loading' | 'verified' | 'error';

const emptyDraft: Draft = { email: '', rut_apoderado: '', rut_alumno: '', fecha_nacimiento: '', sexo: '', sede_id: '', rama_id: '', monto_matricula: '', abono_matricula: '', monto_mensualidad: '' };
const money = (value: string | number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0));
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString('es-CL') : '—';
const phoneHref = (value: string) => { const digits = String(value || '').replace(/\D/g, ''); if (!digits) return ''; return `https://wa.me/${digits.startsWith('56') ? digits : `56${digits}`}`; };
const statusLabel: Record<string, string> = { nueva: 'Nueva', contactada: 'Contactada', en_revision: 'En revisión', prematricula: 'Pre-matrícula', archivada: 'Archivada' };

function PreEnrollmentDialog({ open, lead, draft, setDraft, sites, branches, submitting, result, onClose, onSubmit }: { open: boolean; lead: Lead | null; draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>; sites: Site[]; branches: Branch[]; submitting: boolean; result: { link: string; email_sent: boolean } | null; onClose: () => void; onSubmit: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  if (!lead) return null;
  const branchOptions = draft.sede_id ? branches.filter((branch) => branch.sede_id === draft.sede_id) : branches;
  return (
    <dialog ref={ref} className="admission-dialog" onClose={onClose}>
      {result ? (
        <div className="admission-result">
          <CheckCircleIcon aria-hidden="true" />
          <h2>Pre-matrícula preparada</h2>
          <p>{result.email_sent ? 'El enlace fue enviado al correo del apoderado.' : 'El registro fue creado, pero no pudimos confirmar el envío. Comparte el enlace por otro canal.'}</p>
          <div><input readOnly value={result.link} /><button type="button" onClick={() => void navigator.clipboard.writeText(result.link)}>Copiar enlace</button></div>
          <button type="button" className="secondary" onClick={onClose}>Cerrar</button>
        </div>
      ) : (
        <>
          <div className="admission-dialog-head"><div><p>Admission Queue · Conversión</p><h2>Pre-matrícula de {lead.alumno_nombre}</h2><span>Conservamos los datos recibidos y solo pedimos lo formal que falta.</span></div><button type="button" onClick={onClose} aria-label="Cerrar"><XMarkIcon aria-hidden="true" /></button></div>
          <div className="admission-dialog-grid">
            <label><span>Correo apoderado *</span><input type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} /></label>
            <label><span>RUT apoderado *</span><input value={draft.rut_apoderado} onChange={(event) => setDraft((current) => ({ ...current, rut_apoderado: event.target.value }))} /></label>
            <label><span>RUT deportista</span><input value={draft.rut_alumno} onChange={(event) => setDraft((current) => ({ ...current, rut_alumno: event.target.value }))} /></label>
            <label><span>Fecha nacimiento</span><input type="date" value={draft.fecha_nacimiento} onChange={(event) => setDraft((current) => ({ ...current, fecha_nacimiento: event.target.value }))} /></label>
            <label><span>Sexo</span><select value={draft.sexo} onChange={(event) => setDraft((current) => ({ ...current, sexo: event.target.value }))}><option value="">Sin informar</option><option value="Masculino">Masculino</option><option value="Femenino">Femenino</option><option value="Otro">Otro</option></select></label>
            <label><span>Sede *</span><select value={draft.sede_id} onChange={(event) => setDraft((current) => ({ ...current, sede_id: event.target.value, rama_id: '' }))}><option value="">Seleccionar sede</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.nombre}</option>)}</select></label>
            <label><span>Rama *</span><select value={draft.rama_id} onChange={(event) => setDraft((current) => ({ ...current, rama_id: event.target.value }))}><option value="">Seleccionar rama</option>{branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}</option>)}</select></label>
          </div>
          <div className="admission-money">
            <div><label><span>Matrícula</span><input type="number" min="0" value={draft.monto_matricula} onChange={(event) => setDraft((current) => ({ ...current, monto_matricula: event.target.value }))} /></label><label><span>Abono</span><input type="number" min="0" value={draft.abono_matricula} onChange={(event) => setDraft((current) => ({ ...current, abono_matricula: event.target.value }))} /></label><label><span>Mensualidad</span><input type="number" min="0" value={draft.monto_mensualidad} onChange={(event) => setDraft((current) => ({ ...current, monto_mensualidad: event.target.value }))} /></label></div>
            <p>Saldo de matrícula: <strong>{money(Math.max(0, Number(draft.monto_matricula || 0) - Number(draft.abono_matricula || 0)))}</strong></p>
          </div>
          <div className="admission-dialog-actions"><button type="button" onClick={onClose}>Cancelar</button><button type="button" className="primary" disabled={submitting} onClick={onSubmit}>{submitting ? 'Preparando…' : 'Crear y enviar pre-matrícula'}</button></div>
        </>
      )}
    </dialog>
  );
}

export default function AdmissionQueue() {
  const { notify } = useAppDialog();
  const [items, setItems] = useState<Lead[]>([]);
  const [structure, setStructure] = useState<Site[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ link: string; email_sent: boolean } | null>(null);

  const load = async () => {
    setLoadState('loading');
    try {
      const [leadResponse, structureResponse] = await Promise.all([api.get('/api/solicitudes-admision'), api.get('/api/estructura')]);
      setItems(leadResponse.data?.data || []);
      setStructure(structureResponse.data?.data || []);
      setLoadState('verified');
    } catch (error: any) {
      setLoadState('error');
      await notify(error?.response?.data?.error || 'No fue posible cargar las solicitudes.', { title: 'Solicitudes' });
    }
  };
  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => items.filter((item) => showArchived ? item.estado === 'archivada' : item.estado !== 'archivada'), [items, showArchived]);
  const counts = useMemo(() => ({ new: items.filter((item) => item.estado === 'nueva').length, active: items.filter((item) => ['nueva', 'contactada', 'en_revision'].includes(item.estado)).length, pre: items.filter((item) => item.estado === 'prematricula').length }), [items]);
  const activeSites = useMemo(() => structure.filter((site) => site.activa !== false), [structure]);
  const activeBranches = useMemo(() => activeSites.flatMap((site) => site.ramas.filter((branch) => branch.activa !== false)), [activeSites]);
  const verified = loadState === 'verified';

  const changeState = async (lead: Lead, estado: string) => {
    if (!verified) return;
    try { await api.patch(`/api/solicitudes-admision/${lead.id}`, { estado }); await load(); }
    catch (error: any) { await notify(error?.response?.data?.error || 'No fue posible actualizar la solicitud.', { title: 'Solicitudes' }); }
  };

  const openPre = (lead: Lead) => {
    const preferredBranch = activeBranches.find((branch) => branch.id === lead.rama_id) || activeBranches[0] || null;
    const preferredSite = activeSites.find((site) => site.id === (lead.sede_id || preferredBranch?.sede_id)) || activeSites[0] || null;
    const branch = preferredBranch?.sede_id === preferredSite?.id ? preferredBranch : preferredSite?.ramas.find((item) => item.activa !== false) || null;
    setSelected(lead); setResult(null);
    setDraft({ ...emptyDraft, email: lead.email || '', fecha_nacimiento: lead.fecha_nacimiento || '', sede_id: preferredSite?.id || '', rama_id: branch?.id || '' });
  };
  const closePre = () => { if (submitting) return; setSelected(null); setDraft(emptyDraft); setResult(null); };
  const submitPre = async () => {
    if (!selected || !verified) return;
    if (!draft.email.trim() || !draft.rut_apoderado.trim() || !draft.sede_id || !draft.rama_id) {
      await notify('Completa correo, RUT del apoderado, sede y rama antes de preparar la pre-matrícula.', { title: selected.alumno_nombre }); return;
    }
    setSubmitting(true);
    try {
      const response = await api.post(`/api/solicitudes-admision/${selected.id}/prematricula`, { ...draft, monto_matricula: Number(draft.monto_matricula || 0), abono_matricula: Number(draft.abono_matricula || 0), monto_mensualidad: Number(draft.monto_mensualidad || 0) });
      setResult({ link: response.data?.link || '', email_sent: Boolean(response.data?.email_sent) });
      await load();
    } catch (error: any) { await notify(error?.response?.data?.error || 'No fue posible preparar la pre-matrícula.', { title: selected.alumno_nombre }); }
    finally { setSubmitting(false); }
  };

  if (loadState === 'loading') return <main className="admission-queue"><div className="admission-loading">Verificando solicitudes y estructura…</div></main>;
  if (loadState === 'error') return <main className="admission-queue"><section className="admission-error" role="alert"><ExclamationTriangleIcon aria-hidden="true" /><div><strong>No pudimos verificar la bandeja de admisión.</strong><p>No se habilitarán decisiones hasta recuperar los datos.</p><button type="button" onClick={() => void load()}>Reintentar</button></div></section></main>;

  return (
    <main className="admission-queue">
      <header className="admission-head">
        <div><p>Admission Queue · Admisión</p><h1>Familias que quieren entrar a la academia</h1><span>La tarea no es “gestionar leads”: es decidir el próximo paso de cada deportista y su familia.</span></div>
        <div className="admission-head-count"><span>Por decidir</span><strong>{counts.active}</strong><small>{counts.new} sin primera gestión · {counts.pre} convertidas</small></div>
      </header>

      <div className="admission-toolbar"><div><strong>{showArchived ? 'Archivo' : 'Bandeja activa'}</strong><span>{showArchived ? 'Solicitudes fuera del flujo actual.' : 'Ordenadas para contacto, revisión o conversión.'}</span></div><div><Link to="/matricula">Matrícula<ArrowRightIcon aria-hidden="true" /></Link><button type="button" onClick={() => setShowArchived((value) => !value)}>{showArchived ? 'Ver activas' : 'Ver archivo'}</button></div></div>

      <section className="admission-ledger" aria-label="Bandeja de admisión">
        <div className="admission-ledger-head"><span>Deportista / familia</span><span>Interés deportivo</span><span>Estado</span><span>Próximo paso</span></div>
        {visible.map((lead) => {
          const wa = phoneHref(lead.telefono);
          const nextAction = lead.prematricula_id ? 'Esperar firma / revisar estado' : lead.estado === 'nueva' ? 'Contactar familia' : lead.estado === 'contactada' ? 'Revisar antecedentes' : lead.estado === 'en_revision' ? 'Preparar pre-matrícula' : 'Seguimiento';
          return (
            <article key={lead.id} className="admission-row" data-status={lead.estado}>
              <div className="admission-family"><strong>{lead.alumno_nombre}</strong><span>{lead.apoderado_nombre} · {lead.telefono}</span><small>Recibida {date(lead.created_at)}{lead.email ? ` · ${lead.email}` : ''}</small></div>
              <div className="admission-context"><strong>{lead.ramas?.disciplina || lead.ramas?.nombre || 'Disciplina por definir'}</strong><span>{lead.sedes?.nombre || 'Sede por definir'}{lead.categorias?.nombre ? ` · ${lead.categorias.nombre}` : ''}</span><small>{lead.mensaje || 'Sin mensaje adicional.'}</small></div>
              <div className="admission-state"><span>{statusLabel[lead.estado] || lead.estado}</span>{lead.prematricula_id ? <small>{lead.prematriculas?.signed_at ? 'Firmada' : lead.prematriculas?.estado || 'Enviada'}</small> : null}</div>
              <div className="admission-next"><strong>{nextAction}</strong><div>{wa && lead.estado !== 'archivada' ? <a href={wa} target="_blank" rel="noreferrer" onClick={() => { if (lead.estado === 'nueva') void changeState(lead, 'contactada'); }}>WhatsApp</a> : null}{!lead.prematricula_id && lead.estado !== 'archivada' ? <button type="button" className="primary" onClick={() => openPre(lead)}>Pre-matrícula</button> : null}{lead.estado !== 'archivada' && !lead.prematricula_id ? <button type="button" onClick={() => void changeState(lead, 'en_revision')}>Revisar</button> : null}{lead.estado !== 'archivada' ? <button type="button" onClick={() => void changeState(lead, 'archivada')}>Archivar</button> : <button type="button" className="primary" onClick={() => void changeState(lead, 'en_revision')}>Restaurar</button>}</div></div>
            </article>
          );
        })}
        {!visible.length ? <div className="admission-empty"><strong>{showArchived ? 'Sin solicitudes archivadas' : 'Todavía no hay solicitudes'}</strong><p>{showArchived ? 'El archivo está vacío.' : 'Cuando una familia complete el formulario público aparecerá aquí.'}</p></div> : null}
      </section>

      <PreEnrollmentDialog open={Boolean(selected)} lead={selected} draft={draft} setDraft={setDraft} sites={activeSites} branches={activeBranches} submitting={submitting} result={result} onClose={closePre} onSubmit={() => void submitPre()} />
    </main>
  );
}
