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

const field = 'w-full rounded-xl border border-[#cfd8cc] bg-white px-3 py-2.5 text-sm font-bold text-[#111711] outline-none placeholder:text-[#899389] focus:border-[#8eb700]';

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving]);

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

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recognition-catalog-title"
      className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[26px] border border-[#d8dfd5] bg-white text-[#111711] shadow-2xl shadow-black/20"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#e2e7df] bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7a641e]">Reconocimientos · {branch.disciplina}</p>
          <h2 id="recognition-catalog-title" className="mt-1 text-2xl font-black text-[#111711]">Medallas propias de {branch.nombre}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#566356]">Se suman al catálogo estándar de {BRAND.name}. Puedes crear reconocimientos formativos o competitivos propios de tu metodología.</p>
        </div>
        <button type="button" onClick={onClose} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7dfd4] bg-[#f8faf6] text-[#354235] hover:bg-[#eef2eb]" aria-label="Cerrar"><XMarkIcon className="h-5 w-5" /></button>
      </div>

      <div className="space-y-5 p-5 sm:p-7">
        <div className="rounded-2xl border border-[#e4d7bc] bg-[#fbf7ee] p-4">
          <div className="flex items-start gap-3"><SparklesIcon className="mt-0.5 h-6 w-6 shrink-0 text-[#85691f]"/><div><p className="font-black text-[#111711]">Catálogo mixto</p><p className="mt-1 text-sm leading-6 text-[#566356]">Los reconocimientos de {BRAND.name} no se eliminan. Estos son adicionales y quedan disponibles solo para esta rama.</p></div></div>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => <div key={`${item.code}-${index}`} className="rounded-2xl border border-[#dce2d8] bg-[#f8faf6] p-4">
            <div className="grid gap-3 sm:grid-cols-[80px_1fr_170px_auto]">
              <input aria-label="Emoji" maxLength={8} value={item.emoji} onChange={(event) => update(index, { emoji: event.target.value })} className={`${field} text-center text-xl`} />
              <input aria-label="Nombre" maxLength={90} value={item.name} onChange={(event) => update(index, { name: event.target.value })} placeholder="Ej.: Espíritu del dojo" className={field} />
              <select aria-label="Ámbito" value={item.kind} onChange={(event) => update(index, { kind: event.target.value as EditableRecognition['kind'] })} className={field}><option value="formacion">Formación</option><option value="competencia">Competencia</option></select>
              <button type="button" onClick={() => remove(index)} className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-red-700 hover:bg-red-100" aria-label={`Eliminar ${item.name || 'reconocimiento'}`}><TrashIcon className="h-5 w-5" /></button>
            </div>
            <textarea aria-label={`Descripción de ${item.name || `reconocimiento ${index + 1}`}`} maxLength={240} value={item.description} onChange={(event) => update(index, { description: event.target.value })} placeholder="Descripción opcional: qué conducta o logro reconoce" className={`${field} mt-3 min-h-20 resize-y`} />
          </div>)}
          {!items.length ? <div className="rounded-2xl border border-dashed border-[#c8d0c5] bg-[#fafbf9] p-7 text-center text-sm font-semibold text-[#596359]">Aún no hay reconocimientos personalizados. El catálogo estándar por disciplina sigue activo.</div> : null}
          {items.length < 20 ? <button type="button" onClick={add} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-[#b8a36c] bg-[#fffdf8] px-4 text-sm font-black text-[#755d19] hover:bg-[#fbf7ee]"><PlusIcon className="h-5 w-5"/>Agregar reconocimiento</button> : null}
        </div>

        {message ? <div role="status" className="rounded-xl border border-[#e4d7bc] bg-[#fbf7ee] px-4 py-3 text-sm font-semibold leading-6 text-[#674f15]">{message}</div> : null}

        <div className="flex flex-col-reverse gap-3 border-t border-[#e2e7df] pt-5 sm:flex-row sm:justify-between">
          <button type="button" disabled={saving || !initialItems.length} onClick={() => void restore()} className="min-h-11 rounded-xl border border-[#d7dfd4] bg-white px-4 text-sm font-black text-[#354235] hover:bg-[#f8faf6] disabled:opacity-40">Restaurar solo estándar</button>
          <div className="flex gap-3"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[#d7dfd4] bg-white px-4 text-sm font-black text-[#354235] hover:bg-[#f8faf6]">Cerrar</button><button type="button" disabled={saving} onClick={() => void save()} className="min-h-11 rounded-xl bg-[#111711] px-5 text-sm font-black text-white hover:bg-[#242b25] disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar medallas'}</button></div>
        </div>
      </div>
    </div>
  </div>;
}