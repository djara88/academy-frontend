import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

const Matricula: React.FC = () => {
  const navigate = useNavigate();

  // Estados del formulario
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Datos del tutor
  const [tutor, setTutor] = useState({
    nombre_completo: '',
    rut: '',
    telefono: '',
    email: ''
  });

  // Datos del jugador
  const [jugador, setJugador] = useState({
    nombre: '',
    sexo: 'Masculino',
    fecha_nacimiento: '',
    posicion_cancha: 'Delantero',
    talla_uniforme: 'Talla 8',
    talla_apoderado: 'No desea',
    numero_camiseta: 10,
    nombre_camiseta: ''
  });

  // Foto (base64)
  const [fotoBase64, setFotoBase64] = useState('');

  // Evaluación inicial
  const [evaluacion, setEvaluacion] = useState<Record<string, number>>({});

  // Ficha médica
  const [fichaMedica, setFichaMedica] = useState({
    tipo_sangre: 'No sabe',
    alergias: '',
    enfermedades_cronicas: '',
    contacto_em_nombre: '',
    contacto_em_telefono: '',
    compromiso_certificado: false
  });

  // Datos financieros
  const [finanzas, setFinanzas] = useState({
    monto_matricula: 35000,
    abono_matricula: 35000,
    monto_mensualidad: 30000
  });

  // Manejar cambios en inputs
  const handleTutorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTutor({ ...tutor, [e.target.name]: e.target.value });
  };

  const handleJugadorChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setJugador({ ...jugador, [e.target.name]: value });
  };

  const handleFinanzasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setFinanzas({ ...finanzas, [e.target.name]: value });
  };

  const handleFichaMedicaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFichaMedica({ ...fichaMedica, [e.target.name]: value });
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        tutor,
        ...jugador,
        foto_base64: fotoBase64,
        evaluacion,
        ficha_medica: fichaMedica,
        monto_matricula: finanzas.monto_matricula,
        abono_matricula: finanzas.abono_matricula,
        monto_mensualidad: finanzas.monto_mensualidad
      };

      const response = await api.post('/api/jugadores', payload);
      console.log('✅ Matrícula exitosa:', response.data);
      alert('¡Matrícula registrada con éxito!');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('❌ Error al matricular:', err);
      setError(err.response?.data?.error || 'Error al registrar la matrícula');
    } finally {
      setLoading(false);
    }
  };

  // Placeholder para evaluación (se puede mejorar después)
  const handleEvaluacionChange = (skill: string, value: number) => {
    setEvaluacion({ ...evaluacion, [skill]: value });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">📝 Nueva Matrícula</h1>

      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECCIÓN: TUTOR */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">👤 Datos del Apoderado</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="nombre_completo" placeholder="Nombre completo" value={tutor.nombre_completo} onChange={handleTutorChange} required className="border p-2 rounded" />
            <input name="rut" placeholder="RUT" value={tutor.rut} onChange={handleTutorChange} required className="border p-2 rounded" />
            <input name="telefono" placeholder="Teléfono" value={tutor.telefono} onChange={handleTutorChange} className="border p-2 rounded" />
            <input name="email" placeholder="Email" type="email" value={tutor.email} onChange={handleTutorChange} className="border p-2 rounded" />
          </div>
        </div>

        {/* SECCIÓN: JUGADOR */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">⚽ Datos del Jugador</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="nombre" placeholder="Nombre del alumno" value={jugador.nombre} onChange={handleJugadorChange} required className="border p-2 rounded" />
            <select name="sexo" value={jugador.sexo} onChange={handleJugadorChange} className="border p-2 rounded">
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
            </select>
            <input name="fecha_nacimiento" type="date" value={jugador.fecha_nacimiento} onChange={handleJugadorChange} required className="border p-2 rounded" />
            <select name="posicion_cancha" value={jugador.posicion_cancha} onChange={handleJugadorChange} className="border p-2 rounded">
              <option value="Arquero">Arquero</option>
              <option value="Defensa">Defensa</option>
              <option value="Mediocampista">Mediocampista</option>
              <option value="Delantero">Delantero</option>
            </select>
            <select name="talla_uniforme" value={jugador.talla_uniforme} onChange={handleJugadorChange} className="border p-2 rounded">
              <option value="Talla 4">Talla 4</option>
              <option value="Talla 6">Talla 6</option>
              <option value="Talla 8">Talla 8</option>
              <option value="Talla 10">Talla 10</option>
              <option value="Talla 12">Talla 12</option>
              <option value="Talla 14">Talla 14</option>
              <option value="Talla 16">Talla 16</option>
              <option value="S">S</option>
              <option value="M">M</option>
            </select>
            <select name="talla_apoderado" value={jugador.talla_apoderado} onChange={handleJugadorChange} className="border p-2 rounded">
              <option value="No desea">No desea</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
            </select>
            <input name="numero_camiseta" type="number" placeholder="N° Camiseta" value={jugador.numero_camiseta} onChange={handleJugadorChange} className="border p-2 rounded" />
            <input name="nombre_camiseta" placeholder="Nombre en camiseta (Ej: MATEO)" value={jugador.nombre_camiseta} onChange={handleJugadorChange} className="border p-2 rounded" />
          </div>
        </div>

        {/* SECCIÓN: FOTO */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">📷 Foto del Alumno</h2>
          <input type="file" accept="image/*" onChange={handleFotoChange} className="border p-2 rounded w-full" />
          {fotoBase64 && <img src={fotoBase64} alt="Vista previa" className="mt-2 w-32 h-32 object-cover rounded" />}
        </div>

        {/* SECCIÓN: EVALUACIÓN INICIAL (simplificada) */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">📊 Evaluación Inicial</h2>
          <p className="text-sm text-gray-500 mb-2">(Las habilidades se pueden ajustar después)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {['Velocidad', 'Remate', 'Pase', 'Defensa', 'Físico', 'Mental'].map((skill) => (
              <div key={skill} className="flex items-center gap-2">
                <span className="text-sm w-16">{skill}</span>
                <input type="range" min="0" max="100" defaultValue="50" onChange={(e) => handleEvaluacionChange(skill, Number(e.target.value))} className="flex-1" />
                <span className="text-sm w-8 text-center">50</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECCIÓN: FICHA MÉDICA */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">🏥 Ficha Médica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select name="tipo_sangre" value={fichaMedica.tipo_sangre} onChange={handleFichaMedicaChange} className="border p-2 rounded">
              <option value="No sabe">No sabe</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
            <input name="alergias" placeholder="Alergias" value={fichaMedica.alergias} onChange={handleFichaMedicaChange} className="border p-2 rounded" />
            <input name="enfermedades_cronicas" placeholder="Enfermedades crónicas" value={fichaMedica.enfermedades_cronicas} onChange={handleFichaMedicaChange} className="border p-2 rounded" />
            <input name="contacto_em_nombre" placeholder="Contacto emergencia (nombre)" value={fichaMedica.contacto_em_nombre} onChange={handleFichaMedicaChange} className="border p-2 rounded" />
            <input name="contacto_em_telefono" placeholder="Teléfono emergencia" value={fichaMedica.contacto_em_telefono} onChange={handleFichaMedicaChange} className="border p-2 rounded" />
            <label className="flex items-center gap-2">
              <input type="checkbox" name="compromiso_certificado" checked={fichaMedica.compromiso_certificado} onChange={handleFichaMedicaChange} />
              <span>Compromiso de certificado médico (30 días)</span>
            </label>
          </div>
        </div>

        {/* SECCIÓN: FINANZAS */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">💰 Datos Financieros</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm">Valor Matrícula ($)</label>
              <input name="monto_matricula" type="number" value={finanzas.monto_matricula} onChange={handleFinanzasChange} className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block text-sm">Abono Inicial ($)</label>
              <input name="abono_matricula" type="number" value={finanzas.abono_matricula} onChange={handleFinanzasChange} className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block text-sm">Mensualidad ($)</label>
              <input name="monto_mensualidad" type="number" value={finanzas.monto_mensualidad} onChange={handleFinanzasChange} className="border p-2 rounded w-full" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Registrando...' : '✅ Registrar Matrícula'}
        </button>
      </form>
    </div>
  );
};

export default Matricula;
