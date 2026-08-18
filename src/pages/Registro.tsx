import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../config/supabase';
import api from '../api/axiosConfig';
import { Logo } from '../components/Logo';
import { BRAND } from '../config/brand';
import { useAppDialog } from '../contexts/DialogContext';
import { PASSWORD_REQUIREMENTS, validateStrongPassword } from '../utils/passwordPolicy';
import { DISCIPLINES, defaultBranchName } from '../config/disciplines';

const Registro: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useAppDialog();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nombre_academia: '',
    nombre_director: '',
    email: '',
    password: '',
    disciplina_principal: 'Fútbol',
    nombre_rama_principal: 'Fútbol',
    nombre_sede_principal: 'Sede Principal',
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const changeDiscipline = (discipline: string) => {
    setFormData((current) => ({
      ...current,
      disciplina_principal: discipline,
      nombre_rama_principal:
        !current.nombre_rama_principal || current.nombre_rama_principal === defaultBranchName(current.disciplina_principal)
          ? defaultBranchName(discipline)
          : current.nombre_rama_principal,
    }));
  };

  const handleRegistroManual = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!validateStrongPassword(formData.password)) return setError(PASSWORD_REQUIREMENTS);
    if (!formData.disciplina_principal || !formData.nombre_rama_principal.trim()) {
      return setError('Selecciona la disciplina principal e indica el nombre de la primera rama.');
    }

    setLoading(true);
    try {
      const response = await api.post('/api/academias/registro-publico', formData);
      if (response.data?.success) {
        await notify(`¡${formData.nombre_academia} fue creada con su rama principal ${formData.nombre_rama_principal}! Inicia sesión con tus credenciales.`, { title: BRAND.name });
        navigate('/login');
      }
    } catch (err: any) {
      console.error('Error en registro:', err);
      setError(err.response?.data?.error || 'Ocurrió un error al crear tu cuenta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/completar-perfil` },
      });
      if (oauthError) throw oauthError;
    } catch (err: any) {
      console.error('Error con Google:', err);
      setError('No se pudo conectar con Google. Intenta de nuevo.');
      setLoading(false);
    }
  };

  const fieldClass = 'w-full rounded-xl border border-white/10 bg-[#070B14] p-3.5 text-white outline-none transition placeholder:text-[#536073] focus:border-[#3157FF] focus:ring-2 focus:ring-[#3157FF]/15';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070B14] p-4 font-sans text-white sm:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(49,87,255,.22),transparent_28%),radial-gradient(circle_at_88%_72%,rgba(184,255,61,.08),transparent_27%)]" />
      <div className="relative mx-auto w-full max-w-2xl rounded-[30px] border border-white/10 bg-[#0B1220]/95 p-6 shadow-[0_32px_100px_rgba(0,0,0,.46)] backdrop-blur-xl sm:p-9">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] border border-[#3157FF]/40 bg-[#09101d] p-3 shadow-[0_18px_55px_rgba(49,87,255,.25)]"><Logo variant="mark" className="h-full w-full" /></div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B8FF3D]">15 días Full · sin tarjeta</p>
          <h1 className="mt-2 text-3xl font-black text-white">Crea tu academia en {BRAND.name}</h1>
          <p className="mt-2 text-sm leading-6 text-[#8D99AA]">La primera sede y rama quedan listas desde el inicio. Después podrás crecer a más disciplinas, categorías y sedes según tu plan.</p>
        </div>

        <button type="button" onClick={handleGoogleLogin} disabled={loading} className="mb-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-bold text-gray-900 transition hover:bg-gray-100 disabled:opacity-50">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
          <span>Continuar con Google</span>
        </button>

        <div className="mb-6 flex items-center"><div className="flex-grow border-t border-white/10"/><span className="px-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#687589]">O regístrate con tu correo</span><div className="flex-grow border-t border-white/10"/></div>

        <form onSubmit={handleRegistroManual} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-bold text-[#DCE4EE]">Nombre de la academia *</span><input type="text" name="nombre_academia" value={formData.nombre_academia} onChange={handleChange} required disabled={loading} className={fieldClass} placeholder="Ej. Escuela Los Leones" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-bold text-[#DCE4EE]">Tu nombre completo *</span><input type="text" name="nombre_director" value={formData.nombre_director} onChange={handleChange} required disabled={loading} className={fieldClass} placeholder="Ej. Juan Pérez" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-bold text-[#DCE4EE]">Correo electrónico *</span><input type="email" name="email" value={formData.email} onChange={handleChange} required disabled={loading} className={fieldClass} placeholder="tu@correo.com" /></label>
          </div>

          <section className="rounded-2xl border border-[#3157FF]/25 bg-[#3157FF]/[.08] p-4 sm:p-5">
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#B8FF3D]">Estructura inicial</p>
            <h2 className="mt-1 text-lg font-black">¿Cuál es tu disciplina principal?</h2>
            <p className="mt-1 text-xs leading-5 text-[#8D99AA]">Esto no te limita a un solo deporte. Solo define el contexto inicial y la rama que {BRAND.name} abrirá por defecto.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1.5 block text-sm font-bold text-[#DCE4EE]">Disciplina *</span><select value={formData.disciplina_principal} onChange={(event) => changeDiscipline(event.target.value)} disabled={loading} className={fieldClass}>{DISCIPLINES.map((discipline) => <option key={discipline}>{discipline}</option>)}</select></label>
              <label className="block"><span className="mb-1.5 block text-sm font-bold text-[#DCE4EE]">Nombre de la rama *</span><input name="nombre_rama_principal" value={formData.nombre_rama_principal} onChange={handleChange} required disabled={loading} className={fieldClass} placeholder={formData.disciplina_principal === 'Otro' ? 'Ej. Escalada' : formData.disciplina_principal}/></label>
              <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-bold text-[#DCE4EE]">Nombre de la primera sede</span><input name="nombre_sede_principal" value={formData.nombre_sede_principal} onChange={handleChange} disabled={loading} className={fieldClass} placeholder="Sede Principal"/></label>
            </div>
          </section>

          <label className="block"><span className="mb-1.5 block text-sm font-bold text-[#DCE4EE]">Contraseña segura *</span><input type="password" name="password" value={formData.password} onChange={handleChange} required disabled={loading} minLength={10} maxLength={128} className={fieldClass} placeholder="Ej. Academia9!"/><p className="mt-1.5 text-xs leading-5 text-[#687589]">{PASSWORD_REQUIREMENTS}</p></label>

          {error && <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
          <button type="submit" disabled={loading} className="min-h-12 w-full rounded-xl bg-[#3157FF] px-4 py-3.5 font-black text-white shadow-[0_16px_35px_rgba(49,87,255,.23)] transition hover:bg-[#4265FF] disabled:opacity-50">{loading ? 'Creando academia y estructura...' : `Crear mi academia en ${BRAND.name}`}</button>
        </form>

        <p className="mt-6 text-center text-sm text-[#7F8B9D]">¿Ya tienes una cuenta? <Link to="/login" className="font-black text-[#B8FF3D] hover:underline">Inicia sesión aquí</Link></p>
        <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#485467]">{BRAND.domain}</p>
      </div>
    </div>
  );
};

export default Registro;
