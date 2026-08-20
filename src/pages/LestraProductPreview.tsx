import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

type ProductKey = 'learn' | 'profe';

const productCopy: Record<ProductKey, { title: string; eyebrow: string; description: string; points: string[] }> = {
  learn: {
    title: 'Lestra Learn',
    eyebrow: 'Próxima solución',
    description: 'Estamos diseñando la vertical educativa del ecosistema Lestra. Su alcance funcional se definirá antes de comenzar el desarrollo para construir un producto especializado, no una extensión improvisada de Deportivo.',
    points: ['Arquitectura independiente', 'Identidad Lestra compartida', 'Experiencia enfocada en aprendizaje'],
  },
  profe: {
    title: 'Lestra Profe',
    eyebrow: 'Próxima solución',
    description: 'Una futura solución enfocada en el trabajo diario de profesores. Primero definiremos con precisión sus usuarios, problemas y propuesta de valor antes de escribir el primer módulo.',
    points: ['Herramientas para docentes', 'Arquitectura independiente', 'Integración futura con Lestra ID'],
  },
};

const LestraProductPreview = ({ product }: { product: ProductKey }) => {
  const copy = productCopy[product];
  return (
    <div className="min-h-screen bg-[#060A12] text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(49,87,255,.18),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(20,184,166,.1),transparent_28%)]" />
      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#0B1220] p-1.5"><Logo variant="mark" className="h-full w-full" /></div>
            <span className="font-black tracking-[0.14em]">LESTRA</span>
          </Link>
          <Link to="/" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-[#C2CCDA] transition hover:bg-white/5">Volver a Lestra</Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full border border-[#3157FF]/30 bg-[#3157FF]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#AFC0FF]">{copy.eyebrow}</span>
          <h1 className="mt-6 text-5xl font-black tracking-[-0.04em] sm:text-7xl">{copy.title}</h1>
          <p className="mt-7 text-lg leading-8 text-[#AAB5C5]">{copy.description}</p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {copy.points.map((point) => <div key={point} className="rounded-2xl border border-white/10 bg-white/[.035] p-5 text-sm font-bold text-[#D5DCE6]">{point}</div>)}
        </div>

        <div className="mt-14 rounded-[28px] border border-white/10 bg-[#0B1220] p-7 sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#B8FF3D]">Desarrollo progresivo</p>
          <h2 className="mt-3 text-2xl font-black">Primero definiremos el producto. Después construiremos la tecnología.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#8F9CAF]">Esto nos permite mantener Lestra Deportivo estable mientras cada nueva solución nace con un objetivo, arquitectura y modelo comercial propios.</p>
        </div>
      </main>
    </div>
  );
};

export default LestraProductPreview;
