import React from 'react';

export const Logo = ({ className = "h-10" }: { className?: string }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 240 45" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Degradado para el ícono */}
        <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#48DFDD" />
          <stop offset="100%" stopColor="#289E9D" />
        </linearGradient>
      </defs>

      {/* ÍCONO: Símbolo de Sincronización / Letra abstracta 'S' */}
      <path 
        d="M14 32 C 8 32, 5 28, 5 22 C 5 12, 14 5, 22 5 C 32 5, 36 12, 36 18" 
        stroke="url(#tealGradient)" 
        strokeWidth="5" 
        strokeLinecap="round" 
      />
      <path 
        d="M26 12 C 32 12, 35 16, 35 22 C 35 32, 26 39, 18 39 C 8 39, 4 32, 4 26" 
        stroke="#1a6b6a" 
        strokeWidth="5" 
        strokeLinecap="round" 
      />
      {/* Flechas del loop de sincronización */}
      <path d="M30 16 L37 18 L38 10" stroke="url(#tealGradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 28 L3 26 L2 34" stroke="#1a6b6a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>

      {/* TEXTO: Syncademia */}
      <text 
        x="50" 
        y="32" 
        fontFamily="system-ui, -apple-system, sans-serif" 
        fontSize="28" 
        fontWeight="800" 
        letterSpacing="0.5"
      >
        <tspan fill="#FFFFFF">Sync</tspan>
        <tspan fill="#289E9D">ademia</tspan>
      </text>
    </svg>
  );
};
