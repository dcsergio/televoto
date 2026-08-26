import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { VotingApi, VotingProgress, VotingProgressJudge } from '../../api/voting.api';
import { PartialRankingsPanelComponent } from '../partial-rankings-panel/partial-rankings-panel';
import {
  getJudgeTokenStatusClass as getStatusClass,
  getJudgeTokenStatusLabel as getStatusLabel,
} from '../../shared/judge-token-status.util';

const POLL_MS = 10000;

@Component({
  selector: 'app-voting-progress-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, PartialRankingsPanelComponent],
  templateUrl: './voting-progress-dashboard.html',
})
export class VotingProgressDashboardComponent {
  private readonly votingApi = inject(VotingApi);

  readonly eventId = input.required<string>();
  readonly votingClosed = input.required<boolean>();
  readonly authToken = input.required<string>();

  protected readonly progress = signal<VotingProgress | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly getStatusLabel = getStatusLabel;
  protected readonly getStatusClass = getStatusClass;

  private pollId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      void this.loadProgress(this.eventId(), this.authToken());
    });

    effect(() => {
      const closed = this.votingClosed();
      if (this.pollId !== null) {
        clearInterval(this.pollId);
        this.pollId = null;
      }
      if (!closed) {
        this.pollId = setInterval(() => void this.loadProgress(), POLL_MS);
      }
    });
  }

  protected joinNames(candidates: Array<{ name: string }>): string {
    return candidates.map((c) => c.name).join(', ');
  }

  protected activeIncompleteJudges(): VotingProgressJudge[] {
    return (this.progress()?.judges ?? []).filter(
      (judge) => judge.status === 'active' && judge.votesCast < judge.votesRequired,
    );
  }

  protected async loadProgress(eventId?: string, authToken?: string): Promise<void> {
    const id = eventId ?? this.eventId();
    const token = authToken ?? this.authToken();
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.votingApi.fetchVotingProgress(id, token));
      this.progress.set(data);
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore');
    } finally {
      this.loading.set(false);
    }
  }
}
