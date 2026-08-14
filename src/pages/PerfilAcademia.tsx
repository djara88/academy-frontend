// src/pages/PerfilAcademia.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { getAcademyName } from '../config/brand';
import { useAppDialog } from '../contexts/DialogContext';

const PerfilAcademia: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { notify } = useAppDialog();
  const [form, setForm] = useState({ 
    nombre: '', 
    dias_entrenamiento: '', 
    horarios_entrenamiento: '', 
    ubicacion_entrenamiento: '' 
  });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get('/api/academias/mi-academia')
      .then(res => {
        if (res.data.data) setForm(res.data.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const response = await api.put('/api/academias/mi-academia', form);
      const updatedAcademy = response.data?.data;
      if (updatedAcademy?.nombre) {
        setUser(current => {
          if (!current) return current;
          const updatedUser = { ...current, nombre_academia: updatedAcademy.nombre };
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
          return updatedUser;
        });
      }
      await notify('✅ Perfil actualizado correctamente.', { title: getAcademyName(updatedAcademy?.nombre || form.nombre) });
      navigate('/configuracion');
    } catch (error) {
      await notify('Error al guardar los datos del perfil.', { title: getAcademyName(user?.nombre_academia) });
    } finally {
      setGuardando(false);
    }
  };

  if (loading) return <div className="text-center text-[#289E9D] mt-10">Cargando perfil...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/configuracion')} className="text-gray-400 hover:text-white transition-colors">
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-[#e6edf3]">🏟️ Perfil de {getAcademyName(form.nombre || user?.nombre_academia)}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-8 space-y-6 shadow-xl">
        <div>
          <label className="block text-sm font-semibold text-gray-400 mb-2">Nombre de la Academia</label>
          <input type="text" value={form.nombre || ''} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-white focus:border-[#289E9D] outline-none" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-400 mb-2">Días de Entrenamiento</label>
          <input type="text" value={form.dias_entrenamiento || ''} onChange={e => setForm({...form, dias_entrenamiento: e.target.value})} placeholder="Ej: Lunes, Miércoles y Viernes" className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-white focus:border-[#289E9D] outline-none" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-400 mb-2">Horarios</label>
          <input type="text" value={form.horarios_entrenamiento || ''} onChange={e => setForm({...form, horarios_entrenamiento: e.target.value})} placeholder="Ej: 17:00 a 19:30 hrs" className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-white focus:border-[#289E9D] outline-none" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-400 mb-2">Ubicación / Cancha Principal</label>
          <input type="text" value={form.ubicacion_entrenamiento || ''} onChange={e => setForm({...form, ubicacion_entrenamiento: e.target.value})} placeholder="Ej: Complejo Deportivo Cordillera, Cancha 2" className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-white focus:border-[#289E9D] outline-none" />
        </div>

        <div className="pt-6 border-t border-[#30363d]">
          <button type="submit" disabled={guardando} className="w-full bg-[#289E9D] hover:bg-[#207f7e] text-white py-4 rounded-lg font-black tracking-widest uppercase transition-colors shadow-lg">
            {guardando ? 'Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PerfilAcademia;
