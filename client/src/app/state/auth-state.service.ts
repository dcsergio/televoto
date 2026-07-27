import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../api/auth.api';

const ROOT_TOKEN_KEY = 'televoto.rootAuthToken';
const EVENT_MANAGER_TOKEN_KEY = 'televoto.eventManagerAuthToken';

function readSessionToken(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionToken(key: string, value: string | null): void {
  try {
    if (value) {
      sessionStorage.setItem(key, value);
    } else {
      sessionStorage.removeItem(key);
    }
  } catch {
    // sessionStorage unavailable (e.g. private mode) - fall back to in-memory only
  }
}

/**
 * Root/event-manager bearer tokens, persisted to sessionStorage so a page
 * refresh during an event doesn't force the operator to log back in.
 */
@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly authApi = inject(AuthApi);

  readonly rootAuthToken = signal<string | null>(readSessionToken(ROOT_TOKEN_KEY));
  readonly eventManagerAuthToken = signal<string | null>(readSessionToken(EVENT_MANAGER_TOKEN_KEY));

  readonly isRootAuthenticated = computed(() => this.rootAuthToken() !== null);
  readonly isEventManagerAuthenticated = computed(() => this.eventManagerAuthToken() !== null);

  async loginRoot(password: string): Promise<void> {
    const session = await firstValueFrom(this.authApi.loginRoot(password));
    this.setRootAuthToken(session.token);
    this.setEventManagerAuthToken(null);
  }

  async loginEventManager(eventId: string, password: string): Promise<void> {
    const session = await firstValueFrom(this.authApi.loginEventManager(eventId, password));
    this.setEventManagerAuthToken(session.token);
  }

  setRootAuthToken(token: string | null): void {
    this.rootAuthToken.set(token);
    writeSessionToken(ROOT_TOKEN_KEY, token);
  }

  setEventManagerAuthToken(token: string | null): void {
    this.eventManagerAuthToken.set(token);
    writeSessionToken(EVENT_MANAGER_TOKEN_KEY, token);
  }

  logoutRoot(): void {
    this.setRootAuthToken(null);
  }

  logoutEventManager(): void {
    this.setEventManagerAuthToken(null);
  }
}
