import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { withAuth } from './auth.interceptor';
import { toApiError } from './http-error.util';

const BASE = '/api';

export interface RankingEntry {
  id: string;
  number: number;
  name: string;
  color: string;
  totalScore: number;
  finalScore: number;
  voteCount: number;
  avgScore: number;
  avgQualificata: number;
  avgPopolare: number;
  qualifiedVoteCount: number;
  popularVoteCount: number;
}

export interface PartialRankingEntry {
  id: string;
  number: number;
  name: string;
  color: string;
  avgQualificata: number;
  avgPopolare: number;
  finalScore: number;
  qualifiedVoteCount: number;
  popularVoteCount: number;
  totalVoteCount: number;
  position: number;
}

export interface PartialRankings {
  qualified: PartialRankingEntry[];
  popular: PartialRankingEntry[];
  weighted: PartialRankingEntry[];
  weights: {
    qualificata: number;
    popolare: number;
  };
  eligibleQualifiedJudges: number;
  event: {
    enableTrimmedMean: boolean;
    trimmedMeanPercentage: number;
  };
}

@Injectable({ providedIn: 'root' })
export class RankingsApi {
  private readonly http = inject(HttpClient);

  fetchRankings(eventId: string, authToken?: string): Observable<RankingEntry[]> {
    return this.http
      .get<RankingEntry[]>(`${BASE}/rankings/${eventId}`, authToken ? withAuth(authToken) : {})
      .pipe(catchError((err) => throwError(() => toApiError(err, 'Errore nel caricamento classifica'))));
  }

  fetchPartialRankings(eventId: string, authToken: string): Observable<PartialRankings> {
    return this.http
      .get<PartialRankings>(`${BASE}/events/${eventId}/partial-rankings`, withAuth(authToken))
      .pipe(
        catchError((err) => throwError(() => toApiError(err, 'Errore nel caricamento classifiche parziali'))),
      );
  }
}
