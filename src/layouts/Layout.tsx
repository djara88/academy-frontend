import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
// Si usas un contexto de autenticación para el logout, lo puedes importar aquí.
// import { useAuth } from '../contexts/AuthContext'; 

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // const { logout } = useAuth(); // Descomenta si tienes tu función de logout en el contexto

  // Función para determinar si un enlace está activo (para pintarlo de otro color)
  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    // Aquí puedes llamar a tu función de logout, limpiar el localStorage, etc.
    // logout();
    localStorage.removeItem('token'); // Ejemplo genérico
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#131722] text-white font-sans overflow-hidden">
      
      {/* =========================================
          BARRA LATERAL (SIDEBAR)
          ========================================= */}
      <aside className="w-64 bg-[#1C212D] border-r border-gray-800 flex flex-col justify-between">
        
        {/* LOGO O TÍTULO DE LA PLATAFORMA */}
        <div>
          <div className="p-6 border-b border-gray-800 text-center">
            <h1 className="text-2xl font-bold text-[#289E9D] tracking-wider">
              ACADEMIA<span className="text-white">PRO</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">SaaS Management</p>
          </div>

          {/* MENÚ DE NAVEGACIÓN */}
          <nav className="p-4 space-y-2 mt-4">
            <Link
              to="/dashboard"
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                isActive('/dashboard') 
                  ? 'bg-[#289E9D] text-white font-semibold' 
                  : 'text-gray-400 hover:bg-[#131722] hover:text-white'
              }`}
            >
              <span className="mr-3">📊</span> Dashboard
            </Link>

            <Link
              to="/jugadores"
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                isActive('/jugadores') 
                  ? 'bg-[#289E9D] text-white font-semibold' 
                  : 'text-gray-400 hover:bg-[#131722] hover:text-white'
              }`}
            >
              <span className="mr-3">🏃‍♂️</span> Jugadores
            </Link>

            <Link
              to="/torneos"
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                isActive('/torneos') 
                  ? 'bg-[#289E9D] text-white font-semibold' 
                  : 'text-gray-400 hover:bg-[#131722] hover:text-white'
              }`}
            >
              <span className="mr-3">🏆</span> Torneos
            </Link>

            <Link
              to="/partidos"
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                isActive('/partidos') 
                  ? 'bg-[#289E9D] text-white font-semibold' 
                  : 'text-gray-400 hover:bg-[#131722] hover:text-white'
              }`}
            >
              <span className="mr-3">⚽</span> Partidos
            </Link>
          </nav>
        </div>

        {/* SECCIÓN INFERIOR: PANEL MAESTRO Y LOGOUT */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          
          {/* BOTÓN AL PANEL MAESTRO SAAS (Solo debería verse para tu usuario super-admin) */}
          <Link
            to="/saas-admin"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              isActive('/saas-admin') 
                ? 'bg-orange-600 text-white font-bold' 
                : 'text-orange-400 hover:bg-[#131722] hover:text-orange-300 font-semibold'
            }`}
          >
            <span className="mr-3">👑</span> Panel Maestro
          </Link>

          {/* BOTÓN DE CERRAR SESIÓN */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 rounded-lg text-gray-400 hover:bg-red-900 hover:text-red-200 transition-colors mt-2"
          >
            <span className="mr-3">🚪</span> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* =========================================
          CONTENEDOR PRINCIPAL (DONDE VAN LAS PANTALLAS)
          ========================================= */}
      <main className="flex-1 overflow-y-auto">
        {/* 
          ¡AQUÍ ESTÁ LA MAGIA!
          El <Outlet /> es el componente que renderiza las pantallas hijas
          (Dashboard, Jugadores, SaaSAdmin, etc.) sin romper las rutas.
        */}
        <div className="h-full">
          <Outlet />
        </div>
      </main>
      
    </div>
  );
};

export default Layout;
