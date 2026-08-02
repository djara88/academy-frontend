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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Formulario nueva academia
  const [nombre, setNombre] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correoAcademia, setCorreoAcademia] = useState('');
  const [nombreDirector, setNombreDirector] = useState('');
  const [directorEmail, setDirectorEmail] = useState('');
  const [plan, setPlan] = useState<'Formación' | 'Competencia' | 'Alto Rendimiento'>('Competencia');

  // Formulario seguridad SuperAdmin
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [secMessage, setSecMessage] = useState<string | null>(null);

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
      alert('Hubo un problema al cargar la lista de academias.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleCreateAcademia = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      // Como estamos enviando un archivo, usamos FormData en lugar de un objeto JSON normal
      const formData = new FormData();
      formData.append('nombre', nombre);
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      formData.append('direccion', direccion);
      formData.append('telefono', telefono);
      formData.append('correo_academia', correoAcademia);
      formData.append('nombre_director', nombreDirector);
      formData.append('director_email', directorEmail);
      formData.append('plan', plan);

      // Axios configurará automáticamente los headers de 'multipart/form-data'
      await api.post('/api/academias', formData);
      
      alert('Academia creada exitosamente.');
      setShowCreateModal(false);
      
      // Limpiar formulario
      setNombre(''); setLogoFile(null); setDireccion(''); setTelefono('');
      setCorreoAcademia(''); setNombreDirector(''); setDirectorEmail('');
      
      fetchAcademias();
    } catch (err: any) {
      console.error('Error al crear academia:', err);
      alert(`Error al crear la academia: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const toggleEstado = (id: string) => {
    setAcademias(academias.map(a => 
      a.id === id ? { ...a, estado: a.estado === 'Activa' ? 'Inactiva' : 'Activa' } : a
    ));
  };

  const changePlan = (id: string, newPlan: 'Formación' | 'Competencia' | 'Alto Rendimiento') => {
    setAcademias(academias.map(a => 
      a.id === id ? { ...a, plan: newPlan } : a
    ));
  };

  const handleSecurityChange = (e: React.FormEvent) => {
    e.preventDefault();
    setSecMessage('Contraseña de Administrador actualizada correctamente.');
    setCurrentPass('');
    setNewPass('');
  };

  const totalAcademias = academias.length;
  const activas = academias.filter(a => a.estado === 'Activa').length;
  const totalJugadores = academias.reduce((acc, curr) => acc + (curr.jugadores_count || 0), 0);
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
            Gestión global de licencias, facturación y plataformas cliente. Usuario: <span className="text-[#289E9D] font-semibold">d.jarazerene@gmail.com</span>
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#289E9D] hover:bg-[#1f7a79] text-white font-bold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-lg"
        >
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
          <p className="text-xs text-gray-500 mt-2">A nivel sistema</p>
        </div>
        <div className="bg-[#1C212D] p-6 rounded-xl border border-gray-800">
          <p className="text-xs text-gray-400 font-bold uppercase">Ingreso Mensual (MRR)</p>
          <p className="text-3xl font-extrabold text-green-400 mt-2">${mrrEstimado.toLocaleString('es-CL')} CLP</p>
          <p className="text-xs text-gray-500 mt-2">Suscripciones activas</p>
        </div>
        <div className="bg-[#1C212D] p-6 rounded-xl border border-gray-800">
          <p className="text-xs text-gray-400 font-bold uppercase">Estado de Servidores</p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">100% OK</p>
          <p className="text-xs text-gray-500 mt-2">Render Backend en línea</p>
        </div>
      </div>

      <div className="bg-[#1C212D] rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Academias Registradas</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando academias desde el servidor...</div>
        ) : academias.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay academias registradas aún.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#131722] text-gray-400 text-xs uppercase border-b border-gray-800">
                  <th className="p-4">Academia</th>
                  <th className="p-4">Director</th>
                  <th className="p-4">Plan Actual</th>
                  <th className="p-4">Jugadores</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
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
                      <select
                        value={a.plan}
                        onChange={(e) => changePlan(a.id, e.target.value as any)}
                        className="bg-[#131722] border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                      >
                        <option value="Formación">Formación</option>
                        <option value="Competencia">Competencia</option>
                        <option value="Alto Rendimiento">Alto Rendimiento</option>
                      </select>
                    </td>
                    <td className="p-4 text-gray-300">{a.jugadores_count || 0}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        a.estado === 'Activa' ? 'bg-green-900/60 text-green-300 border border-green-700' : 'bg-red-900/60 text-red-300 border border-red-700'
                      }`}>
                        {a.estado}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => toggleEstado(a.id)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                          a.estado === 'Activa' ? 'bg-red-800 hover:bg-red-700 text-white' : 'bg-green-800 hover:bg-green-700 text-white'
                        }`}
                      >
                        {a.estado === 'Activa' ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-[#1C212D] p-6 rounded-xl border border-gray-800 max-w-xl">
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <span>🔐</span> Credenciales SuperAdmin
        </h3>
        <p className="text-xs text-gray-400 mb-6">
          Cambia la contraseña maestra de acceso global a la plataforma.
        </p>

        {secMessage && (
          <div className="p-4 bg-green-900/50 text-green-300 border border-green-700 rounded-lg mb-4 text-sm">
            {secMessage}
          </div>
        )}

        <form onSubmit={handleSecurityChange} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Contraseña Actual</label>
            <input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2.5 text-white focus:border-[#289E9D] focus:outline-none text-sm" placeholder="••••••••" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Nueva Contraseña</label>
            <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2.5 text-white focus:border-[#289E9D] focus:outline-none text-sm" placeholder="••••••••" required />
          </div>
          <button type="submit" className="w-full bg-[#289E9D] hover:bg-[#1f7a79] text-white font-bold py-2.5 rounded transition-colors">
            Guardar Nueva Contraseña
          </button>
        </form>
      </div>

      {/* MODAL CREAR ACADEMIA */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#1C212D] p-6 rounded-xl border border-gray-800 max-w-2xl w-full my-8">
            <h3 className="text-xl font-bold text-white mb-6 border-b border-gray-800 pb-4">Registrar Nueva Academia</h3>
            
            <form onSubmit={handleCreateAcademia} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* DATOS DE LA ACADEMIA */}
                <div className="space-y-4">
                  <h4 className="text-[#289E9D] text-sm font-bold uppercase">Datos Institucionales</h4>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nombre de la Academia *</label>
                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2.5 text-white text-sm focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Logo de la Academia</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange} 
                      className="w-full bg-[#131722] border border-gray-700 rounded p-1.5 text-white text-sm focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#289E9D] file:text-white hover:file:bg-[#1f7a79]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Dirección de Sede Principal</label>
                    <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2.5 text-white text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Teléfono Institucional</label>
                    <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2.5 text-white text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Correo de la Academia</label>
                    <input type="email" value={correoAcademia} onChange={(e) => setCorreoAcademia(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2.5 text-white text-sm focus:outline-none" />
                  </div>
                </div>

                {/* DATOS DEL DIRECTOR Y SISTEMA */}
                <div className="space-y-4">
                  <h4 className="text-[#289E9D] text-sm font-bold uppercase">Administración y Sistema</h4>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nombre del Director/Encargado *</label>
                    <input type="text" value={nombreDirector} onChange={(e) => setNombreDirector(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2.5 text-white text-sm focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Correo del Director (Usuario Login) *</label>
                    <input type="email" value={directorEmail} onChange={(e) => setDirectorEmail(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2.5 text-white text-sm focus:outline-none" placeholder="director@ejemplo.com" required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Plan de Licencia SaaS *</label>
                    <select value={plan} onChange={(e) => setPlan(e.target.value as any)} className="w-full bg-[#131722] border border-gray-700 rounded p-2.5 text-white text-sm focus:outline-none">
                      <option value="Formación">Formación</option>
                      <option value="Competencia">Competencia</option>
                      <option value="Alto Rendimiento">Alto Rendimiento</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-800 mt-6">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded transition-colors" disabled={uploading}>
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-[#289E9D] hover:bg-[#1f7a79] text-white font-bold py-3 rounded transition-colors flex items-center justify-center" disabled={uploading}>
                  {uploading ? 'Creando Academia...' : 'Crear Academia'}
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
