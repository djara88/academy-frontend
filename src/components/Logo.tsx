import { BRAND } from '../config/brand';

type LogoProps = {
  className?: string;
  variant?: 'brand' | 'mark';
};

export const Logo = ({ className = 'h-10', variant = 'brand' }: LogoProps) => {
  return (
    <img 
      src={variant === 'mark' ? BRAND.mark : BRAND.logo}
      alt={variant === 'mark' ? 'Símbolo de Syncademia' : `${BRAND.name}: ${BRAND.tagline}`}
      className={`object-contain ${className}`} 
    />
  );
};
