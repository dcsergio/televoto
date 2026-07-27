import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { withAuth } from './auth.interceptor';
import { toApiError } from './http-error.util';

const BASE = '/api';

export interface VotingProgressJudge {
  id: string;
  label: string | null;
  type: 'QUALIFICATA' | 'POPOLARE';
  voterStatus: 'ACTIVE' | 'SUBMITTED';
  tokenPreview: string;
  status: 'active' | 'used' | 'revoked';
  votesCast: number;
  votesRequired: number;
  missingCandidates: Array<{ id: string; number: number; name: string }>;
}

export interface VotingProgress {
  candidateCount: number;
  totalJudges: number;
  activeJudges: number;
  finalizedJudges: number;
  revokedJudges: number;
  judges: VotingProgressJudge[];
  qualified: {
    totalJudges: number;
    activeJudges: number;
    submittedJudges: number;
    revokedJudges: number;
  };
  popular: {
    totalTokens: number;
    activeTokens: number;
    submittedTokens: number;
    revokedTokens: number;
    activatedTokens: number;
    totalVotesCast: number;
  };
  incompleteCandidates: Array<{
    candidateId: string;
    candidateNumber: number;
    candidateName: string;
    missingJudgeCount: number;
  }>;
}

@Injectable({ providedIn: 'root' })
export class VotingApi {
  private readonly http = inject(HttpClient);

  castVote(candidateId: string, score: number | null, judgeToken: string): Observable<{ ok: boolean }> {
    return this.http
      .post<{ ok: boolean }>(`${BASE}/vote`, { candidateId, score, judgeToken })
      .pipe(catchError((err) => throwError(() => toApiError(err, 'Errore nel voto'))));
  }

  fetchVotingProgress(eventId: string, authToken: string): Observable<VotingProgress> {
    return this.http
      .get<VotingProgress>(`${BASE}/events/${eventId}/voting-progress`, withAuth(authToken))
      .pipe(
        catchError((err) => throwError(() => toApiError(err, 'Errore nel caricamento progresso voti'))),
      );
  }
}
