import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export const DIRECTOR_FIELD = 'min-h-12 w-full rounded-[14px] border border-[#d6ddd2] bg-white px-4 text-sm font-bold text-[#111711] outline-none transition-[border-color,box-shadow,background-color] duration-150 focus-visible:border-[#8eb700] focus-visible:ring-4 focus-visible:ring-[#b7ff00]/15 disabled:cursor-not-allowed disabled:opacity-55';
export const DIRECTOR_TEXTAREA = `${DIRECTOR_FIELD} min-h-28 py-3 resize-y`;
export const DIRECTOR_BUTTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#b7ff00] bg-[#b7ff00] px-5 text-sm font-black text-[#111711] transition-[background-color,border-color,box-shadow] duration-150 hover:bg-[#c5ff35] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b7ff00]/25 disabled:cursor-not-allowed disabled:opacity-45';
export const DIRECTOR_BUTTON_DARK = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#202720] bg-[#111711] px-5 text-sm font-black text-white transition-[background-color,border-color,color,box-shadow] duration-150 hover:bg-[#202720] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#111711]/20 disabled:cursor-not-allowed disabled:opacity-45';
export const DIRECTOR_BUTTON_GHOST = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d7ded4] bg-white px-5 text-sm font-black text-[#111711] transition-[background-color,border-color,box-shadow] duration-150 hover:border-[#aab6a4] hover:bg-[#f7f9f5] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#111711]/10 disabled:cursor-not-allowed disabled:opacity-45';

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
    <section className="director-module-hero relative overflow-hidden rounded-[26px] border border-[#dce2d8] bg-white px-5 py-6 text-[#111711] shadow-[0_8px_24px_rgba(15,23,16,.045)] sm:px-7 sm:py-7 lg:px-8">
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-[#b7ff00]" />
      <div className={`relative z-10 grid gap-6 ${aside ? 'lg:grid-cols-[minmax(0,1.35fr)_minmax(270px,.65fr)] lg:items-center' : ''}`}>
        <div className="min-w-0 pl-1">
          <p className="text-[10px] font-black uppercase tracking-[.15em] text-[#71806d]">{eyebrow}</p>
          <h1 className="mt-2 max-w-[920px] text-[clamp(2rem,4vw,3.35rem)] font-black leading-[1.02] tracking-[-.045em] text-[#111711]">{title}</h1>
          {description ? <div className="mt-3 max-w-3xl text-sm leading-6 text-[#667064] sm:text-[15px]">{description}</div> : null}
          {actions ? <div className="mt-5 flex flex-wrap items-center gap-2.5">{actions}</div> : null}
        </div>
        {aside ? <div className="director-module-hero-aside min-w-0">{aside}</div> : null}
      </div>
    </section>
  );
}

type DirectorPanelProps = ComponentPropsWithoutRef<'section'>;

export function DirectorPanel({ children, className = '', ...props }: DirectorPanelProps) {
  return <section {...props} className={`director-module-panel min-w-0 rounded-[22px] border border-[#d9e0d6] bg-white shadow-[0_8px_22px_rgba(15,23,16,.035)] ${className}`}>{children}</section>;
}

export function DirectorStat({ label, value, detail, tone = 'default' }: { label: string; value: ReactNode; detail?: ReactNode; tone?: 'default' | 'lime' | 'dark' }) {
  const styles = tone === 'lime'
    ? 'border-[#d7e7b7] bg-[#f5f9e9]'
    : tone === 'dark'
      ? 'border-[#263026] bg-[#111711] text-white'
      : 'border-[#d9e0d6] bg-white';
  return (
    <article className={`director-stat director-stat-${tone} rounded-[18px] border p-4 ${styles}`}>
      <p className={`director-stat-label text-[10px] font-black uppercase tracking-[.12em] ${tone === 'dark' ? 'text-[#b7ff00]' : 'text-[#748073]'}`}>{label}</p>
      <div className={`director-stat-value mt-2 text-2xl font-black tracking-[-.035em] ${tone === 'dark' ? 'text-white' : 'text-[#111711]'}`}>{value}</div>
      {detail ? <div className={`director-stat-detail mt-1 text-xs font-semibold ${tone === 'dark' ? 'text-[#c7d0c8]' : 'text-[#697468]'}`}>{detail}</div> : null}
    </article>
  );
}

export function DirectorTabs({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`inline-grid min-h-[54px] max-w-full gap-1 rounded-[14px] border border-[#d7ded4] bg-white p-1 ${className}`}>{children}</div>;
}

export function DirectorTabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`min-h-11 min-w-0 rounded-[10px] px-4 text-sm font-black transition-[background-color,color,border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#111711]/10 ${active ? 'border border-[#263026] bg-[#111711] text-[#b7ff00]' : 'border border-transparent bg-transparent text-[#687367] hover:bg-[#f2f5ef] hover:text-[#111711]'}`}>{children}</button>;
}
