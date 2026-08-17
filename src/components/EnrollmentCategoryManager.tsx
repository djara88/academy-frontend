import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import StudentReportCard from './StudentReportCard';

type Category = {
  id: string;
  nombre: string;
  rama_id?: string | null;
  sede_id?: string | null;
};

type MembershipPayload = {
  categorias: Category[];
  categoria_referencia_id?: string | null;
  inscripcion_id?: string | null;
  rama_id?: string | null;
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
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ['categorias-rama', branchId],
    enabled: Boolean(branchId),
    queryFn: async () => {
      const response = await api.get('/api/categorias', { params: { rama_id: branchId } });
      return (response.data?.data || []) as Category[];
    },
  });

  const membershipsQuery = useQuery({
    queryKey: ['categorias-alumno-rama', studentId, branchId],
    enabled: Boolean(studentId && branchId),
    queryFn: async () => {
      const response = await api.get(`/api/jugadores/${studentId}/categorias`, { params: { rama_id: branchId } });
      return (response.data?.data || { categorias: [] }) as MembershipPayload;
    },
  });

  const assignedIds = useMemo(
    () => new Set((membershipsQuery.data?.categorias || []).map((category) => category.id)),
    [membershipsQuery.data?.categorias],
  );
  const referenceId = membershipsQuery.data?.categoria_referencia_id || currentCategoryId || null;
  const assigned = membershipsQuery.data?.categorias || [];

  const membershipMutation = useMutation({
    mutationFn: async ({ categoryId, assignedNow }: { categoryId: string; assignedNow: boolean }) => {
      if (assignedNow) {
        await api.delete(`/api/jugadores/${studentId}/categorias/${categoryId}`);
      } else {
        await api.post(`/api/jugadores/${studentId}/categorias`, { categoria_id: categoryId });
      }
      return { categoryId, assignedNow };
    },
    onSuccess: async ({ categoryId, assignedNow }) => {
      const selected = (categoriesQuery.data || []).find((category) => category.id === categoryId);
      onNotice?.(
        assignedNow
          ? `${selected?.nombre || 'La categoría'} fue retirada de ${branchLabel}.`
          : `${selected?.nombre || 'La categoría'} fue agregada a ${branchLabel}.`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['categorias-alumno-rama', studentId, branchId] }),
        onSaved(),
      ]);
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { error?: string } }; message?: string };
      onNotice?.(apiError.response?.data?.error || apiError.message || 'No fue posible actualizar las categorías.');
    },
  });

  const categories = categoriesQuery.data || [];
  const loading = categoriesQuery.isLoading || membershipsQuery.isLoading;
  const failed = categoriesQuery.isError || membershipsQuery.isError;

  return (
    <div className="mt-5 border-t border-white/10 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-black text-white">Categorías en esta rama</p>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#7f8c9c]">
            Un alumno puede pertenecer a <strong className="text-[#b9c3cf]">una o varias categorías</strong> dentro de {branchLabel}. Las categorías de otras ramas permanecen totalmente separadas.
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${assigned.length ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-400/20 bg-amber-500/10 text-amber-300'}`}>
          {assigned.length ? `${assigned.length} ${assigned.length === 1 ? 'categoría' : 'categorías'}` : currentCategoryName || 'Sin categoría'}
        </span>
      </div>

      {loading ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm text-[#8995a4]">Cargando categorías...</div>
      ) : failed ? (
        <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">No fue posible cargar las categorías de esta rama.</div>
      ) : categories.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-amber-400/25 bg-amber-500/[.06] p-4 text-sm leading-6 text-[#b9a98d]">
          Esta rama todavía no tiene categorías. Créala en <Link to="/configuracion/estructura" className="font-black text-[#D8BE87] underline underline-offset-2">Configuración → Estructura</Link> y vuelve a la ficha.
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const isAssigned = assignedIds.has(category.id);
            const isReference = String(referenceId || '') === String(category.id);
            const busy = membershipMutation.isPending && membershipMutation.variables?.categoryId === category.id;
            return (
              <button
                key={category.id}
                type="button"
                disabled={disabled || membershipMutation.isPending}
                onClick={() => membershipMutation.mutate({ categoryId: category.id, assignedNow: isAssigned })}
                className={`group flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${isAssigned ? 'border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/15' : 'border-white/10 bg-[#0d1117] hover:border-violet-400/30 hover:bg-violet-500/[.06]'}`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${isAssigned ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300' : 'border-white/10 bg-white/5 text-[#7f8c9c]'}`}>
                  {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : isAssigned ? <CheckIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-black ${isAssigned ? 'text-emerald-100' : 'text-white'}`}>{category.nombre}</span>
                  <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-[#697586]">
                    {isReference ? 'Referencia de la rama' : isAssigned ? 'Asignada · clic para quitar' : 'Clic para agregar'}
                  </span>
                </span>
                {isAssigned ? <XMarkIcon className="h-4 w-4 shrink-0 text-emerald-300/60 opacity-0 transition group-hover:opacity-100" /> : null}
              </button>
            );
          })}
        </div>
      )}

      {assigned.length > 1 ? (
        <p className="mt-3 text-[11px] leading-5 text-[#697586]">
          La etiqueta “Referencia de la rama” mantiene compatibilidad con funciones antiguas que esperan una sola categoría; <strong className="text-[#8995a4]">no limita</strong> la pertenencia del alumno a las demás categorías seleccionadas.
        </p>
      ) : null}

      <StudentReportCard
        studentId={studentId}
        branchId={branchId}
        branchLabel={branchLabel}
        disabled={disabled}
        onNotice={onNotice}
      />
    </div>
  );
}
