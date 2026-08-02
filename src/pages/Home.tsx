import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen bg-[#131722] text-white font-sans selection:bg-[#289E9D] selection:text-white">
      
      {/* NAVEGACIÓN SUPERIOR */}
      <nav className="flex justify-between items-center px-8 py-6 bg-[#1C212D] border-b border-gray-800">
        
        {/* LOGO VECTORIAL (SVG) + TEXTO */}
        <div className="flex items-center gap-3">
          <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="20" fill="#289E9D" fillOpacity="0.1"/>
            <path d="M50 20L80 75H20L50 20Z" stroke="#289E9D" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M50 45L65 75H35L50 45Z" fill="#289E9D"/>
          </svg>
          <span className="text-2xl font-bold tracking-wider">
            ACADEMIA<span className="text-[#289E9D]">PRO</span>
          </span>
        </div>

        {/* BOTÓN DE ACCESO UNIVERSAL */}
        <Link 
          to="/login" 
          className="bg-[#289E9D] hover:bg-[#1f7a79] text-white px-6 py-2 rounded-lg font-semibold transition-all duration-300 shadow-[0_0_15px_rgba(40,158,157,0.4)]"
        >
          Acceso a la Plataforma
        </Link>
      </nav>

      {/* SECCIÓN HERO (PRINCIPAL) */}
      <header className="px-8 py-20 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
          La gestión de tu academia deportiva, <span className="text-[#289E9D]">llevada al siguiente nivel.</span>
        </h1>
        <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
          Centraliza jugadores, torneos, finanzas y comunicación en un solo lugar. Diseñado para directores, entrenadores y apoderados.
        </p>
        <Link 
          to="/login" 
          className="inline-block border-2 border-[#289E9D] text-[#289E9D] hover:bg-[#289E9D] hover:text-white px-8 py-3 rounded-lg font-bold text-lg transition-colors"
        >
          Comenzar ahora
        </Link>
      </header>

      {/* SECCIÓN ALCANCES / CARACTERÍSTICAS */}
      <section className="px-8 py-16 bg-[#1C212D]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Todo lo que necesitas para triunfar</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#131722] p-8 rounded-xl border border-gray-800 hover:border-[#289E9D] transition-colors">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-bold mb-3">Gestión de Roles</h3>
              <p className="text-gray-400">Accesos personalizados para Directores, Profesores y Apoderados. Cada quien ve exactamente lo que necesita.</p>
            </div>
            
            <div className="bg-[#131722] p-8 rounded-xl border border-gray-800 hover:border-[#289E9D] transition-colors">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-xl font-bold mb-3">Control de Torneos</h3>
              <p className="text-gray-400">Organiza partidos, lleva el rendimiento de los jugadores y automatiza las tablas de posiciones sin usar Excel.</p>
            </div>
            
            <div className="bg-[#131722] p-8 rounded-xl border border-gray-800 hover:border-[#289E9D] transition-colors">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-bold mb-3">Administración Total</h3>
              <p className="text-gray-400">Matrículas, pagos y reportes financieros al instante para mantener la salud económica de la academia.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN LICENCIAS */}
      <section className="px-8 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Licencias adaptadas a tu crecimiento</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Plan Básico */}
          <div className="bg-[#1C212D] p-8 rounded-xl border border-gray-800 flex flex-col">
            <h3 className="text-2xl font-bold text-gray-300">Formación</h3>
            <p className="text-gray-500 mt-2 border-b border-gray-700 pb-4 mb-4">Para academias pequeñas que recién inician.</p>
            <ul className="space-y-3 mb-8 text-gray-400 flex-1">
              <li>✔️ Hasta 50 jugadores</li>
              <li>✔️ 2 perfiles de Profesor</li>
              <li>✔️ Acceso para apoderados</li>
            </ul>
            <button className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 rounded font-bold transition-colors">Contactar</button>
          </div>

          {/* Plan Pro (Destacado) */}
          <div className="bg-[#1C212D] p-8 rounded-xl border-2 border-[#289E9D] relative flex flex-col transform scale-105 shadow-2xl">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#289E9D] text-white px-4 py-1 rounded-full text-sm font-bold">
              Más Popular
            </div>
            <h3 className="text-2xl font-bold text-[#289E9D]">Competencia</h3>
            <p className="text-gray-500 mt-2 border-b border-gray-700 pb-4 mb-4">El equilibrio perfecto para escuelas en desarrollo.</p>
            <ul className="space-y-3 mb-8 text-gray-300 flex-1">
              <li>✔️ Hasta 200 jugadores</li>
              <li>✔️ Perfiles de Profesor ilimitados</li>
              <li>✔️ Módulo de Torneos y Finanzas</li>
              <li>✔️ Soporte prioritario</li>
            </ul>
            <button className="w-full bg-[#289E9D] hover:bg-[#1f7a79] text-white py-2 rounded font-bold transition-colors">Elegir Plan</button>
          </div>

          {/* Plan Élite */}
          <div className="bg-[#1C212D] p-8 rounded-xl border border-gray-800 flex flex-col">
            <h3 className="text-2xl font-bold text-orange-400">Alto Rendimiento</h3>
            <p className="text-gray-500 mt-2 border-b border-gray-700 pb-4 mb-4">Para franquicias y clubes consolidados.</p>
            <ul className="space-y-3 mb-8 text-gray-400 flex-1">
              <li>✔️ Jugadores Ilimitados</li>
              <li>✔️ Múltiples sedes/sucursales</li>
              <li>✔️ Reportes avanzados exportables</li>
              <li>✔️ Capacitación presencial</li>
            </ul>
            <button className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 rounded font-bold transition-colors">Contactar</button>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black py-8 text-center text-gray-600 border-t border-gray-900">
        <p>© 2026 AcademiaPro SaaS. Todos los derechos reservados.</p>
      </footer>

    </div>
  );
};

export default Home;
