import { CheckBadgeIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const EVIDENCE = [
  'Finalidades separadas',
  'Texto y versión registrados',
  'Representante y fecha trazables',
  'Autorizaciones revocables',
];

export default function SetupPrivacyLawNotice() {
  return (
    <aside className="mt-6 overflow-hidden rounded-[24px] border border-[#b9e937]/45 bg-[#182019] text-white shadow-[0_18px_45px_rgba(23,32,24,.12)]">
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#b9e937] px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-[#11170f]">
              <ShieldCheckIcon className="h-4 w-4" /> Ley 21.719
            </span>
            <span className="rounded-full border border-white/15 bg-white/[.06] px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-white/80">
              Vigencia · 01 dic 2026
            </span>
          </div>

          <h3 className="mt-4 max-w-3xl text-xl font-black tracking-tight text-white sm:text-2xl">
            La protección de datos también es parte de administrar bien una academia.
          </h3>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/72">
            Una academia deportiva puede tratar datos de niños, niñas y adolescentes, fotografías, información de contacto, antecedentes de cobro y, si corresponde, información sensible de salud. La nueva regulación chilena refuerza el deber de informar para qué se usan los datos, recolectar solo lo necesario, protegerlos y poder demostrar las decisiones y autorizaciones que correspondan.
          </p>
          <p className="mt-3 max-w-4xl text-xs leading-5 text-white/55">
            Lestra ayuda a ordenar y dejar evidencia de estas decisiones dentro de la operación. Esta herramienta apoya la preparación y trazabilidad del cumplimiento, pero no reemplaza la evaluación jurídica particular que pueda necesitar cada academia.
          </p>
        </div>

        <div className="grid min-w-[250px] gap-2 rounded-2xl border border-white/10 bg-white/[.045] p-4 sm:grid-cols-2 lg:grid-cols-1">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[.16em] text-[#b9e937] sm:col-span-2 lg:col-span-1">Qué documenta Lestra</p>
          {EVIDENCE.map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs font-bold text-white/82">
              <CheckBadgeIcon className="h-4 w-4 shrink-0 text-[#b9e937]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
