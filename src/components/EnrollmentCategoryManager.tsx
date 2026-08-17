import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../api/axiosConfig';

type Category = {
  id: string;
  nombre: string;
  rama_id?: string | null;
  sede_id?: string | null;
};

type Props = {
  studentId: string;
  branchId: string;
  branchLabel: string;
  currentCategoryId?: string | null;
  currentCategoryName?: string | null;
  disabled?: boolean;
  onSaved: () => void | Promise<void>;
  onNotice?: (message: string) => void;
};

const field = 'w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#289E9D] disabled:cursor-not-allowed disabled:opacity-50';

export default function EnrollmentCategoryManager({
  studentId,
  branchId,
  branchLabel,
  currentCategoryId,
  currentCategoryName,
  disabled = false,
  onSaved,
  onNotice,
}: Props) {
  const [draft, setDraft] = useState(currentCategoryId || '');

  useEffect(() => {
    setDraft(currentCategoryId || '');
  }, [studentId, branchId, currentCategoryId]);

  const categoriesQuery = useQuery({
    queryKey: ['categorias-rama', branchId],
    enabled: Boolean(branchId),
    queryFn: async () => {
      const response = await api.get('/api/categorias', { params: { rama_id: branchId } });
      return (response.data?.data || []) as Category[];
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Selecciona una categoría.');
      await api.post(`/api/jugadores/${studentId}/categorias`, { categoria_id: draft });
    },
    onSuccess: async () => {
      const selected = (categoriesQuery.data || []).find((category) => category.id === draft);
      onNotice?.(`Categoría ${selected?.nombre || ''} asignada correctamente a ${branchLabel}.`.replace(/\s+/g, ' ').trim());
      await onSaved();
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { error?: string } }; message?: string };
      onNotice?.(apiError.response?.data?.error || apiError.message || 'No fue posible asignar la categoría.');
    },
  });

  const categories = categoriesQuery.data || [];
  const unchanged = Boolean(currentCategoryId) && draft === currentCategoryId;

  return (
    <div className="mt-5 border-t border-white/10 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-black text-white">Categoría en esta rama</p>
          <p className="mt-1 text-xs leading-5 text-[#7f8c9c]">
            La categoría pertenece solo a <strong className="text-[#b9c3cf]">{branchLabel}</strong>; si el alumno practica otra disciplina puede tener una categoría distinta allí.
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${currentCategoryId ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-400/20 bg-amber-500/10 text-amber-300'}`}>
          {currentCategoryName || 'Sin categoría'}
        </span>
      </div>

      {categoriesQuery.isLoading ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm text-[#8995a4]">Cargando categorías...</div>
      ) : categoriesQuery.isError ? (
        <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">No fue posible cargar las categorías de esta rama.</div>
      ) : categories.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-amber-400/25 bg-amber-500/[.06] p-4 text-sm leading-6 text-[#b9a98d]">
          Esta rama todavía no tiene categorías. Créala en <Link to="/configuracion/estructura" className="font-black text-[#D8BE87] underline underline-offset-2">Configuración → Estructura</Link> y vuelve a la ficha.
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={disabled || assignMutation.isPending}
            className={field}
          >
            <option value="">Selecciona categoría</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}
          </select>
          <button
            type="button"
            disabled={disabled || !draft || unchanged || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
            className="min-h-11 shrink-0 rounded-xl bg-violet-500 px-4 text-sm font-black text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {assignMutation.isPending ? 'Asignando...' : currentCategoryId ? 'Cambiar categoría' : 'Asignar categoría'}
          </button>
        </div>
      )}
    </div>
  );
}
