import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Terminos: React.FC = () => {
  const { user } = useAuth();
  
  const [terminos, setTerminos] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [generandoPDF, setGenerandoPDF] = useState<boolean>(false);

  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cargarTerminos = async () => {
      if (!user?.academia_id) return;
      try {
        setLoading(true);
        const response = await api.get(`/api/academias/${user.academia_id}`);
        const data = response.data.data;
        
        if (data && data.terminos_condiciones) {
          setTerminos(data.terminos_condiciones);
        } else {
          setTerminos('Aún no se han establecido los términos y condiciones de la academia.');
        }
      } catch (error) {
        console.error('Error cargando los términos:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarTerminos();
  }, [user?.academia_id]);

  const handleGuardar = async () => {
    if (!user?.academia_id) return;
    try {
      setSaving(true);
      
      await api.put(`/api/academias/${user.academia_id}/terminos`, {
        terminos_condiciones: terminos
      });
      
      setIsEditing(false);
      alert('✅ Términos y condiciones guardados con éxito.');
    } catch (error: any) {
      console.error('Error al guardar términos:', error);
      alert(`❌ Error al guardar: ${error.response?.data?.message || 'Error de conexión'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerarPDF = async () => {
    if (!pdfRef.current) return;
    try {
      setGenerandoPDF(true);
      
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Terminos_y_Condiciones_${user?.nombre_academia?.replace(/\s+/g, '_')}.pdf`);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Hubo un problema al generar el documento PDF.');
    } finally {
      setGenerandoPDF(false);
    }
  };

  if (loading) {
    return <div className="text-[#289E9D] text-center mt-10 font-bold">Cargando documento...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative overflow-hidden">
      
      {/* PLANTILLA OCULTA PARA EL PDF */}
      <div className="absolute left-[-10000px] top-0">
        <div ref={pdfRef} className="w-[800px] min-h-[1130px] bg-white text-black p-12 font-sans flex flex-col">
          <div className="flex justify-between items-center border-b-2 border-gray-800 pb-6 mb-8">
            {user?.logo_url ? (
              <img src={user.logo_url} className="w-24 h-24 object-contain" alt="Logo" />
            ) : (
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">LOGO</div>
            )}
            <div className="text-right">
              <h1 className="text-2xl font-black uppercase text-gray-900">Términos y Condiciones</h1>
              <h2 className="text-lg text-gray-600 font-semibold">{user?.nombre_academia || 'Academia Deportiva'}</h2>
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-4 text-center underline">CONTRATO DE MATRÍCULA Y REGLAMENTO</h3>
            <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap text-justify">
              {terminos}
            </div>
          </div>

          <div className="mt-20 pt-8 border-t border-gray-400 grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="border-b border-gray-800 w-48 mx-auto mb-2"></div>
              <p className="font-bold text-sm">Firma del Director</p>
              <p className="text-xs text-gray-500">{user?.nombre_completo}</p>
            </div>
            <div className="text-center">
              <div className="border-b border-gray-800 w-48 mx-auto mb-2"></div>
              <p className="font-bold text-sm">Firma del Apoderado / Jugador</p>
              <p className="text-xs text-gray-500">Aceptación de Términos</p>
            </div>
          </div>
        </div>
      </div>

      {/* INTERFAZ DE USUARIO */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#e6edf3]">📄 Términos y Condiciones</h1>
        <div className="flex gap-3">
          {!isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(true)} 
                className="bg-[#21262d] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#30363d] border border-[#30363d]"
              >
                ✏️ Editar Texto
              </button>
              <button 
                onClick={handleGenerarPDF} 
                disabled={generandoPDF}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50"
              >
                {generandoPDF ? 'Generando...' : '📄 Descargar PDF'}
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setIsEditing(false)} 
                className="bg-transparent text-gray-400 px-4 py-2 hover:text-white"
              >
                Cancelar
              </button>
              <button 
                onClick={handleGuardar} 
                disabled={saving}
                className="bg-[#289E9D] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#207f7e] disabled:opacity-50"
              >
                {saving ? 'Guardando...' : '💾 Guardar Definitivo'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-[#0d1117] p-6 rounded-xl border border-[#30363d] shadow-lg">
        {isEditing ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Modifica los términos, condiciones y reglamento interno de tu academia.
            </p>
            <textarea
              value={terminos}
              onChange={(e) => setTerminos(e.target.value)}
              className="w-full h-[60vh] bg-[#161b22] text-gray-200 border border-[#30363d] rounded-lg p-4 outline-none focus:border-[#289E9D] leading-relaxed resize-none"
              placeholder="Escribe aquí los términos de matrícula..."
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg p-8 h-[60vh] overflow-y-auto">
            <div className="max-w-3xl mx-auto text-black">
              <h2 className="font-bold text-xl text-center mb-6 underline">REGLAMENTO Y TÉRMINOS DE MATRÍCULA</h2>
              <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap text-justify">
                {terminos}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Terminos;
