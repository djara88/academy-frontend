import { Link } from 'react-router-dom';
import { BuildingOffice2Icon, ChartBarSquareIcon, CheckCircleIcon, CreditCardIcon, GlobeAltIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { Logo } from '../components/Logo';

export default function HomeCommercial() {
  return <div className="min-h-screen bg-[#0B1220] text-white">
    <nav aria-label="Navegación principal" className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
      <Logo className="h-11 max-w-[190px]" />
      <Link className="rounded-xl border border-white/30 px-5 py-3 font-bold" to="/login">Ingresar</Link>
    </nav>
    <main>
      <header className="mx-auto max-w-7xl px-5 py-12 sm:py-20">
        <p className="font-bold text-[#B8FF3D]">Lestra Deportivo · Gestión de academias</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">Del entrenamiento de hoy al cierre de mensualidades.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">Tu profesor pasa lista en cancha. Tú revisas quién entrenó, cómo evoluciona y qué cuotas quedan pendientes. Cada familia tiene su propio acceso.</p>
        <p className="mt-8 text-3xl font-black">$19.990 <span className="text-base font-medium">CLP al mes por academia · IVA incluido</span></p>
        <p className="mt-2 text-slate-300">Un solo plan con todas las funciones y el portal de apoderados incluido.</p>
        <Link className="mt-6 inline-flex rounded-xl bg-[#B8FF3D] px-6 py-3 font-bold text-slate-950" to="/registro">Registrar mi academia</Link>
      </header>
      <section id="producto" className="border-y border-white/8 bg-white/[.015] px-5 py-20"><div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[.18em] text-[#B8FF3D]">Operación conectada</p><h2 className="mt-3 max-w-3xl text-3xl font-black sm:text-4xl">Menos planillas separadas. Más control de la academia.</h2><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{[
        {icon:BuildingOffice2Icon,title:'Multisede y multideporte',copy:'Sedes, ramas y categorías con una ficha única por alumno.'},
        {icon:CreditCardIcon,title:'Finanzas por disciplina',copy:'Matrículas, mensualidades, abonos, morosidad e ingresos vinculados a cada inscripción.'},
        {icon:TrophyIcon,title:'Competencia',copy:'Amistosos, torneos, citaciones y resultados de cada plantel.'},
        {icon:ChartBarSquareIcon,title:'Rendimiento 360°',copy:'Revisa evaluaciones, evolución y disponibilidad de cada deportista.'},
      ].map(({icon:Icon,title,copy})=><article key={title} className="rounded-3xl border border-white/10 bg-[#0F172A] p-6"><Icon className="h-7 w-7 text-[#B8FF3D]"/><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#93a1b1]">{copy}</p></article>)}</div></div></section>

      <section id="pagina-propia" className="px-5 py-20"><div className="mx-auto grid max-w-7xl gap-8 rounded-[34px] border border-[#B8FF3D]/20 bg-[radial-gradient(circle_at_top_right,rgba(184,255,61,.12),transparent_38%),#0F172A] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]"><div className="flex flex-col justify-center"><GlobeAltIcon className="h-10 w-10 text-[#B8FF3D]"/><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-[#B8FF3D]">Incluida en la mensualidad</p><h2 className="mt-3 text-4xl font-black">Tu academia también tiene su propia página.</h2><p className="mt-4 leading-7 text-[#a7b4c3]">Publica tus disciplinas y horarios para que las familias puedan conocer tu academia e inscribirse.</p></div><div className="grid gap-3 sm:grid-cols-2">{[
        ['Enlace propio','Una URL pública para compartir directamente desde RRSS, WhatsApp o campañas.'],
        ['Inscripciones online','Las familias pueden consultar disciplinas y enviar solicitudes sin crear cobros automáticos.'],
        ['Pagos conectados','Acceso al portal de consulta y pago con verificación del contacto registrado.'],
        ['Tu identidad','Logo, colores, descripción, redes sociales, WhatsApp y galería de hasta 6 fotos.'],
        ['Oferta deportiva','Muestra disciplinas, ramas, categorías, sedes, días y horarios de entrenamiento.'],
      ].map(([title,copy])=><div key={title} className="rounded-2xl border border-white/10 bg-[#0B1220] p-5"><CheckCircleIcon className="h-5 w-5 text-[#B8FF3D]"/><h3 className="mt-3 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#93a1b1]">{copy}</p></div>)}</div></div></section>

    </main>
  </div>;
}
