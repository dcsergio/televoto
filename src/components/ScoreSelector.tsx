interface ScoreSelectorProps {
  value: number | null;
  onChange: (score: number) => void;
}

const SCORE_COLORS: { gradient: string; glow: string }[] = [
  { gradient: "linear-gradient(135deg, #f43f5e, #e11d48)", glow: "rgba(244,63,94,0.5)" },
  { gradient: "linear-gradient(135deg, #f43f5e, #f97316)", glow: "rgba(249,115,22,0.5)" },
  { gradient: "linear-gradient(135deg, #f97316, #eab308)", glow: "rgba(234,179,8,0.5)" },
  { gradient: "linear-gradient(135deg, #eab308, #84cc16)", glow: "rgba(132,204,22,0.5)" },
  { gradient: "linear-gradient(135deg, #84cc16, #22c55e)", glow: "rgba(34,197,94,0.5)" },
  { gradient: "linear-gradient(135deg, #22c55e, #14b8a6)", glow: "rgba(20,184,166,0.5)" },
  { gradient: "linear-gradient(135deg, #14b8a6, #06b6d4)", glow: "rgba(6,182,212,0.5)" },
  { gradient: "linear-gradient(135deg, #06b6d4, #3b82f6)", glow: "rgba(59,130,246,0.5)" },
  { gradient: "linear-gradient(135deg, #3b82f6, #8b5cf6)", glow: "rgba(139,92,246,0.5)" },
  { gradient: "linear-gradient(135deg, #8b5cf6, #c026d3)", glow: "rgba(192,38,211,0.5)" },
];

export function ScoreSelector({ value, onChange }: ScoreSelectorProps) {
  return (
    <div>
      <div className="flex justify-between items-center gap-1 sm:gap-2">
        {Array.from({ length: 10 }, (_, i) => {
          const score = i + 1;
          const isActive = value === score;
          const colors = SCORE_COLORS[i];

          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={`score-btn ${isActive ? "active" : ""}`}
              style={{
                "--gradient": colors.gradient,
                "--glow-color": colors.glow,
                background: isActive ? colors.gradient : "rgba(20,20,50,0.6)",
                color: isActive ? "#fff" : "#9ca3c0",
              } as React.CSSProperties}
            >
              {score}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 px-1">
        <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Minimo</span>
        <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Massimo</span>
      </div>
    </div>
  );
}
