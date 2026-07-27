export type JudgeAccessStatus = 'idle' | 'loading' | 'valid' | 'used' | 'revoked' | 'invalid';

export interface JudgeAccessState {
  status: JudgeAccessStatus;
  message?: string;
}
