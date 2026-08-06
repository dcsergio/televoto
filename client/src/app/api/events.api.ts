import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { withAuth } from './auth.interceptor';
import { toApiError } from './http-error.util';
import { CandidateData, EventData } from '../models/types';

const BASE = '/api';

export interface AdminEventSummary {
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
  createdAt: string;
}

export interface CreateEventInput {
  managerPassword: string;
  code?: string;
  name: string;
  subtitle?: string;
  popularVoteMode?: 'NUMERIC' | 'SINGLE';
}

export type UpdateEventInput = Partial<{
  name: string;
  subtitle: string | null;
  weightQualificata: number;
  weightPopolare: number;
  enableTrimmedMean: boolean;
  trimmedMeanPercentage: number;
}>;

@Injectable({ providedIn: 'root' })
export class EventsApi {
  private readonly http = inject(HttpClient);

  fetchEventByCode(eventCode: string): Observable<EventData> {
    return this.http
      .get<EventData>(`${BASE}/events/by-code/${encodeURIComponent(eventCode)}`)
      .pipe(catchError((err) => throwError(() => toApiError(err, 'Errore caricamento evento'))));
  }

  fetchEvents(authToken: string): Observable<AdminEventSummary[]> {
    return this.http
      .get<AdminEventSummary[]>(`${BASE}/events`, withAuth(authToken))
      .pipe(catchError((err) => throwError(() => toApiError(err, 'Errore nel caricamento eventi'))));
  }

  createEvent(input: CreateEventInput, authToken: string): Observable<AdminEventSummary> {
    return this.http
      .post<AdminEventSummary>(`${BASE}/events`, input, withAuth(authToken))
      .pipe(catchError((err) => throwError(() => toApiError(err, 'Errore nella creazione evento'))));
  }

  updateEvent(eventId: string, input: UpdateEventInput, authToken: string): Observable<AdminEventSummary> {
    return this.http
      .put<AdminEventSummary>(`${BASE}/events/${eventId}`, input, withAuth(authToken))
      .pipe(
        catchError((err) => throwError(() => toApiError(err, "Errore nell'aggiornamento evento"))),
      );
  }

  updateEventManagerPassword(
    eventId: string,
    password: string,
    authToken: string,
  ): Observable<{ ok: boolean }> {
    return this.http
      .put<{ ok: boolean }>(`${BASE}/events/${eventId}/manager-password`, { password }, withAuth(authToken))
      .pipe(
        catchError((err) => throwError(() => toApiError(err, 'Aggiornamento password evento non riuscito'))),
      );
  }

  fetchEventState(eventId: string): Observable<{ id: string; code: string; votingClosed: boolean }> {
    return this.http
      .get<{ id: string; code: string; votingClosed: boolean }>(`${BASE}/events/${eventId}`)
      .pipe(catchError((err) => throwError(() => toApiError(err, 'Errore nel caricamento stato evento'))));
  }

  updateEventVotingState(
    eventId: string,
    votingClosed: boolean,
    authToken: string,
  ): Observable<{ id: string; votingClosed: boolean }> {
    return this.http
      .put<{ id: string; votingClosed: boolean }>(
        `${BASE}/events/${eventId}/voting-state`,
        { votingClosed },
        withAuth(authToken),
      )
      .pipe(
        catchError((err) => throwError(() => toApiError(err, "Errore nell'aggiornamento dello stato"))),
      );
  }

  resetEventVotes(eventId: string, authToken: string): Observable<{ ok: boolean }> {
    return this.http
      .delete<{ ok: boolean }>(`${BASE}/events/${eventId}/votes`, withAuth(authToken))
      .pipe(
        catchError((err) => throwError(() => toApiError(err, "Errore nell'azzeramento della classifica"))),
      );
  }

  startEvent(
    eventId: string,
    authToken: string,
  ): Observable<{ ok: boolean; votingClosed: boolean; candidates: CandidateData[] }> {
    return this.http
      .post<{ ok: boolean; votingClosed: boolean; candidates: CandidateData[] }>(
        `${BASE}/events/${eventId}/start`,
        {},
        withAuth(authToken),
      )
      .pipe(catchError((err) => throwError(() => toApiError(err, "Errore nell'avvio della gara"))));
  }
}
