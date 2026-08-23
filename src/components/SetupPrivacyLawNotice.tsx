import { ArrowTopRightOnSquareIcon, CheckBadgeIcon, CloudIcon, LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const EVIDENCE = [
  'Finalidades separadas',
  'Texto y versión registrados',
  'Representante y fecha trazables',
  'Autorizaciones revocables',
];

const HOW_LESTRA_WORKS = [
  { icon: ShieldCheckIcon, title: 'Uso limitado al servicio', text: 'Procesamos los datos para operar las funciones que la academia decide utilizar.' },
  { icon: LockClosedIcon, title: 'Acceso por identidad y rol', text: 'El acceso privado pasa por autenticación y controles asociados a academia y perfil.' },
  { icon: CloudIcon, title: 'Infraestructura cloud informada', text: 'La plataforma usa proveedores especializados y puede implicar tratamiento fuera de Chile.' },
];

export default function SetupPrivacyLawNotice() {
  return (
    <aside className="setup-privacy-notice mt-6 overflow-hidden rounded-[26px] border shadow-[0_22px_55px_rgba(23,32,24,.14)]">
      <div className="setup-privacy-main grid gap-7 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:p-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="setup-privacy-law-badge inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[.14em]">
              <ShieldCheckIcon className="h-4 w-4" /> Ley 21.719
            </span>
            <span className="setup-privacy-date-badge rounded-full border px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[.12em]">
              Vigencia · 01 dic 2026
            </span>
          </div>

          <h3 className="setup-privacy-heading mt-5 max-w-3xl text-2xl font-black tracking-[-.025em] sm:text-[2rem] sm:leading-[1.08]">
            La protección de datos también es parte de administrar bien una academia.
          </h3>
          <p className="setup-privacy-lead mt-4 max-w-4xl text-sm leading-7 sm:text-[15px]">
            Una academia deportiva puede tratar datos de niños, niñas y adolescentes, fotografías, información de contacto, antecedentes de cobro y, si corresponde, información sensible de salud. La nueva regulación chilena refuerza el deber de informar para qué se usan los datos, recolectar solo lo necesario, protegerlos y poder demostrar las decisiones y autorizaciones que correspondan.
          </p>
          <p className="setup-privacy-disclaimer mt-4 max-w-4xl text-xs leading-5">
            Lestra ayuda a ordenar y dejar evidencia de estas decisiones dentro de la operación. Esta herramienta apoya la preparación y trazabilidad del cumplimiento, pero no reemplaza la evaluación jurídica particular que pueda necesitar cada academia.
          </p>
        </div>

        <div className="setup-privacy-evidence grid min-w-0 gap-3 rounded-[22px] border p-5">
          <p className="setup-privacy-evidence-title mb-1 text-[10px] font-black uppercase tracking-[.16em]">Qué documenta Lestra</p>
          {EVIDENCE.map((item) => (
            <div key={item} className="setup-privacy-evidence-item flex items-center gap-2.5 text-xs font-bold">
              <CheckBadgeIcon className="setup-privacy-evidence-icon h-4 w-4 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="setup-privacy-bottom border-t px-6 py-5 sm:px-7 lg:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid flex-1 gap-3 md:grid-cols-3">
            {HOW_LESTRA_WORKS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="setup-privacy-feature flex gap-3 rounded-2xl border p-3.5">
                <span className="setup-privacy-feature-icon grid h-9 w-9 shrink-0 place-items-center rounded-xl">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="setup-privacy-feature-title text-xs font-black">{title}</p>
                  <p className="setup-privacy-feature-text mt-1 text-[11px] leading-[1.45]">{text}</p>
                </div>
              </div>
            ))}
          </div>

          <a
            href="/privacidad-lestra"
            target="_blank"
            rel="noreferrer"
            className="setup-privacy-link inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border px-4 py-2.5 text-xs font-black transition xl:self-center"
          >
            Cómo trata Lestra los datos
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        </div>
      </div>
    </aside>
  );
}
