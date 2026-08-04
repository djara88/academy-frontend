export const Logo = ({ className = "h-10" }: { className?: string }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 240 45" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Degradado moderno para el escudo */}
        <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#48DFDD" />
          <stop offset="100%" stopColor="#1a6b6a" />
        </linearGradient>
      </defs>

      {/* ÍCONO: Escudo Deportivo Moderno */}
      <path 
        d="M 22 3 L 6 8 L 6 22 C 6 33 22 42 22 42 C 22 42 38 33 38 22 L 38 8 Z" 
        fill="url(#shieldGradient)" 
      />
      
      {/* ÍCONO INTERIOR: Estrella de rendimiento/crecimiento */}
      <path 
        d="M 22 11 L 25.5 17.5 L 32 18.5 L 27 23.5 L 28.5 30 L 22 26.5 L 15.5 30 L 17 23.5 L 12 18.5 L 18.5 17.5 Z" 
        fill="#FFFFFF" 
      />

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
