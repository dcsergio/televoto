import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Stage } from "../components/Stage";
import { useFade } from "../components/useFade";
import { QRFake } from "../components/QRFake";
import { SegmentedCode } from "../components/SegmentedCode";
import { theme } from "../theme";
import { displayFontFamily, bodyFontFamily } from "../fonts";

export const JudgeTokens: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFade(150);
  const qrScale = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14, stiffness: 130 },
  });
  const revealed = Math.min(4, Math.max(0, Math.floor((frame - 55) / 10)));

  return (
    <Stage>
      <div
        style={{
          opacity: fade,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 44,
        }}
      >
        <div
          style={{
            fontFamily: displayFontFamily,
            fontSize: 52,
            color: theme.textPrimary,
            textAlign: "center",
          }}
        >
          Codici giudice via QR
        </div>
        <div style={{ transform: `scale(${qrScale})` }}>
          <QRFake size={300} />
        </div>
        <SegmentedCode revealed={revealed} />
        <div
          style={{
            fontFamily: bodyFontFamily,
            fontSize: 26,
            color: theme.textMuted,
            textAlign: "center",
            maxWidth: 640,
          }}
        >
          Nessun account da creare: link o QR, e si vota
        </div>
      </div>
    </Stage>
  );
};
