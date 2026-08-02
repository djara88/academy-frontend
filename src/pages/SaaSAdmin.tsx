import { useState } from 'react';

export const SecuritySettings = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden.' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }

    // Aquí realizas la llamada a tu API backend para actualizar la contraseña
    // api.post('/api/admin/change-password', { currentPassword, newPassword })

    setMessage({ type: 'success', text: '¡Contraseña de administrador actualizada correctamente!' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="bg-[#1C212D] p-6 rounded-xl border border-gray-800 max-w-xl mt-8">
      <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
        <span>🔐</span> Seguridad de la Cuenta Administrador
      </h3>
      <p className="text-sm text-gray-400 mb-6">
        Cambia la contraseña maestra de acceso a la plataforma (`admin`).
      </p>

      {message && (
        <div className={`p-4 rounded-lg mb-4 text-sm ${
          message.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-red-900/50 text-red-300 border border-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleChangePassword} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1">Contraseña Actual</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full bg-[#131722] border border-gray-700 rounded p-2.5 text-white focus:border-[#289E9D] focus:outline-none text-sm"
            placeholder="••••••••"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1">Nueva Contraseña</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-[#131722] border border-gray-700 rounded p-2.5 text-white focus:border-[#289E9D] focus:outline-none text-sm"
            placeholder="••••••••"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1">Confirmar Nueva Contraseña</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-[#131722] border border-gray-700 rounded p-2.5 text-white focus:border-[#289E9D] focus:outline-none text-sm"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-[#289E9D] hover:bg-[#1f7a79] text-white font-bold py-2.5 rounded transition-colors mt-2"
        >
          Actualizar Contraseña
        </button>
      </form>
    </div>
  );
};
