import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChildren } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../components/header/header';
import { HeroBannerComponent } from '../../components/hero-banner/hero-banner';
import { CandidateListComponent } from '../../components/candidate-list/candidate-list';
import { EventCodeGateComponent } from '../../components/event-code-gate/event-code-gate';
import { VotingStateService } from '../../state/voting-state.service';
import {
  JUDGE_TOKEN_SEGMENT_COUNT,
  JUDGE_TOKEN_SEGMENT_LENGTH,
  joinJudgeTokenSegments,
  normalizeJudgeTokenInput,
  splitJudgeTokenSegments,
} from '../../shared/judge-token.util';

const VOTING_STATE_POLL_MS = 7000;

@Component({
  selector: 'app-voting-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeaderComponent, HeroBannerComponent, CandidateListComponent, EventCodeGateComponent],
  templateUrl: './voting-shell.html',
})
export class VotingShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly votingState = inject(VotingStateService);

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly eventCode = computed(() => this.queryParamMap().get('eventCode'));
  protected readonly judgeToken = computed(() => {
    const raw = this.queryParamMap().get('judgeToken');
    if (!raw) return null;
    const normalized = normalizeJudgeTokenInput(raw);
    return normalized.length > 0 ? normalized : null;
  });
  protected readonly judgeMode = computed(() => Boolean(this.judgeToken() && this.eventCode()));

  protected readonly event = this.votingState.event;
  protected readonly myVotes = this.votingState.myVotes;
  protected readonly selectedCandidateId = this.votingState.selectedCandidateId;
  protected readonly loading = this.votingState.loading;
  protected readonly eventLoadError = this.votingState.eventLoadError;
  protected readonly submitting = this.votingState.submitting;
  protected readonly judgeAccess = this.votingState.judgeAccess;
  protected readonly voterType = this.votingState.voterType;

  protected readonly manualJudgeCodeSegments = signal<string[]>(splitJudgeTokenSegments(''));
  protected readonly judgeCodeInlineError = signal<string | null>(null);
  protected readonly judgeFinalizeOpen = signal(false);
  protected readonly finalizingJudgeToken = signal(false);

  protected readonly segmentInputs = viewChildren<ElementRef<HTMLInputElement>>('segInput');

  protected readonly isJudgeAccessRejected = computed(
    () => this.judgeMode() && (this.judgeAccess().status === 'invalid' || this.judgeAccess().status === 'revoked'),
  );
  protected readonly isJudgeVoteLocked = computed(() => this.judgeAccess().status === 'used');
  protected readonly appLoading = computed(() => this.loading() || (this.judgeMode() && this.judgeAccess().status === 'loading'));
  protected readonly judgeCodeStatusLabel = computed(() => {
    const status = this.judgeAccess().status;
    if (status === 'used') return 'Codice bloccato';
    if (status === 'valid') return 'Codice attivo';
    if (status === 'loading') return 'Verifica codice...';
    return null;
  });
  protected readonly votingClosed = computed(() => this.event()?.votingClosed ?? false);
  protected readonly turnoutLabel = computed(() => {
    const turnout = this.event()?.turnout;
    if (!turnout) return null;
    return `${turnout.qualifiedVoted + turnout.popularVoted}/${turnout.qualifiedTotal + turnout.popularTotal} giudici hanno votato`;
  });
  protected readonly canVote = computed(
    () => !this.votingClosed() && this.judgeMode() && this.judgeAccess().status === 'valid',
  );
  protected readonly judgeVotesCount = computed(() => Object.keys(this.myVotes()).length);
  protected readonly isQualifiedVoter = computed(() => this.voterType() === 'QUALIFICATA');
  protected readonly isPopularVoter = computed(() => this.voterType() === 'POPOLARE');
  protected readonly popularVoteMode = computed(() => this.event()?.popularVoteMode ?? 'NUMERIC');
  protected readonly isPreferenceVoteMode = computed(() => this.isPopularVoter() && this.popularVoteMode() === 'PREFERENCE');
  protected readonly maxPreferences = computed(() => Math.max(1, this.event()?.maxPreferences ?? 1));
  protected readonly votedCandidateNames = computed(() => {
    const ev = this.event();
    if (!ev) return [];
    const votedIds = new Set(Object.keys(this.myVotes()));
    return ev.candidates.filter((c) => votedIds.has(c.id)).map((c) => c.name);
  });
  protected readonly singleVotedCandidateName = computed(() => this.votedCandidateNames().join(', ') || null);
  protected readonly allJudgeVotesCast = computed(() => {
    const ev = this.event();
    if (!ev) return false;
    return Boolean(
      this.judgeMode() &&
        this.judgeAccess().status === 'valid' &&
        ev.candidates.length > 0 &&
        ev.candidates.every((candidate) => this.myVotes()[candidate.id] !== undefined),
    );
  });
  protected readonly canFinalizeJudge = computed(
    () =>
      this.judgeMode() &&
      this.judgeAccess().status === 'valid' &&
      !this.isJudgeVoteLocked() &&
      (this.isQualifiedVoter() || this.isPopularVoter()),
  );
  protected readonly finalizeDisabled = computed(() =>
    this.isQualifiedVoter() ? !this.allJudgeVotesCast() : this.judgeVotesCount() === 0,
  );
  protected readonly progressPercent = computed(() => {
    const ev = this.event();
    return ev && ev.candidates.length > 0 ? (this.judgeVotesCount() / ev.candidates.length) * 100 : 0;
  });
  protected readonly missingVotes = computed(() => {
    const ev = this.event();
    return ev ? Math.max(ev.candidates.length - this.judgeVotesCount(), 0) : 0;
  });

  private pollIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastValidatedKey: string | null = null;

  constructor() {
    effect(() => {
      const code = this.eventCode();
      const judge = this.judgeMode();
      void this.votingState.loadEventByCode(code, judge);
    });

    effect(() => {
      const token = this.judgeToken();
      const code = this.eventCode();
      if (!token || !code) {
        this.votingState.resetJudgeAccess();
        this.lastValidatedKey = null;
        return;
      }
      const key = `${code}:${token}`;
      if (key === this.lastValidatedKey) return;
      this.lastValidatedKey = key;
      void this.votingState.validateJudge(token, code);
    });

    effect(() => {
      const ev = this.event();
      this.stopPolling();
      if (ev && !ev.votingClosed) {
        this.pollIntervalId = setInterval(() => void this.votingState.refreshVotingState(), VOTING_STATE_POLL_MS);
      }
    });
  }

  private stopPolling(): void {
    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  protected handleEventCodeSubmit(code: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { eventCode: code },
      queryParamsHandling: 'merge',
    });
  }

  protected selectCandidate(candidateId: string): void {
    if (this.canVote()) {
      this.votingState.selectCandidate(candidateId);
    }
  }

  protected onVote(payload: { candidateId: string; score: number }): void {
    const token = this.judgeToken();
    if (!token || !this.canVote()) return;
    this.votingState.castVote(payload.candidateId, payload.score, token, this.isPreferenceVoteMode());
  }

  protected onUnvote(candidateId: string): void {
    const token = this.judgeToken();
    if (!token || !this.canVote()) return;
    this.votingState.removeVote(candidateId, token);
  }

  protected openFinalizeDialog(): void {
    this.judgeFinalizeOpen.set(true);
  }

  protected closeFinalizeDialog(): void {
    this.judgeFinalizeOpen.set(false);
  }

  protected async handleFinalizeJudgeCode(): Promise<void> {
    const token = this.judgeToken();
    const code = this.eventCode();
    if (!token || !code) return;
    this.finalizingJudgeToken.set(true);
    try {
      const result = await this.votingState.finalizeJudgeToken(token, code);
      if (result.ok) {
        this.judgeFinalizeOpen.set(false);
      }
    } finally {
      this.finalizingJudgeToken.set(false);
    }
  }

  protected handleManualJudgeCodeSubmit(): void {
    const code = joinJudgeTokenSegments(this.manualJudgeCodeSegments());
    this.judgeCodeInlineError.set(null);

    if (code.length !== JUDGE_TOKEN_SEGMENT_COUNT * JUDGE_TOKEN_SEGMENT_LENGTH) {
      this.judgeCodeInlineError.set('Inserisci un codice voto completo (16 caratteri).');
      return;
    }

    const eventCode = this.eventCode();
    if (!eventCode) {
      this.judgeCodeInlineError.set('Inserisci prima il codice evento.');
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { eventCode, judgeToken: code },
      queryParamsHandling: 'merge',
    });
  }

  protected handleManualJudgeCodeSegmentChange(index: number, rawValue: string): void {
    const normalized = normalizeJudgeTokenInput(rawValue);
    this.judgeCodeInlineError.set(null);

    if (normalized.length > JUDGE_TOKEN_SEGMENT_LENGTH) {
      this.manualJudgeCodeSegments.set(splitJudgeTokenSegments(normalized));
      const targetIndex = Math.min(
        Math.floor((normalized.length - 1) / JUDGE_TOKEN_SEGMENT_LENGTH),
        JUDGE_TOKEN_SEGMENT_COUNT - 1,
      );
      this.focusSegment(targetIndex, true);
      return;
    }

    this.manualJudgeCodeSegments.update((prev) => {
      const next = [...prev];
      next[index] = normalized.slice(0, JUDGE_TOKEN_SEGMENT_LENGTH);
      return next;
    });

    if (normalized.length === JUDGE_TOKEN_SEGMENT_LENGTH && index < JUDGE_TOKEN_SEGMENT_COUNT - 1) {
      this.focusSegment(index + 1, false);
    }
  }

  protected handleManualJudgeCodeSegmentKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.manualJudgeCodeSegments()[index] && index > 0) {
      this.focusSegment(index - 1, true);
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      this.segmentInputs()[index - 1]?.nativeElement.focus();
    }
    if (event.key === 'ArrowRight' && index < JUDGE_TOKEN_SEGMENT_COUNT - 1) {
      this.segmentInputs()[index + 1]?.nativeElement.focus();
    }
  }

  protected handleManualJudgeCodeSegmentPaste(event: ClipboardEvent): void {
    event.preventDefault();
    this.judgeCodeInlineError.set(null);
    const pasted = event.clipboardData?.getData('text') ?? '';
    this.manualJudgeCodeSegments.set(splitJudgeTokenSegments(pasted));

    const lastFilledIndex = Math.min(
      Math.max(Math.ceil(normalizeJudgeTokenInput(pasted).length / JUDGE_TOKEN_SEGMENT_LENGTH) - 1, 0),
      JUDGE_TOKEN_SEGMENT_COUNT - 1,
    );
    this.focusSegment(lastFilledIndex, true);
  }

  private focusSegment(index: number, select: boolean): void {
    const input = this.segmentInputs()[index]?.nativeElement;
    if (!input) return;
    input.focus();
    if (select) {
      input.setSelectionRange(JUDGE_TOKEN_SEGMENT_LENGTH, JUDGE_TOKEN_SEGMENT_LENGTH);
    } else {
      input.select();
    }
  }
}
