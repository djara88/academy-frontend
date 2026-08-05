import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

export default function Terminos() {
  const { user } = useAuth();
  const [terminos, setTerminos] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Cargar términos actuales (opcional, si tienes un endpoint para obtener la academia, puedes llamarlo aquí)
  // Por ahora, le damos un lienzo en blanco o los términos por defecto.
  useEffect(() => {
    setTerminos('1. El apoderado se compromete a...\n2. El pago debe realizarse...\n3. El jugador deberá...');
  }, []);

  const handleGuardar = async () => {
    if (!user?.academia_id) return;
    setGuardando(true);
    setMensaje('');
    try {
      await api.put(`/api/academias/${user.academia_id}/terminos`, {
        terminos_matricula: terminos
      });
      setMensaje('✅ Términos guardados exitosamente. Aparecerán en los próximos PDFs.');
    } catch (error) {
      console.error(error);
      setMensaje('❌ Hubo un error al guardar los términos.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-[#e6edf3]">⚖️ Términos y Condiciones</h1>
      
      <div className="card-uniforme p-6">
        <p className="text-sm text-gray-400 mb-4">
          Escribe aquí las reglas, condiciones y términos de tu academia. 
          Separa cada punto con un <strong>Salto de Línea (Enter)</strong>. El sistema los numerará automáticamente en el comprobante de matrícula PDF.
        </p>

        <textarea
          className="w-full h-64 bg-[#0d1117] border border-[#30363d] rounded-lg p-4 text-white focus:border-[#289E9D] outline-none resize-none"
          value={terminos}
          onChange={(e) => setTerminos(e.target.value)}
          placeholder="1. El apoderado se compromete a..."
        />

        {mensaje && (
          <div className={`mt-4 p-3 rounded ${mensaje.includes('✅') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            {mensaje}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="bg-[#289E9D] hover:bg-[#207f7e] text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            {guardando ? 'Guardando...' : 'Guardar Términos'}
          </button>
        </div>
      </div>
    </div>
  );
}
