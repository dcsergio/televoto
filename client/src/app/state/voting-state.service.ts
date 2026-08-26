import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EventsApi } from '../api/events.api';
import { VotingApi } from '../api/voting.api';
import { JudgeTokensApi } from '../api/judge-tokens.api';
import { EventData } from '../models/types';
import { JudgeAccessState } from '../models/judge-access';
import { ToastService } from '../shared/toast.service';

/**
 * Owns the public-voting page state: the loaded event, the current device's
 * votes, judge-token access status and vote submission (7s voting-state poll
 * and per-candidate 300ms debounce are ported unchanged from the React app).
 */
@Injectable({ providedIn: 'root' })
export class VotingStateService {
  private readonly eventsApi = inject(EventsApi);
  private readonly votingApi = inject(VotingApi);
  private readonly judgeTokensApi = inject(JudgeTokensApi);
  private readonly toast = inject(ToastService);

  readonly event = signal<EventData | null>(null);
  readonly myVotes = signal<Record<string, number>>({});
  readonly selectedCandidateId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly eventLoadError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly judgeAccess = signal<JudgeAccessState>({ status: 'idle' });
  readonly voterType = signal<'QUALIFICATA' | 'POPOLARE' | null>(null);

  private readonly voteDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private lastLoadedEventCode: string | null = null;

  async loadEventByCode(eventCode: string | null, judgeMode: boolean): Promise<void> {
    if (!eventCode) {
      this.event.set(null);
      this.loading.set(false);
      this.eventLoadError.set(null);
      this.lastLoadedEventCode = null;
      return;
    }

    if (eventCode === this.lastLoadedEventCode && this.event()) {
      return;
    }
    this.lastLoadedEventCode = eventCode;

    this.loading.set(true);
    this.eventLoadError.set(null);
    try {
      const ev = await firstValueFrom(this.eventsApi.fetchEventByCode(eventCode));
      this.event.set(ev);
      if (!judgeMode) {
        this.myVotes.set({});
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Impossibile caricare l'evento";
      this.eventLoadError.set(msg);
      this.toast.error(msg);
    } finally {
      this.loading.set(false);
    }
  }

  async refreshVotingState(): Promise<void> {
    const ev = this.event();
    if (!ev || ev.votingClosed) return;
    try {
      const state = await firstValueFrom(this.eventsApi.fetchEventState(ev.id));
      this.event.update((prev) => (prev ? { ...prev, turnout: state.turnout } : prev));
      if (state.votingClosed) {
        this.event.update((prev) => (prev ? { ...prev, votingClosed: true } : prev));
        this.toast.error('Le votazioni sono state chiuse.');
      }
    } catch {
      // Silent poll failure - the next tick retries.
    }
  }

  async validateJudge(judgeToken: string, eventCode: string): Promise<void> {
    this.judgeAccess.set({ status: 'loading' });
    this.myVotes.set({});
    this.selectedCandidateId.set(null);
    try {
      const result = await firstValueFrom(this.judgeTokensApi.validateJudgeToken(judgeToken, eventCode));
      this.judgeAccess.set({
        status: result.valid ? 'valid' : result.status === 'active' ? 'invalid' : result.status,
        message: result.message,
      });
      this.voterType.set(result.code?.type ?? null);
      this.myVotes.set(result.votes ?? result.code?.votes ?? {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Codice non valido';
      this.judgeAccess.set({ status: 'invalid', message: msg });
      this.voterType.set(null);
      this.myVotes.set({});
    }
  }

  resetJudgeAccess(): void {
    this.judgeAccess.set({ status: 'idle' });
    this.voterType.set(null);
  }

  selectCandidate(candidateId: string): void {
    this.selectedCandidateId.set(candidateId);
  }

  castVote(candidateId: string, score: number, judgeToken: string, singleVoteMode: boolean = false): void {
    const ev = this.event();
    if (!candidateId || !judgeToken || !ev) return;

    const nextVotes = singleVoteMode ? { [candidateId]: score } : { ...this.myVotes(), [candidateId]: score };
    this.myVotes.set(nextVotes);
    if (singleVoteMode) {
      this.selectedCandidateId.set(null);
    } else {
      const nextCandidate = ev.candidates.find((candidate) => nextVotes[candidate.id] === undefined);
      this.selectedCandidateId.set(nextCandidate?.id ?? null);
    }

    const existingTimer = this.voteDebounceTimers.get(candidateId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.submitting.set(true);
    const timer = setTimeout(async () => {
      try {
        await firstValueFrom(this.votingApi.castVote(candidateId, score, judgeToken));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Errore';
        this.toast.error(msg);
      } finally {
        this.voteDebounceTimers.delete(candidateId);
        if (this.voteDebounceTimers.size === 0) {
          this.submitting.set(false);
        }
      }
    }, 300);
    this.voteDebounceTimers.set(candidateId, timer);
  }

  async finalizeJudgeToken(judgeToken: string, eventCode: string): Promise<{ ok: boolean; message: string }> {
    try {
      const result = await firstValueFrom(this.judgeTokensApi.finalizeJudgeToken(judgeToken, eventCode));
      this.judgeAccess.set({
        status: result.status === 'used' ? 'used' : 'valid',
        message: result.message,
      });
      this.myVotes.set(result.votes ?? result.code?.votes ?? this.myVotes());
      const message = result.message || 'Codice bloccato';
      return { ok: true, message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore nel blocco del codice';
      this.toast.error(msg);
      return { ok: false, message: msg };
    }
  }

  async closeVoting(authToken: string): Promise<void> {
    const ev = this.event();
    if (!ev) return;
    try {
      const updated = await firstValueFrom(this.eventsApi.updateEventVotingState(ev.id, true, authToken));
      this.event.update((prev) => (prev ? { ...prev, votingClosed: updated.votingClosed } : prev));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore nella chiusura del televoto';
      this.toast.error(msg);
    }
  }

  clearVoteDebounceTimers(): void {
    for (const timer of this.voteDebounceTimers.values()) {
      clearTimeout(timer);
    }
    this.voteDebounceTimers.clear();
  }
}
