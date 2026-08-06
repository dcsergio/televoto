export interface EventData {
  id: string;
  code: string;
  name: string;
  subtitle: string | null;
  active: boolean;
  votingClosed: boolean;
  weightQualificata: number;
  weightPopolare: number;
  enableTrimmedMean: boolean;
  trimmedMeanPercentage: number;
  popularVoteMode: 'NUMERIC' | 'SINGLE';
  candidates: CandidateData[];
}

export interface CandidateData {
  id: string;
  eventId: string;
  number: number;
  name: string;
  subtitle: string | null;
  color: string;
}
