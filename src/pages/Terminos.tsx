import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { useAcademyMessages } from '../hooks/useAcademyMessages';
import { BRAND } from '../config/brand';

const LEGACY_EMPTY_TEXT = 'Aún no se han establecido los términos y condiciones de la academia.';

const normalizeTerms = (value: unknown) => {
  const text = String(value ?? '').trim();
  if (!text || text === LEGACY_EMPTY_TEXT) return '';
  if (text.startsWith(LEGACY_EMPTY_TEXT)) return text.slice(LEGACY_EMPTY_TEXT.length).trim();
  return text;
};

const Terminos: React.FC = () => {
  const { notify } = useAcademyMessages();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromSetup = new URLSearchParams(location.search).get('setup') === '1';
  const [terminos, setTerminos] = useState('');
  const [savedTerms, setSavedTerms] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cargarTerminos = async () => {
      if (!user?.academia_id) return;
      try {
        setLoading(true);
        const response = await api.get(`/api/academias/${user.academia_id}`);
        const normalized = normalizeTerms(response.data?.data?.terminos_condiciones);
        setTerminos(normalized);
        setSavedTerms(normalized);
      } catch (error) {
        console.error('Error cargando los términos:', error);
        void notify('No fue posible cargar los términos de matrícula.');
      } finally {
        setLoading(false);
      }
    };
    void cargarTerminos();
  }, [user?.academia_id]);

  const handleGuardar = async () => {
    if (!user?.academia_id) return;
    const clean = terminos.trim();
    try {
      setSaving(true);
      await api.put(`/api/academias/${user.academia_id}/terminos`, { terminos_condiciones: clean || null });
      setTerminos(clean);
      setSavedTerms(clean);
      setIsEditing(false);
      void notify(clean
        ? 'Términos de matrícula guardados. Las nuevas pre-matrículas usarán esta versión.'
        : 'Se eliminaron los términos personalizados. Las nuevas pre-matrículas quedarán sin condiciones adicionales.');
    } catch (error: any) {
      console.error('Error al guardar términos:', error);
      void notify(`No fue posible guardar: ${error.response?.data?.message || error.response?.data?.error || 'Error de conexión'}`);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setTerminos(savedTerms);
    setIsEditing(false);
  };

  const handleGenerarPDF = async () => {
    if (!pdfRef.current) return;
    try {
      setGenerandoPDF(true);
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(pdfRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Terminos_y_Condiciones_${user?.nombre_academia?.replace(/\s+/g, '_') || 'Academia'}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      void notify('Hubo un problema al generar el documento PDF.');
    } finally {
      setGenerandoPDF(false);
    }
  };

  if (loading) return <div className="mt-10 text-center font-bold text-[#4f641b]">Cargando documento...</div>;

  const visibleTerms = terminos.trim();
  const termsForPdf = visibleTerms || 'La academia no ha configurado condiciones adicionales de matrícula.';

  return (
    <div className="relative mx-auto max-w-5xl space-y-6 overflow-hidden pb-12">
      <div className="absolute left-[-10000px] top-0">
        <div ref={pdfRef} className="flex min-h-[1130px] w-[800px] flex-col bg-white p-12 font-sans text-black">
          <div className="mb-8 flex items-center justify-between border-b-2 border-gray-800 pb-6">
            {user?.logo_url ? <img src={user.logo_url} className="h-24 w-24 object-contain" alt="Logo" /> : <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 font-bold text-gray-500">LOGO</div>}
            <div className="text-right"><h1 className="text-2xl font-black uppercase text-gray-900">Términos y Condiciones</h1><h2 className="text-lg font-semibold text-gray-600">{user?.nombre_academia || 'Academia Deportiva'}</h2></div>
          </div>
          <div className="flex-1"><h3 className="mb-4 text-center text-lg font-bold underline">CONTRATO DE MATRÍCULA Y REGLAMENTO</h3><div className="whitespace-pre-wrap text-justify text-sm leading-relaxed text-gray-800">{termsForPdf}</div></div>
          <div className="mt-20 grid grid-cols-2 gap-8 border-t border-gray-400 pt-8"><div className="text-center"><div className="mx-auto mb-2 w-48 border-b border-gray-800"/><p className="text-sm font-bold">Firma del Director</p><p className="text-xs text-gray-500">{user?.nombre_completo}</p></div><div className="text-center"><div className="mx-auto mb-2 w-48 border-b border-gray-800"/><p className="text-sm font-bold">Firma del Apoderado / Jugador</p><p className="text-xs text-gray-500">Aceptación de Términos</p></div></div>
        </div>
      </div>

      {fromSetup ? (
        <button
          type="button"
          onClick={() => navigate('/puesta-en-marcha')}
          className="inline-flex min-h-10 items-center gap-2 rounded-full !border !border-[#cfd5c7] !bg-white px-4 py-2 text-sm font-black !text-[#35402f] shadow-sm transition hover:!border-[#9bab85] hover:!bg-[#f6f8f1]"
        >
          <span aria-hidden="true">←</span>
          Volver a Puesta en Marcha
        </button>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-3xl font-black !text-[#172018]">📄 Términos de matrícula</h1><p className="mt-1 text-sm !text-[#7a8375]">Define las condiciones que verá y aceptará el apoderado antes de firmar.</p></div>
        <div className="flex flex-wrap gap-3">
          {!isEditing ? <><button onClick={() => setIsEditing(true)} className="min-h-11 rounded-xl !border !border-[#d3d8ce] !bg-white px-5 py-2.5 font-black !text-[#172018] shadow-sm transition hover:!border-[#aeb8a4] hover:!bg-[#f8faf5]">✏️ Editar texto</button><button onClick={handleGenerarPDF} disabled={generandoPDF} className="min-h-11 rounded-xl !border !border-[#b9e937] !bg-[#b9e937] px-5 py-2.5 font-black !text-[#11170f] shadow-[0_10px_24px_rgba(185,233,55,.18)] transition hover:!bg-[#c5f143] disabled:opacity-50">{generandoPDF ? 'Generando…' : '↓ Descargar PDF'}</button></> : <><button onClick={cancelEdit} className="min-h-11 rounded-xl px-4 py-2 !text-[#687166] hover:!bg-[#eef1e9] hover:!text-[#172018]">Cancelar</button><button onClick={handleGuardar} disabled={saving} className="min-h-11 rounded-xl !border !border-[#b9e937] !bg-[#b9e937] px-6 py-2.5 font-black !text-[#11170f] shadow-[0_10px_24px_rgba(185,233,55,.18)] transition hover:!bg-[#c5f143] disabled:opacity-50">{saving ? 'Guardando...' : '💾 Guardar términos'}</button></>}
        </div>
      </div>

      <section className="rounded-2xl !border !border-[#c8d98a] !bg-[#f1f7dc] p-5 text-sm leading-6 shadow-[0_8px_24px_rgba(55,73,36,.05)]">
        <p className="!text-[#4d6319] font-black">Uso en matrículas</p>
        <p className="mt-1 !text-[#44503f]">Al enviar una pre-matrícula, {BRAND.name} guarda una <b className="!text-[#20291d]">copia exacta de estos términos</b>. El apoderado ve esa copia, la acepta y firma. La misma versión queda incorporada en la matrícula final firmada; cambios posteriores no modifican documentos ya enviados o firmados.</p>
      </section>

      <div className="rounded-2xl !border !border-[#d7dcd2] !bg-[#f8f9f5] p-6 shadow-[0_18px_45px_rgba(31,39,30,.06)]">
        {isEditing ? <div className="space-y-4"><p className="text-sm !text-[#6f796b]">Escribe únicamente las condiciones que aplican a tu academia.</p><textarea value={terminos} onChange={(e) => setTerminos(e.target.value)} className="h-[60vh] w-full resize-none rounded-xl !border !border-[#cdd4c8] !bg-white p-4 leading-relaxed !text-[#20261f] outline-none placeholder:!text-[#9aa395] focus:!border-[#91a774]" placeholder={'Ejemplo:\n1. La matrícula corresponde a...\n2. Las mensualidades vencen...\n3. El alumno y apoderado se comprometen a...'} /></div> : <div className="h-[60vh] overflow-y-auto rounded-xl bg-white p-8"><div className="mx-auto max-w-3xl text-black"><h2 className="mb-6 text-center text-xl font-bold underline">REGLAMENTO Y TÉRMINOS DE MATRÍCULA</h2>{visibleTerms ? <div className="whitespace-pre-wrap text-justify text-sm leading-relaxed text-gray-800">{visibleTerms}</div> : <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">Aún no hay términos personalizados. Pulsa <b>Editar texto</b> para configurar las condiciones que se incluirán en las nuevas matrículas.</div>}</div></div>}
      </div>
    </div>
  );
};

export default Terminos;
