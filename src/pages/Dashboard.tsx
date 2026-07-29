import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosConfig';
import { UserIcon, CheckCircleIcon, CalendarIcon, StarIcon } from '@heroicons/react/24/outline';

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
      <h1 className="text-3xl font-extrabold text-[#e6edf3] mb-6">
        Dashboard {user ? `- ${user.nombre_completo}` : ''}
      </h1>

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
