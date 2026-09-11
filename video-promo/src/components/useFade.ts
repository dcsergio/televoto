import { interpolate, useCurrentFrame } from "remotion";

// Local fade in/out so every scene can be dropped into a plain <Series>
// without needing a separate transition layer.
export const useFade = (durationInFrames: number, edge = 15) => {
  const frame = useCurrentFrame();
  return interpolate(
    frame,
    [0, edge, durationInFrames - edge, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
};
