import React from "react";
import { AbsoluteFill } from "remotion";
import { theme } from "../theme";

// Near-black "Palco" backdrop with a soft radial vignette, no gradients on
// content itself (matches client/CLAUDE.md: solid surfaces, one accent).
export const Stage: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 55%)",
        }}
      />
      <AbsoluteFill
        style={{
          boxShadow: "inset 0 0 260px 140px rgba(0,0,0,0.65)",
        }}
      />
      <AbsoluteFill
        style={{
          padding: 80,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
