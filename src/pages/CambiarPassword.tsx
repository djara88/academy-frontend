import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { BRAND } from '../config/brand';
import { useAppDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';
import { PASSWORD_REQUIREMENTS, validateStrongPassword } from '../utils/passwordPolicy';

const CambiarPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { notify } = useAppDialog();
  const { user, setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateStrongPassword(newPassword)) {
      setError(PASSWORD_REQUIREMENTS);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/cambiar-password', { newPassword });

      const storedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      storedUser.requiere_cambio_password = false;
      sessionStorage.setItem('user', JSON.stringify(storedUser));
      setUser((current) => current ? { ...current, requiere_cambio_password: false } : current);

      await notify('✅ Contraseña actualizada con éxito. ¡Bienvenido!', { title: BRAND.name });
      navigate(String(user?.rol).toLowerCase() === 'profesor' ? '/profesor' : '/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Hubo un error al actualizar la contraseña.');
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
              minLength={10}
              maxLength={128}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#00e676] focus:outline-none"
              placeholder="Ej. Academia9!"
            />
            <p className="mt-1.5 text-xs text-gray-400">{PASSWORD_REQUIREMENTS}</p>
          </div>
          <div>
            <label className="block text-sm mb-1 font-semibold">Confirmar Contraseña</label>
            <input
              type="password"
              required
              minLength={10}
              maxLength={128}
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
