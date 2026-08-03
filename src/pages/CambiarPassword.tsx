import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

const CambiarPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      return setError('La contraseña debe tener al menos 6 caracteres.');
    }
    if (newPassword !== confirmPassword) {
      return setError('Las contraseñas no coinciden.');
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/api/cambiar-password', { newPassword });
      
      // Actualizamos el localStorage para quitar la marca localmente
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.requiere_cambio_password = false;
      localStorage.setItem('user', JSON.stringify(storedUser));

      alert('✅ Contraseña actualizada con éxito. ¡Bienvenido!');
      navigate('/dashboard');

    } catch (err: any) {
      console.error(err);
      setError('Hubo un error al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117] p-4 text-white">
      <div className="bg-[#161b22] p-8 rounded-xl border border-[#2d3a4f] shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-2 text-[#00e676] text-center">¡Bienvenido!</h2>
        <p className="text-sm text-gray-400 mb-6 text-center">
          Por tu seguridad, debes cambiar la contraseña temporal antes de entrar a tu panel.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 font-semibold">Nueva Contraseña</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#00e676] focus:outline-none"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 font-semibold">Confirmar Contraseña</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#00e676] focus:outline-none"
              placeholder="Repite tu contraseña"
            />
          </div>

          {error && <div className="text-red-400 text-sm bg-red-900/30 p-2 rounded">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00e676] hover:bg-[#00c853] text-[#0d1117] font-bold py-2 px-4 rounded mt-4"
          >
            {loading ? 'Guardando...' : 'Guardar y Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CambiarPassword;
