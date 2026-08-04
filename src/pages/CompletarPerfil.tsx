import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { supabase } from '../config/supabase'; // Asegúrate de que esta ruta sea correcta

const CrearAcademia: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Datos del usuario logueado en Supabase Auth
  const [userData, setUserData] = useState({ id: '', email: '', nombre: '' });

  // Datos del formulario de la academia
  const [nombreAcademia, setNombreAcademia] = useState('');
  const [direccion, setDireccion] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [preview, setPreview] = useState('');

  // 1. Obtener los datos de Auth apenas carga la pantalla
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserData({
          id: session.user.id,
          email: session.user.email || '',
          nombre: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Director'
        });
      }
    };
    fetchUser();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 2. Preparamos los datos en formato "Formulario Web" (Multipart) para Multer
      const formData = new FormData();
      formData.append('auth_id', userData.id);
      formData.append('email', userData.email);
      formData.append('nombre_director', userData.nombre);
      formData.append('nombre_academia', nombreAcademia);
      formData.append('direccion', direccion);
      if (logo) {
        formData.append('logo', logo);
      }

      // 3. Enviamos a TU ruta específica
      // Nota: Asumo que este router está montado en '/api/academias' en tu index.js
      const response = await api.post('/api/academias/completar-google', formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // Fundamental para enviar el archivo
        },
      });
      
      console.log('✅ Perfil y Academia completados:', response.data);
      alert('¡Academia configurada con éxito! Revisa tu correo electrónico.');
      
      // Forzamos la recarga para que el sistema detecte que ya tiene academia
      window.location.href = '/dashboard';
      
    } catch (err: any) {
      console.error('❌ Error al configurar academia:', err);
      setError(err.response?.data?.error || 'Ocurrió un error al configurar tu academia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] p-8 rounded-2xl shadow-2xl max-w-md w-full">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-[#e6edf3] mb-2">Paso Final 🏁</h1>
          <p className="text-[#8b949e]">Completa los datos de tu academia para activar tus 15 días de prueba.</p>
        </div>

        {error && (
          <div className="bg-[#2c1a1a] border border-[#e74c3c] text-[#e74c3c] px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* FOTO / LOGO */}
          <div className="flex flex-col items-center mb-4">
            <div className="w-24 h-24 rounded-full bg-[#0d1117] border-2 border-dashed border-[#30363d] flex items-center justify-center overflow-hidden mb-3">
              {preview ? (
                <img src={preview} alt="Logo preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">📷</span>
              )}
            </div>
            <label className="cursor-pointer text-[#289E9D] hover:text-[#1f7a79] text-sm font-semibold transition-colors">
              Subir Logo de la Academia
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Nombre de la Academia *</label>
            <input
              type="text"
              required
              placeholder="Ej: Escuela de Fútbol FC"
              value={nombreAcademia}
              onChange={(e) => setNombreAcademia(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-white focus:border-[#289E9D] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Sede Principal / Dirección</label>
            <input
              type="text"
              placeholder="Ej: Complejo Deportivo Norte"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-white focus:border-[#289E9D] focus:outline-none"
            />
          </div>

          {/* Email estático para que vea qué cuenta está usando */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Director Asociado</label>
            <input
              type="text"
              disabled
              value={userData.email}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-gray-500 cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !userData.id}
            className="w-full bg-[#289E9D] hover:bg-[#1f7a79] text-white font-bold text-lg py-3 rounded-lg shadow-lg focus:outline-none disabled:opacity-50 mt-4"
          >
            {loading ? 'Configurando...' : '🚀 Activar Academia'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default CrearAcademia;
