import React from "react";
import { random } from "remotion";
import { theme } from "../theme";

// Not a scannable QR code — a deterministic decorative grid standing in for
// one, since the promo shows the concept ("scan a code") not a real link.
const GRID = 9;

export const QRFake: React.FC<{ size?: number }> = ({ size = 260 }) => {
  const cell = size / GRID;
  const cells: React.ReactNode[] = [];

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const isFinder =
        (row < 3 && col < 3) ||
        (row < 3 && col >= GRID - 3) ||
        (row >= GRID - 3 && col < 3);
      const on = isFinder
        ? !(row === 1 && col === 1) &&
          !(row === 1 && col === GRID - 2) &&
          !(row === GRID - 2 && col === 1)
        : random(`qr-${row}-${col}`) > 0.52;
      if (!on) continue;
      cells.push(
        <div
          key={`${row}-${col}`}
          style={{
            position: "absolute",
            left: col * cell,
            top: row * cell,
            width: cell - 2,
            height: cell - 2,
            backgroundColor: isFinder ? theme.accentGold : theme.textPrimary,
            borderRadius: 2,
          }}
        />,
      );
    }
  }

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        backgroundColor: theme.bgCard,
        border: `2px solid ${theme.hairline}`,
        borderRadius: 20,
        padding: 12,
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {cells}
      </div>
    </div>
  );
};
