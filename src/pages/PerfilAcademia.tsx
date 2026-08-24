import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { getAcademyName } from '../config/brand';
import { useAppDialog } from '../contexts/DialogContext';
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_DARK,
  DIRECTOR_FIELD,
  DirectorHero,
  DirectorPage,
  DirectorPanel,
} from '../components/director/DirectorModule';

const emptyForm = {
  nombre: '',
  dias_entrenamiento: '',
  horarios_entrenamiento: '',
  ubicacion_entrenamiento: '',
  dia_vencimiento_mensualidad: '' as number | '',
  dias_aviso_mensualidad: 3,
};
const labelClass='mb-1.5 block text-[11px] font-black uppercase tracking-[.09em] text-[#697468]';

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
      await notify('Perfil y calendario de mensualidades actualizados.', { title: getAcademyName(updatedAcademy?.nombre || form.nombre) });
      navigate('/configuracion');
    } catch (error: any) {
      await notify(error?.response?.data?.error || 'Error al guardar los datos del perfil.', { title: getAcademyName(user?.nombre_academia) });
    } finally {
      setGuardando(false);
    }
  };

  if (loading) return <DirectorPanel className="mx-auto max-w-3xl p-10 text-center text-sm font-bold text-[#697468]">Cargando perfil...</DirectorPanel>;

  return (
    <DirectorPage className="max-w-5xl">
      <DirectorHero
        eyebrow="Perfil y operación"
        title={getAcademyName(form.nombre || user?.nombre_academia)}
        description="Actualiza los datos generales de la academia, su referencia de entrenamiento y el calendario que utilizará Lestra para las mensualidades."
        actions={<button type="button" onClick={()=>navigate('/configuracion')} className={DIRECTOR_BUTTON_DARK}>← Configuración</button>}
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <DirectorPanel className="p-5 sm:p-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Datos generales</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Identidad y entrenamiento</h2>
            <p className="mt-1 text-sm text-[#697468]">Estos datos sirven como referencia general para la operación de la academia.</p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className={labelClass}>Nombre de la academia</span><input type="text" value={form.nombre || ''} onChange={e => setForm({...form, nombre: e.target.value})} className={DIRECTOR_FIELD}/></label>
            <label><span className={labelClass}>Días de entrenamiento</span><input type="text" value={form.dias_entrenamiento || ''} onChange={e => setForm({...form, dias_entrenamiento: e.target.value})} placeholder="Ej.: Lunes, miércoles y viernes" className={DIRECTOR_FIELD}/></label>
            <label><span className={labelClass}>Horarios</span><input type="text" value={form.horarios_entrenamiento || ''} onChange={e => setForm({...form, horarios_entrenamiento: e.target.value})} placeholder="Ej.: 17:00 a 19:30 hrs" className={DIRECTOR_FIELD}/></label>
            <label className="sm:col-span-2"><span className={labelClass}>Ubicación / cancha principal</span><input type="text" value={form.ubicacion_entrenamiento || ''} onChange={e => setForm({...form, ubicacion_entrenamiento: e.target.value})} placeholder="Ej.: Complejo Deportivo Cordillera, Cancha 2" className={DIRECTOR_FIELD}/></label>
          </div>
        </DirectorPanel>

        <DirectorPanel className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#111711] text-2xl">📅</div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Calendario de mensualidades</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Define cuándo pagan tus apoderados</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#697468]">Lestra genera automáticamente cada mensualidad. Un alumno recién matriculado comienza a pagar desde el ciclo siguiente y solo se considera moroso después del vencimiento.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label><span className={labelClass}>Día de vencimiento mensual</span><select value={form.dia_vencimiento_mensualidad} onChange={e => setForm({ ...form, dia_vencimiento_mensualidad: e.target.value ? Number(e.target.value) : '' })} className={DIRECTOR_FIELD}><option value="">Seleccionar día...</option>{Array.from({ length: 31 }, (_, i) => i + 1).map(day => <option key={day} value={day}>Día {day} de cada mes</option>)}</select><p className="mt-2 text-xs leading-5 text-[#7a8477]">Si eliges 29, 30 o 31 y el mes es más corto, se usa automáticamente el último día de ese mes.</p></label>
            <label><span className={labelClass}>Avisar antes del vencimiento</span><select value={form.dias_aviso_mensualidad} onChange={e => setForm({ ...form, dias_aviso_mensualidad: Number(e.target.value) })} className={DIRECTOR_FIELD}><option value={0}>Solo el día del vencimiento</option><option value={1}>1 día antes</option><option value={3}>3 días antes</option><option value={5}>5 días antes</option><option value={7}>7 días antes</option><option value={10}>10 días antes</option><option value={15}>15 días antes</option></select><p className="mt-2 text-xs leading-5 text-[#7a8477]">Antes de vencer se mostrará como “Próximo pago”, nunca como deuda vencida.</p></label>
          </div>

          {!form.dia_vencimiento_mensualidad ? <div className="mt-4 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">El calendario todavía no está activo. Selecciona un día para automatizar las mensualidades.</div> : null}
        </DirectorPanel>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={()=>navigate('/configuracion')} className={DIRECTOR_BUTTON_DARK}>Cancelar</button>
          <button type="submit" disabled={guardando} className={DIRECTOR_BUTTON}>{guardando ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      </form>
    </DirectorPage>
  );
};

export default PerfilAcademia;
