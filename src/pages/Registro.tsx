import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../config/supabase';
import api from '../api/axiosConfig';

const Registro: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Datos del formulario manual
  const [formData, setFormData] = useState({
    nombre_academia: '',
    nombre_director: '',
    email: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ==========================================
  // REGISTRO CON CORREO Y CONTRASEÑA
  // ==========================================
  const handleRegistroManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/academias/registro-publico', formData);
      
      if (response.data?.success) {
        alert('¡Academia creada con éxito! Inicia sesión con tus credenciales.');
        navigate('/login');
      }
    } catch (err: any) {
      console.error('Error en registro:', err);
      setError(err.response?.data?.error || 'Ocurrió un error al crear tu cuenta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // INICIO DE SESIÓN / REGISTRO CON GOOGLE
  // ==========================================
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // 🔥 REDIRIGE A COMPLETAR PERFIL
          redirectTo: `${window.location.origin}/completar-perfil`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Error con Google:', err);
      setError('No se pudo conectar con Google. Intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117] p-4 font-sans">
      <div className="bg-[#161b22] p-8 rounded-xl border border-[#30363d] shadow-2xl w-full max-w-md">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#58a6ff] rounded-full flex items-center justify-center text-3xl font-bold text-[#0d1117] mx-auto mb-3">
            🚀
          </div>
          <h1 className="text-2xl font-extrabold text-[#e6edf3]">Crea tu Academia</h1>
          <p className="text-sm text-[#8b949e] mt-1">Únete a AcademiaPro en segundos</p>
        </div>

        {/* BOTÓN DE GOOGLE */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-3 mb-6 cursor-pointer"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          <span>Continuar con Google</span>
        </button>

        <div className="flex items-center mb-6">
          <div className="flex-grow border-t border-[#30363d]"></div>
          <span className="px-3 text-[#8b949e] text-xs font-semibold">O REGÍSTRATE CON TU CORREO</span>
          <div className="flex-grow border-t border-[#30363d]"></div>
        </div>

        {/* FORMULARIO MANUAL */}
        <form onSubmit={handleRegistroManual} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Nombre de la Academia *</label>
            <input type="text" name="nombre_academia" value={formData.nombre_academia} onChange={handleChange} required disabled={loading}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-2.5 text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none" 
              placeholder="Ej. Escuela Los Leones" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Tu Nombre Completo *</label>
            <input type="text" name="nombre_director" value={formData.nombre_director} onChange={handleChange} required disabled={loading}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-2.5 text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none" 
              placeholder="Ej. Juan Pérez" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Correo Electrónico *</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required disabled={loading}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-2.5 text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none" 
              placeholder="tu@correo.com" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Contraseña Segura *</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required disabled={loading} minLength={6}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-2.5 text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none" 
              placeholder="Mínimo 6 caracteres" />
          </div>

          {error && (
            <div className="text-[#e74c3c] text-sm bg-[#2c1a1a] border border-[#e74c3c] p-3 rounded-lg">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-bold py-3 px-4 rounded-md transition-colors mt-2 cursor-pointer">
            {loading ? 'Creando cuenta...' : 'Crear mi Academia'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#8b949e]">
          ¿Ya tienes una cuenta? <Link to="/login" className="text-[#58a6ff] hover:underline font-semibold">Inicia Sesión aquí</Link>
        </p>
      </div>
    </div>
  );
};

export default Registro;
