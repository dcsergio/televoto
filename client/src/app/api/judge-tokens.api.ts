import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { withAuth } from './auth.interceptor';
import { toApiError } from './http-error.util';

const BASE = '/api';

export type JudgeTokenStatus = 'active' | 'used' | 'revoked' | 'invalid';

export interface JudgeTokenRecord {
  id: string;
  label: string | null;
  type: 'QUALIFICATA' | 'POPOLARE';
  voterStatus: 'ACTIVE' | 'SUBMITTED';
  tokenPreview: string;
  createdAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  status: Exclude<JudgeTokenStatus, 'invalid'>;
}

export interface GeneratedJudgeToken extends JudgeTokenRecord {
  token: string;
  url: string;
}

export interface JudgeTokenValidationResult {
  valid: boolean;
  status: JudgeTokenStatus;
  message: string;
  votes?: Record<string, number>;
  code?: JudgeTokenRecord & { eventId: string; votes?: Record<string, number> };
}

export interface GenerateJudgeTokensInput {
  count: number;
  labelPrefix?: string;
  origin?: string;
  type?: 'QUALIFICATA' | 'POPOLARE';
}

@Injectable({ providedIn: 'root' })
export class JudgeTokensApi {
  private readonly http = inject(HttpClient);

  fetchJudgeTokens(eventId: string, authToken: string): Observable<JudgeTokenRecord[]> {
    return this.http
      .get<JudgeTokenRecord[]>(`${BASE}/events/${eventId}/judge-tokens`, withAuth(authToken))
      .pipe(catchError((err) => throwError(() => toApiError(err, 'Errore nel caricamento codici giudice'))));
  }

  buildJudgeTokenStreamUrl(eventId: string, authToken: string): string {
    const params = new URLSearchParams({ authToken });
    return `${BASE}/events/${eventId}/judge-tokens/stream?${params.toString()}`;
  }

  generateJudgeTokens(
    eventId: string,
    input: GenerateJudgeTokensInput,
    authToken: string,
  ): Observable<{ ok: boolean; codes: GeneratedJudgeToken[] }> {
    return this.http
      .post<{ ok: boolean; codes: GeneratedJudgeToken[] }>(
        `${BASE}/events/${eventId}/judge-tokens`,
        input,
        withAuth(authToken),
      )
      .pipe(catchError((err) => throwError(() => toApiError(err, 'Errore nella generazione codici'))));
  }

  validateJudgeToken(token: string, eventCode?: string): Observable<JudgeTokenValidationResult> {
    return this.http.post<JudgeTokenValidationResult>(`${BASE}/judge-tokens/validate`, { token, eventCode }).pipe(
      catchError((err) => {
        const body = err?.error ?? {};
        return of({
          valid: false,
          status: (body.status as JudgeTokenStatus) || 'invalid',
          message: body.error || body.message || 'Codice non valido',
        });
      }),
    );
  }

  finalizeJudgeToken(token: string, eventCode?: string): Observable<JudgeTokenValidationResult> {
    return this.http
      .post<JudgeTokenValidationResult>(`${BASE}/judge-tokens/finalize`, { token, eventCode })
      .pipe(catchError((err) => throwError(() => toApiError(err, 'Errore nel blocco del codice'))));
  }

  revokeJudgeToken(id: string, authToken: string): Observable<JudgeTokenRecord> {
    return this.http
      .post<JudgeTokenRecord>(`${BASE}/judge-tokens/${id}/revoke`, {}, withAuth(authToken))
      .pipe(catchError((err) => throwError(() => toApiError(err, 'Errore nella revoca del codice'))));
  }
}
