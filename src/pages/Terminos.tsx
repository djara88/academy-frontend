import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { useAcademyMessages } from '../hooks/useAcademyMessages';
import { BRAND } from '../config/brand';
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_DARK,
  DIRECTOR_BUTTON_GHOST,
  DIRECTOR_TEXTAREA,
  DirectorHero,
  DirectorPage,
  DirectorPanel,
} from '../components/director/DirectorModule';

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
        setTerminos(normalized); setSavedTerms(normalized);
      } catch (error) {
        console.error('Error cargando los términos:', error);
        void notify('No fue posible cargar los términos de matrícula.');
      } finally { setLoading(false); }
    };
    void cargarTerminos();
  }, [user?.academia_id]);

  const handleGuardar = async () => {
    if (!user?.academia_id) return;
    const clean = terminos.trim();
    try {
      setSaving(true);
      await api.put(`/api/academias/${user.academia_id}/terminos`, { terminos_condiciones: clean || null });
      setTerminos(clean); setSavedTerms(clean); setIsEditing(false);
      void notify(clean ? 'Términos de matrícula guardados. Las nuevas pre-matrículas usarán esta versión.' : 'Se eliminaron los términos personalizados. Las nuevas pre-matrículas quedarán sin condiciones adicionales.');
    } catch (error: any) {
      console.error('Error al guardar términos:', error);
      void notify(`No fue posible guardar: ${error.response?.data?.message || error.response?.data?.error || 'Error de conexión'}`);
    } finally { setSaving(false); }
  };
  const cancelEdit = () => { setTerminos(savedTerms); setIsEditing(false); };
  const handleGenerarPDF = async () => {
    if (!pdfRef.current) return;
    try {
      setGenerandoPDF(true);
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'),import('jspdf')]);
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
    } finally { setGenerandoPDF(false); }
  };

  if (loading) return <DirectorPanel className="mx-auto max-w-5xl p-12 text-center text-sm font-bold text-[#697468]">Cargando documento...</DirectorPanel>;

  const visibleTerms = terminos.trim();
  const termsForPdf = visibleTerms || 'La academia no ha configurado condiciones adicionales de matrícula.';

  return <DirectorPage className="max-w-5xl">
    <div className="absolute left-[-10000px] top-0">
      <div ref={pdfRef} className="flex min-h-[1130px] w-[800px] flex-col bg-white p-12 font-sans text-black">
        <div className="mb-8 flex items-center justify-between border-b-2 border-gray-800 pb-6">{user?.logo_url ? <img src={user.logo_url} className="h-24 w-24 object-contain" alt="Logo" /> : <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 font-bold text-gray-500">LOGO</div>}<div className="text-right"><h1 className="text-2xl font-black uppercase text-gray-900">Términos y Condiciones</h1><h2 className="text-lg font-semibold text-gray-600">{user?.nombre_academia || 'Academia Deportiva'}</h2></div></div>
        <div className="flex-1"><h3 className="mb-4 text-center text-lg font-bold underline">CONTRATO DE MATRÍCULA Y REGLAMENTO</h3><div className="whitespace-pre-wrap text-justify text-sm leading-relaxed text-gray-800">{termsForPdf}</div></div>
        <div className="mt-20 grid grid-cols-2 gap-8 border-t border-gray-400 pt-8"><div className="text-center"><div className="mx-auto mb-2 w-48 border-b border-gray-800"/><p className="text-sm font-bold">Firma del Director</p><p className="text-xs text-gray-500">{user?.nombre_completo}</p></div><div className="text-center"><div className="mx-auto mb-2 w-48 border-b border-gray-800"/><p className="text-sm font-bold">Firma del Apoderado / Jugador</p><p className="text-xs text-gray-500">Aceptación de Términos</p></div></div>
      </div>
    </div>

    <DirectorHero
      eyebrow="Reglamento de matrícula"
      title="Términos de matrícula"
      description="Define las condiciones propias de tu academia que verá y aceptará el apoderado antes de firmar."
      actions={fromSetup ? <button type="button" onClick={()=>navigate('/puesta-en-marcha')} className={DIRECTOR_BUTTON_DARK}>← Puesta en Marcha</button> : <button type="button" onClick={()=>navigate('/configuracion')} className={DIRECTOR_BUTTON_DARK}>← Configuración</button>}
      aside={<div className="rounded-[20px] border border-white/15 bg-white/[.055] p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b7ff00]">Documento vigente</p><p className="mt-2 text-xl font-black text-white">{visibleTerms ? 'Configurado' : 'Sin texto adicional'}</p><p className="mt-1 text-xs font-semibold text-[#c7d0c8]">Cada pre-matrícula conserva su propia versión.</p></div>}
    />

    <DirectorPanel className="border-[#cde995] bg-[#f3fadf] p-5">
      <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#5f7900]">Uso en matrículas</p>
      <p className="mt-2 text-sm leading-6 text-[#44503f]">Al enviar una pre-matrícula, {BRAND.name} guarda una <strong className="text-[#111711]">copia exacta de estos términos</strong>. El apoderado ve esa copia, la acepta y firma. Cambios posteriores no modifican documentos ya enviados o firmados.</p>
    </DirectorPanel>

    <DirectorPanel className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-[#e2e7df] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Contenido</p><h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Reglamento y condiciones</h2></div>
        <div className="flex flex-wrap gap-2">
          {!isEditing ? <><button onClick={()=>setIsEditing(true)} className={DIRECTOR_BUTTON_GHOST}>Editar texto</button><button onClick={handleGenerarPDF} disabled={generandoPDF} className={DIRECTOR_BUTTON}>{generandoPDF?'Generando…':'Descargar PDF'}</button></> : <><button onClick={cancelEdit} className={DIRECTOR_BUTTON_DARK}>Cancelar</button><button onClick={handleGuardar} disabled={saving} className={DIRECTOR_BUTTON}>{saving?'Guardando...':'Guardar términos'}</button></>}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {isEditing ? <div><p className="mb-3 text-sm text-[#697468]">Escribe únicamente las condiciones que aplican a tu academia.</p><textarea value={terminos} onChange={(e)=>setTerminos(e.target.value)} className={`${DIRECTOR_TEXTAREA} min-h-[52vh] bg-white`} placeholder={'Ejemplo:\n1. La matrícula corresponde a...\n2. Las mensualidades vencen...\n3. El alumno y apoderado se comprometen a...'}/></div> : <div className="min-h-[52vh] rounded-[18px] border border-[#e1e6df] bg-[#fbfcfa] p-6 sm:p-8"><div className="mx-auto max-w-3xl text-[#111711]"><h3 className="mb-6 text-center text-xl font-black underline">REGLAMENTO Y TÉRMINOS DE MATRÍCULA</h3>{visibleTerms ? <div className="whitespace-pre-wrap text-justify text-sm leading-7 text-[#3f4940]">{visibleTerms}</div> : <div className="rounded-[16px] border border-dashed border-[#d5ddd2] bg-white p-8 text-center text-sm text-[#697468]">Aún no hay términos personalizados. Pulsa <strong>Editar texto</strong> para configurar las condiciones que se incluirán en las nuevas matrículas.</div>}</div></div>}
      </div>
    </DirectorPanel>
  </DirectorPage>;
};

export default Terminos;
