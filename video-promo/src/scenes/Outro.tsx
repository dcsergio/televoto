import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Stage } from "../components/Stage";
import { Wordmark } from "../components/Wordmark";
import { useFade } from "../components/useFade";
import { theme } from "../theme";
import { bodyFontFamily } from "../fonts";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = useFade(120);
  const tagOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Stage>
      <div style={{ opacity: fade, textAlign: "center" }}>
        <Wordmark size={92} />
        <div
          style={{
            marginTop: 30,
            fontFamily: bodyFontFamily,
            fontSize: 30,
            color: theme.textMuted,
            opacity: tagOpacity,
          }}
        >
          La vostra serata, il vostro voto.
        </div>
      </div>
    </Stage>
  );
};
