import React from "react";
import { theme } from "../theme";
import { displayFontFamily } from "../fonts";

// Mirrors the real judge-token display: a 16-char opaque code shown in
// four 4-character groups (client/src/app/shared/judge-token.util.ts).
const CODE = "A3F9K2L8Q7T1M4X6";
const GROUPS = CODE.match(/.{1,4}/g) ?? [];

export const SegmentedCode: React.FC<{ revealed: number }> = ({
  revealed,
}) => {
  return (
    <div style={{ display: "flex", gap: 14 }}>
      {GROUPS.map((group, i) => (
        <div
          key={group}
          style={{
            border: `2px solid ${theme.hairline}`,
            borderRadius: 14,
            padding: "14px 18px",
            backgroundColor: theme.bgCard,
            fontFamily: displayFontFamily,
            fontSize: 34,
            letterSpacing: 3,
            color: i < revealed ? theme.accentGold : theme.textMuted,
            opacity: i < revealed ? 1 : 0.35,
          }}
        >
          {group}
        </div>
      ))}
    </div>
  );
};
