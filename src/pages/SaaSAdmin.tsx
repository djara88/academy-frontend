import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

interface Academia {
  id: string;
  nombre: string;
  logo?: string;
  direccion?: string;
  telefono?: string;
  correo_academia?: string;
  nombre_director?: string;
  director_email: string;
  plan: 'Formación' | 'Competencia' | 'Alto Rendimiento';
  estado: 'Activa' | 'Inactiva';
  jugadores_count: number;
  created_at: string;
}

const SaaSAdmin = () => {
  const [academias, setAcademias] = useState<Academia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formulario unificado (Crear y Editar)
  const [nombre, setNombre] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correoAcademia, setCorreoAcademia] = useState('');
  const [nombreDirector, setNombreDirector] = useState('');
  const [directorEmail, setDirectorEmail] = useState('');
  const [plan, setPlan] = useState<'Formación' | 'Competencia' | 'Alto Rendimiento'>('Competencia');
  const [estado, setEstado] = useState<'Activa' | 'Inactiva'>('Activa');

  useEffect(() => {
    fetchAcademias();
  }, []);

  const fetchAcademias = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/academias');
      setAcademias(res.data);
    } catch (err) {
      console.error('Error cargando academias:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setNombre(''); setLogoFile(null); setDireccion(''); setTelefono('');
    setCorreoAcademia(''); setNombreDirector(''); setDirectorEmail('');
    setPlan('Competencia'); setEstado('Activa');
    setShowModal(true);
  };

  const openEditModal = (a: Academia) => {
    setEditingId(a.id);
    setNombre(a.nombre); 
    setLogoFile(null); 
    setDireccion(a.direccion || ''); 
    setTelefono(a.telefono || ''); 
    setCorreoAcademia(a.correo_academia || ''); 
    setNombreDirector(a.nombre_director || ''); 
    setDirectorEmail(a.director_email);
    setPlan(a.plan); 
    setEstado(a.estado);
    setShowModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('nombre', nombre);
      if (logoFile) formData.append('logo', logoFile);
      formData.append('direccion', direccion);
      formData.append('telefono', telefono);
      formData.append('correo_academia', correoAcademia);
      formData.append('nombre_director', nombreDirector);
      formData.append('director_email', directorEmail);
      formData.append('plan', plan);
      formData.append('estado', estado);

      if (editingId) {
        await api.put(`/api/academias/${editingId}`, formData);
        alert('Academia actualizada exitosamente.');
      } else {
        await api.post('/api/academias', formData);
        alert('Academia creada exitosamente.');
      }
      
      setShowModal(false);
      fetchAcademias();
    } catch (err: any) {
      alert(`Error al procesar: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (window.confirm(`⚠️ ¿Estás COMPLETAMENTE SEGURO de que deseas eliminar la academia "${nombre}"? Esta acción borrará todos sus datos y no se puede deshacer.`)) {
      try {
        await api.delete(`/api/academias/${id}`);
        alert('Academia eliminada.');
        fetchAcademias();
      } catch (err: any) {
        alert(`Error al eliminar: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  const handleResetPassword = async (id: string, nombre: string) => {
    if (window.confirm(`🔑 ¿Deseas generar y enviar una nueva contraseña temporal al director de "${nombre}"?`)) {
      try {
        await api.post(`/api/academias/${id}/reset-password`);
        alert('Nueva contraseña generada y enviada por correo exitosamente.');
      } catch (err: any) {
        alert(`Error al restablecer contraseña: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  const totalAcademias = academias.length;
  const activas = academias.filter(a => a.estado === 'Activa').length;
  const totalJugadores = academias.reduce((acc, curr) => acc + (curr.jugadores_count || 0), 0);
  
  // Puedes cambiar estos valores (29900, 59900, 99900) por los precios reales de tus planes
  const mrrEstimado = (academias.filter(a => a.plan === 'Formación' && a.estado === 'Activa').length * 29900) +
                      (academias.filter(a => a.plan === 'Competencia' && a.estado === 'Activa').length * 59900) +
                      (academias.filter(a => a.plan === 'Alto Rendimiento' && a.estado === 'Activa').length * 99900);

  return (
    <div className="p-8 space-y-8 bg-[#131722] min-h-screen text-white">
      
      <div className="flex justify-between items-center border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span>👑</span> Panel Maestro de Administración
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Modo Dios: Gestión global de licencias y datos.
          </p>
        </div>
        <button onClick={openCreateModal} className="bg-[#289E9D] hover:bg-[#1f7a79] text-white font-bold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-lg">
          <span>➕</span> Nueva Academia
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#1C212D] p-6 rounded-xl border border-gray-800">
          <p className="text-xs text-gray-400 font-bold uppercase">Total Academias</p>
          <p className="text-3xl font-extrabold text-white mt-2">{totalAcademias}</p>
          <p className="text-xs text-green-400 mt-2">Activas: {activas}</p>
        </div>
        <div className="bg-[#1C212D] p-6 rounded-xl border border-gray-800">
          <p className="text-xs text-gray-400 font-bold uppercase">Jugadores Registrados</p>
          <p className="text-3xl font-extrabold text-[#289E9D] mt-2">{totalJugadores}</p>
        </div>
        <div className="bg-[#1C212D] p-6 rounded-xl border border-gray-800">
          <p className="text-xs text-gray-400 font-bold uppercase">Ingreso Mensual (MRR)</p>
          <p className="text-3xl font-extrabold text-green-400 mt-2">${mrrEstimado.toLocaleString('es-CL')} CLP</p>
        </div>
        <div className="bg-[#1C212D] p-6 rounded-xl border border-gray-800">
          <p className="text-xs text-gray-400 font-bold uppercase">Estado Sistema</p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">100% OK</p>
        </div>
      </div>

      <div className="bg-[#1C212D] rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Gestión de Academias</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando datos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#131722] text-gray-400 text-xs uppercase border-b border-gray-800">
                  <th className="p-4">Academia</th>
                  <th className="p-4">Director</th>
                  <th className="p-4">Plan / Estado</th>
                  <th className="p-4 text-center">Acciones Maestras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {academias.map((a) => (
                  <tr key={a.id} className="hover:bg-[#131722]/50 transition-colors">
                    <td className="p-4 font-semibold text-white">
                      <div className="flex items-center gap-3">
                        {a.logo ? (
                          <img src={a.logo} alt={a.nombre} className="w-8 h-8 rounded-full object-cover bg-gray-800 border border-gray-600" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-600">🏫</div>
                        )}
                        <span>{a.nombre}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-300">
                      <div>{a.nombre_director}</div>
                      <div className="text-xs text-gray-500">{a.director_email}</div>
                    </td>
                    <td className="p-4">
                      {/* Ahora esto es solo texto visual, no un <select> */}
                      <div className="font-semibold text-white">{a.plan}</div>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${a.estado === 'Activa' ? 'bg-green-900/60 text-green-300 border border-green-700' : 'bg-red-900/60 text-red-300 border border-red-700'}`}>
                        {a.estado}
                      </span>
                    </td>
                    <td className="p-4 text-center space-x-2">
                      <button onClick={() => openEditModal(a)} title="Editar datos completos" className="p-2 bg-blue-900/50 hover:bg-blue-800 text-blue-300 rounded transition-colors">
                        ✏️
                      </button>
                      <button onClick={() => handleResetPassword(a.id, a.nombre)} title="Restablecer Contraseña" className="p-2 bg-yellow-900/50 hover:bg-yellow-800 text-yellow-300 rounded transition-colors">
                        🔑
                      </button>
                      <button onClick={() => handleDelete(a.id, a.nombre)} title="Eliminar Academia" className="p-2 bg-red-900/50 hover:bg-red-800 text-red-300 rounded transition-colors">
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREAR/EDITAR ACADEMIA */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#1C212D] p-6 rounded-xl border border-gray-800 max-w-2xl w-full my-8">
            <h3 className="text-xl font-bold text-white mb-6 border-b border-gray-800 pb-4">
              {editingId ? 'Editar Academia' : 'Registrar Nueva Academia'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-4">
                  <h4 className="text-[#289E9D] text-sm font-bold uppercase">Datos Institucionales</h4>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nombre *</label>
                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white text-sm focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{editingId ? 'Actualizar Logo (Dejar vacío para conservar)' : 'Logo'}</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="w-full bg-[#131722] border border-gray-700 rounded p-1 text-white text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Dirección</label>
                    <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Teléfono</label>
                    <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white text-sm focus:outline-none" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[#289E9D] text-sm font-bold uppercase">Administración</h4>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nombre Director *</label>
                    <input type="text" value={nombreDirector} onChange={(e) => setNombreDirector(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white text-sm focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Correo Director (Login) *</label>
                    <input type="email" value={directorEmail} onChange={(e) => setDirectorEmail(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white text-sm focus:outline-none" required disabled={!!editingId} title={editingId ? "No se puede cambiar el correo de login al editar" : ""} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Plan SaaS *</label>
                    <select value={plan} onChange={(e) => setPlan(e.target.value as any)} className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white text-sm focus:outline-none">
                      <option value="Formación">Formación</option>
                      <option value="Competencia">Competencia</option>
                      <option value="Alto Rendimiento">Alto Rendimiento</option>
                    </select>
                  </div>
                  {editingId && (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Estado del Cliente *</label>
                      <select value={estado} onChange={(e) => setEstado(e.target.value as any)} className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white text-sm focus:outline-none">
                        <option value="Activa">Activa</option>
                        <option value="Inactiva">Inactiva (Suspender acceso)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-800 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded" disabled={uploading}>
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-[#289E9D] hover:bg-[#1f7a79] text-white font-bold py-3 rounded" disabled={uploading}>
                  {uploading ? 'Guardando...' : (editingId ? 'Actualizar Academia' : 'Crear Academia')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaaSAdmin;
