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

  return (
    <div className="min-h-screen bg-[#0d1117] p-4 font-sans text-white sm:py-10">
      <div className="mx-auto w-full max-w-2xl rounded-[28px] border border-[#30363d] bg-[#161b22] p-6 shadow-2xl sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#289E9D]/60 bg-[#0d1117] p-3 shadow-[0_0_20px_rgba(40,158,157,0.25)]"><Logo variant="mark" className="h-full w-full" /></div>
          <h1 className="text-3xl font-black text-[#e6edf3]">Crea tu academia</h1>
          <p className="mt-2 text-sm text-[#8b949e]">La primera sede y rama quedan listas desde el inicio; luego podrás agregar más según tu plan.</p>
        </div>

        <button type="button" onClick={handleGoogleLogin} disabled={loading} className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-bold text-gray-900 transition hover:bg-gray-100 disabled:opacity-50">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
          <span>Continuar con Google</span>
        </button>

        <div className="mb-6 flex items-center"><div className="flex-grow border-t border-[#30363d]"/><span className="px-3 text-xs font-semibold text-[#8b949e]">O REGÍSTRATE CON TU CORREO</span><div className="flex-grow border-t border-[#30363d]"/></div>

        <form onSubmit={handleRegistroManual} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-semibold text-[#e6edf3]">Nombre de la academia *</span><input type="text" name="nombre_academia" value={formData.nombre_academia} onChange={handleChange} required disabled={loading} className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] p-3 text-[#e6edf3] outline-none focus:border-[#289E9D]" placeholder="Ej. Escuela Los Leones" /></label>
            <label className="block"><span className="mb-1 block text-sm font-semibold text-[#e6edf3]">Tu nombre completo *</span><input type="text" name="nombre_director" value={formData.nombre_director} onChange={handleChange} required disabled={loading} className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] p-3 text-[#e6edf3] outline-none focus:border-[#289E9D]" placeholder="Ej. Juan Pérez" /></label>
            <label className="block"><span className="mb-1 block text-sm font-semibold text-[#e6edf3]">Correo electrónico *</span><input type="email" name="email" value={formData.email} onChange={handleChange} required disabled={loading} className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] p-3 text-[#e6edf3] outline-none focus:border-[#289E9D]" placeholder="tu@correo.com" /></label>
          </div>

          <section className="rounded-2xl border border-[#289E9D]/30 bg-[#289E9D]/[.07] p-4 sm:p-5">
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#70e4df]">Estructura inicial</p>
            <h2 className="mt-1 text-lg font-black">¿Cuál es tu disciplina principal?</h2>
            <p className="mt-1 text-xs leading-5 text-[#8b949e]">Esto no te limita a un solo deporte. Solo define el contexto inicial y la rama que Syncademia abrirá por defecto.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block text-sm font-semibold">Disciplina *</span><select value={formData.disciplina_principal} onChange={(event) => changeDiscipline(event.target.value)} disabled={loading} className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] p-3 outline-none focus:border-[#289E9D]">{DISCIPLINES.map((discipline) => <option key={discipline}>{discipline}</option>)}</select></label>
              <label className="block"><span className="mb-1 block text-sm font-semibold">Nombre de la rama *</span><input name="nombre_rama_principal" value={formData.nombre_rama_principal} onChange={handleChange} required disabled={loading} className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] p-3 outline-none focus:border-[#289E9D]" placeholder={formData.disciplina_principal === 'Otro' ? 'Ej. Escalada' : formData.disciplina_principal}/></label>
              <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-semibold">Nombre de la primera sede</span><input name="nombre_sede_principal" value={formData.nombre_sede_principal} onChange={handleChange} disabled={loading} className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] p-3 outline-none focus:border-[#289E9D]" placeholder="Sede Principal"/></label>
            </div>
          </section>

          <label className="block"><span className="mb-1 block text-sm font-semibold text-[#e6edf3]">Contraseña segura *</span><input type="password" name="password" value={formData.password} onChange={handleChange} required disabled={loading} minLength={10} maxLength={128} className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] p-3 text-[#e6edf3] outline-none focus:border-[#289E9D]" placeholder="Ej. Academia9!"/><p className="mt-1.5 text-xs text-[#8b949e]">{PASSWORD_REQUIREMENTS}</p></label>

          {error && <div className="rounded-xl border border-[#e74c3c] bg-[#2c1a1a] p-3 text-sm text-[#ff8b82]">{error}</div>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#289E9D] px-4 py-3.5 font-black text-white transition hover:bg-[#35b8b5] disabled:opacity-50">{loading ? 'Creando academia y estructura...' : 'Crear mi academia'}</button>
        </form>

        <p className="mt-6 text-center text-sm text-[#8b949e]">¿Ya tienes una cuenta? <Link to="/login" className="font-semibold text-[#58a6ff] hover:underline">Inicia sesión aquí</Link></p>
      </div>
    </div>
  );
};

export default Registro;
