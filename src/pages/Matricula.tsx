import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';
import { useMutation, useQuery } from '@tanstack/react-query';

interface Tutor {
  id: string;
  nombre_completo: string;
  rut: string;
  telefono: string;
  email: string;
}

interface Jugador {
  id: string;
  nombre: string;
  sexo: string;
  fecha_nacimiento: string;
  posicion_cancha: string;
  talla_uniforme: string;
  talla_apoderado: string;
  numero_camiseta: number;
  nombre_camiseta: string;
  foto_ruta: string;
}

const Matricula: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    // Tutor
    tutor_nombre: '',
    tutor_rut: '',
    tutor_telefono: '',
    tutor_email: '',
    // Jugador
    jugador_nombre: '',
    jugador_sexo: 'Masculino',
    jugador_fecha_nacimiento: '',
    jugador_posicion: 'Delantero',
    jugador_talla_uniforme: 'Talla 8',
    jugador_talla_apoderado: 'No desea',
    jugador_numero_camiseta: 10,
    jugador_nombre_camiseta: '',
    // Finanzas
    monto_matricula: 35000,
    monto_abono: 35000,
    monto_mensualidad: 30000,
    // Ficha médica
    tipo_sangre: 'No sabe',
    alergias: '',
    enfermedades: '',
    contacto_emergencia_nombre: '',
    contacto_emergencia_telefono: '',
    compromiso_certificado: false,
  });

  // Sliders de evaluación
  const [evaluacion, setEvaluacion] = useState({
    reflejos: 50,
    estirada: 50,
    saque_mano: 50,
    saque_meta: 50,
    juego_pies: 50,
    valentia: 50,
  });

  // Cargar categorías para validación (opcional)
  const { data: categorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const res = await api.get('/api/categorias');
      return res.data;
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.checked
    }));
  };

  const handleSliderChange = (name: string, value: number) => {
    setEvaluacion(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      // 1. Crear tutor
      const tutorData = {
        nombre_completo: formData.tutor_nombre,
        rut: formData.tutor_rut,
        telefono: formData.tutor_telefono,
        email: formData.tutor_email,
      };
      const tutorRes = await api.post('/api/tutores', tutorData);
      const tutorId = tutorRes.data.id;

      // 2. Subir foto a Supabase Storage (si hay)
      let fotoUrl = '';
      if (fotoFile) {
        const formDataFoto = new FormData();
        formDataFoto.append('file', fotoFile);
        const fotoRes = await api.post('/api/upload', formDataFoto, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        fotoUrl = fotoRes.data.url;
      }

      // 3. Crear jugador
      const jugadorData = {
        tutor_id: tutorId,
        nombre: formData.jugador_nombre,
        sexo: formData.jugador_sexo,
        fecha_nacimiento: formData.jugador_fecha_nacimiento,
        posicion_cancha: formData.jugador_posicion,
        talla_uniforme: formData.jugador_talla_uniforme,
        talla_apoderado: formData.jugador_talla_apoderado,
        numero_camiseta: formData.jugador_numero_camiseta,
        nombre_camiseta: formData.jugador_nombre_camiseta,
        foto_ruta: fotoUrl,
        monto_matricula: formData.monto_matricula,
        monto_pagado_matricula: formData.monto_abono,
        monto_mensualidad: formData.monto_mensualidad,
        tipo_alumno: 'Nuevo',
      };
      const jugadorRes = await api.post('/api/jugadores', jugadorData);
      const jugadorId = jugadorRes.data.id;

      // 4. Crear evaluación
      await api.post('/api/evaluaciones', {
        jugador_id: jugadorId,
        metricas: evaluacion,
      });

      // 5. Crear ficha médica
      await api.post('/api/ficha-medica', {
        jugador_id: jugadorId,
        tipo_sangre: formData.tipo_sangre,
        alergias: formData.alergias,
        enfermedades_cronicas: formData.enfermedades,
        contacto_em_nombre: formData.contacto_emergencia_nombre,
        contacto_em_telefono: formData.contacto_emergencia_telefono,
        compromiso_certificado: formData.compromiso_certificado,
      });

      // 6. Registrar movimiento financiero
      if (formData.monto_abono > 0) {
        await api.post('/api/finanzas', {
          jugador_id: jugadorId,
          flujo: 'Ingreso',
          tipo_pago: 'Matrícula',
          monto: formData.monto_abono,
          fecha_pago: new Date().toISOString().split('T')[0],
          concepto: `Abono matrícula ${formData.jugador_nombre}`,
          metodo_pago: 'Efectivo/Transferencia',
          mes_correspondiente: '-- No Aplica --',
        });
      }

      return jugadorRes.data;
    },
    onSuccess: () => {
      alert('✅ ¡Matrícula completada con éxito!');
      navigate('/dashboard');
    },
    onError: (error: any) => {
      alert('❌ Error al registrar: ' + (error.response?.data?.error || error.message));
    },
  });

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">📝 Registro de Matrícula</h1>

      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
        {/* Sección: Apoderado */}
        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">👤 Datos del Apoderado</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
              <input type="text" name="tutor_nombre" value={formData.tutor_nombre} onChange={handleChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RUT *</label>
              <input type="text" name="tutor_rut" value={formData.tutor_rut} onChange={handleChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input type="text" name="tutor_telefono" value={formData.tutor_telefono} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="tutor_email" value={formData.tutor_email} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Sección: Jugador */}
        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">⚽ Datos del Jugador</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" name="jugador_nombre" value={formData.jugador_nombre} onChange={handleChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
              <select name="jugador_sexo" value={formData.jugador_sexo} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500">
                <option>Masculino</option>
                <option>Femenino</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Nacimiento</label>
              <input type="date" name="jugador_fecha_nacimiento" value={formData.jugador_fecha_nacimiento} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Posición</label>
              <select name="jugador_posicion" value={formData.jugador_posicion} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500">
                <option>Arquero</option>
                <option>Defensa</option>
                <option>Mediocampista</option>
                <option>Delantero</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Talla Uniforme</label>
              <select name="jugador_talla_uniforme" value={formData.jugador_talla_uniforme} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500">
                <option>Talla 4</option>
                <option>Talla 6</option>
                <option>Talla 8</option>
                <option>Talla 10</option>
                <option>Talla 12</option>
                <option>Talla 14</option>
                <option>Talla 16</option>
                <option>S</option>
                <option>M</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Talla Apoderado</label>
              <select name="jugador_talla_apoderado" value={formData.jugador_talla_apoderado} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500">
                <option>No desea</option>
                <option>S</option>
                <option>M</option>
                <option>L</option>
                <option>XL</option>
                <option>XXL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° Camiseta</label>
              <input type="number" name="jugador_numero_camiseta" value={formData.jugador_numero_camiseta} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre en Camiseta</label>
              <input type="text" name="jugador_nombre_camiseta" value={formData.jugador_nombre_camiseta} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="Ej: MATEO" />
            </div>
          </div>
        </div>

        {/* Sección: Foto */}
        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">📸 Foto del Alumno</h2>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
              {fotoPreview ? (
                <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-sm">Sin foto</span>
              )}
            </div>
            <div>
              <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              <p className="text-xs text-gray-400 mt-1">Formatos: JPG, PNG (máx 5MB)</p>
            </div>
          </div>
        </div>

        {/* Sección: Evaluación Técnica */}
        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">📊 Evaluación Técnica Inicial</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(evaluacion).map(([key, value]) => {
              const labels: Record<string, string> = {
                reflejos: 'Reflejos',
                estirada: 'Estirada',
                saque_mano: 'Saque de Mano',
                saque_meta: 'Saque de Meta',
                juego_pies: 'Juego de Pies',
                valentia: 'Valentía',
              };
              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{labels[key] || key}: {value}</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => handleSliderChange(key, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Sección: Finanzas */}
        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">💰 Datos Financieros</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Matrícula ($)</label>
              <input type="number" name="monto_matricula" value={formData.monto_matricula} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Abono Inicial ($)</label>
              <input type="number" name="monto_abono" value={formData.monto_abono} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensualidad ($)</label>
              <input type="number" name="monto_mensualidad" value={formData.monto_mensualidad} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Sección: Ficha Médica */}
        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">🏥 Ficha Médica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Sangre</label>
              <select name="tipo_sangre" value={formData.tipo_sangre} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500">
                <option>No sabe</option>
                <option>O+</option>
                <option>O-</option>
                <option>A+</option>
                <option>A-</option>
                <option>B+</option>
                <option>B-</option>
                <option>AB+</option>
                <option>AB-</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alergias</label>
              <input type="text" name="alergias" value={formData.alergias} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="Ej: Penicilina, Ninguna..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enfermedades Crónicas</label>
              <input type="text" name="enfermedades" value={formData.enfermedades} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="Ej: Asma, Ninguna..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contacto Emergencia</label>
              <input type="text" name="contacto_emergencia_nombre" value={formData.contacto_emergencia_nombre} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="Nombre" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono Emergencia</label>
              <input type="text" name="contacto_emergencia_telefono" value={formData.contacto_emergencia_telefono} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="+569..." />
            </div>
            <div className="flex items-center">
              <input type="checkbox" name="compromiso_certificado" checked={formData.compromiso_certificado} onChange={handleCheckbox} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <label className="ml-2 text-sm text-gray-700">Compromiso de entrega de Certificado Médico</label>
            </div>
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
          >
            {mutation.isPending ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Registrando...
              </>
            ) : (
              '📝 Registrar Matrícula'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Matricula;
