import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      
      // 🔥 REDIRECCIÓN INTELIGENTE SEGÚN EL USUARIO
      if (email.toLowerCase() === 'd.jarazerene@gmail.com') {
        navigate('/admin'); // El SuperAdmin va a su panel maestro
      } else {
        navigate('/dashboard'); // Los directores/profesores van a su academia
      }
      
    } catch (err) {
      setError('Credenciales inválidas. Por favor, verifica tu email y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117] p-4">
      <div className="bg-[#161b22] p-8 rounded-xl border border-[#2d3a4f] shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#00e676] rounded-full flex items-center justify-center text-3xl font-bold text-[#0d1117] mx-auto mb-3">
            ⚽
          </div>
          <h1 className="text-2xl font-extrabold text-[#e6edf3]">Academia Deportiva</h1>
          <p className="text-sm text-[#8b949e]">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="label text-[#e6edf3] block mb-2 text-sm font-semibold">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-2.5 text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
              placeholder="tucorreo@ejemplo.com"
            />
          </div>
          <div className="mb-6">
            <label className="label text-[#e6edf3] block mb-2 text-sm font-semibold">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-2.5 text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="mb-4 text-[#e74c3c] text-sm bg-[#2c1a1a] border border-[#e74c3c] p-3 rounded-lg">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-bold py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-2 border border-[#rgba(240,246,252,0.1)]"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Iniciando...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#8b949e]">
          El sistema puede tardar unos segundos en despertar el servidor.
        </p>
      </div>
    </div>
  );
};

export default Login;
