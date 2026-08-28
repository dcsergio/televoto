import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { RankingEntry, RankingsApi } from '../../api/rankings.api';
import { AuthStateService } from '../../state/auth-state.service';
import { VotingStateService } from '../../state/voting-state.service';
import { splitEventNameForDisplay } from '../../shared/event-name-display.util';
import { CountUpDirective } from '../../shared/count-up.directive';
import { formatScore } from '../../shared/format-score.util';
import { EventCodeGateComponent } from '../event-code-gate/event-code-gate';
import { ProtectedPageGateComponent } from '../protected-page-gate/protected-page-gate';
import { getButtonLabel, getFinalistLabel, getMedalEmoji, rankingsToCsv } from './score.util';

@Component({
  selector: 'app-score',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, CountUpDirective, EventCodeGateComponent, ProtectedPageGateComponent],
  templateUrl: './score.html',
})
export class ScoreComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly rankingsApi = inject(RankingsApi);
  protected readonly votingState = inject(VotingStateService);
  protected readonly authState = inject(AuthStateService);

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly eventCode = computed(() => this.queryParamMap().get('eventCode'));

  /**
   * Gating token for the Classifica: a root token is accepted here too (mirrors
   * `/manager`'s documented superuser escalation — the backend already lets a
   * root token pass every event-manager-scoped route), so a root operator who
   * opened Classifica from admin/manager enters without re-entering a password.
   * A non-root event-manager token still works as before; the backend keeps
   * enforcing `eventId`, so it grants no cross-event access.
   */
  protected readonly activeToken = computed(
    () => this.authState.rootAuthToken() ?? this.authState.eventManagerAuthToken(),
  );
  protected readonly isAuthenticated = computed(() => this.activeToken() !== null);

  protected readonly event = this.votingState.event;
  protected readonly loading = this.votingState.loading;

  protected readonly passwordError = signal('');

  protected readonly rankings = signal<RankingEntry[]>([]);
  protected readonly rankingsLoading = signal(true);
  protected readonly startingReveal = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly revealedIndices = signal<number[]>([]);
  protected readonly showFinalistsStage = signal(false);
  protected readonly showWinner = signal(false);
  protected readonly closingTelevote = signal(false);
  protected readonly presenterMode = signal(false);

  protected readonly getMedalEmoji = getMedalEmoji;
  protected readonly getFinalistLabel = getFinalistLabel;
  protected readonly formatScore = formatScore;

  protected readonly nonFinalistCount = computed(() => Math.max(this.rankings().length - 2, 0));
  protected readonly nextRevealIndex = computed(() => this.rankings().length - 1 - this.revealedIndices().length);
  protected readonly showFinalists = computed(() => this.showFinalistsStage() || this.showWinner());
  protected readonly isFinalistsStage = computed(() => this.showFinalistsStage() && !this.showWinner());
  protected readonly isAboutToRevealThirdPlace = computed(
    () => this.rankings().length > 2 && this.nextRevealIndex() === 2 && !this.showFinalistsStage() && !this.showWinner(),
  );
  protected readonly isThirdPlaceStage = computed(
    () =>
      this.rankings().length > 2 &&
      this.revealedIndices().includes(2) &&
      !this.showFinalistsStage() &&
      !this.showWinner(),
  );
  protected readonly revealStarted = computed(
    () => this.revealedIndices().length > 0 || this.showFinalistsStage() || this.showWinner(),
  );
  protected readonly finalists = computed(() => this.rankings().slice(0, 2));
  protected readonly hasTopTie = computed(() => {
    const r = this.rankings();
    return r.length > 1 && Math.abs(r[0].finalScore - r[1].finalScore) <= 0.001;
  });
  protected readonly visibleEntries = computed(() =>
    this.rankings().filter((_, index) => this.revealedIndices().includes(index)),
  );
  protected readonly revealDisabled = computed(() => {
    const r = this.rankings();
    return (
      r.length === 0 ||
      this.showWinner() ||
      this.startingReveal() ||
      (r.length < 2 && this.revealedIndices().length >= r.length)
    );
  });
  protected readonly canUndo = computed(
    () => this.showWinner() || this.showFinalistsStage() || this.revealedIndices().length > 0,
  );
  protected readonly buttonLabel = computed(() =>
    getButtonLabel({
      showWinner: this.showWinner(),
      revealedCount: this.revealedIndices().length,
      rankingsLength: this.rankings().length,
      isAboutToRevealThirdPlace: this.isAboutToRevealThirdPlace(),
      isThirdPlaceStage: this.isThirdPlaceStage(),
      isFinalistsStage: this.isFinalistsStage(),
    }),
  );
  protected readonly eventNameParts = computed(() => splitEventNameForDisplay(this.event()?.name ?? ''));
  protected readonly waitingForClose = computed(() => !!this.event() && !this.event()!.votingClosed);

  // ── Presenter-stage helpers ──
  // The most recently revealed position (lowest index = best rank so far) is the
  // headline "title card"; everything revealed before it drops into a ladder.
  protected readonly presenterHeroIndex = computed(() => {
    const revealed = this.revealedIndices();
    return revealed.length > 0 ? Math.min(...revealed) : -1;
  });
  protected readonly presenterHeroEntry = computed<RankingEntry | null>(() => {
    const index = this.presenterHeroIndex();
    return index >= 0 ? this.rankings()[index] ?? null : null;
  });
  protected readonly presenterLadderEntries = computed<RankingEntry[]>(() => {
    const heroIndex = this.presenterHeroIndex();
    const revealed = this.revealedIndices();
    return this.rankings()
      .map((entry, index) => ({ entry, index }))
      .filter(({ index }) => index !== heroIndex && revealed.includes(index))
      .sort((a, b) => b.index - a.index)
      .map(({ entry }) => entry);
  });
  protected readonly heroIsThirdPlace = computed(() => this.presenterHeroIndex() === 2);
  protected readonly runnerUp = computed<RankingEntry | null>(() => this.rankings()[1] ?? null);

  private lastRankingsEventId: string | null = null;

  constructor() {
    effect(() => {
      const code = this.eventCode();
      void this.votingState.loadEventByCode(code, false);
    });

    effect(() => {
      const ev = this.event();
      const token = this.activeToken();
      if (!ev || !token || !ev.votingClosed) return;
      if (ev.id === this.lastRankingsEventId) return;
      this.lastRankingsEventId = ev.id;
      this.revealedIndices.set([]);
      this.showFinalistsStage.set(false);
      this.showWinner.set(false);
      void this.loadRankings();
    });
  }

  @HostListener('window:keydown', ['$event'])
  protected handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.presenterMode.set(false);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined);
      }
      return;
    }

    if (this.rankings().length === 0) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      void this.handleRevealNext();
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      this.handleUndoReveal();
      return;
    }

    if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      void this.handleTogglePresenterMode();
    }
  }

  // silent = the one-off reveal-start refetch (see handleRevealNext); no full-page loading state.
  private async loadRankings(silent = false): Promise<boolean> {
    const ev = this.event();
    const token = this.activeToken();
    if (!ev || !token || !ev.votingClosed) return false;
    if (silent) {
      this.startingReveal.set(true);
    } else {
      this.rankingsLoading.set(true);
    }
    try {
      const data = await firstValueFrom(this.rankingsApi.fetchRankings(ev.id, token));
      this.rankings.set(data);
      this.error.set(null);
      return true;
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore nel caricamento');
      return false;
    } finally {
      this.rankingsLoading.set(false);
      this.startingReveal.set(false);
    }
  }

  protected handleEventCodeSubmit(code: string): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { eventCode: code }, queryParamsHandling: 'merge' });
  }

  protected async handleLoginSubmit(password: string): Promise<void> {
    const ev = this.event();
    if (!ev) {
      this.passwordError.set('Evento non disponibile');
      return;
    }
    try {
      await this.authState.loginEventManager(ev.id, password);
      this.passwordError.set('');
    } catch (err) {
      this.passwordError.set(err instanceof Error ? err.message : 'Password errata');
    }
  }

  protected handleLoginCancel(): void {
    this.router.navigate(['/']);
  }

  protected async handleRevealNext(): Promise<void> {
    if (this.rankings().length === 0 || this.showWinner() || this.startingReveal()) return;

    if (this.isFinalistsStage()) {
      this.showWinner.set(true);
      return;
    }

    if (this.rankings().length >= 2 && this.revealedIndices().length >= this.nonFinalistCount()) {
      this.showFinalistsStage.set(true);
      return;
    }

    if (this.revealedIndices().length >= this.rankings().length) return;

    if (!this.revealStarted()) {
      // Freeze point: last fetch before locking in the reveal, so nothing refetches afterwards.
      const refreshed = await this.loadRankings(true);
      if (!refreshed || this.rankings().length === 0) return;
    }

    const nextIndex = this.rankings().length - 1 - this.revealedIndices().length;
    this.revealedIndices.update((prev) => [...prev, nextIndex].sort((a, b) => a - b));
  }

  protected handleUndoReveal(): void {
    if (this.showWinner()) {
      this.showWinner.set(false);
      return;
    }
    if (this.showFinalistsStage()) {
      this.showFinalistsStage.set(false);
      return;
    }
    if (this.revealedIndices().length === 0) return;

    const lastRevealed = Math.min(...this.revealedIndices());
    this.revealedIndices.update((prev) => prev.filter((index) => index !== lastRevealed));
  }

  protected handleExportCsv(): void {
    const csv = rankingsToCsv(this.rankings());
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `classifica-${this.eventCode() ?? 'evento'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected async handleTogglePresenterMode(): Promise<void> {
    if (this.presenterMode()) {
      this.presenterMode.set(false);
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      }
      return;
    }

    this.presenterMode.set(true);
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen API non disponibile: usa solo la modalita presentazione CSS
    }
  }

  protected async handleCloseTelevote(): Promise<void> {
    const token = this.activeToken();
    if (this.event()?.votingClosed || this.closingTelevote() || !token) return;

    this.closingTelevote.set(true);
    try {
      await this.votingState.closeVoting(token);
    } finally {
      this.closingTelevote.set(false);
    }
  }

  protected finalistCardClasses(index: number): Record<string, boolean> {
    const isWinnerCard = this.showWinner() && (this.hasTopTie() || index === 0);
    return {
      'scale-[1.03]': isWinnerCard,
      'border-accent-yellow/70': isWinnerCard,
      'bg-gradient-to-b': isWinnerCard,
      'from-accent-cyan/15': isWinnerCard,
      'to-transparent': isWinnerCard,
      'animate-winner-glow': isWinnerCard,
      'border-border-glass': !isWinnerCard,
      'bg-bg-card': !isWinnerCard,
    };
  }

  protected isFinalistWinnerCard(index: number): boolean {
    return this.showWinner() && (this.hasTopTie() || index === 0);
  }

  protected entryCardClasses(entry: RankingEntry): Record<string, boolean> {
    const isThirdPlaceCard = this.isThirdPlaceStage() && this.rankingIndex(entry) === 2;
    return {
      'bg-gradient-to-b': isThirdPlaceCard,
      'from-accent-yellow/12': isThirdPlaceCard,
      'to-transparent': isThirdPlaceCard,
      'border-accent-yellow/40': isThirdPlaceCard,
      'bg-bg-card': !isThirdPlaceCard,
    };
  }

  protected rankingIndex(entry: RankingEntry): number {
    return this.rankings().findIndex((item) => item.id === entry.id);
  }

  protected barWidth(entry: RankingEntry): number {
    const top = this.rankings()[0];
    return top && top.finalScore > 0 ? (entry.finalScore / top.finalScore) * 100 : 0;
  }

  protected totalVotes(): number {
    return this.rankings().reduce((sum, r) => sum + r.voteCount, 0);
  }

  protected averageFinalScore(): number {
    const r = this.rankings();
    if (r.length === 0) return 0;
    return r.reduce((sum, entry) => sum + entry.finalScore, 0) / r.length;
  }
}
