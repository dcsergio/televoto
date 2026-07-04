import type { CandidateData } from "../types";

interface CandidateCardProps {
  candidate: CandidateData;
  selected: boolean;
  votedScore: number | null;
  onClick: () => void;
  delay: number;
}

// Shape components for candidate icons
function CandidateIcon({ color, number }: { color: string; number: number }) {
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

export function CandidateCard({ candidate, selected, votedScore, onClick, delay }: CandidateCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl transition-all duration-200 text-left
        animate-fade-in-up cursor-pointer
        ${selected
          ? "glass-selected"
          : "glass hover:bg-bg-card-hover"
        }
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CandidateIcon color={candidate.color} number={candidate.number} />

      <span
        className="text-2xl md:text-3xl font-black tabular-nums"
        style={{ color: candidate.color, opacity: 0.7 }}
      >
        {String(candidate.number).padStart(2, "0")}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm md:text-base uppercase tracking-wide text-text-primary truncate">
          {candidate.name}
        </p>
        {candidate.subtitle && (
          <p className="text-xs md:text-sm text-text-muted truncate">{candidate.subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {votedScore !== null && (
          <span className="text-xs font-bold text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded-full">
            {votedScore}/10
          </span>
        )}
        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            selected
              ? "border-accent-cyan bg-accent-cyan/20"
              : "border-text-muted/40"
          }`}
        >
          {selected && (
            <div className="w-3 h-3 rounded-full bg-accent-cyan" />
          )}
        </div>
      </div>
    </button>
  );
}
