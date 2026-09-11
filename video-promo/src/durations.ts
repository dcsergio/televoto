export const SCENES = {
  intro: 120,
  concept: 150,
  judgeTokens: 150,
  liveDashboard: 150,
  classifica: 210,
  outro: 120,
} as const;

export const TOTAL_DURATION = Object.values(SCENES).reduce(
  (sum, d) => sum + d,
  0,
);
