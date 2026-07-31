import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig'; // Asegúrate de que esta ruta coincida con tu proyecto

const Matricula = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Estado unificado para el formulario
  const [formData, setFormData] = useState({
    // Datos del Apoderado
    tutor_nombre: '',
    tutor_rut: '',
    tutor_telefono: '',
    tutor_email: '',
    
    // Datos del Jugador
    nombre: '',
    sexo: 'Masculino',
    fecha_nacimiento: '',
    posicion_cancha: 'Delantero',
    talla_uniforme: 'Talla 12',
    talla_apoderado: 'No desea',
    numero_camiseta: '',
    nombre_camiseta: '',
    
    // Finanzas (Ajusta estos valores por defecto según tu academia)
    monto_matricula: 50000,
    abono_matricula: 50000,
    monto_mensualidad: 35000,

    // Base64 de la foto si se requiere subirla (opcional)
    foto_base64: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Estructuramos el payload exactamente como lo espera el Backend
      const payload = {
        tutor: {
          nombre_completo: formData.tutor_nombre,
          rut: formData.tutor_rut,
          telefono: formData.tutor_telefono,
          email: formData.tutor_email
        },
        nombre: formData.nombre,
        sexo: formData.sexo,
        fecha_nacimiento: formData.fecha_nacimiento,
        posicion_cancha: formData.posicion_cancha,
        talla_uniforme: formData.talla_uniforme,
        talla_apoderado: formData.talla_apoderado,
        numero_camiseta: formData.numero_camiseta,
        nombre_camiseta: formData.nombre_camiseta,
        monto_matricula: formData.monto_matricula,
        abono_matricula: formData.abono_matricula,
        monto_mensualidad: formData.monto_mensualidad,
        foto_base64: formData.foto_base64,
        evaluacion: {}, // Opcional
        ficha_medica: null // Opcional
      };

      // Llamada a la API de tu backend
      const response = await api.post('/api/jugadores', payload);
      
      console.log('✅ Matrícula exitosa:', response.data);
      
      // NUEVA ALERTA: Muestra el folio y avisa del correo
      alert(`Alumno matriculado exitosamente.\n\nFolio: ${response.data.folio}\nEl contrato ha sido generado y enviado al correo del apoderado.`);
      
      // Redirigir al dashboard después del éxito
      navigate('/dashboard');

    } catch (error: any) {
      console.error('❌ Error al matricular:', error);
      alert(error.response?.data?.error || 'Ocurrió un error al intentar matricular al alumno.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 text-white min-h-screen bg-[#131722]"> {/* Ajusta el color de fondo a tu tema */}
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        📝 Nueva Matrícula
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* ================= SECCIÓN APODERADO ================= */}
        <div className="bg-[#1C212D] p-6 rounded-lg shadow-md border border-gray-800">
          <h2 className="text-xl font-semibold mb-4 text-[#289E9D]">👤 Datos del Apoderado</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Nombre completo *</label>
              <input
                type="text"
                name="tutor_nombre"
                value={formData.tutor_nombre}
                onChange={handleChange}
                required
                className="w-full bg-[#131722] border border-gray-700 rounded p-2 focus:outline-none focus:border-[#289E9D]"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">RUT *</label>
              <input
                type="text"
                name="tutor_rut"
                value={formData.tutor_rut}
                onChange={handleChange}
                required
                className="w-full bg-[#131722] border border-gray-700 rounded p-2 focus:outline-none focus:border-[#289E9D]"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Teléfono</label>
              <input
                type="text"
                name="tutor_telefono"
                value={formData.tutor_telefono}
                onChange={handleChange}
                className="w-full bg-[#131722] border border-gray-700 rounded p-2 focus:outline-none focus:border-[#289E9D]"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Correo electrónico</label>
              <input
                type="email"
                name="tutor_email"
                value={formData.tutor_email}
                onChange={handleChange}
                className="w-full bg-[#131722] border border-gray-700 rounded p-2 focus:outline-none focus:border-[#289E9D]"
              />
            </div>
          </div>
        </div>

        {/* ================= SECCIÓN JUGADOR ================= */}
        <div className="bg-[#1C212D] p-6 rounded-lg shadow-md border border-gray-800">
          <h2 className="text-xl font-semibold mb-4 text-[#289E9D]">⚽ Datos del Jugador</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Nombre completo *</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="w-full bg-[#131722] border border-gray-700 rounded p-2 focus:outline-none focus:border-[#289E9D]"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Sexo</label>
              <select
                name="sexo"
                value={formData.sexo}
                onChange={handleChange}
                className="w-full bg-[#131722] border border-gray-700 rounded p-2 focus:outline-none focus:border-[#289E9D]"
              >
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Fecha de nacimiento *</label>
              <input
                type="date"
                name="fecha_nacimiento"
                value={formData.fecha_nacimiento}
                onChange={handleChange}
                required
                className="w-full bg-[#131722] border border-gray-700 rounded p-2 focus:outline-none focus:border-[#289E9D]"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Posición en cancha *</label>
              <select
                name="posicion_cancha"
                value={formData.posicion_cancha}
                onChange={handleChange}
                className="w-full bg-[#131722] border border-gray-700 rounded p-2 focus:outline-none focus:border-[#289E9D]"
              >
                <option value="Portero">Portero</option>
                <option value="Defensa">Defensa</option>
                <option value="Mediocampista">Mediocampista</option>
                <option value="Delantero">Delantero</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Talla uniforme niño</label>
              <select
                name="talla_uniforme"
                value={formData.talla_uniforme}
                onChange={handleChange}
                className="w-full bg-[#131722] border border-gray-700 rounded p-2 focus:outline-none focus:border-[#289E9D]"
              >
                <option value="Talla 8">Talla 8</option>
                <option value="Talla 10">Talla 10</option>
                <option value="Talla 12">Talla 12</option>
                <option value="Talla 14">Talla 14</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Talla uniforme apoderado</label>
              <select
                name="talla_apoderado"
                value={formData.talla_apoderado}
                onChange={handleChange}
                className="w-full bg-[#131722] border border-gray-700 rounded p-2 focus:outline-none focus:border-[#289E9D]"
              >
                <option value="No desea">No desea</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">N° Camiseta</label>
              <input
                type="number"
                name="numero_camiseta"
                value={formData.numero_camiseta}
                onChange={handleChange}
                className="w-full bg-[#131722] border border-gray-700 rounded p-2 focus:outline-none focus:border-[#289E9D]"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Nombre en camiseta</label>
              <input
                type="text"
                name="nombre_camiseta"
                value={formData.nombre_camiseta}
                onChange={handleChange}
                className="w-full bg-[#131722] border border-gray-700 rounded p-2 focus:outline-none focus:border-[#289E9D]"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>
        </div>

        {/* ================= BOTÓN DE ENVÍO ================= */}
        <div className="flex justify-end mt-6">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#289E9D] hover:bg-[#1f7a79] text-white font-bold py-2 px-6 rounded focus:outline-none disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Guardar Matrícula'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Matricula;
