import { BRAND } from '../config/brand';

type LogoProps = {
  className?: string;
  variant?: 'brand' | 'mark';
};

export const Logo = ({ className = 'h-10', variant = 'brand' }: LogoProps) => {
  if (variant === 'brand') {
    return (
      <div className={`flex min-w-0 items-center gap-3 overflow-hidden ${className}`} aria-label={`${BRAND.name}: ${BRAND.tagline}`}>
        <img src={BRAND.mark} alt="" className="h-full w-auto shrink-0 object-contain" aria-hidden="true" />
        <div className="min-w-0 leading-none">
          <span className="block whitespace-nowrap text-[1.05em] font-black uppercase tracking-[0.08em] text-white">{BRAND.name}</span>
          <span className="mt-1 hidden whitespace-nowrap text-[0.34em] font-semibold uppercase tracking-[0.12em] text-[#48d8d0] sm:block">{BRAND.tagline}</span>
        </div>
      </div>
    );
  }

  return (
    <img 
      src={BRAND.mark}
      alt="Símbolo de Syncademia"
      className={`object-contain ${className}`} 
    />
  );
};
