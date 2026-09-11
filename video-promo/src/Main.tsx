import React from "react";
import { Audio, interpolate, Series, staticFile } from "remotion";
import { SCENES, TOTAL_DURATION } from "./durations";
import { Intro } from "./scenes/Intro";
import { Concept } from "./scenes/Concept";
import { JudgeTokens } from "./scenes/JudgeTokens";
import { LiveDashboard } from "./scenes/LiveDashboard";
import { Classifica } from "./scenes/Classifica";
import { Outro } from "./scenes/Outro";

const musicVolume = (frame: number) =>
  interpolate(
    frame,
    [0, 30, TOTAL_DURATION - 45, TOTAL_DURATION],
    [0, 0.5, 0.5, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

export const Main: React.FC = () => {
  return (
    <>
      <Audio src={staticFile("music.mp3")} volume={musicVolume} />
      <Series>
        <Series.Sequence durationInFrames={SCENES.intro}>
          <Intro />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.concept}>
          <Concept />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.judgeTokens}>
          <JudgeTokens />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.liveDashboard}>
          <LiveDashboard />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.classifica}>
          <Classifica />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.outro}>
          <Outro />
        </Series.Sequence>
      </Series>
    </>
  );
};
