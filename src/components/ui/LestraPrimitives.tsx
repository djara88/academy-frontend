import { type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';

type SurfaceVariant = 'default' | 'muted' | 'admin';
type ButtonVariant = 'primary' | 'secondary' | 'admin';

const surfaceClasses: Record<SurfaceVariant, string> = {
  default: 'border-[#dce2d8] bg-white text-[#151a16]',
  muted: 'border-[#dce2d8] bg-[#eef1eb] text-[#151a16]',
  admin: 'border-white/10 bg-[#101720] text-white',
};

const buttonClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[#1c231d] text-white hover:bg-[#2d372f] focus-visible:outline-[#617d00]',
  secondary: 'border border-[#cfd8cb] bg-white text-[#1c231d] hover:bg-[#f4f6f1] focus-visible:outline-[#617d00]',
  admin: 'bg-orange-500 text-[#0b1118] hover:bg-orange-400 focus-visible:outline-orange-300',
};

export function LestraSurface({
  variant = 'default',
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { variant?: SurfaceVariant; children: ReactNode }) {
  return (
    <section
      className={`rounded-[28px] border ${surfaceClasses[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </section>
  );
}

export function LestraButton({
  variant = 'primary',
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; children: ReactNode }) {
  return (
    <button
      type={type}
      className={`min-h-12 rounded-xl px-5 font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${buttonClasses[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function LestraStatusDot({
  tone = 'director',
  className = '',
}: {
  tone?: 'director' | 'admin';
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`h-3 w-3 rounded-full ${tone === 'admin' ? 'bg-orange-500' : 'bg-[#a3c63a]'} ${className}`.trim()}
    />
  );
}
