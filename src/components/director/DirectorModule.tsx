import type { ReactNode } from 'react';

export const DIRECTOR_FIELD = 'min-h-12 w-full rounded-[14px] border border-[#d6ddd2] bg-[#f3f6f0] px-4 text-sm font-bold text-[#111711] outline-none transition focus:border-[#8eb700] focus:ring-4 focus:ring-[#b7ff00]/10 disabled:cursor-not-allowed disabled:opacity-55';
export const DIRECTOR_TEXTAREA = `${DIRECTOR_FIELD} min-h-28 py-3 resize-y`;
export const DIRECTOR_BUTTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#b7ff00] bg-[#b7ff00] px-5 text-sm font-black text-[#111711] shadow-[0_10px_24px_rgba(183,255,0,.12)] transition hover:-translate-y-px hover:bg-[#c5ff35] disabled:cursor-not-allowed disabled:opacity-45';
export const DIRECTOR_BUTTON_DARK = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#263026] bg-[#111711] px-5 text-sm font-black text-white transition hover:border-[#8eb700] hover:text-[#b7ff00] disabled:cursor-not-allowed disabled:opacity-45';
export const DIRECTOR_BUTTON_GHOST = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d7ded4] bg-white px-5 text-sm font-black text-[#111711] transition hover:border-[#aab6a4] hover:bg-[#f7f9f5] disabled:cursor-not-allowed disabled:opacity-45';

export function DirectorPage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`director-module-page mx-auto w-full max-w-[1320px] space-y-5 pb-16 ${className}`}>{children}</div>;
}

export function DirectorHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="director-module-hero relative isolate overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(132deg,#09100c_0%,#111a13_62%,#11190f_100%)] px-6 py-8 text-white shadow-[0_26px_66px_rgba(14,22,15,.16)] sm:px-8 sm:py-10 lg:px-10 lg:py-11">
      <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border-[38px] border-[#b7ff00]/10" />
      <div className="pointer-events-none absolute bottom-6 left-[58%] h-px w-80 -rotate-[10deg] bg-gradient-to-r from-[#b7ff00]/40 to-transparent" />
      <div className={`relative z-10 grid gap-8 ${aside ? 'lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)] lg:items-end' : ''}`}>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[.17em] text-[#b7ff00]">{eyebrow}</p>
          <h1 className="mt-3 max-w-[980px] text-[clamp(2.5rem,5vw,5rem)] font-black leading-[.95] tracking-[-.055em] text-white">{title}</h1>
          {description ? <div className="mt-4 max-w-4xl text-sm leading-6 text-[#c7d0c8] sm:text-base">{description}</div> : null}
          {actions ? <div className="mt-6 flex flex-wrap items-center gap-2.5">{actions}</div> : null}
        </div>
        {aside ? <div className="director-module-hero-aside min-w-0">{aside}</div> : null}
      </div>
    </section>
  );
}

export function DirectorPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`director-module-panel min-w-0 rounded-[24px] border border-[#d9e0d6] bg-white shadow-[0_14px_36px_rgba(15,23,16,.045)] ${className}`}>{children}</section>;
}

export function DirectorStat({ label, value, detail, tone = 'default' }: { label: string; value: ReactNode; detail?: ReactNode; tone?: 'default' | 'lime' | 'dark' }) {
  const styles = tone === 'lime'
    ? 'border-[#cde995] bg-[#f3fadf]'
    : tone === 'dark'
      ? 'border-[#263026] bg-[#111711] text-white'
      : 'border-[#d9e0d6] bg-white';
  return (
    <article className={`director-stat director-stat-${tone} rounded-[20px] border p-5 shadow-[0_10px_26px_rgba(15,23,16,.035)] ${styles}`}>
      <p className={`director-stat-label text-[10px] font-black uppercase tracking-[.14em] ${tone === 'dark' ? 'text-[#b7ff00]' : 'text-[#748073]'}`}>{label}</p>
      <div className={`director-stat-value mt-2 text-2xl font-black tracking-[-.035em] ${tone === 'dark' ? 'text-white' : 'text-[#111711]'}`}>{value}</div>
      {detail ? <div className={`director-stat-detail mt-1 text-xs font-semibold ${tone === 'dark' ? 'text-[#c7d0c8]' : 'text-[#697468]'}`}>{detail}</div> : null}
    </article>
  );
}

export function DirectorTabs({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`inline-grid min-h-[58px] max-w-full gap-1.5 rounded-[16px] border border-[#d7ded4] bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,16,.05)] ${className}`}>{children}</div>;
}

export function DirectorTabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`min-h-11 min-w-0 rounded-[11px] px-4 text-sm font-black transition ${active ? 'border border-[#263026] bg-[#111711] text-[#b7ff00]' : 'border border-transparent bg-transparent text-[#687367] hover:bg-[#f2f5ef] hover:text-[#111711]'}`}>{children}</button>;
}
