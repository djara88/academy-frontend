import React, { useEffect, useState } from 'react';
import { ArrowLeftIcon, CheckBadgeIcon, UserIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import JerseyNumberPicker, { type JerseyMap } from '../components/JerseyNumberPicker';
import {
  DIRECTOR_BUTTON_GHOST,
  DIRECTOR_FIELD,
  DirectorHero,
  DirectorPage,
  DirectorPanel,
} from '../components/director/DirectorModule';
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
        ? `Dorsal liberado para ${selectedStudent?.nombre || 'el alumno'}.`
        : `Dorsal ${number} asignado a ${selectedStudent?.nombre || 'el alumno'}.`);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || 'No fue posible actualizar el dorsal.');
      setRefreshKey((current) => current + 1);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DirectorPage className="max-w-[1480px]">
      <DirectorHero
        eyebrow="Uniformes · dorsales"
        title="Elige el número junto al jugador"
        description="Visualiza de inmediato qué dorsales están libres, reservados por una pre-matrícula u ocupados por un alumno activo."
        aside={<div className="rounded-[18px] border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-black uppercase text-[#d8e8a8]">Regla actual</p><p className="mt-2 text-lg font-black text-white">1–99</p><p className="mt-1 text-[11px] text-[#c7d0c8]">Rama + categoría cuando corresponde.</p></div>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Link to="/uniformes" className={DIRECTOR_BUTTON_GHOST}><ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />Volver a Uniformes</Link>
      </div>

      <DirectorPanel className="p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-[.08em] text-[#697468]">Rama deportiva</span><select className={DIRECTOR_FIELD} value={branchId} onChange={(event) => setBranchId(event.target.value)}><option value="">Seleccionar</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-[.08em] text-[#697468]">Categoría</span><select className={DIRECTOR_FIELD} value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={!branchId}><option value="">Toda la rama</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-[.08em] text-[#697468]">Alumno para asignar</span><select className={DIRECTOR_FIELD} value={studentId} onChange={(event) => setStudentId(event.target.value)} disabled={!branchId}><option value="">Solo revisar disponibilidad</option>{students.map((student) => <option key={student.id} value={student.id}>{student.nombre}{student.numero_camiseta ? ` · #${student.numero_camiseta}` : ''}</option>)}</select></label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="rounded-2xl border border-[#e0e5de] bg-[#f8faf7] p-4">
            {selectedStudent ? <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#edf4d8] text-[#5e751d]"><UserIcon aria-hidden="true" className="h-5 w-5" /></div><div><p className="font-black text-[#161a17]">{selectedStudent.nombre}</p><p className="text-sm text-[#687068]">{selectedStudent.numero_camiseta ? `Dorsal actual #${selectedStudent.numero_camiseta}` : 'Todavía sin dorsal asignado'}{selectedCategory ? ` · ${selectedCategory.nombre}` : ''}</p></div></div> : <p className="text-sm font-bold text-[#687068]">Selecciona un alumno sólo si quieres asignar un número. El listado respeta la pertenencia real a la rama y categoría elegidas.</p>}
          </div>
          {selectedStudent?.numero_camiseta ? <button type="button" disabled={saving} onClick={() => void assign(null)} className={DIRECTOR_BUTTON_GHOST}>Liberar #{selectedStudent.numero_camiseta}</button> : null}
        </div>
      </DirectorPanel>

      {error ? <div className="rounded-[18px] border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">{error}</div> : null}

      <JerseyNumberPicker
        branchId={branchId}
        categoryId={categoryId || null}
        value={selectedStudent?.numero_camiseta ?? null}
        excludePlayerId={studentId || null}
        selectable={Boolean(studentId) && !saving}
        refreshKey={refreshKey}
        title={selectedStudent ? `Dorsal para ${selectedStudent.nombre}` : 'Disponibilidad de dorsales'}
        description={selectedStudent ? 'Toca una camiseta disponible para asignarla. El servidor vuelve a validar antes de guardar.' : 'Consulta el mapa junto al apoderado o alumno. Selecciona un alumno arriba para habilitar la asignación.'}
        onLoaded={syncScopedStudents}
        onSelect={(number) => void assign(number)}
      />

      <DirectorPanel className="p-5">
        <div className="flex items-start gap-3"><CheckBadgeIcon aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-[#5e751d]" /><div><h3 className="font-black text-[#161a17]">Qué significa cada estado</h3><div className="mt-3 grid gap-2 text-sm text-[#687068] sm:grid-cols-3"><p><strong className="text-[#3f5115]">Disponible:</strong> se puede seleccionar ahora.</p><p><strong className="text-amber-700">Reservado:</strong> una pre-matrícula activa ya solicitó ese número.</p><p><strong className="text-[#4d554e]">Ocupado:</strong> pertenece a uno o más alumnos activos.</p></div></div></div>
      </DirectorPanel>
    </DirectorPage>
  );
};

export default JerseyNumbers;
