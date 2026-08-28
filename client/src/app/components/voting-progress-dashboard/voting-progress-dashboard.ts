import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { Subject, debounceTime, firstValueFrom } from 'rxjs';
import { VotingApi, VotingProgress, VotingProgressJudge } from '../../api/voting.api';
import { JudgeTokensApi } from '../../api/judge-tokens.api';
import { JudgeTokenStreamService } from '../../api/judge-token-stream.service';
import { PartialRankingsPanelComponent } from '../partial-rankings-panel/partial-rankings-panel';
import {
  getJudgeTokenStatusClass as getStatusClass,
  getJudgeTokenStatusLabel as getStatusLabel,
} from '../../shared/judge-token-status.util';
import { pluralize } from '../../shared/pluralize.util';

// The judge-token SSE stream only emits on token lifecycle events (generate /
// revoke / reissue / finalize / event start) — NOT on every cast vote — so
// polling stays the primary mechanism for live vote tallies. Faster while voting
// is open; slower (but never stopped) once closed, since rankings/finalization
// state still settle after close.
const POLL_OPEN_MS = 5000;
const POLL_CLOSED_MS = 20000;
// Cadence for refreshing the "aggiornato Ns fa" label.
const TICK_MS = 5000;
// Trailing debounce so a burst of stream emissions triggers a single re-fetch.
const REFRESH_DEBOUNCE_MS = 700;

@Component({
  selector: 'app-voting-progress-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, PartialRankingsPanelComponent],
  templateUrl: './voting-progress-dashboard.html',
})
export class VotingProgressDashboardComponent {
  private readonly votingApi = inject(VotingApi);
  private readonly judgeTokensApi = inject(JudgeTokensApi);
  private readonly stream = inject(JudgeTokenStreamService);
  private readonly destroyRef = inject(DestroyRef);

  readonly eventId = input.required<string>();
  readonly votingClosed = input.required<boolean>();
  readonly authToken = input.required<string>();

  protected readonly progress = signal<VotingProgress | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly streamConnected = signal(false);
  protected readonly getStatusLabel = getStatusLabel;
  protected readonly getStatusClass = getStatusClass;
  protected readonly pluralize = pluralize;

  private readonly rankingsPanel = viewChild(PartialRankingsPanelComponent);

  private readonly lastUpdated = signal<number | null>(null);
  private readonly nowTick = signal(Date.now());
  protected readonly lastUpdatedLabel = computed(() => {
    this.nowTick();
    const at = this.lastUpdated();
    if (at === null) return null;
    const secs = Math.max(0, Math.round((Date.now() - at) / 1000));
    if (secs < 5) return 'aggiornato ora';
    if (secs < 60) return `aggiornato ${secs}s fa`;
    return `aggiornato ${Math.floor(secs / 60)}m fa`;
  });

  private readonly refresh$ = new Subject<void>();

  constructor() {
    // Initial load + reload when the event/credentials change.
    effect(() => {
      void this.loadProgress(this.eventId(), this.authToken());
    });

    // Live updates: every judge-token / voting-progress stream emission triggers
    // a trailing-debounced re-fetch of both this dashboard and the hosted
    // partial-rankings panel.
    effect((onCleanup) => {
      const url = this.judgeTokensApi.buildJudgeTokenStreamUrl(this.eventId(), this.authToken());
      const subscription = this.stream.connect(url).subscribe({
        next: () => {
          this.streamConnected.set(true);
          this.refresh$.next();
        },
      });
      onCleanup(() => {
        this.streamConnected.set(false);
        subscription.unsubscribe();
      });
    });

    this.refresh$.pipe(debounceTime(REFRESH_DEBOUNCE_MS), takeUntilDestroyed()).subscribe(() => {
      void this.refreshAll();
    });

    // Poll while mounted, re-armed at a different cadence when voting opens/closes.
    effect((onCleanup) => {
      const interval = this.votingClosed() ? POLL_CLOSED_MS : POLL_OPEN_MS;
      const pollId = setInterval(() => void this.refreshAll(), interval);
      onCleanup(() => clearInterval(pollId));
    });

    const tickId = setInterval(() => this.nowTick.set(Date.now()), TICK_MS);
    this.destroyRef.onDestroy(() => clearInterval(tickId));
  }

  protected joinNames(candidates: Array<{ name: string }>): string {
    return candidates.map((c) => c.name).join(', ');
  }

  protected activeIncompleteJudges(): VotingProgressJudge[] {
    return (this.progress()?.judges ?? []).filter(
      (judge) => judge.status === 'active' && judge.votesCast < judge.votesRequired,
    );
  }

  /** Single manual refresh for the whole backstage screen (progress + partial rankings). */
  protected async refreshAll(): Promise<void> {
    await Promise.all([
      this.loadProgress(),
      this.rankingsPanel()?.loadRankings() ?? Promise.resolve(),
    ]);
  }

  protected async loadProgress(eventId?: string, authToken?: string): Promise<void> {
    const id = eventId ?? this.eventId();
    const token = authToken ?? this.authToken();
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.votingApi.fetchVotingProgress(id, token));
      this.progress.set(data);
      this.error.set(null);
      this.lastUpdated.set(Date.now());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore');
    } finally {
      this.loading.set(false);
    }
  }
}
