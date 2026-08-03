import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  // Verificamos si es el SuperAdmin general
  const isSuperAdmin = user?.email === 'd.jarazerene@gmail.com' || user?.rol === 'SUPER_ADMIN' || location.pathname === '/admin';

  const handleLogout = () => {
    if (logout) {
      logout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#131722] text-white font-sans overflow-hidden">
      
      {/* BARRA LATERAL */}
      <aside className="w-64 bg-[#1C212D] border-r border-gray-800 flex flex-col justify-between">
        <div>
          {/* LOGO PLATAFORMA */}
          <div className="p-6 border-b border-gray-800 text-center">
            <h1 className="text-2xl font-bold text-[#289E9D] tracking-wider">
              ACADEMIA<span className="text-white">PRO</span>
            </h1>
            <p className="text-xs text-orange-400 mt-1 font-semibold">
              {isSuperAdmin ? '👑 Control Maestro SaaS' : 'SaaS Management'}
            </p>
          </div>

          {/* MENÚ CONDICIONAL */}
          <nav className="p-4 space-y-2 mt-4">
            {isSuperAdmin ? (
              /* =========================================
                 MENÚ EXCLUSIVO PARA SUPERADMIN (d.jarazerene)
                 ========================================= */
              <>
                <Link
                  to="/admin"
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive('/admin') 
                      ? 'bg-orange-600 text-white font-bold' 
                      : 'text-orange-400 hover:bg-[#131722] hover:text-orange-300 font-semibold'
                  }`}
                >
                  <span className="mr-3">⚙️</span> Panel de Academias
                </Link>
              </>
            ) : (
              /* =========================================
                 MENÚ NORMAL DE ACADEMIAS (Directores/Profes)
                 ========================================= */
              <>
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

                {/* 🔥 NUEVO BOTÓN DE MATRÍCULA AGREGADO AQUÍ 🔥 */}
                <Link
                  to="/matricula"
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive('/matricula') 
                      ? 'bg-[#289E9D] text-white font-semibold' 
                      : 'text-gray-400 hover:bg-[#131722] hover:text-white'
                  }`}
                >
                  <span className="mr-3">📝</span> Nueva Matrícula
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
              </>
            )}
          </nav>
        </div>

        {/* SECCIÓN INFERIOR */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-800 mb-2">
            Usuario: <span className="text-white font-semibold block truncate">{user?.email || 'd.jarazerene@gmail.com'}</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 rounded-lg text-gray-400 hover:bg-red-900 hover:text-red-200 transition-colors"
          >
            <span className="mr-3">🚪</span> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENEDOR PRINCIPAL */}
      <main className="flex-1 overflow-y-auto">
        <div className="h-full">
          <Outlet />
        </div>
      </main>
      
    </div>
  );
};

export default Layout;
