import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

const DEPORTIVO_URL = 'https://deportivo.lestra.app';

const products = [
  {
    key: 'deportivo',
    eyebrow: 'Disponible',
    title: 'Lestra Deportivo',
    description: 'Gestión integral para academias, clubes y organizaciones deportivas: administra, compite y optimiza.',
    href: DEPORTIVO_URL,
    cta: 'Conocer Deportivo',
    accent: 'from-[#3157FF]/30 to-[#3157FF]/5',
    external: true,
  },
  {
    key: 'learn',
    eyebrow: 'En diseño',
    title: 'Lestra Learn',
    description: 'La próxima solución del ecosistema Lestra enfocada en aprendizaje y gestión educativa.',
    href: '/learn',
    cta: 'Conocer visión',
    accent: 'from-[#14B8A6]/25 to-[#14B8A6]/5',
    external: false,
  },
  {
    key: 'profe',
    eyebrow: 'En diseño',
    title: 'Lestra Profe',
    description: 'Herramientas pensadas para potenciar el trabajo cotidiano de profesores y profesionales de la enseñanza.',
    href: '/profe',
    cta: 'Conocer visión',
    accent: 'from-[#B8FF3D]/20 to-[#B8FF3D]/5',
    external: false,
  },
] as const;

const LestraHub = () => (
  <div className="min-h-screen bg-[#060A12] text-white">
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(49,87,255,.2),transparent_28%),radial-gradient(circle_at_82%_28%,rgba(20,184,166,.12),transparent_26%),radial-gradient(circle_at_60%_90%,rgba(184,255,61,.07),transparent_28%)]" />
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 opacity-[.12] [background-image:linear-gradient(rgba(255,255,255,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.055)_1px,transparent_1px)] [background-size:48px_48px]" />

    <header className="relative z-10 border-b border-white/10 bg-[#060A12]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#0B1220] p-1.5">
            <Logo variant="mark" className="h-full w-full" />
          </div>
          <div>
            <div className="text-lg font-black tracking-[0.14em]">LESTRA</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F8B9D]">Ecosistema digital</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <a href={DEPORTIVO_URL} className="hidden rounded-xl px-4 py-2 text-sm font-bold text-[#C4CEDB] transition hover:bg-white/5 hover:text-white sm:inline-flex">
            Soluciones
          </a>
          <a href={`${DEPORTIVO_URL}/login`} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-black transition hover:border-[#3157FF]/60 hover:bg-[#3157FF]/10">
            Ingresar a Deportivo
          </a>
        </div>
      </div>
    </header>

    <main className="relative z-10">
      <section className="mx-auto max-w-7xl px-5 pb-14 pt-20 sm:px-8 sm:pb-20 sm:pt-28">
        <div className="max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#3157FF]/30 bg-[#3157FF]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#AFC0FF]">
            Una marca · múltiples soluciones
          </div>
          <h1 className="max-w-4xl text-5xl font-black leading-[.98] tracking-[-0.04em] sm:text-7xl">
            Tecnología para <span className="text-[#7E9AFF]">gestionar</span>, enseñar y crecer.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#AAB5C5] sm:text-xl">
            Lestra es un ecosistema de soluciones SaaS especializadas. Cada producto resuelve un problema concreto, compartiendo una misma visión tecnológica.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {products.map((product) => (
            <article key={product.key} className={`group relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br ${product.accent} p-7 shadow-[0_24px_80px_rgba(0,0,0,.24)] transition hover:-translate-y-1 hover:border-white/20`}>
              <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-white/[.035] blur-2xl" />
              <div className="relative">
                <span className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#B9C4D2]">
                  {product.eyebrow}
                </span>
                <h2 className="mt-8 text-3xl font-black tracking-[-0.03em]">{product.title}</h2>
                <p className="mt-4 min-h-24 text-sm leading-7 text-[#AAB5C5]">{product.description}</p>
                {product.external ? (
                  <a href={product.href} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#08101B] transition group-hover:bg-[#EAF0F7]">
                    {product.cta}<span aria-hidden="true">→</span>
                  </a>
                ) : (
                  <Link to={product.href} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#08101B] transition group-hover:bg-[#EAF0F7]">
                    {product.cta}<span aria-hidden="true">→</span>
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[.025]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-3">
          <div><div className="text-2xl font-black">Una identidad</div><p className="mt-2 text-sm leading-6 text-[#8E9BAD]">La evolución de Lestra apunta a una cuenta única para acceder a las soluciones contratadas.</p></div>
          <div><div className="text-2xl font-black">Productos especializados</div><p className="mt-2 text-sm leading-6 text-[#8E9BAD]">Cada SaaS mantiene su propio foco, datos y ritmo de evolución sin convertir Lestra en una aplicación monolítica.</p></div>
          <div><div className="text-2xl font-black">Una plataforma que crece</div><p className="mt-2 text-sm leading-6 text-[#8E9BAD]">Deportivo es el primer producto operativo del ecosistema; Learn y Profe se incorporarán de forma progresiva.</p></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="rounded-[30px] border border-[#3157FF]/25 bg-[#0A1020] p-8 sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B8FF3D]">Producto disponible</p>
          <div className="mt-4 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-3xl font-black sm:text-4xl">Lestra Deportivo</h2>
              <p className="mt-3 max-w-2xl text-[#AAB5C5]">El sistema que ya construimos sigue funcionando completo. La diferencia es que ahora pasa a ser el primer producto de una plataforma mayor.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={DEPORTIVO_URL} className="rounded-xl bg-[#3157FF] px-5 py-3 text-sm font-black shadow-[0_14px_35px_rgba(49,87,255,.28)]">Explorar Deportivo</a>
              <a href={`${DEPORTIVO_URL}/login`} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-black">Ingresar</a>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer className="relative z-10 border-t border-white/10 px-5 py-8 text-center text-xs font-semibold text-[#667386]">
      © {new Date().getFullYear()} Lestra · Ecosistema de soluciones digitales
    </footer>
  </div>
);

export default LestraHub;