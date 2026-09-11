import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Stage } from "../components/Stage";
import { useFade } from "../components/useFade";
import { theme } from "../theme";
import { displayFontFamily, bodyFontFamily } from "../fonts";

const useCountUp = (target: number, startFrame: number, durationFrames = 40) => {
  const frame = useCurrentFrame();
  return interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, target],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
};

const LadderRow: React.FC<{
  position: string;
  name: string;
  score: number;
  startFrame: number;
}> = ({ position, name, score, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 16, stiffness: 130 },
  });
  const value = useCountUp(score, startFrame + 6);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: 760,
        border: `1px solid ${theme.hairline}`,
        borderRadius: 16,
        backgroundColor: theme.bgCard,
        padding: "22px 32px",
        opacity: enter,
        transform: `translateX(${(1 - enter) * -50}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <span
          style={{
            fontFamily: displayFontFamily,
            fontSize: 40,
            color: theme.textMuted,
          }}
        >
          {position}
        </span>
        <span
          style={{
            fontFamily: bodyFontFamily,
            fontSize: 32,
            color: theme.textPrimary,
            fontWeight: 600,
          }}
        >
          {name}
        </span>
      </div>
      <span
        style={{
          fontFamily: displayFontFamily,
          fontSize: 40,
          color: theme.accentGold,
        }}
      >
        {value.toFixed(1)}
      </span>
    </div>
  );
};

const WinnerCard: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 12, mass: 0.7, stiffness: 150 },
  });
  const value = useCountUp(96.4, startFrame + 10, 50);
  const glow = 0.4 + 0.3 * Math.abs(Math.sin((frame - startFrame) / 10));

  return (
    <div
      style={{
        width: 800,
        border: `2px solid ${theme.accentGold}`,
        borderRadius: 24,
        backgroundColor: theme.bgCard,
        padding: "44px 40px",
        textAlign: "center",
        opacity: enter,
        transform: `scale(${0.9 + enter * 0.1})`,
        boxShadow: `0 0 ${60 * glow}px ${10 * glow}px rgba(255,176,32,${0.35 * glow})`,
      }}
    >
      <div
        style={{
          fontFamily: bodyFontFamily,
          fontSize: 24,
          letterSpacing: 3,
          color: theme.accentChampagne,
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        1° classificato
      </div>
      <div
        style={{
          fontFamily: displayFontFamily,
          fontSize: 64,
          color: theme.textPrimary,
          marginTop: 12,
        }}
      >
        Aurora
      </div>
      <div
        style={{
          fontFamily: displayFontFamily,
          fontSize: 88,
          color: theme.accentGold,
          marginTop: 16,
        }}
      >
        {value.toFixed(1)}
      </div>
    </div>
  );
};

export const Classifica: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = useFade(210);
  const headingOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const showLadder = frame < 130;

  return (
    <Stage>
      <div
        style={{
          opacity: fade,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 36,
        }}
      >
        <div
          style={{
            fontFamily: displayFontFamily,
            fontSize: 52,
            color: theme.textPrimary,
            opacity: headingOpacity,
          }}
        >
          Classifica finale
        </div>
        {showLadder ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <LadderRow position="3°" name="Solstizio" score={81.2} startFrame={20} />
            <LadderRow position="2°" name="Meridiana" score={89.7} startFrame={55} />
          </div>
        ) : (
          <WinnerCard startFrame={130} />
        )}
      </div>
    </Stage>
  );
};
