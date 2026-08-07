// src/pages/NuevoTorneo.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

const NuevoTorneo: React.FC = () => {
  const navigate = useNavigate();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    costo_inscripcion: 0,
    permite_cuotas: false,
    max_cuotas: 2,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    try {
      await api.post('/api/torneos', formData);
      navigate('/torneos'); // Redirige a la lista de torneos al guardar
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al crear el torneo. Inténtalo nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/torneos')} className="text-gray-400 hover:text-white transition-colors">
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-[#e6edf3]">🏆 Configurar Nuevo Torneo</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* BLOQUE 1: DATOS GENERALES */}
        <div className="bg-[#0d1117] border border-[#30363d] p-6 rounded-xl space-y-4">
          <h2 className="text-xl font-bold text-white border-b border-[#30363d] pb-2">1. Información General</h2>
          
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-1">Nombre del Torneo/Campeonato *</label>
            <input 
              type="text" 
              name="nombre" 
              required 
              value={formData.nombre} 
              onChange={handleChange} 
              placeholder="Ej: Copa de Invierno 2026" 
              className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-white focus:outline-none focus:border-[#289E9D]" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-1">Fecha de Inicio</label>
              <input 
                type="date" 
                name="fecha_inicio" 
                value={formData.fecha_inicio} 
                onChange={handleChange} 
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-white focus:outline-none focus:border-[#289E9D]" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-1">Fecha de Término (Aprox)</label>
              <input 
                type="date" 
                name="fecha_fin" 
                value={formData.fecha_fin} 
                onChange={handleChange} 
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-white focus:outline-none focus:border-[#289E9D]" 
              />
            </div>
          </div>
        </div>

        {/* BLOQUE 2: FINANZAS */}
        <div className="bg-[#0d1117] border border-[#30363d] p-6 rounded-xl space-y-4">
          <h2 className="text-xl font-bold text-white border-b border-[#30363d] pb-2">2. Condiciones Financieras</h2>
          <p className="text-sm text-gray-400">Define el costo de inscripción por jugador. El bot de WhatsApp usará esta información al enviar las convocatorias.</p>
          
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-1">Costo de Inscripción (Por jugador)</label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-500 font-bold">$</span>
              <input 
                type="number" 
                name="costo_inscripcion" 
                min="0"
                value={formData.costo_inscripcion} 
                onChange={handleChange} 
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-3 pl-8 text-white focus:outline-none focus:border-[#289E9D]" 
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Déjalo en 0 si la participación es gratuita.</p>
          </div>

          <div className="mt-6 flex items-center justify-between bg-[#161b22] p-4 rounded-lg border border-[#30363d]">
            <div>
              <h3 className="font-bold text-white">💳 Permitir Pago en Cuotas</h3>
              <p className="text-xs text-gray-400">Si se activa, el bot le preguntará al apoderado en cuántas cuotas desea pagar.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                name="permite_cuotas" 
                checked={formData.permite_cuotas} 
                onChange={handleChange} 
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#289E9D]"></div>
            </label>
          </div>

          {formData.permite_cuotas && (
            <div className="pt-2 animate-fade-in-down">
              <label className="block text-sm font-semibold text-gray-400 mb-1">Máximo de cuotas permitidas</label>
              <select 
                name="max_cuotas" 
                value={formData.max_cuotas} 
                onChange={handleChange} 
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-white focus:outline-none focus:border-[#289E9D]"
              >
                <option value="2">Hasta 2 cuotas</option>
                <option value="3">Hasta 3 cuotas</option>
                <option value="4">Hasta 4 cuotas</option>
                <option value="5">Hasta 5 cuotas</option>
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/50 text-red-400 p-3 rounded font-semibold text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={guardando} 
            className="bg-[#289E9D] hover:bg-[#207f7e] text-white px-8 py-3 rounded-lg font-bold text-lg transition-colors shadow-lg shadow-[#289E9D]/20"
          >
            {guardando ? 'Guardando...' : 'Crear Torneo'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NuevoTorneo;
