import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { withAuth } from './auth.interceptor';
import { toApiError } from './http-error.util';
import { CandidateData } from '../models/types';

const BASE = '/api';

@Injectable({ providedIn: 'root' })
export class CandidatesApi {
  private readonly http = inject(HttpClient);

  fetchCandidates(eventId: string, authToken: string): Observable<CandidateData[]> {
    return this.http
      .get<CandidateData[]>(`${BASE}/candidates/${eventId}`, withAuth(authToken))
      .pipe(catchError((err) => throwError(() => toApiError(err, 'Errore nel caricamento candidati'))));
  }

  addCandidate(
    eventId: string,
    number: number,
    name: string,
    authToken: string,
    subtitle?: string,
    color?: string,
  ): Observable<CandidateData> {
    return this.http
      .post<CandidateData>(
        `${BASE}/candidates`,
        { eventId, number, name, subtitle, color },
        withAuth(authToken),
      )
      .pipe(catchError((err) => throwError(() => toApiError(err, "Errore nell'aggiunta candidato"))));
  }

  updateCandidate(
    id: string,
    data: Partial<{ name: string; subtitle: string | null; color: string; number: number }>,
    authToken: string,
  ): Observable<CandidateData> {
    return this.http
      .put<CandidateData>(`${BASE}/candidates/${id}`, data, withAuth(authToken))
      .pipe(catchError((err) => throwError(() => toApiError(err, "Errore nell'aggiornamento"))));
  }

  deleteCandidate(id: string, authToken: string): Observable<{ ok: boolean }> {
    return this.http
      .delete<{ ok: boolean }>(`${BASE}/candidates/${id}`, withAuth(authToken))
      .pipe(catchError((err) => throwError(() => toApiError(err, 'Errore nella cancellazione'))));
  }
}
