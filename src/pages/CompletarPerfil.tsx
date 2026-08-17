import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { supabase } from '../config/supabase';
import { Logo } from '../components/Logo';
import { BRAND } from '../config/brand';
import { useAppDialog } from '../contexts/DialogContext';
import { DISCIPLINES, defaultBranchName } from '../config/disciplines';

const CrearAcademia: React.FC = () => {
  const { notify } = useAppDialog();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userData, setUserData] = useState({ id: '', email: '', nombre: '' });
  const [nombreAcademia, setNombreAcademia] = useState('');
  const [direccion, setDireccion] = useState('');
  const [disciplina, setDisciplina] = useState('Fútbol');
  const [nombreRama, setNombreRama] = useState('Fútbol');
  const [nombreSede, setNombreSede] = useState('Sede Principal');
  const [logo, setLogo] = useState<File | null>(null);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserData({
          id: session.user.id,
          email: session.user.email || '',
          nombre: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Director',
        });
      }
    };
    void fetchUser();
  }, []);

  const changeDiscipline = (next: string) => {
    setNombreRama((current) => (!current || current === defaultBranchName(disciplina) ? defaultBranchName(next) : current));
    setDisciplina(next);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogo(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!nombreRama.trim()) throw new Error('Indica el nombre de la rama principal.');
      const formData = new FormData();
      formData.append('auth_id', userData.id);
      formData.append('email', userData.email);
      formData.append('nombre_director', userData.nombre);
      formData.append('nombre_academia', nombreAcademia);
      formData.append('direccion', direccion);
      formData.append('disciplina_principal', disciplina);
      formData.append('nombre_rama_principal', nombreRama);
      formData.append('nombre_sede_principal', nombreSede || 'Sede Principal');
      if (logo) formData.append('logo', logo);

      const response = await api.post('/api/academias/completar-google', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      console.log('Academia configurada:', response.data);
      await notify(`¡${nombreAcademia} quedó configurada con su rama principal ${nombreRama}!`, { title: nombreAcademia || BRAND.name });
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('Error al configurar academia:', err);
      setError(err.response?.data?.error || err.message || 'Ocurrió un error al configurar tu academia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4 py-10">
      <div className="bg-[#161b22] border border-[#30363d] p-6 sm:p-8 rounded-[28px] shadow-2xl max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#289E9D]/60 bg-[#0d1117] p-3 shadow-[0_0_20px_rgba(40,158,157,0.25)]"><Logo variant="mark" className="h-full w-full" /></div>
          <h1 className="text-3xl font-extrabold text-[#e6edf3] mb-2">Configura tu academia</h1>
          <p className="text-[#8b949e]">Crearemos automáticamente tu primera sede y tu rama principal para activar la prueba de {BRAND.name}.</p>
        </div>

        {error && <div className="bg-[#2c1a1a] border border-[#e74c3c] text-[#ff8b82] px-4 py-3 rounded-xl mb-6 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col items-center mb-4">
            <div className="w-24 h-24 rounded-full bg-[#0d1117] border-2 border-dashed border-[#30363d] flex items-center justify-center overflow-hidden mb-3">{preview ? <img src={preview} alt="Vista previa del logo" className="w-full h-full object-cover" /> : <span className="text-3xl">📷</span>}</div>
            <label className="cursor-pointer text-[#289E9D] hover:text-[#48d8d0] text-sm font-semibold">Subir logo de la academia<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} /></label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2"><span className="block text-sm font-semibold mb-1 text-[#e6edf3]">Nombre de la Academia *</span><input type="text" required placeholder="Ej. Academia Deportiva Los Leones" value={nombreAcademia} onChange={(event) => setNombreAcademia(event.target.value)} className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-3 text-white focus:border-[#289E9D] focus:outline-none" /></label>
            <label className="block sm:col-span-2"><span className="block text-sm font-semibold mb-1 text-[#e6edf3]">Dirección de la primera sede</span><input type="text" placeholder="Ej. Complejo Deportivo Norte" value={direccion} onChange={(event) => setDireccion(event.target.value)} className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-3 text-white focus:border-[#289E9D] focus:outline-none" /></label>
          </div>

          <section className="rounded-2xl border border-[#289E9D]/30 bg-[#289E9D]/[.07] p-4 sm:p-5">
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#70e4df]">Rama principal</p>
            <p className="mt-1 text-xs leading-5 text-[#8b949e]">Es solo el punto de partida. Después podrás crear otras ramas y sedes según el plan contratado.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label><span className="block text-sm font-semibold mb-1">Disciplina *</span><select value={disciplina} onChange={(event) => changeDiscipline(event.target.value)} className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-3 text-white focus:border-[#289E9D] outline-none">{DISCIPLINES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span className="block text-sm font-semibold mb-1">Nombre visible de la rama *</span><input required value={nombreRama} onChange={(event) => setNombreRama(event.target.value)} placeholder={disciplina === 'Otro' ? 'Ej. Escalada deportiva' : disciplina} className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-3 text-white focus:border-[#289E9D] outline-none" /></label>
              <label className="sm:col-span-2"><span className="block text-sm font-semibold mb-1">Nombre de la sede</span><input value={nombreSede} onChange={(event) => setNombreSede(event.target.value)} placeholder="Sede Principal" className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-3 text-white focus:border-[#289E9D] outline-none" /></label>
            </div>
          </section>

          <label className="block"><span className="block text-sm font-semibold mb-1 text-[#e6edf3]">Director asociado</span><input type="text" disabled value={userData.email} className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-3 text-gray-500 cursor-not-allowed" /></label>
          <button type="submit" disabled={loading || !userData.id} className="w-full bg-[#289E9D] hover:bg-[#35b8b5] text-white font-black text-lg py-3 rounded-xl shadow-lg disabled:opacity-50 mt-4">{loading ? 'Configurando sede y rama...' : 'Activar academia'}</button>
        </form>
      </div>
    </div>
  );
};

export default CrearAcademia;
