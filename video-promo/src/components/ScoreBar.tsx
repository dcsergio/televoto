import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { displayFontFamily, bodyFontFamily } from "../fonts";

export const ScoreBar: React.FC<{
  label: string;
  value: number; // 0-100
  delay: number;
  accent?: string;
}> = ({ label, value, delay, accent = theme.accentGold }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [delay, delay + 40], [0, value], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
          fontFamily: bodyFontFamily,
          color: theme.textPrimary,
          fontSize: 26,
          fontWeight: 600,
        }}
      >
        <span>{label}</span>
        <span style={{ fontFamily: displayFontFamily, color: accent }}>
          {Math.round(progress)}
        </span>
      </div>
      <div
        style={{
          height: 20,
          borderRadius: 10,
          backgroundColor: theme.bgCard,
          border: `1px solid ${theme.hairline}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            backgroundColor: accent,
            borderRadius: 10,
          }}
        />
      </div>
    </div>
  );
};
