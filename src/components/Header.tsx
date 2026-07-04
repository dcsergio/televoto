interface HeaderProps {
  onOpenAdmin?: () => void;
  onOpenHallOfFame?: () => void;
}

export function Header({ onOpenAdmin, onOpenHallOfFame }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-bg-primary/80 border-b border-border-glass">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="w-10 h-10 rounded-full glass flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Admin"
            onClick={onOpenAdmin}
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-extrabold tracking-wider uppercase neon-text leading-none">
              Televoto
            </h1>
            <p className="text-[10px] tracking-[0.2em] uppercase text-text-muted leading-none mt-0.5">
              Vota. Partecipa. Fai la differenza.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="w-10 h-10 rounded-full glass flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Classifica"
          onClick={onOpenHallOfFame}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="10" width="4" height="7" rx="1" fill="currentColor" opacity="0.5" />
            <rect x="7" y="5" width="4" height="12" rx="1" fill="currentColor" opacity="0.7" />
            <rect x="13" y="1" width="4" height="16" rx="1" fill="currentColor" />
          </svg>
        </button>
      </div>
    </header>
  );
}
