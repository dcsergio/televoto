import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Stage } from "../components/Stage";
import { useFade } from "../components/useFade";
import { theme } from "../theme";
import { displayFontFamily, bodyFontFamily } from "../fonts";

const Card: React.FC<{
  eyebrow: string;
  title: string;
  detail: string;
  delay: number;
}> = ({ eyebrow, title, detail, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 16, stiffness: 120 },
  });

  return (
    <div
      style={{
        width: 760,
        border: `1px solid ${theme.hairline}`,
        borderRadius: 20,
        backgroundColor: theme.bgCard,
        padding: "36px 40px",
        opacity: enter,
        transform: `translateY(${(1 - enter) * 40}px)`,
      }}
    >
      <div
        style={{
          fontFamily: bodyFontFamily,
          fontSize: 22,
          letterSpacing: 2,
          color: theme.accentGold,
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          fontFamily: displayFontFamily,
          fontSize: 46,
          color: theme.textPrimary,
          marginTop: 10,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: bodyFontFamily,
          fontSize: 26,
          color: theme.textMuted,
          marginTop: 14,
        }}
      >
        {detail}
      </div>
    </div>
  );
};

export const Concept: React.FC = () => {
  const fade = useFade(150);

  return (
    <Stage>
      <div style={{ opacity: fade, display: "flex", flexDirection: "column", gap: 40 }}>
        <div
          style={{
            fontFamily: displayFontFamily,
            fontSize: 56,
            color: theme.textPrimary,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          Giuria + pubblico
        </div>
        <Card
          eyebrow="Giuria qualificata"
          title="Voto 1-10"
          detail="Ogni giudice valuta ogni candidato con un punteggio"
          delay={20}
        />
        <Card
          eyebrow="Voto popolare"
          title="Numerico o a preferenze"
          detail="Il pubblico vota da telefono, in tempo reale"
          delay={45}
        />
      </div>
    </Stage>
  );
};
