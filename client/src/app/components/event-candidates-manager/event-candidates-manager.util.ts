import { CandidateData } from '../../models/types';

export function getNextCandidateNumber(candidates: CandidateData[]): number {
  if (candidates.length === 0) return 1;
  return Math.max(...candidates.map((c) => c.number)) + 1;
}

export function getRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i += 1) {
    color += letters[Math.floor(Math.random() * letters.length)];
  }
  return color;
}

export const CANDIDATE_COLOR_PALETTE = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
