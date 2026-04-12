import { MessageCircle } from 'lucide-react';

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="h-[100dvh] w-screen flex flex-col items-center justify-center bg-[var(--color-surface-900)] relative overflow-hidden">
      
      {/* Animated background blobs */}
      <div className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] max-w-[400px] max-h-[400px] bg-[var(--color-primary)] opacity-[0.08] rounded-full blur-[120px] animate-float pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] max-w-[300px] max-h-[300px] bg-[oklch(0.55_0.18_185)] opacity-[0.06] rounded-full blur-[100px] animate-float pointer-events-none" style={{ animationDelay: '1s' }}></div>

      {/* Logo container */}
      <div className="relative animate-scale-in">
        {/* Glow ring */}
        <div className="absolute inset-0 w-24 h-24 rounded-3xl gradient-primary opacity-30 blur-xl animate-glow-pulse"></div>
        
        {/* Logo */}
        <div className="relative w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center shadow-2xl shadow-[var(--color-primary)]/20">
          <MessageCircle size={48} className="text-white drop-shadow-lg" />
        </div>
      </div>

      {/* Brand name */}
      <h1 className="mt-8 text-3xl font-extrabold tracking-tight text-gradient animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
        Whispr
      </h1>

      {/* Loading text */}
      <p className="mt-3 text-[var(--color-text-muted)] text-sm font-medium animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
        {message}
      </p>

      {/* Shimmer loading bar */}
      <div className="mt-8 w-48 h-1 bg-[var(--color-surface-700)] rounded-full overflow-hidden animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
        <div className="h-full w-1/3 gradient-primary rounded-full animate-shimmer"></div>
      </div>

      {/* Floating dots */}
      <div className="mt-6 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-typing" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-typing" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-typing" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  );
}
