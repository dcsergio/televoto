interface VoteButtonProps {
  disabled: boolean;
  loading: boolean;
  alreadyVoted: boolean;
  onClick: () => void;
}

export function VoteButton({ disabled, loading, alreadyVoted, onClick }: VoteButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        w-full mt-6 py-4 rounded-2xl font-bold text-base uppercase tracking-wider
        transition-all duration-200 cursor-pointer
        ${disabled
          ? "bg-bg-card text-text-muted border border-border-glass cursor-not-allowed"
          : "bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-magenta text-white shadow-lg shadow-accent-cyan/20 hover:shadow-accent-cyan/40 hover:scale-[1.02] active:scale-[0.98]"
        }
      `}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Invio in corso...
        </span>
      ) : alreadyVoted ? (
        "Aggiorna il voto"
      ) : (
        "Conferma il voto"
      )}
    </button>
  );
}
