export const Logo = ({ className = "h-10" }: { className?: string }) => {
  return (
    <img 
      src="/logo-syncademia.png" 
      alt="Logo Syncademia" 
      className={`object-contain ${className}`} 
    />
  );
};
