// src/pages/PerfilAcademia.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { getAcademyName } from '../config/brand';
import { useAppDialog } from '../contexts/DialogContext';

const emptyForm = {
  nombre: '',
  dias_entrenamiento: '',
  horarios_entrenamiento: '',
  ubicacion_entrenamiento: '',
  dia_vencimiento_mensualidad: '' as number | '',
  dias_aviso_mensualidad: 3,
};

const PerfilAcademia: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { notify } = useAppDialog();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get('/api/academias/mi-academia')
      .then(res => {
        if (res.data.data) {
          setForm({
            ...emptyForm,
            ...res.data.data,
            dia_vencimiento_mensualidad: res.data.data.dia_vencimiento_mensualidad ?? '',
            dias_aviso_mensualidad: res.data.data.dias_aviso_mensualidad ?? 3,
          });
        }
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
      await notify('✅ Perfil y calendario de mensualidades actualizados.', { title: getAcademyName(updatedAcademy?.nombre || form.nombre) });
      navigate('/configuracion');
    } catch (error: any) {
      await notify(error?.response?.data?.error || 'Error al guardar los datos del perfil.', { title: getAcademyName(user?.nombre_academia) });
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

      <form onSubmit={handleSubmit} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 md:p-8 space-y-6 shadow-xl">
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

        <section className="rounded-2xl border border-[#C8A96B]/30 bg-gradient-to-br from-[#171713] to-[#111827] p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#C8A96B]/15 text-2xl">📅</div>
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-[#D8BE87]">Calendario de mensualidades</p>
              <h2 className="mt-1 text-xl font-black text-white">Define cuándo pagan tus apoderados</h2>
              <p className="mt-2 text-sm leading-6 text-[#9ca3af]">Lestra generará automáticamente cada mensualidad. Un alumno recién matriculado comienza a pagar desde el ciclo siguiente y solo se considera moroso después de la fecha de vencimiento.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Día de vencimiento mensual</label>
              <select
                value={form.dia_vencimiento_mensualidad}
                onChange={e => setForm({ ...form, dia_vencimiento_mensualidad: e.target.value ? Number(e.target.value) : '' })}
                className="w-full bg-[#0d1117] border border-[#3b414b] rounded-lg p-3 text-white focus:border-[#C8A96B] outline-none"
              >
                <option value="">Seleccionar día...</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => <option key={day} value={day}>Día {day} de cada mes</option>)}
              </select>
              <p className="mt-2 text-xs text-gray-500">Si eliges 29, 30 o 31 y el mes es más corto, se usa automáticamente el último día de ese mes.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Avisar antes del vencimiento</label>
              <select
                value={form.dias_aviso_mensualidad}
                onChange={e => setForm({ ...form, dias_aviso_mensualidad: Number(e.target.value) })}
                className="w-full bg-[#0d1117] border border-[#3b414b] rounded-lg p-3 text-white focus:border-[#C8A96B] outline-none"
              >
                <option value={0}>Solo el día del vencimiento</option>
                <option value={1}>1 día antes</option>
                <option value={3}>3 días antes</option>
                <option value={5}>5 días antes</option>
                <option value={7}>7 días antes</option>
                <option value={10}>10 días antes</option>
                <option value={15}>15 días antes</option>
              </select>
              <p className="mt-2 text-xs text-gray-500">Antes de vencer se mostrará como “Próximo pago”, nunca como deuda vencida.</p>
            </div>
          </div>

          {!form.dia_vencimiento_mensualidad && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              El calendario todavía no está activo. Selecciona un día para automatizar las mensualidades.
            </div>
          )}
        </section>

        <div className="pt-6 border-t border-[#30363d]">
          <button type="submit" disabled={guardando} className="w-full bg-[#289E9D] hover:bg-[#207f7e] text-white py-4 rounded-lg font-black tracking-widest uppercase transition-colors shadow-lg disabled:opacity-60">
            {guardando ? 'Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PerfilAcademia;
