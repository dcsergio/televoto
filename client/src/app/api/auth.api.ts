import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { withAuth } from './auth.interceptor';
import { toApiError } from './http-error.util';

const BASE = '/api';

export interface AuthSession {
  token: string;
  role: 'root' | 'event_manager';
  eventId?: string;
  expiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  loginRoot(password: string): Observable<AuthSession> {
    return this.http
      .post<AuthSession>(`${BASE}/auth/root/login`, { password })
      .pipe(catchError((err) => throwError(() => toApiError(err, 'Autenticazione root fallita'))));
  }

  updateRootPassword(
    authToken: string,
    currentPassword: string,
    newPassword: string,
  ): Observable<{ ok: boolean }> {
    return this.http
      .post<{ ok: boolean }>(
        `${BASE}/auth/root/password`,
        { currentPassword, newPassword },
        withAuth(authToken),
      )
      .pipe(
        catchError((err) => throwError(() => toApiError(err, 'Aggiornamento password root non riuscito'))),
      );
  }

  loginEventManager(eventId: string, password: string): Observable<AuthSession> {
    return this.http
      .post<AuthSession>(`${BASE}/auth/event/login`, { eventId, password })
      .pipe(
        catchError((err) => throwError(() => toApiError(err, 'Autenticazione manager evento fallita'))),
      );
  }
}
