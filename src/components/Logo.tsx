import { BRAND } from '../config/brand';

type LogoProps = {
  className?: string;
  variant?: 'brand' | 'mark';
};

const LestraMark = ({ className = '' }: { className?: string }) => (
  <span
    aria-hidden="true"
    className={`relative inline-flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-[28%] bg-[#3157FF] text-white shadow-[0_10px_30px_rgba(49,87,255,0.28)] ${className}`}
  >
    <span className="relative -translate-y-[2%] text-[0.62em] font-black tracking-[-0.08em]">L</span>
    <span className="absolute inset-x-[22%] bottom-[18%] h-[9%] rounded-full bg-[#B8FF3D]" />
  </span>
);

export const Logo = ({ className = 'h-10', variant = 'brand' }: LogoProps) => {
  if (variant === 'brand') {
    return (
      <div
        className={`flex min-w-0 items-center gap-3 overflow-hidden ${className}`}
        aria-label={`${BRAND.name}: ${BRAND.tagline}`}
      >
        <LestraMark className="h-full" />
        <div className="min-w-0 leading-none">
          <span className="block whitespace-nowrap text-[1.05em] font-black uppercase tracking-[0.1em] text-white">
            {BRAND.displayName}
          </span>
          <span className="mt-1 hidden whitespace-nowrap text-[0.34em] font-semibold uppercase tracking-[0.11em] text-[#B8FF3D] sm:block">
            {BRAND.tagline}
          </span>
        </div>
      </div>
    );
  }

  return (
    <span className={`inline-flex ${className}`} role="img" aria-label={`Símbolo de ${BRAND.name}`}>
      <LestraMark className="h-full w-full" />
    </span>
  );
};
