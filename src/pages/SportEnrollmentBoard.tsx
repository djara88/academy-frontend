import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';

type Enrollment = {
  id: string;
  jugador_id: string;
  sede_id: string;
  rama_id: string;
  categoria_id?: string | null;
  estado: string;
  monto_mensualidad: number;
  ramas?: { nombre?: string; disciplina?: string } | null;
  sedes?: { nombre?: string } | null;
  categorias?: { nombre?: string } | null;
};
type Player = { id: string; nombre: string; rut?: string | null; fecha_nacimiento?: string | null; foto_url?: string | null; avatar_url?: string | null; inscripciones: Enrollment[] };
type Branch = { id: string; sede_id: string; nombre: string; disciplina: string; activa: boolean; principal: boolean };
type Site = { id: string; nombre: string; activa: boolean; principal: boolean; ramas: Branch[] };
type Category = { id: string; nombre: string; sede_id?: string | null; rama_id?: string | null };

const money = (value: number | string) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0));

export default function SportEnrollmentBoard() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ jugador_id: '', sede_id: '', rama_id: '', categoria_id: '', monto_matricula: '', abono_matricula: '', monto_mensualidad: '' });
  const [message, setMessage] = useState('');

  const playersQuery = useQuery({ queryKey: ['sport-enrollment-players'], queryFn: async () => (await api.get('/api/inscripciones/alumnos')).data.data as Player[] });
  const structureQuery = useQuery({ queryKey: ['sport-enrollment-structure'], queryFn: async () => (await api.get('/api/estructura')).data.data as Site[] });
  const categoriesQuery = useQuery({ queryKey: ['sport-enrollment-categories'], queryFn: async () => (await api.get('/api/jugadores/categorias')).data.data as Category[] });

  const dataVerified = !playersQuery.isLoading && !structureQuery.isLoading && !categoriesQuery.isLoading && !playersQuery.isError && !structureQuery.isError && !categoriesQuery.isError;
  const player = useMemo(() => (playersQuery.data || []).find((item) => item.id === form.jugador_id) || null, [playersQuery.data, form.jugador_id]);
  const activeEnrollments = useMemo(() => (player?.inscripciones || []).filter((item) => item.estado === 'Activa'), [player]);
  const activeBranchIds = useMemo(() => new Set(activeEnrollments.map((item) => item.rama_id)), [activeEnrollments]);
  const sites = (structureQuery.data || []).filter((site) => site.activa);
  const site = sites.find((item) => item.id === form.sede_id);
  const branches = (site?.ramas || []).filter((branch) => branch.activa);
  const categories = (categoriesQuery.data || []).filter((category) => category.rama_id === form.rama_id);
  const selectedBranch = branches.find((branch) => branch.id === form.rama_id) || null;
  const selectedCategory = categories.find((category) => category.id === form.categoria_id) || null;
  const enrollmentCount = dataVerified ? (playersQuery.data || []).reduce((sum, item) => sum + item.inscripciones.filter((enrollment) => enrollment.estado === 'Activa').length, 0) : null;

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/api/inscripciones', {
      ...form,
      categoria_id: form.categoria_id || null,
      monto_matricula: Number(form.monto_matricula || 0),
      abono_matricula: Number(form.abono_matricula || 0),
      monto_mensualidad: Number(form.monto_mensualidad || 0),
    })).data.data,
    onSuccess: async (data) => {
      setMessage(`${data.jugador?.nombre || 'Deportista'} quedó inscrito en ${data.rama?.disciplina || 'la nueva disciplina'}. Se crearon ${data.cobros_creados || 0} cobros asociados.`);
      setForm((current) => ({ ...current, rama_id: '', categoria_id: '', monto_matricula: '', abono_matricula: '', monto_mensualidad: '' }));
      await queryClient.invalidateQueries({ queryKey: ['sport-enrollment-players'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-resumen'] });
    },
    onError: (error: any) => setMessage(error?.response?.data?.error || 'No fue posible crear la inscripción deportiva.'),
  });

  const choosePlayer = (jugador_id: string) => {
    setMessage('');
    setForm({ jugador_id, sede_id: '', rama_id: '', categoria_id: '', monto_matricula: '', abono_matricula: '', monto_mensualidad: '' });
  };
  const chooseSite = (sede_id: string) => {
    const selected = sites.find((item) => item.id === sede_id);
    const firstAvailable = selected?.ramas.find((branch) => branch.activa && !activeBranchIds.has(branch.id));
    setForm((current) => ({ ...current, sede_id, rama_id: firstAvailable?.id || '', categoria_id: '' }));
  };
  const submit = () => {
    setMessage('');
    if (!dataVerified) return setMessage('Primero recupera un estado verificado de deportistas y estructura.');
    if (!form.jugador_id || !form.sede_id || !form.rama_id) return setMessage('Selecciona deportista, sede y una rama deportiva nueva.');
    if (activeBranchIds.has(form.rama_id)) return setMessage('Ese deportista ya tiene una inscripción activa en la rama seleccionada.');
    mutation.mutate();
  };

  if (!dataVerified && (playersQuery.isLoading || structureQuery.isLoading || categoriesQuery.isLoading)) {
    return <main className="sport-enrollment-board"><div className="sport-enrollment-loading">Verificando plantel y estructura deportiva…</div></main>;
  }

  if (playersQuery.isError || structureQuery.isError || categoriesQuery.isError) {
    return <main className="sport-enrollment-board"><section className="sport-enrollment-error" role="alert"><ExclamationTriangleIcon aria-hidden="true" /><div><strong>No pudimos verificar las inscripciones deportivas.</strong><p>Recarga la página antes de crear una nueva inscripción.</p></div></section></main>;
  }

  return (
    <main className="sport-enrollment-board">
      <header className="sport-enrollment-head">
        <div>
          <p>Plantel · Inscripciones</p>
          <h1>Agregar una disciplina al deportista</h1>
          <span>Una sola ficha personal puede pertenecer a distintas ramas sin duplicar identidad, historial ni familia.</span>
        </div>
        <div className="sport-enrollment-count"><span>Inscripciones activas</span><strong>{enrollmentCount}</strong><small>{sites.length} sedes operativas</small></div>
      </header>

      {message ? <div className={`sport-enrollment-message ${mutation.isError ? 'is-error' : 'is-success'}`} role="status">{message}</div> : null}

      <div className="sport-enrollment-flow" aria-label="Flujo de inscripción deportiva">
        <section className="sport-enrollment-player">
          <div className="sport-step-label"><span>01</span><div><strong>Deportista</strong><small>Usar ficha existente</small></div></div>
          <label><span>Seleccionar</span><select value={form.jugador_id} onChange={(event) => choosePlayer(event.target.value)}><option value="">Seleccionar deportista</option>{(playersQuery.data || []).map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.rut ? ` · ${item.rut}` : ''}</option>)}</select></label>

          {player ? (
            <div className="sport-player-passport">
              <div className="sport-player-identity">
                {player.foto_url || player.avatar_url ? <img src={player.foto_url || player.avatar_url || ''} alt="" /> : <span>{player.nombre.slice(0, 1)}</span>}
                <div><strong>{player.nombre}</strong><small>{player.rut || 'Sin documento informado'}</small></div>
              </div>
              <div className="sport-current-enrollments">
                <p>Ya compite o entrena en</p>
                {activeEnrollments.length ? activeEnrollments.map((enrollment) => <div key={enrollment.id}><span>{enrollment.ramas?.disciplina || enrollment.ramas?.nombre || 'Disciplina'}</span><strong>{enrollment.categorias?.nombre || 'Sin categoría'}</strong><small>{money(enrollment.monto_mensualidad || 0)} / mes</small></div>) : <p className="sport-empty-note">Sin inscripciones activas.</p>}
              </div>
            </div>
          ) : <div className="sport-player-placeholder">Selecciona una ficha existente. Para un deportista nuevo usa Matrícula.</div>}
        </section>

        <section className={`sport-enrollment-destination ${player ? 'is-ready' : ''}`}>
          <div className="sport-step-label"><span>02</span><div><strong>Nueva disciplina</strong><small>Destino deportivo</small></div></div>
          {!player ? <div className="sport-destination-locked">Selecciona primero al deportista.</div> : (
            <>
              <div className="sport-destination-grid">
                <label><span>Sede</span><select value={form.sede_id} onChange={(event) => chooseSite(event.target.value)}><option value="">Seleccionar sede</option>{sites.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
                <label><span>Rama / disciplina</span><select value={form.rama_id} onChange={(event) => setForm((current) => ({ ...current, rama_id: event.target.value, categoria_id: '' }))}><option value="">Seleccionar rama</option>{branches.map((branch) => <option key={branch.id} value={branch.id} disabled={activeBranchIds.has(branch.id)}>{branch.disciplina} · {branch.nombre}{activeBranchIds.has(branch.id) ? ' · Ya inscrito' : ''}</option>)}</select></label>
                <label><span>Categoría</span><select value={form.categoria_id} onChange={(event) => setForm((current) => ({ ...current, categoria_id: event.target.value }))}><option value="">Sin categoría por ahora</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select></label>
              </div>

              <div className="sport-transfer-arrow" aria-hidden="true"><ArrowRightIcon /></div>

              <div className="sport-destination-summary">
                <p>Destino</p>
                <strong>{selectedBranch ? `${selectedBranch.disciplina} · ${selectedBranch.nombre}` : 'Aún sin rama'}</strong>
                <span>{site?.nombre || 'Selecciona sede'}{selectedCategory ? ` · ${selectedCategory.nombre}` : ''}</span>
              </div>
            </>
          )}
        </section>

        <section className={`sport-enrollment-finance ${form.rama_id ? 'is-ready' : ''}`}>
          <div className="sport-step-label"><span>03</span><div><strong>Impacto financiero</strong><small>Solo esta inscripción</small></div></div>
          <div className="sport-finance-inputs">
            <label><span>Matrícula</span><input type="number" min="0" value={form.monto_matricula} onChange={(event) => setForm((current) => ({ ...current, monto_matricula: event.target.value }))} /></label>
            <label><span>Abono</span><input type="number" min="0" value={form.abono_matricula} onChange={(event) => setForm((current) => ({ ...current, abono_matricula: event.target.value }))} /></label>
            <label><span>Mensualidad</span><input type="number" min="0" value={form.monto_mensualidad} onChange={(event) => setForm((current) => ({ ...current, monto_mensualidad: event.target.value }))} /></label>
          </div>
          <div className="sport-finance-summary"><div><span>Saldo inicial</span><strong>{money(Math.max(0, Number(form.monto_matricula || 0) - Number(form.abono_matricula || 0)))}</strong></div><div><span>Nueva mensualidad</span><strong>{money(form.monto_mensualidad)}</strong></div></div>
          <button type="button" disabled={mutation.isPending || !form.rama_id} onClick={submit}>{mutation.isPending ? 'Creando inscripción…' : <><CheckCircleIcon aria-hidden="true" />Confirmar inscripción</>}</button>
        </section>
      </div>
    </main>
  );
}
