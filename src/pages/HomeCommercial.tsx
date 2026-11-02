import { Link } from 'react-router-dom';
import { ArrowRightIcon, BoltIcon, ChartBarSquareIcon, CheckCircleIcon, GlobeAltIcon, ShieldCheckIcon, TrophyIcon, UsersIcon } from '@heroicons/react/24/outline';
import { Logo } from '../components/Logo';

const highlights = [
  { icon: UsersIcon, title: 'Toda tu academia', text: 'Deportistas, profesores, sedes y categorías, conectados.' },
  { icon: TrophyIcon, title: 'La cancha en orden', text: 'Asistencia, evaluaciones, partidos y torneos.' },
  { icon: ChartBarSquareIcon, title: 'Finanzas claras', text: 'Mensualidades, pagos y seguimiento en un solo lugar.' },
];

export default function HomeCommercial() {
  return <div className="min-h-screen overflow-hidden bg-[#060B14] text-white">
    <div aria-hidden="true" className="pointer-events-none absolute left-[-20%] top-0 h-[38rem] w-[70rem] rounded-full bg-[#3157FF]/15 blur-[120px]" />
    <nav aria-label="Navegación principal" className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
      <Link to="/deportivo" aria-label="Lestra Deportivo, inicio"><Logo className="h-10 max-w-[180px]" /></Link>
      <div className="flex items-center gap-3"><Link className="hidden text-sm font-bold text-slate-300 transition hover:text-white sm:inline-flex" to="/registro">Comenzar</Link><Link className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold transition hover:border-[#B8FF3D]/50 hover:bg-white/5" to="/login">Ingresar</Link></div>
    </nav>

    <main>
      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.03fr_.97fr] lg:gap-16 lg:pb-28">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B8FF3D]/25 bg-[#B8FF3D]/[.07] px-4 py-2 text-[11px] font-black uppercase tracking-[.15em] text-[#C9FF78]"><BoltIcon className="h-4 w-4" /> Una plataforma. Todo el juego.</div>
          <h1 className="mt-7 max-w-2xl text-[clamp(3rem,6.1vw,5.8rem)] font-black leading-[.98] tracking-[-.065em]">Tu academia.<span className="block text-[#B8FF3D]">En otro nivel.</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[#AEBBD0]">Menos tiempo administrando. Más tiempo desarrollando deportistas. Tu operación deportiva y financiera en un solo lugar.</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/registro" className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#B8FF3D] px-6 py-3 font-black text-[#0C1609] shadow-[0_16px_45px_rgba(184,255,61,.15)] transition hover:bg-[#D0FF91]">Registrar mi academia <ArrowRightIcon className="h-5 w-5" /></Link>
            <a href="#funciones" className="inline-flex min-h-12 items-center rounded-xl border border-white/20 px-5 py-3 font-bold text-white transition hover:bg-white/5">Descubrir Lestra</a>
          </div>
          <div className="mt-10 flex flex-wrap items-end gap-x-4 gap-y-2 border-t border-white/10 pt-7">
            <div><div className="text-4xl font-black tracking-tight">$19.990 <span className="text-xl text-[#B8FF3D]">+ IVA</span></div><p className="mt-1 text-sm text-[#AEBBD0]">por academia / mes · Total $23.788</p></div>
            <span className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-[#DEE6F4]">Un único plan · 15 días de prueba</span>
          </div>
        </div>

        <div className="relative" aria-label="Vista ilustrativa del panel de gestión de Lestra Deportivo">
          <div aria-hidden="true" className="absolute -inset-5 rounded-[40px] bg-[radial-gradient(circle_at_65%_20%,rgba(184,255,61,.13),transparent_44%),radial-gradient(circle_at_20%_80%,rgba(49,87,255,.3),transparent_42%)] blur-2xl" />
          <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-[#0D1627] shadow-[0_40px_100px_rgba(0,0,0,.5)]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5"><div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#93A4BA]">Lestra Deportivo</p><p className="mt-1 text-xl font-black">Tu centro de control</p></div><span className="flex items-center gap-2 rounded-full bg-[#B8FF3D]/10 px-3 py-1.5 text-xs font-bold text-[#C9FF78]"><span className="h-2 w-2 rounded-full bg-[#B8FF3D]" /> En acción</span></div>
            <div className="grid grid-cols-2 gap-3 p-5 sm:p-6">
              <div className="rounded-2xl border border-white/10 bg-[#152137] p-5"><UsersIcon className="h-6 w-6 text-[#B8FF3D]" /><p className="mt-6 text-2xl font-black">Alumnos</p><p className="mt-2 text-sm text-[#AEBBD0]">Fichas y categorías conectadas</p></div>
              <div className="rounded-2xl border border-white/10 bg-[#152137] p-5"><ChartBarSquareIcon className="h-6 w-6 text-[#89A4FF]" /><p className="mt-6 text-2xl font-black">Finanzas</p><p className="mt-2 text-sm text-[#AEBBD0]">Cobranza y pagos organizados</p></div>
              <div className="col-span-2 rounded-2xl border border-[#B8FF3D]/20 bg-[#1A2932] p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#C9FF78]">Tu semana deportiva</p><p className="mt-2 text-xl font-black">Todo listo para jugar</p></div><TrophyIcon className="h-9 w-9 shrink-0 text-[#B8FF3D]" /></div><div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-bold"><span className="rounded-xl bg-white/10 p-3">Asistencia</span><span className="rounded-xl bg-white/10 p-3">Partidos</span><span className="rounded-xl bg-white/10 p-3">Evolución</span></div></div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-[#7F90A8]">Representación ilustrativa de las funciones de la plataforma</p>
        </div>
      </section>

      <section id="funciones" className="relative border-y border-white/10 bg-white/[.025] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#B8FF3D]">Lo esencial, resuelto</p><h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Una herramienta para dirigir mejor.</h2></div><p className="max-w-sm text-sm leading-6 text-[#AEBBD0]">Gestión completa sin planes confusos ni módulos básicos fragmentados.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">{highlights.map(({icon:Icon,title,text})=><article key={title} className="rounded-[24px] border border-white/10 bg-[#101A2B] p-7"><Icon className="h-9 w-9 text-[#B8FF3D]" /><h3 className="mt-8 text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-[#AEBBD0]">{text}</p></article>)}</div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center">
        <div><GlobeAltIcon className="h-10 w-10 text-[#B8FF3D]" /><h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Tu academia también se muestra al mundo.</h2><p className="mt-4 max-w-xl leading-8 text-[#AEBBD0]">Una página pública con tu identidad, disciplinas, sedes y solicitudes de inscripción. Incluida en el plan.</p><div className="mt-5 flex items-center gap-3 text-sm font-semibold text-[#DDE8F4]"><CheckCircleIcon className="h-5 w-5 text-[#B8FF3D]" /> Sin otro plan para tus funciones deportivas</div></div>
        <div className="rounded-[28px] border border-[#B8FF3D]/20 bg-[#101C26] p-8"><ShieldCheckIcon className="h-9 w-9 text-[#B8FF3D]" /><p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-[#B8FF3D]">Complemento opcional</p><h3 className="mt-3 text-2xl font-black">Portal de apoderados</h3><p className="mt-3 leading-7 text-[#AEBBD0]">El acceso familiar se contrata por separado. Agrégalo solo cuando tu academia lo necesite.</p><p className="mt-6 font-black">$15.000 + IVA <span className="text-sm font-normal text-[#AEBBD0]">al mes, adicional al plan</span></p></div>
      </section>
      <section className="border-t border-white/10 px-5 py-14 text-center"><h2 className="text-3xl font-black">El siguiente nivel empieza aquí.</h2><Link to="/registro" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#B8FF3D] px-6 py-3 font-black text-[#0C1609]">Comenzar ahora <ArrowRightIcon className="h-5 w-5" /></Link></section>
    </main>
  </div>;
}
