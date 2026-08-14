import { useState } from 'react';
import { KeyIcon, MoonIcon, ShieldCheckIcon, SunIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { supabase } from '../config/supabase';
import { BRAND } from '../config/brand';
import { useAuth } from '../contexts/AuthContext';
import { useAppDialog } from '../contexts/DialogContext';
import { useAdminTheme } from '../contexts/AdminThemeContext';

const AdminProfile = () => {
  const { user, setUser } = useAuth();
  const { notify } = useAppDialog();
  const { theme, setTheme } = useAdminTheme();
  const light = theme === 'light';
  const [name, setName] = useState(user?.nombre_completo || 'Administración Syncademia');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const saveName = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 3) return void notify('El nombre debe tener al menos 3 caracteres.', { title: BRAND.name });
    setSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: cleanName } });
      if (error) throw error;
      setUser((current) => {
        if (!current) return current;
        const updated = { ...current, nombre_completo: cleanName };
        sessionStorage.setItem('user', JSON.stringify(updated));
        return updated;
      });
      await notify('Perfil maestro actualizado correctamente.', { title: BRAND.name });
    } catch (error: any) {
      await notify(error.message || 'No fue posible actualizar el perfil.', { title: BRAND.name });
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 10) return void notify('La contraseña debe tener al menos 10 caracteres.', { title: BRAND.name });
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return void notify('Incluye mayúscula, minúscula, número y símbolo.', { title: BRAND.name });
    }
    if (password !== confirmation) return void notify('Las contraseñas no coinciden.', { title: BRAND.name });
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setConfirmation('');
      await notify('Contraseña maestra actualizada.', { title: BRAND.name });
    } catch (error: any) {
      await notify(error.message || 'No fue posible cambiar la contraseña.', { title: BRAND.name });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <header className={`rounded-3xl border border-orange-400/20 p-6 sm:p-8 ${light ? 'bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_38%),white]' : 'bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.16),transparent_38%),#1C212D]'}`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/10">
            <UserCircleIcon className="h-12 w-12 text-orange-300" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Cuenta propietaria</p>
            <h1 className={`mt-2 text-3xl font-black ${light ? 'text-slate-950' : 'text-white'}`}>{user?.nombre_completo || 'Administración Syncademia'}</h1>
            <p className={`mt-2 text-sm ${light ? 'text-slate-500' : 'text-[#9aa6b5]'}`}>Administrador maestro de {BRAND.name} · acceso global al ecosistema</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className={`rounded-2xl border p-6 ${light ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#1C212D]'}`}>
          <div className="flex items-center gap-3"><UserCircleIcon className="h-7 w-7 text-[#48d8d0]" /><div><p className="text-xs font-black uppercase tracking-wider text-[#8995a4]">Identidad</p><h2 className={`text-xl font-black ${light ? 'text-slate-950' : 'text-white'}`}>Mi perfil</h2></div></div>
          <form onSubmit={saveName} className="mt-6 space-y-4">
            <label className="block"><span className="label">Nombre visible</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="w-full" /></label>
            <label className="block"><span className="label">Correo propietario</span><input value={user?.email || ''} readOnly className="w-full cursor-not-allowed opacity-70" /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`rounded-xl border p-4 ${light ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-[#131722]'}`}><p className="text-xs font-bold uppercase text-[#8995a4]">Rol</p><p className="mt-1 font-black text-orange-400">Superadministrador</p></div>
              <div className={`rounded-xl border p-4 ${light ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-[#131722]'}`}><p className="text-xs font-bold uppercase text-[#8995a4]">Alcance</p><p className="mt-1 font-black text-[#289E9D]">Todas las academias</p></div>
            </div>
            <button disabled={savingName} className="btn-primary min-h-12 w-full disabled:opacity-50">{savingName ? 'Guardando...' : 'Guardar perfil'}</button>
          </form>
        </section>

        <section className={`rounded-2xl border p-6 ${light ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#1C212D]'}`}>
          <div className="flex items-center gap-3"><KeyIcon className="h-7 w-7 text-orange-300" /><div><p className="text-xs font-black uppercase tracking-wider text-[#8995a4]">Seguridad</p><h2 className={`text-xl font-black ${light ? 'text-slate-950' : 'text-white'}`}>Cambiar contraseña</h2></div></div>
          <form onSubmit={changePassword} className="mt-6 space-y-4">
            <label className="block"><span className="label">Nueva contraseña</span><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full" /></label>
            <label className="block"><span className="label">Confirmar contraseña</span><input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full" /></label>
            <p className="text-xs leading-5 text-[#8995a4]">Mínimo 10 caracteres con mayúscula, minúscula, número y símbolo.</p>
            <button disabled={savingPassword} className="min-h-12 w-full rounded-xl border border-orange-400/40 bg-orange-500/10 px-4 py-3 font-black text-orange-200 hover:bg-orange-500/20 disabled:opacity-50">{savingPassword ? 'Actualizando...' : 'Actualizar contraseña'}</button>
          </form>
          <div className="mt-5 flex gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4"><ShieldCheckIcon className="h-6 w-6 shrink-0 text-emerald-300" /><p className="text-sm leading-6 text-emerald-100">Esta cuenta no pertenece a ninguna academia y mantiene acceso exclusivo al panel maestro.</p></div>
        </section>
      </div>
      <section className={`rounded-2xl border p-6 ${light ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#1C212D]'}`}>
        <p className="text-xs font-black uppercase tracking-wider text-[#8995a4]">Apariencia del panel maestro</p><h2 className={`mt-1 text-xl font-black ${light ? 'text-slate-950' : 'text-white'}`}>Modo visual</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><button type="button" onClick={() => setTheme('dark')} className={`flex items-center gap-4 rounded-2xl border p-5 text-left ${theme === 'dark' ? 'border-[#289E9D] bg-[#289E9D]/10' : light ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-[#131722]'}`}><MoonIcon className="h-8 w-8 text-[#289E9D]" /><div><p className={`font-black ${light ? 'text-slate-950' : 'text-white'}`}>Oscuro ejecutivo</p><p className="mt-1 text-sm text-[#8995a4]">Menor brillo y alto contraste.</p></div></button><button type="button" onClick={() => setTheme('light')} className={`flex items-center gap-4 rounded-2xl border p-5 text-left ${theme === 'light' ? 'border-orange-400 bg-orange-50' : 'border-white/10 bg-[#131722]'}`}><SunIcon className="h-8 w-8 text-orange-400" /><div><p className={`font-black ${light ? 'text-slate-950' : 'text-white'}`}>Claro estratégico</p><p className="mt-1 text-sm text-[#8995a4]">Ideal para trabajo diurno.</p></div></button></div>
      </section>
    </div>
  );
};

export default AdminProfile;
