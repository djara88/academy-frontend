import { BRAND } from '../config/brand';

type LogoProps = {
  className?: string;
  variant?: 'brand' | 'mark';
};

const LestraMark = ({ className = '' }: { className?: string }) => (
  <span
    aria-hidden="true"
    className={`relative inline-flex aspect-square shrink-0 items-center justify-center text-[#c8ff00] ${className}`}
  >
    <span className="-skew-x-[14deg] text-[0.88em] font-black italic leading-none tracking-[-0.18em]">L</span>
    <span className="absolute bottom-[13%] left-[18%] h-[9%] w-[66%] -skew-x-[18deg] rounded-full bg-current" />
  </span>
);

export const Logo = ({ className = 'h-10', variant = 'brand' }: LogoProps) => {
  if (variant === 'brand') {
    return (
      <div
        className={`flex min-w-0 items-center gap-2.5 overflow-hidden text-current ${className}`}
        aria-label={`${BRAND.name}: ${BRAND.tagline}`}
      >
        <LestraMark className="h-full" />
        <div className="min-w-0 leading-none">
          <span className="block -skew-x-[7deg] whitespace-nowrap text-[1.05em] font-black italic uppercase tracking-[0.055em] text-current">
            {BRAND.displayName}
          </span>
          <span className="mt-1 hidden whitespace-nowrap text-[0.31em] font-semibold tracking-[0.08em] text-current opacity-55 sm:block">
            {BRAND.productDomain}
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
