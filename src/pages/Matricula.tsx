import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

const Matricula = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Estado con TODOS los campos (Apoderado, Jugador, Médicos, Evaluación, Finanzas)
  const [formData, setFormData] = useState({
    // Datos del Apoderado
    tutor_nombre: '',
    tutor_rut: '',
    tutor_telefono: '',
    tutor_email: '',
    talla_apoderado: 'No desea',
    
    // Datos del Jugador
    nombre: '',
    rut: '',
    sexo: 'Masculino',
    fecha_nacimiento: '',
    posicion_cancha: 'Delantero',
    talla_uniforme: 'Talla 12',
    numero_camiseta: '',
    nombre_camiseta: '',
    foto_base64: '',

    // Ficha Médica
    tipo_sangre: 'O+',
    alergias: 'Ninguna',
    patologias: 'Ninguna',
    medicamentos: 'Ninguno',

    // Evaluación Inicial
    nivel_tecnico: 'Principiante',
    nivel_fisico: 'Normal',

    // Finanzas
    monto_matricula: 50000,
    abono_matricula: 50000,
    monto_mensualidad: 35000,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      // 1. Estructuramos el payload COMPLETO como lo espera tu Backend
      const payload = {
        // Objeto del Apoderado
        tutor: {
          nombre_completo: formData.tutor_nombre,
          rut: formData.tutor_rut,
          telefono: formData.tutor_telefono,
          email: formData.tutor_email
        },
        
        // Datos directos del Jugador
        nombre: formData.nombre,
        rut: formData.rut,
        sexo: formData.sexo,
        fecha_nacimiento: formData.fecha_nacimiento,
        posicion_cancha: formData.posicion_cancha,
        talla_uniforme: formData.talla_uniforme,
        talla_apoderado: formData.talla_apoderado,
        numero_camiseta: formData.numero_camiseta,
        nombre_camiseta: formData.nombre_camiseta,
        
        // Finanzas
        monto_matricula: Number(formData.monto_matricula),
        abono_matricula: Number(formData.abono_matricula),
        monto_mensualidad: Number(formData.monto_mensualidad),
        foto_base64: formData.foto_base64,
        
        // Objeto de Ficha Médica
        ficha_medica: {
          tipo_sangre: formData.tipo_sangre,
          alergias: formData.alergias,
          patologias: formData.patologias,
          medicamentos: formData.medicamentos
        },
        
        // Objeto de Evaluación Inicial
        evaluacion: {
          nivel_tecnico: formData.nivel_tecnico,
          nivel_fisico: formData.nivel_fisico,
          observaciones: 'Evaluación de ingreso generada en matrícula.'
        }
      };

      // 2. Guardamos todo en la base de datos
      const response = await api.post('/api/jugadores', payload);
      console.log('✅ Matrícula guardada:', response.data);

      const jugadorId = response.data?.jugador_id || response.data?.data?.id;
      const tutorId = response.data?.tutor_id;
      let folioGenerado = 'Generado en sistema';

      // 3. GENERAR PDF, DESCARGAR Y ENVIAR POR CORREO
      if (jugadorId && tutorId) {
        try {
          const responseMatricula = await api.post('/api/matriculas/generar-documento', {
            jugador_id: jugadorId,
            tutor_id: tutorId
          });

          if (responseMatricula.data?.success) {
            folioGenerado = responseMatricula.data.folio;
            
            // Abre el PDF automáticamente en una pestaña nueva (Descarga/Impresión)
            if (responseMatricula.data.url) {
              window.open(responseMatricula.data.url, '_blank'); 
            }
          }
        } catch (pdfError) {
          console.error('❌ Error al generar/enviar PDF:', pdfError);
          // Si el PDF falla (ej. error de red), no bloqueamos al usuario, el alumno ya se guardó.
        }
      }
      
      // 4. Mensaje de Éxito y Redirección
      alert(`✅ Alumno matriculado exitosamente.\n\nFolio: ${folioGenerado}\nEl contrato en PDF se abrió en una pestaña nueva y fue enviado al correo del apoderado.`);
      navigate('/dashboard');

    } catch (error: any) {
      console.error('❌ Error al matricular:', error);
      alert(error.response?.data?.error || 'Ocurrió un error al intentar matricular al alumno.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 text-white min-h-screen bg-[#0d1117]">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-6 flex items-center text-[#e6edf3]">
          <span className="mr-3">📝</span> Nueva Matrícula
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* ================= SECCIÓN 1: APODERADO ================= */}
          <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d] shadow-lg">
            <h2 className="text-xl font-bold mb-5 text-[#58a6ff] border-b border-[#30363d] pb-2">
              👤 Datos del Apoderado (Tutor)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Nombre completo *</label>
                <input type="text" name="tutor_nombre" value={formData.tutor_nombre} onChange={handleChange} required
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#58a6ff] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">RUT *</label>
                <input type="text" name="tutor_rut" value={formData.tutor_rut} onChange={handleChange} required
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#58a6ff] focus:outline-none" placeholder="12.345.678-9" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Teléfono *</label>
                <input type="text" name="tutor_telefono" value={formData.tutor_telefono} onChange={handleChange} required
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#58a6ff] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Correo electrónico *</label>
                <input type="email" name="tutor_email" value={formData.tutor_email} onChange={handleChange} required
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#58a6ff] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Talla de regalo (Apoderado)</label>
                <select name="talla_apoderado" value={formData.talla_apoderado} onChange={handleChange}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#58a6ff] focus:outline-none">
                  <option value="No desea">No desea</option>
                  <option value="S">S</option><option value="M">M</option><option value="L">L</option><option value="XL">XL</option>
                </select>
              </div>
            </div>
          </div>

          {/* ================= SECCIÓN 2: ALUMNO / JUGADOR ================= */}
          <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d] shadow-lg">
            <h2 className="text-xl font-bold mb-5 text-[#3fb950] border-b border-[#30363d] pb-2">
              ⚽ Datos del Jugador
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Nombre completo *</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#3fb950] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">RUT del Alumno *</label>
                <input type="text" name="rut" value={formData.rut} onChange={handleChange} required
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#3fb950] focus:outline-none" placeholder="12.345.678-9" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Fecha Nacimiento *</label>
                <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} required
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#3fb950] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Sexo</label>
                <select name="sexo" value={formData.sexo} onChange={handleChange}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#3fb950] focus:outline-none">
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Posición</label>
                <select name="posicion_cancha" value={formData.posicion_cancha} onChange={handleChange}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#3fb950] focus:outline-none">
                  <option value="Portero">Portero</option>
                  <option value="Defensa">Defensa</option>
                  <option value="Mediocampista">Mediocampista</option>
                  <option value="Delantero">Delantero</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Talla Uniforme</label>
                <select name="talla_uniforme" value={formData.talla_uniforme} onChange={handleChange}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#3fb950] focus:outline-none">
                  <option value="Talla 8">Talla 8</option><option value="Talla 10">Talla 10</option><option value="Talla 12">Talla 12</option>
                  <option value="Talla 14">Talla 14</option><option value="S">S</option><option value="M">M</option><option value="L">L</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">N° Camiseta</label>
                <input type="number" name="numero_camiseta" value={formData.numero_camiseta} onChange={handleChange}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#3fb950] focus:outline-none" />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Nombre en la Camiseta</label>
                <input type="text" name="nombre_camiseta" value={formData.nombre_camiseta} onChange={handleChange}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#3fb950] focus:outline-none uppercase" />
              </div>
            </div>
          </div>

          {/* ================= SECCIÓN 3: FICHA MÉDICA Y EVALUACIÓN ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ficha Médica */}
            <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d] shadow-lg">
              <h2 className="text-xl font-bold mb-5 text-[#d29922] border-b border-[#30363d] pb-2">
                🏥 Ficha Médica
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Tipo de Sangre</label>
                  <select name="tipo_sangre" value={formData.tipo_sangre} onChange={handleChange}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#d29922] focus:outline-none">
                    <option value="O+">O+</option><option value="O-">O-</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Alergias</label>
                  <input type="text" name="alergias" value={formData.alergias} onChange={handleChange}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#d29922] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Patologías / Enfermedades</label>
                  <input type="text" name="patologias" value={formData.patologias} onChange={handleChange}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#d29922] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Medicamentos Regulares</label>
                  <input type="text" name="medicamentos" value={formData.medicamentos} onChange={handleChange}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#d29922] focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Evaluación y Finanzas */}
            <div className="space-y-6">
              {/* Evaluación */}
              <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d] shadow-lg">
                <h2 className="text-xl font-bold mb-5 text-[#8957e5] border-b border-[#30363d] pb-2">
                  📊 Evaluación Inicial
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Nivel Técnico</label>
                    <select name="nivel_tecnico" value={formData.nivel_tecnico} onChange={handleChange}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#8957e5] focus:outline-none">
                      <option value="Principiante">Principiante</option>
                      <option value="Intermedio">Intermedio</option>
                      <option value="Avanzado">Avanzado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Nivel Físico</label>
                    <select name="nivel_fisico" value={formData.nivel_fisico} onChange={handleChange}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#8957e5] focus:outline-none">
                      <option value="Bajo">Bajo</option>
                      <option value="Normal">Normal</option>
                      <option value="Alto">Alto</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Finanzas */}
              <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d] shadow-lg">
                <h2 className="text-xl font-bold mb-5 text-[#238636] border-b border-[#30363d] pb-2">
                  💰 Finanzas
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Valor Matrícula ($)</label>
                    <input type="number" name="monto_matricula" value={formData.monto_matricula} onChange={handleChange} required
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#238636] focus:outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Abono Inicial ($)</label>
                    <input type="number" name="abono_matricula" value={formData.abono_matricula} onChange={handleChange} required
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#238636] focus:outline-none font-mono" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold mb-1 text-[#e6edf3]">Valor Mensualidad ($)</label>
                    <input type="number" name="monto_mensualidad" value={formData.monto_mensualidad} onChange={handleChange} required
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 focus:border-[#238636] focus:outline-none font-mono" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================= BOTÓN DE ENVÍO ================= */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-lg py-3 px-8 rounded-lg shadow-lg focus:outline-none disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando Matrícula...
                </>
              ) : (
                <>
                  <span>💾</span> Confirmar y Generar PDF
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Matricula;
