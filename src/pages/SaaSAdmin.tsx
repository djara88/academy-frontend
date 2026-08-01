import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig'; // Ajusta la ruta si es necesario

// Definimos la estructura de datos de una Academia
interface Academia {
  id: string;
  nombre: string;
  abreviacion: string;
  director_nombre: string;
  director_correo: string;
  director_telefono: string;
  limite_alumnos: number;
  estado_licencia: string;
  created_at: string;
}

const SaaSAdmin = () => {
  const [academias, setAcademias] = useState<Academia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para el formulario de nueva academia
  const [formData, setFormData] = useState({
    nombre: '',
    abreviacion: '',
    director_nombre: '',
    director_correo: '',
    director_telefono: '',
    limite_alumnos: 100
  });

  // Cargar lista de academias al montar el componente
  useEffect(() => {
    fetchAcademias();
  }, []);

  const fetchAcademias = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/saas/academias');
      setAcademias(response.data.data);
    } catch (error) {
      console.error('❌ Error al cargar academias:', error);
      alert('Error al cargar la lista de clientes.');
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambios en el formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Crear nueva academia
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/api/saas/academias', formData);
      alert('¡Nueva academia creada con éxito!');
      setShowModal(false);
      setFormData({
        nombre: '',
        abreviacion: '',
        director_nombre: '',
        director_correo: '',
        director_telefono: '',
        limite_alumnos: 100
      });
      fetchAcademias(); // Recargar la tabla
    } catch (error) {
      console.error('❌ Error al crear academia:', error);
      alert('Hubo un error al registrar la academia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cambiar estado de la licencia (Activa / Suspendida)
  const toggleLicencia = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'Activa' ? 'Suspendida' : 'Activa';
    const confirmar = window.confirm(`¿Estás seguro de cambiar el estado a ${nuevoEstado}?`);
    
    if (!confirmar) return;

    try {
      await api.put(`/api/saas/academias/${id}`, { estado_licencia: nuevoEstado });
      fetchAcademias(); // Recargar la tabla para reflejar cambios
    } catch (error) {
      console.error('❌ Error al actualizar licencia:', error);
      alert('Error al cambiar el estado de la licencia.');
    }
  };

  return (
    <div className="p-6 text-white min-h-screen bg-[#131722]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          👑 Panel Maestro (SaaS)
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#289E9D] hover:bg-[#1f7a79] text-white font-bold py-2 px-4 rounded"
        >
          + Nueva Academia
        </button>
      </div>

      {/* TABLA DE CLIENTES (ACADEMIAS) */}
      <div className="bg-[#1C212D] rounded-lg shadow-md border border-gray-800 overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center text-gray-400">Cargando academias...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#131722] text-gray-400 text-sm border-b border-gray-700">
                <th className="p-4">Academia</th>
                <th className="p-4">Director</th>
                <th className="p-4">Contacto</th>
                <th className="p-4">Límite Alumnos</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {academias.map((academia) => (
                <tr key={academia.id} className="border-b border-gray-800 hover:bg-[#131722] transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-white">{academia.nombre}</div>
                    <div className="text-xs text-gray-500">[{academia.abreviacion}]</div>
                  </td>
                  <td className="p-4 text-sm">{academia.director_nombre}</td>
                  <td className="p-4 text-sm">
                    <div>{academia.director_correo}</div>
                    <div className="text-gray-500">{academia.director_telefono}</div>
                  </td>
                  <td className="p-4 text-sm text-center font-bold">{academia.limite_alumnos}</td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        academia.estado_licencia === 'Activa'
                          ? 'bg-green-900 text-green-300'
                          : 'bg-red-900 text-red-300'
                      }`}
                    >
                      {academia.estado_licencia}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleLicencia(academia.id, academia.estado_licencia)}
                      className={`text-xs font-bold py-1 px-3 rounded ${
                        academia.estado_licencia === 'Activa'
                          ? 'bg-orange-700 hover:bg-orange-600 text-white'
                          : 'bg-green-700 hover:bg-green-600 text-white'
                      }`}
                    >
                      {academia.estado_licencia === 'Activa' ? 'Suspender' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {academias.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    No hay academias registradas. ¡Vende tu primera licencia!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL PARA CREAR NUEVA ACADEMIA */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
          <div className="bg-[#1C212D] rounded-lg shadow-xl border border-gray-700 w-full max-w-2xl overflow-hidden">
            <div className="bg-[#131722] px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#289E9D]">Registrar Nueva Academia</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 text-gray-300">Nombre de la Escuela *</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white focus:border-[#289E9D] outline-none"
                    placeholder="Ej: Leones FC"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-300">Abreviación (3 Letras) *</label>
                  <input
                    type="text"
                    name="abreviacion"
                    value={formData.abreviacion}
                    onChange={handleChange}
                    required
                    maxLength={3}
                    className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white focus:border-[#289E9D] outline-none uppercase"
                    placeholder="Ej: LEO"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-300">Nombre del Director *</label>
                  <input
                    type="text"
                    name="director_nombre"
                    value={formData.director_nombre}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white focus:border-[#289E9D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-300">Correo del Director *</label>
                  <input
                    type="email"
                    name="director_correo"
                    value={formData.director_correo}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white focus:border-[#289E9D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-300">Teléfono (WhatsApp)</label>
                  <input
                    type="text"
                    name="director_telefono"
                    value={formData.director_telefono}
                    onChange={handleChange}
                    className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white focus:border-[#289E9D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-300">Límite de Alumnos *</label>
                  <input
                    type="number"
                    name="limite_alumnos"
                    value={formData.limite_alumnos}
                    onChange={handleChange}
                    required
                    min="1"
                    className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white focus:border-[#289E9D] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-800 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-800 py-2 px-4 rounded mr-3"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#289E9D] hover:bg-[#1f7a79] text-white font-bold py-2 px-6 rounded disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Crear Licencia'}
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
