import { describe, expect, it } from 'vitest';
import {
  joinJudgeTokenSegments,
  normalizeJudgeTokenInput,
  splitJudgeTokenSegments,
} from './judge-token.util';

describe('judge-token.util', () => {
  it('normalizes lowercase and stray characters', () => {
    expect(normalizeJudgeTokenInput(' ab-12 cd*34 ')).toBe('AB12CD34');
  });

  it('splits into 4 segments of 4 characters', () => {
    expect(splitJudgeTokenSegments('AB12CD34EF56GH78')).toEqual(['AB12', 'CD34', 'EF56', 'GH78']);
  });

  it('pads missing segments with empty strings', () => {
    expect(splitJudgeTokenSegments('AB12')).toEqual(['AB12', '', '', '']);
  });

  it('rejoins segments back into a single token', () => {
    expect(joinJudgeTokenSegments(['AB12', 'CD34', 'EF56', 'GH78'])).toBe('AB12CD34EF56GH78');
  });
});
