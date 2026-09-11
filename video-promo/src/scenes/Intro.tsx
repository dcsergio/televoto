import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { Stage } from "../components/Stage";
import { Wordmark } from "../components/Wordmark";
import { useFade } from "../components/useFade";
import { SCENES } from "../durations";
import { theme } from "../theme";
import { bodyFontFamily } from "../fonts";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = useFade(SCENES.intro);
  const subOpacity = interpolate(frame, [28, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Stage>
      <div style={{ opacity: fade, textAlign: "center" }}>
        <Wordmark />
        <div
          style={{
            marginTop: 34,
            fontFamily: bodyFontFamily,
            fontSize: 32,
            color: theme.textMuted,
            opacity: subOpacity,
          }}
        >
          Voto live per eventi e serate
        </div>
      </div>
    </Stage>
  );
};
