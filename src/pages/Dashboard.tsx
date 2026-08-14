import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosConfig';
import { UserIcon, CheckCircleIcon, CalendarIcon, StarIcon } from '@heroicons/react/24/outline';
import { getAcademyName } from '../config/brand';
import { Link } from 'react-router-dom';

interface Jugador {
  id: string;
  nombre: string;
  posicion_cancha: string;
  talla_uniforme: string;
  numero_camiseta: number;
  estado_uniforme: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: jugadores, isLoading, error } = useQuery({
    queryKey: ['jugadores'],
    queryFn: async () => {
      const response = await api.get('/api/jugadores');
      return response.data.data as Jugador[];
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-[#e6edf3]">
          {getAcademyName(user?.nombre_academia)}
        </h1>
        <p className="text-sm text-[#8b949e] mt-1">
          Panel de gestión{user ? ` · ${user.nombre_completo}` : ''}
        </p>
      </div>

      <Link to="/profesores" className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-[#289E9D]/40 bg-gradient-to-r from-[#163334] to-[#161b22] p-5 transition hover:border-[#48d8d0] hover:shadow-[0_0_28px_rgba(40,158,157,0.16)]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#289E9D]/15 text-3xl">🧑‍🏫</div>
          <div>
            <h2 className="text-lg font-black text-white">Equipo de profesores</h2>
            <p className="text-sm text-[#9da7b3]">Crea accesos y asigna un profesor titular a cada categoría.</p>
          </div>
        </div>
        <span className="hidden font-bold text-[#48d8d0] sm:block">Administrar →</span>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8b949e]">Total Alumnos</p>
              <p className="text-2xl font-bold">{jugadores?.length || 0}</p>
            </div>
            <UserIcon className="w-8 h-8 text-[#00e676]" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8b949e]">Uniforme Pendiente</p>
              <p className="text-2xl font-bold">
                {jugadores?.filter((j) => j.estado_uniforme === 'Pendiente').length || 0}
              </p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-[#f39c12]" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8b949e]">Próximos Partidos</p>
              <p className="text-2xl font-bold">0</p>
            </div>
            <CalendarIcon className="w-8 h-8 text-[#00b0ff]" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8b949e]">Cumpleaños del Mes</p>
              <p className="text-2xl font-bold">0</p>
            </div>
            <StarIcon className="w-8 h-8 text-[#9b59b6]" />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-bold text-[#e6edf3] mb-4">Lista de Jugadores</h2>
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="text-[#8b949e]">Cargando jugadores...</div>
          </div>
        )}
        {error && <p className="text-[#e74c3c]">Error al cargar jugadores</p>}
        {jugadores && jugadores.length === 0 && (
          <p className="text-[#8b949e]">No hay jugadores registrados.</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1c2331] text-[#8b949e]">
              <tr>
                <th className="text-left p-3 rounded-tl-lg">Nombre</th>
                <th className="text-left p-3">Posición</th>
                <th className="text-left p-3">Talla</th>
                <th className="text-left p-3">N° Camiseta</th>
                <th className="text-left p-3 rounded-tr-lg">Uniforme</th>
              </tr>
            </thead>
            <tbody>
              {jugadores?.map((jugador) => (
                <tr key={jugador.id} className="border-t border-[#2d3a4f] hover:bg-[#1c2331] transition-colors">
                  <td className="p-3 font-medium">{jugador.nombre}</td>
                  <td className="p-3">{jugador.posicion_cancha}</td>
                  <td className="p-3">{jugador.talla_uniforme}</td>
                  <td className="p-3">#{jugador.numero_camiseta}</td>
                  <td className="p-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        jugador.estado_uniforme === 'Entregado'
                          ? 'bg-[#00e676] text-[#0d1117]'
                          : 'bg-[#e74c3c] text-white'
                      }`}
                    >
                      {jugador.estado_uniforme}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
