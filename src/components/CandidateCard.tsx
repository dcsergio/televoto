import type { CandidateData } from "../types";
import { ScoreSelector } from "./ScoreSelector";

interface CandidateCardProps {
  readonly candidate: CandidateData;
  readonly selected: boolean;
  readonly votedScore: number | null;
  readonly onClick: () => void;
  readonly onVote?: (candidateId: string, score: number) => void;
  readonly submitting: boolean;
  readonly delay: number;
}

// Shape components for candidate icons
function CandidateIcon({ color, number }: Readonly<{ color: string; number: number }>) {
  const shapes = [
    // Circle
    <circle cx="24" cy="24" r="14" fill={color} opacity="0.9" key="circle" />,
    // Triangle
    <polygon points="24,10 38,38 10,38" fill={color} opacity="0.9" key="triangle" />,
    // Square
    <rect x="12" y="12" width="24" height="24" rx="4" fill={color} opacity="0.9" key="square" />,
    // Diamond
    <polygon points="24,8 40,24 24,40 8,24" fill={color} opacity="0.9" key="diamond" />,
    // Pentagon-ish
    <polygon points="24,8 38,18 34,36 14,36 10,18" fill={color} opacity="0.9" key="pentagon" />,
    // Star-ish (two overlapping shapes)
    <>
      <circle cx="20" cy="20" r="12" fill={color} opacity="0.7" key="s1" />
      <circle cx="28" cy="28" r="12" fill={color} opacity="0.5" key="s2" />
    </>,
  ];
  const idx = (number - 1) % shapes.length;

  return (
    <div
      className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${color}20`, borderLeft: `3px solid ${color}` }}
    >
      <svg width="48" height="48" viewBox="0 0 48 48">
        {shapes[idx]}
      </svg>
    </div>
  );
}

export function CandidateCard({
  candidate,
  selected,
  votedScore,
  onClick,
  onVote,
  submitting,
  delay,
}: CandidateCardProps) {
  const isVoted = votedScore !== null;

  return (
    <div
      className={`
        w-full animate-fade-in-up rounded-2xl transition-all duration-300 btn-tactile
        ${selected
          ? "glass-selected animate-pulse-neon scale-[1.01]"
          : isVoted
            ? "glass-voted border-emerald-500/20"
            : "glass hover:bg-bg-card-hover"
        }
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-3 md:gap-4 p-3.5 md:p-4 text-left touch-manipulation"
      >
        <CandidateIcon color={candidate.color} number={candidate.number} />

        <span
          className="text-2xl md:text-3xl font-black tabular-nums"
          style={{ color: candidate.color, opacity: isVoted && !selected ? 0.45 : 0.8 }}
        >
          {String(candidate.number).padStart(2, "0")}
        </span>

        <div className="flex-1 min-w-0">
          <p className={`font-extrabold text-sm md:text-base uppercase tracking-wide text-text-primary truncate ${isVoted && !selected ? "opacity-60" : ""}`}>
            {candidate.name}
          </p>
          {candidate.subtitle && (
            <p className="text-xs md:text-sm text-text-muted truncate">{candidate.subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {isVoted && (
            <span className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="text-xs">✓</span>
              <span>{votedScore}/10</span>
            </span>
          )}
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
              selected
                ? "border-accent-cyan bg-accent-cyan/20"
                : isVoted
                  ? "border-emerald-500 bg-emerald-500/25"
                  : "border-text-muted/40"
            }`}
          >
            {selected ? (
              <div className="w-2.5 h-2.5 rounded-full bg-accent-cyan" />
            ) : isVoted ? (
              <span className="text-[10px] font-black text-emerald-400">✓</span>
            ) : null}
          </div>
        </div>
      </button>

      {selected && onVote && (
        <div className="px-4 pb-4 pt-0 animate-slide-down">
          <div className="relative -mt-4 rounded-3xl border border-slate-700 bg-slate-950/95 p-4 shadow-xl shadow-slate-950/30">
            <div className="mb-3.5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-bold">Voto rapido</p>
                <p className="mt-1 text-sm font-bold text-text-primary">Seleziona un punteggio</p>
              </div>
              {submitting && (
                <span className="text-xs font-semibold text-accent-cyan animate-pulse">Salvataggio...</span>
              )}
            </div>
            <ScoreSelector
              value={votedScore ?? null}
              onChange={(score) => onVote(candidate.id, score)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
