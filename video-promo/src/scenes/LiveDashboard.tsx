import React from "react";
import { useCurrentFrame } from "remotion";
import { Stage } from "../components/Stage";
import { useFade } from "../components/useFade";
import { ScoreBar } from "../components/ScoreBar";
import { theme } from "../theme";
import { displayFontFamily } from "../fonts";

const CANDIDATES = [
  { label: "N.1 — Aurora", value: 78 },
  { label: "N.2 — Meridiana", value: 63 },
  { label: "N.3 — Solstizio", value: 45 },
];

export const LiveDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = useFade(150);
  const pulse = 0.55 + 0.45 * Math.abs(Math.sin(frame / 8));

  return (
    <Stage>
      <div
        style={{
          opacity: fade,
          display: "flex",
          flexDirection: "column",
          gap: 40,
          width: 800,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              backgroundColor: theme.accentGold,
              opacity: pulse,
            }}
          />
          <div
            style={{
              fontFamily: displayFontFamily,
              fontSize: 48,
              color: theme.textPrimary,
              letterSpacing: 1,
            }}
          >
            Monitoraggio in diretta
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          {CANDIDATES.map((c, i) => (
            <ScoreBar
              key={c.label}
              label={c.label}
              value={c.value}
              delay={20 + i * 14}
            />
          ))}
        </div>
      </div>
    </Stage>
  );
};
