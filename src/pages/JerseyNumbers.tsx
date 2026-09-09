import React, { useEffect, useState } from 'react';
import { ArrowLeftIcon, UserIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import JerseyNumberPicker, { type JerseyMap } from '../components/JerseyNumberPicker';
import { useAcademyMessages } from '../hooks/useAcademyMessages';

type Branch = { id: string; sede_id: string; nombre: string; disciplina: string; principal?: boolean; activa?: boolean };
type Site = { id: string; nombre: string; principal?: boolean; activa?: boolean; ramas?: Branch[] };
type Category = { id: string; nombre: string; rama_id: string };
type Student = { id: string; nombre: string; numero_camiseta?: number | null };

const JerseyNumbers: React.FC = () => {
  const { notify } = useAcademyMessages();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void api.get('/api/estructura')
      .then((response) => {
        const nextSites = (response.data?.data || []) as Site[];
        const nextBranches = nextSites.flatMap((site) => site.ramas || []).filter((branch) => branch.activa !== false);
        setBranches(nextBranches);
        const preferred = nextBranches.find((branch) => branch.principal) || nextBranches[0];
        if (preferred) setBranchId(preferred.id);
      })
      .catch(() => setError('No fue posible cargar la estructura deportiva.'));
  }, []);

  useEffect(() => {
    setCategoryId('');
    setStudentId('');
    setStudents([]);
    if (!branchId) {
      setCategories([]);
      return;
    }
    setError('');
    void api.get('/api/categorias', { params: { rama_id: branchId } })
      .then((response) => setCategories(response.data?.data || []))
      .catch((requestError: any) => setError(requestError?.response?.data?.error || 'No fue posible cargar las categorías.'));
  }, [branchId]);

  useEffect(() => {
    setStudentId('');
    setStudents([]);
  }, [categoryId]);

  const selectedStudent = students.find((student) => student.id === studentId) || null;
  const selectedCategory = categories.find((category) => category.id === categoryId) || null;

  useEffect(() => {
    if (studentId && !students.some((student) => student.id === studentId)) setStudentId('');
  }, [students, studentId]);

  const syncScopedStudents = (map: JerseyMap) => {
    setStudents((map.players || []).map((player) => ({
      id: player.id,
      nombre: player.name,
      numero_camiseta: player.jerseyNumber,
    })));
  };

  const assign = async (number: number | null) => {
    if (!studentId || !branchId || saving) return;
    setSaving(true);
    setError('');
    try {
      await api.put('/api/uniformes/dorsales/asignar', {
        jugador_id: studentId,
        rama_id: branchId,
        categoria_id: categoryId || null,
        numero: number,
      });
      setStudents((current) => current.map((student) => student.id === studentId ? { ...student, numero_camiseta: number } : student));
      setRefreshKey((current) => current + 1);
      await notify(number == null
        ? `Dorsal liberado para ${selectedStudent?.nombre || 'el deportista'}.`
        : `Dorsal ${number} asignado a ${selectedStudent?.nombre || 'el deportista'}.`);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || 'No fue posible actualizar el dorsal.');
      setRefreshKey((current) => current + 1);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="jersey-locker">
      <header className="jersey-locker-head">
        <div>
          <p>Locker Board · Dorsales</p>
          <h1>Números del plantel</h1>
          <p>Consulta disponibilidad y asigna un dorsal dentro de la rama y categoría correctas sin perder trazabilidad.</p>
        </div>
        <Link to="/uniformes"><ArrowLeftIcon aria-hidden="true" />Volver a equipamiento</Link>
      </header>

      <section className="jersey-locker-context" aria-label="Contexto deportivo del dorsal">
        <label><span>Rama deportiva</span><select value={branchId} onChange={(event) => setBranchId(event.target.value)}><option value="">Seleccionar</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}</option>)}</select></label>
        <label><span>Categoría</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={!branchId}><option value="">Toda la rama</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select></label>
        <label><span>Deportista</span><select value={studentId} onChange={(event) => setStudentId(event.target.value)} disabled={!branchId}><option value="">Solo revisar disponibilidad</option>{students.map((student) => <option key={student.id} value={student.id}>{student.nombre}{student.numero_camiseta ? ` · #${student.numero_camiseta}` : ''}</option>)}</select></label>
      </section>

      <section className="jersey-locker-player" aria-live="polite">
        <span><UserIcon aria-hidden="true" /></span>
        <div>
          <strong>{selectedStudent ? selectedStudent.nombre : 'Mapa de dorsales'}</strong>
          <small>{selectedStudent ? `${selectedStudent.numero_camiseta ? `Dorsal actual #${selectedStudent.numero_camiseta}` : 'Sin dorsal asignado'}${selectedCategory ? ` · ${selectedCategory.nombre}` : ''}` : 'Selecciona un deportista solo si necesitas asignar o liberar un número.'}</small>
        </div>
        {selectedStudent?.numero_camiseta ? <button type="button" disabled={saving} onClick={() => void assign(null)}>Liberar #{selectedStudent.numero_camiseta}</button> : null}
      </section>

      {error ? <div className="jersey-locker-error" role="alert">{error}</div> : null}

      <JerseyNumberPicker
        branchId={branchId}
        categoryId={categoryId || null}
        value={selectedStudent?.numero_camiseta ?? null}
        excludePlayerId={studentId || null}
        selectable={Boolean(studentId) && !saving}
        refreshKey={refreshKey}
        title={selectedStudent ? `Dorsal para ${selectedStudent.nombre}` : 'Disponibilidad de dorsales'}
        description={selectedStudent ? 'Toca una camiseta disponible para asignarla. El servidor vuelve a validar antes de guardar.' : 'Consulta el mapa por rama y categoría. Selecciona un deportista arriba para habilitar la asignación.'}
        onLoaded={syncScopedStudents}
        onSelect={(number) => void assign(number)}
      />

      <section className="jersey-locker-legend" aria-label="Estados de dorsal">
        <div><strong>Disponible</strong><span>Se puede asignar en este momento.</span></div>
        <div><strong>Reservado</strong><span>Una pre-matrícula activa ya solicitó ese número.</span></div>
        <div><strong>Ocupado</strong><span>Está asociado a un deportista activo del alcance.</span></div>
      </section>
    </main>
  );
};

export default JerseyNumbers;
