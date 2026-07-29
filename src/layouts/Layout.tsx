import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HomeIcon,
  UserPlusIcon,
  UsersIcon,
  TrophyIcon,
  CalendarIcon,
  CreditCardIcon,
  ShoppingBagIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: HomeIcon },
    { path: '/matricula', label: 'Matrícula', icon: UserPlusIcon },
    { path: '/jugadores', label: 'Jugadores', icon: UsersIcon },
    { path: '/torneos', label: 'Torneos', icon: TrophyIcon },
    { path: '/asistencia', label: 'Asistencia', icon: CalendarIcon },
    { path: '/finanzas', label: 'Finanzas', icon: CreditCardIcon },
    { path: '/uniformes', label: 'Uniformes', icon: ShoppingBagIcon },
    { path: '/configuracion', label: 'Configuración', icon: Cog6ToothIcon },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-72 bg-[#161b22] border-r border-[#2d3a4f] flex flex-col p-6 fixed h-full overflow-y-auto">
        {/* Logo y nombre */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-[#00e676] rounded-full flex items-center justify-center text-2xl font-bold text-[#0d1117]">
            ⚽
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#e6edf3]">Academia</h1>
            <p className="text-xs text-[#8b949e]">Club Deportivo</p>
          </div>
        </div>

        {/* Nombre del usuario */}
        <div className="mb-6 p-3 bg-[#1c2331] rounded-lg border border-[#2d3a4f]">
          <p className="text-sm text-[#8b949e]">Bienvenido</p>
          <p className="font-bold text-[#e6edf3]">{user?.nombre_completo || 'Usuario'}</p>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Cerrar sesión */}
        <button
          onClick={logout}
          className="sidebar-link text-red-400 hover:text-red-300 hover:bg-red-900/30 mt-4"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span>Cerrar Sesión</span>
        </button>
      </aside>

      {/* Contenido principal */}
      <main className="ml-72 flex-1 p-8 bg-[#0d1117] min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
