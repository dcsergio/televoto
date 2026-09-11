import React from "react";
import { Composition } from "remotion";
import { Main } from "./Main";
import { TOTAL_DURATION } from "./durations";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={TOTAL_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
