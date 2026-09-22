import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { displayFontFamily } from "../fonts";

export const Wordmark: React.FC<{ size?: number; delay?: number }> = ({
  size = 108,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 140 },
  });
  const ruleWidth = Math.max(
    0,
    Math.min(1, (frame - delay - 12) / 20),
  );

  return (
    <div style={{ textAlign: "center", transform: `scale(${scale})` }}>
      <div
        style={{
          fontFamily: displayFontFamily,
          fontWeight: 700,
          fontSize: size,
          letterSpacing: 6,
          color: theme.textPrimary,
        }}
      >
        VOTO<span style={{ color: theme.accentGold }}>SUBITO</span>
      </div>
      <div
        style={{
          marginTop: 18,
          height: 3,
          width: `${ruleWidth * 60}%`,
          marginLeft: "auto",
          marginRight: "auto",
          backgroundColor: theme.accentGold,
        }}
      />
    </div>
  );
};
