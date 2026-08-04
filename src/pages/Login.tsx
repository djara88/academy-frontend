import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // ==========================================
  // 1. INICIO DE SESIÓN MANUAL (CORREO Y CLAVE)
  // ==========================================
  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      
      // Leemos el usuario guardado tras el login exitoso
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Lógica de Redirección Inteligente
      if (storedUser.email === 'd.jarazerene@gmail.com' || storedUser.rol === 'superadmin' || storedUser.rol === 'SUPER_ADMIN') {
        navigate('/admin'); // El dueño va a su panel maestro
      } else if (storedUser.requiere_cambio_password) {
        navigate('/cambiar-password'); // Si el admin le creó la cuenta manual, debe cambiar clave
      } else {
        navigate('/dashboard'); // Los directores normales van a su academia
      }

    } catch (err: any) {
      setError('Correo o contraseña incorrectos. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 2. INICIO DE SESIÓN CON GOOGLE
  // ==========================================
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Volvemos a la raíz, el AuthContext y App.tsx se encargarán de enviarlo 
          // al Dashboard o a Completar Perfil si es su primera vez.
          redirectTo: window.location.origin 
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
        
        {/* CABECERA Y LOGO */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#289E9D] bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#289E9D]">
            <span className="text-3xl">⚽</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#e6edf3] tracking-wide">
            ACADEMIA<span className="text-[#289E9D]">PRO</span>
          </h1>
          <p className="text-sm text-[#8b949e] mt-2">Inicia sesión en tu cuenta</p>
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

        {/* SEPARADOR VISUAL */}
        <div className="flex items-center mb-6">
          <div className="flex-grow border-t border-[#30363d]"></div>
          <span className="px-3 text-[#8b949e] text-xs font-semibold uppercase tracking-wider">O con tu correo</span>
          <div className="flex-grow border-t border-[#30363d]"></div>
        </div>

        {/* FORMULARIO MANUAL */}
        <form onSubmit={handleManualLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-[#e6edf3]">Correo electrónico</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              disabled={loading}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-3 text-[#e6edf3] focus:border-[#289E9D] focus:outline-none transition-colors" 
              placeholder="director@academia.com" 
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-semibold text-[#e6edf3]">Contraseña</label>
              {/* Espacio para futuro link de "Olvidé mi contraseña" si lo necesitas */}
            </div>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              disabled={loading}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-3 text-[#e6edf3] focus:border-[#289E9D] focus:outline-none transition-colors" 
              placeholder="••••••••" 
            />
          </div>

          {/* MENSAJE DE ERROR */}
          {error && (
            <div className="text-[#ff7b72] text-sm bg-[#3a1d1d] border border-[#ff7b72] p-3 rounded-md flex items-start gap-2">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {/* BOTÓN INICIAR SESIÓN */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#289E9D] hover:bg-[#1f7a79] text-white font-bold py-3 px-4 rounded-md transition-colors mt-2 shadow-[0_0_10px_rgba(40,158,157,0.2)] cursor-pointer"
          >
            {loading ? 'Validando...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* ENLACE A REGISTRO */}
        <p className="mt-8 text-center text-sm text-[#8b949e]">
          ¿No tienes una cuenta?{' '}
          <Link to="/registro" className="text-[#289E9D] hover:underline font-semibold">
            Regístrate aquí
          </Link>
        </p>

      </div>
    </div>
  );
};

export default Login;
