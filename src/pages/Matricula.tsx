import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

const Matricula: React.FC = () => {
  const navigate = useNavigate();

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

  // Foto
  const [fotoBase64, setFotoBase64] = useState('');

  // Habilidades según posición
  const [habilidades, setHabilidades] = useState<string[]>([]);
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

  // Finanzas
  const [finanzas, setFinanzas] = useState({
    monto_matricula: 35000,
    abono_matricula: 35000,
    monto_mensualidad: 30000
  });

  // Actualizar habilidades según posición
  useEffect(() => {
    const skillsMap: Record<string, string[]> = {
      Arquero: ['Reflejos', 'Estirada', 'Saque de Mano', 'Saque de Meta', 'Juego de Pies', 'Valentía'],
      Delantero: ['Velocidad', 'Remate', 'Pase', 'Defensa', 'Físico', 'Mental'],
      Mediocampista: ['Velocidad', 'Remate', 'Pase', 'Defensa', 'Físico', 'Mental'],
      Defensa: ['Velocidad', 'Remate', 'Pase', 'Defensa', 'Físico', 'Mental']
    };
    const nuevas = skillsMap[jugador.posicion_cancha] || skillsMap['Delantero'];
    setHabilidades(nuevas);
    const nuevaEval: Record<string, number> = {};
    nuevas.forEach(skill => { nuevaEval[skill] = 50; });
    setEvaluacion(nuevaEval);
  }, [jugador.posicion_cancha]);

  // ============================================================
  // VALIDACIÓN Y FORMATEO DE RUT CHILENO
  // ============================================================
  const formatRut = (value: string) => {
    let clean = value.replace(/\D/g, '');
    if (clean.length === 0) return '';
    if (clean.length > 9) clean = clean.slice(0, 9);
    if (clean.length > 1) {
      const cuerpo = clean.slice(0, -1);
      const dv = clean.slice(-1);
      return cuerpo + '-' + dv;
    }
    return clean;
  };

  const validarRut = (rut: string): boolean => {
    const clean = rut.replace(/[.-]/g, '');
    if (clean.length < 2) return false;
    const cuerpo = clean.slice(0, -1);
    const dv = clean.slice(-1).toUpperCase();
    let suma = 0;
    let multiplo = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i]) * multiplo;
      multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }
    const resto = suma % 11;
    const dvCalculado = 11 - resto;
    let dvEsperado = '';
    if (dvCalculado === 11) dvEsperado = '0';
    else if (dvCalculado === 10) dvEsperado = 'K';
    else dvEsperado = dvCalculado.toString();
    return dv === dvEsperado;
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatRut(raw);
    setTutor({ ...tutor, rut: formatted });
  };

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

  const handleEvaluacionChange = (skill: string, value: number) => {
    setEvaluacion({ ...evaluacion, [skill]: value });
  };

  // Manejar envío
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validar RUT antes de enviar
    if (!validarRut(tutor.rut)) {
      setError('RUT inválido. Verifica el formato y dígito verificador.');
      setLoading(false);
      return;
    }

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

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-[#e6edf3] mb-6">📝 Nueva Matrícula</h1>

      {error && (
        <div className="bg-[#2c1a1a] border border-[#e74c3c] text-[#e74c3c] px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECCIÓN: TUTOR */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-[#e6edf3] mb-4">👤 Datos del Apoderado</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre completo *</label>
              <input
                name="nombre_completo"
                placeholder="Nombre completo"
                value={tutor.nombre_completo}
                onChange={handleTutorChange}
                required
                className="w-full"
              />
            </div>
            <div>
              <label className="label">RUT *</label>
              <input
                name="rut"
                placeholder="12345678-9"
                value={tutor.rut}
                onChange={handleRutChange}
                required
                className="w-full"
              />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input
                name="telefono"
                placeholder="+56912345678"
                value={tutor.telefono}
                onChange={handleTutorChange}
                className="w-full"
              />
            </div>
            <div>
              <label className="label">Correo electrónico</label>
              <input
                name="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={tutor.email}
                onChange={handleTutorChange}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN: JUGADOR */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-[#e6edf3] mb-4">⚽ Datos del Jugador</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre completo *</label>
              <input
                name="nombre"
                placeholder="Nombre del alumno"
                value={jugador.nombre}
                onChange={handleJugadorChange}
                required
                className="w-full"
              />
            </div>
            <div>
              <label className="label">Sexo</label>
              <select
                name="sexo"
                value={jugador.sexo}
                onChange={handleJugadorChange}
                className="w-full"
              >
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </div>
            <div>
              <label className="label">Fecha de nacimiento *</label>
              <input
                name="fecha_nacimiento"
                type="date"
                value={jugador.fecha_nacimiento}
                onChange={handleJugadorChange}
                required
                className="w-full"
              />
            </div>
            <div>
              <label className="label">Posición en cancha *</label>
              <select
                name="posicion_cancha"
                value={jugador.posicion_cancha}
                onChange={handleJugadorChange}
                className="w-full"
              >
                <option value="Arquero">Arquero</option>
                <option value="Defensa">Defensa</option>
                <option value="Mediocampista">Mediocampista</option>
                <option value="Delantero">Delantero</option>
              </select>
            </div>
            <div>
              <label className="label">Talla uniforme niño</label>
              <select
                name="talla_uniforme"
                value={jugador.talla_uniforme}
                onChange={handleJugadorChange}
                className="w-full"
              >
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
            </div>
            <div>
              <label className="label">Talla uniforme apoderado</label>
              <select
                name="talla_apoderado"
                value={jugador.talla_apoderado}
                onChange={handleJugadorChange}
                className="w-full"
              >
                <option value="No desea">No desea</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
              </select>
            </div>
            <div>
              <label className="label">N° Camiseta</label>
              <input
                name="numero_camiseta"
                type="number"
                min="1"
                max="99"
                value={jugador.numero_camiseta}
                onChange={handleJugadorChange}
                className="w-full"
              />
            </div>
            <div>
              <label className="label">Nombre en camiseta</label>
              <input
                name="nombre_camiseta"
                placeholder="Ej: MATEO"
                value={jugador.nombre_camiseta}
                onChange={handleJugadorChange}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN: FOTO */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-[#e6edf3] mb-4">📷 Foto del Alumno</h2>
          <input
            type="file"
            accept="image/*"
            onChange={handleFotoChange}
            className="w-full border-none bg-[#1c2331] p-2 rounded-lg"
          />
          {fotoBase64 && (
            <img
              src={fotoBase64}
              alt="Vista previa"
              className="mt-4 w-32 h-32 object-cover rounded-lg border-2 border-[#2d3a4f]"
            />
          )}
        </div>

        {/* SECCIÓN: EVALUACIÓN DINÁMICA */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-[#e6edf3] mb-4">📊 Evaluación Inicial</h2>
          <p className="text-sm text-[#8b949e] mb-4">
            Habilidades para {jugador.posicion_cancha}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {habilidades.map((skill) => (
              <div key={skill} className="flex items-center gap-3">
                <span className="w-32 text-sm font-medium">{skill}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={evaluacion[skill] || 50}
                  onChange={(e) => handleEvaluacionChange(skill, Number(e.target.value))}
                  className="flex-1 accent-[#00e676]"
                />
                <span className="w-8 text-center font-bold text-[#00e676]">
                  {evaluacion[skill] || 50}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SECCIÓN: FICHA MÉDICA */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-[#e6edf3] mb-4">🏥 Ficha Médica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de sangre</label>
              <select
                name="tipo_sangre"
                value={fichaMedica.tipo_sangre}
                onChange={handleFichaMedicaChange}
                className="w-full"
              >
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
            </div>
            <div>
              <label className="label">Alergias</label>
              <input
                name="alergias"
                placeholder="Ej: Penicilina, polen..."
                value={fichaMedica.alergias}
                onChange={handleFichaMedicaChange}
                className="w-full"
              />
            </div>
            <div>
              <label className="label">Enfermedades crónicas</label>
              <input
                name="enfermedades_cronicas"
                placeholder="Ej: Asma, diabetes..."
                value={fichaMedica.enfermedades_cronicas}
                onChange={handleFichaMedicaChange}
                className="w-full"
              />
            </div>
            <div>
              <label className="label">Contacto de emergencia (nombre)</label>
              <input
                name="contacto_em_nombre"
                placeholder="Nombre alternativo"
                value={fichaMedica.contacto_em_nombre}
                onChange={handleFichaMedicaChange}
                className="w-full"
              />
            </div>
            <div>
              <label className="label">Teléfono emergencia</label>
              <input
                name="contacto_em_telefono"
                placeholder="+56987654321"
                value={fichaMedica.contacto_em_telefono}
                onChange={handleFichaMedicaChange}
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="compromiso_certificado"
                checked={fichaMedica.compromiso_certificado}
                onChange={handleFichaMedicaChange}
                className="w-5 h-5 accent-[#00e676]"
              />
              <label className="text-sm font-medium text-[#e6edf3]">
                Compromiso de certificado médico (30 días)
              </label>
            </div>
          </div>
        </div>

        {/* SECCIÓN: FINANZAS */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-[#e6edf3] mb-4">💰 Datos Financieros</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Valor Matrícula ($)</label>
              <input
                name="monto_matricula"
                type="number"
                value={finanzas.monto_matricula}
                onChange={handleFinanzasChange}
                className="w-full"
              />
            </div>
            <div>
              <label className="label">Abono Inicial ($)</label>
              <input
                name="abono_matricula"
                type="number"
                value={finanzas.abono_matricula}
                onChange={handleFinanzasChange}
                className="w-full"
              />
            </div>
            <div>
              <label className="label">Mensualidad ($)</label>
              <input
                name="monto_mensualidad"
                type="number"
                value={finanzas.monto_mensualidad}
                onChange={handleFinanzasChange}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-[#0d1117]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Registrando...
            </>
          ) : (
            '✅ Registrar Matrícula'
          )}
        </button>
      </form>
    </div>
  );
};

export default Matricula;
