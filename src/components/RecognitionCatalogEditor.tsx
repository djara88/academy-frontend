import { useEffect, useState } from 'react';
import { PlusIcon, SparklesIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { BRAND } from '../config/brand';

export type RecognitionDefinition = {
  code: string;
  name: string;
  emoji: string;
  kind: 'formacion' | 'competencia';
  description?: string | null;
  source: 'syncademia' | 'academy';
};

type Branch = { id: string; nombre: string; disciplina: string };
type EditableRecognition = Pick<RecognitionDefinition, 'code' | 'name' | 'emoji' | 'kind'> & { description: string };

type Props = {
  branch: Branch;
  initialItems: RecognitionDefinition[];
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
};

const field = 'w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#C8A96B]/70';

const toEditable = (item: RecognitionDefinition): EditableRecognition => ({
  code: item.code.replace(/^custom_/, ''),
  name: item.name,
  emoji: item.emoji || '🏅',
  kind: item.kind,
  description: item.description || '',
});

export default function RecognitionCatalogEditor({ branch, initialItems, onClose, onSaved }: Props) {
  const [items, setItems] = useState<EditableRecognition[]>(initialItems.map(toEditable));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { setItems(initialItems.map(toEditable)); }, [branch.id, initialItems]);

  const add = () => {
    if (items.length >= 20) return;
    setItems((current) => [...current, {
      code: `reconocimiento_${Date.now()}`,
      name: '',
      emoji: '🏅',
      kind: 'formacion',
      description: '',
    }]);
  };

  const update = (index: number, patch: Partial<EditableRecognition>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const remove = (index: number) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));

  const save = async () => {
    const valid = items.filter((item) => item.name.trim());
    setSaving(true);
    setMessage('');
    try {
      await api.put(`/api/alumnos/ramas/${branch.id}/reconocimientos-config`, {
        items: valid.map((item) => ({
          code: item.code,
          name: item.name.trim(),
          emoji: item.emoji.trim() || '🏅',
          kind: item.kind,
          description: item.description.trim(),
        })),
      });
      setMessage('Reconocimientos personalizados guardados para esta rama.');
      await onSaved?.();
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      setMessage(apiError.response?.data?.error || 'No fue posible guardar los reconocimientos.');
    } finally {
      setSaving(false);
    }
  };

  const restore = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.delete(`/api/alumnos/ramas/${branch.id}/reconocimientos-config`);
      setItems([]);
      setMessage(`Se restauró el catálogo estándar de ${BRAND.name} para esta disciplina.`);
      await onSaved?.();
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      setMessage(apiError.response?.data?.error || 'No fue posible restaurar el catálogo estándar.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
    <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#151b25] shadow-2xl shadow-black/50">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[#151b25]/95 px-5 py-5 backdrop-blur sm:px-7">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D8BE87]">Reconocimientos · {branch.disciplina}</p>
          <h2 className="mt-1 text-2xl font-black text-white">Medallas propias de {branch.nombre}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8995a4]">Se suman al catálogo estándar de {BRAND.name}. Puedes crear reconocimientos formativos o competitivos propios de tu metodología.</p>
        </div>
        <button onClick={onClose} className="rounded-xl border border-white/10 p-2 text-[#9aa6b5] hover:bg-white/5 hover:text-white" aria-label="Cerrar"><XMarkIcon className="h-5 w-5" /></button>
      </div>

      <div className="space-y-5 p-5 sm:p-7">
        <div className="rounded-2xl border border-[#C8A96B]/25 bg-[#C8A96B]/[.07] p-4">
          <div className="flex items-start gap-3"><SparklesIcon className="mt-0.5 h-6 w-6 shrink-0 text-[#D8BE87]"/><div><p className="font-black text-white">Catálogo mixto</p><p className="mt-1 text-sm leading-6 text-[#9aa6b5]">Los reconocimientos de {BRAND.name} no se eliminan. Estos son adicionales y quedan disponibles solo para esta rama.</p></div></div>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => <div key={`${item.code}-${index}`} className="rounded-2xl border border-white/10 bg-[#0d1117] p-4">
            <div className="grid gap-3 sm:grid-cols-[80px_1fr_170px_auto]">
              <input aria-label="Emoji" maxLength={8} value={item.emoji} onChange={(event) => update(index, { emoji: event.target.value })} className={`${field} text-center text-xl`} />
              <input aria-label="Nombre" maxLength={90} value={item.name} onChange={(event) => update(index, { name: event.target.value })} placeholder="Ej.: Espíritu del dojo" className={field} />
              <select aria-label="Ámbito" value={item.kind} onChange={(event) => update(index, { kind: event.target.value as EditableRecognition['kind'] })} className={field}><option value="formacion">Formación</option><option value="competencia">Competencia</option></select>
              <button onClick={() => remove(index)} className="rounded-xl border border-red-400/15 p-2.5 text-red-300 hover:bg-red-500/10" aria-label={`Eliminar ${item.name || 'reconocimiento'}`}><TrashIcon className="h-5 w-5" /></button>
            </div>
            <textarea maxLength={240} value={item.description} onChange={(event) => update(index, { description: event.target.value })} placeholder="Descripción opcional: qué conducta o logro reconoce" className={`${field} mt-3 min-h-20 resize-y`} />
          </div>)}
          {!items.length ? <div className="rounded-2xl border border-dashed border-white/10 p-7 text-center text-sm text-[#7f8c9c]">Aún no hay reconocimientos personalizados. El catálogo estándar por disciplina sigue activo.</div> : null}
          {items.length < 20 ? <button onClick={add} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-[#C8A96B]/40 px-4 text-sm font-black text-[#D8BE87] hover:bg-[#C8A96B]/[.07]"><PlusIcon className="h-5 w-5"/>Agregar reconocimiento</button> : null}
        </div>

        {message ? <div className="rounded-xl border border-[#C8A96B]/25 bg-[#C8A96B]/10 px-4 py-3 text-sm leading-6 text-[#f3dfb5]">{message}</div> : null}

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-between">
          <button disabled={saving || !initialItems.length} onClick={() => void restore()} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-black text-[#c3ccd6] hover:bg-white/5 disabled:opacity-40">Restaurar solo estándar</button>
          <div className="flex gap-3"><button onClick={onClose} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-black text-[#c3ccd6] hover:bg-white/5">Cerrar</button><button disabled={saving} onClick={() => void save()} className="min-h-11 rounded-xl bg-[#C8A96B] px-5 text-sm font-black text-[#15120c] hover:bg-[#d8be87] disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar medallas'}</button></div>
        </div>
      </div>
    </div>
  </div>;
}
