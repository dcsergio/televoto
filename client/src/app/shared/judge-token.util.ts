export const JUDGE_TOKEN_SEGMENT_COUNT = 4;
export const JUDGE_TOKEN_SEGMENT_LENGTH = 4;

export function normalizeJudgeTokenInput(value: string): string {
  return value.trim().toUpperCase().replaceAll(/[^0-9A-Z]/g, '');
}

export function splitJudgeTokenSegments(value: string): string[] {
  const normalized = normalizeJudgeTokenInput(value);
  return Array.from({ length: JUDGE_TOKEN_SEGMENT_COUNT }, (_, index) =>
    normalized.slice(index * JUDGE_TOKEN_SEGMENT_LENGTH, (index + 1) * JUDGE_TOKEN_SEGMENT_LENGTH),
  );
}

export function joinJudgeTokenSegments(segments: string[]): string {
  return segments.join('');
}
