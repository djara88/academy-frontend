import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import api from '../api/axiosConfig';

const CompletarPerfil: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userData, setUserData] = useState<any>(null);

  // Campos del formulario
  const [nombreAcademia, setNombreAcademia] = useState('');
  const [nombreDirector, setNombreDirector] = useState('');
  const [direccion, setDireccion] = useState('');
  const [logo, setLogo] = useState<File | null>(null);

  useEffect(() => {
    const verificarUsuario = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/registro');
      } else {
        setUserData(session.user);
        // Pre-llenamos el nombre del director con el que viene de Google
        if (session.user.user_metadata?.full_name) {
          setNombreDirector(session.user.user_metadata.full_name);
        }
      }
    };
    verificarUsuario();
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogo(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Usamos FormData para enviar el archivo de imagen (logo) + textos
      const formData = new FormData();
      formData.append('auth_id', userData.id);
      formData.append('email', userData.email);
      formData.append('nombre_director', nombreDirector);
      formData.append('nombre_academia', nombreAcademia);
      formData.append('direccion', direccion);
      if (logo) {
        formData.append('logo', logo);
      }

      const response = await api.post('/api/academias/completar-google', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data?.success) {
        // 🔥 GUARDAMOS EL USUARIO ACTUALIZADO EN LOCALSTORAGE
        const userToSave = {
          id: userData.id,
          email: userData.email,
          nombre_completo: nombreDirector,
          rol: 'director',
          academia_id: response.data.academia?.id,
          requiere_cambio_password: false
        };

        localStorage.setItem('user', JSON.stringify(userToSave));

        // 🔥 REFRESCAMOS COMPLETAMENTE LA APLICACIÓN AL IR AL DASHBOARD
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      console.error('Error al completar perfil:', err);
      setError(err.response?.data?.error || 'Hubo un problema al crear tu academia. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-white">
        Cargando perfil...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117] p-4 font-sans py-12">
      <div className="bg-[#161b22] p-8 rounded-xl border border-[#30363d] shadow-2xl w-full max-w-lg text-center">
        
        {/* AVATAR DE GOOGLE */}
        <div className="w-16 h-16 mx-auto mb-4">
          <img 
            src={userData.user_metadata?.avatar_url || 'https://www.svgrepo.com/show/5125/avatar.svg'} 
            alt="Perfil" 
            className="rounded-full border-2 border-[#289E9D] w-full h-full object-cover"
          />
        </div>
        
        <h1 className="text-2xl font-extrabold text-[#e6edf3] mb-2">
          ¡Casi listo, {nombreDirector.split(' ')[0]}! 🚀
        </h1>
        <p className="text-[#8b949e] mb-2 text-sm">
          Completa los datos de tu academia para configurar tu entorno.
        </p>
        
        {/* BANNER 15 DÍAS GRATIS */}
        <div className="bg-[#1f2937] text-[#58a6ff] text-xs font-bold py-1.5 px-3 rounded-full inline-block mb-6 border border-[#30363d]">
          🎁 Tienes 15 días de prueba gratis. Sin compromisos.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          
          {/* NOMBRE DE LA ACADEMIA */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Nombre de la Academia *</label>
            <input 
              type="text" 
              value={nombreAcademia} 
              onChange={(e) => setNombreAcademia(e.target.value)} 
              required 
              disabled={loading}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-2.5 text-[#e6edf3] focus:border-[#289E9D] focus:outline-none" 
              placeholder="Ej. Escuela Los Leones" 
            />
          </div>

          {/* NOMBRE DEL DIRECTOR */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Nombre del Director *</label>
            <input 
              type="text" 
              value={nombreDirector} 
              onChange={(e) => setNombreDirector(e.target.value)} 
              required 
              disabled={loading}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-2.5 text-[#e6edf3] focus:border-[#289E9D] focus:outline-none" 
              placeholder="Ej. Juan Pérez" 
            />
          </div>

          {/* DIRECCIÓN */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Dirección / Sede Principal *</label>
            <input 
              type="text" 
              value={direccion} 
              onChange={(e) => setDireccion(e.target.value)} 
              required 
              disabled={loading}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-2.5 text-[#e6edf3] focus:border-[#289E9D] focus:outline-none" 
              placeholder="Ej. Av. Estadio 123, Santiago" 
            />
          </div>

          {/* LOGO DE LA ACADEMIA */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Logo de la Academia (Opcional)</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              disabled={loading}
              className="w-full text-sm text-[#8b949e] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#30363d] file:text-white hover:file:bg-[#4b5563] cursor-pointer bg-[#0d1117] border border-[#30363d] rounded-md p-1" 
            />
          </div>

          {error && (
            <div className="text-[#e74c3c] text-sm bg-[#2c1a1a] border border-[#e74c3c] p-3 rounded-lg mt-4">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#289E9D] hover:bg-[#1f7a79] text-white font-bold py-3 px-4 rounded-md transition-colors mt-6 shadow-[0_0_10px_rgba(40,158,157,0.3)] cursor-pointer"
          >
            {loading ? 'Preparando tu academia...' : 'Comenzar mis 15 días gratis'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default CompletarPerfil;
