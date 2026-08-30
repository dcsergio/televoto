import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { EventsApi } from '../../api/events.api';
import { CandidateData } from '../../models/types';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog';
import { ToastService } from '../../shared/toast.service';
import { openScoreGuarded } from '../../shared/open-score.util';

export interface VotingStateChange {
  votingClosed: boolean;
  candidates?: CandidateData[];
}

/**
 * Start voting / close televoto / reset ranking controls for a single event.
 * Input/output-driven (no app-level state injected) so it can be hosted by
 * both the root admin and event-manager-only shells, matching
 * JudgeCodeManagerComponent/VotingProgressDashboardComponent.
 */
@Component({
  selector: 'app-event-lifecycle-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  templateUrl: './event-lifecycle-controls.html',
  host: { '(document:keydown.alt.v)': 'onHotkey($event)' },
})
export class EventLifecycleControlsComponent {
  private readonly eventsApi = inject(EventsApi);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly eventId = input.required<string>();
  readonly eventCode = input.required<string>();
  readonly eventName = input<string>('');
  readonly authToken = input.required<string>();
  readonly votingClosed = input.required<boolean>();

  readonly votingStateChange = output<VotingStateChange>();

  protected readonly error = signal<string | null>(null);
  protected readonly primaryActionLabel = computed(() => (this.votingClosed() ? 'Avvia votazione' : 'Chiudi televoto'));

  protected confirmPrimaryAction(): void {
    if (this.votingClosed()) {
      this.confirmStartVoting();
    } else {
      this.confirmCloseTelevote();
    }
  }

  /**
   * Alt+V toggles the primary Avvia/Chiudi action (via its confirm dialog).
   * Ignored while a dialog is already open or focus sits in a form control,
   * so it never fires mid-typing or stacks a second confirm.
   */
  protected onHotkey(event: Event): void {
    const dialogOpen = document.querySelector('.cdk-overlay-container .mat-mdc-dialog-container') !== null;
    const tag = document.activeElement?.tagName ?? '';
    if (dialogOpen || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    event.preventDefault();
    this.confirmPrimaryAction();
  }

  protected handleOpenScore(): void {
    openScoreGuarded(this.dialog, this.eventCode(), this.votingClosed());
  }

  private confirmStartVoting(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Avvia votazione',
        message:
          'Tutti i voti già espressi saranno cancellati definitivamente e i candidati verranno rinumerati progressivamente. Il televoto verrà riaperto.',
        detail: this.eventName() ? `Evento: ${this.eventName()}` : undefined,
        confirmLabel: 'Sì, azzera e avvia',
        confirmVariant: 'danger',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) void this.startVoting();
    });
  }

  private async startVoting(): Promise<void> {
    try {
      const result = await firstValueFrom(this.eventsApi.startEvent(this.eventId(), this.authToken()));
      this.votingStateChange.emit({ votingClosed: result.votingClosed, candidates: result.candidates });
      this.error.set(null);
      this.toast.success('Votazione avviata');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Errore nell'avvio della votazione");
    }
  }

  private confirmCloseTelevote(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Chiudi televoto',
        message: 'Vuoi chiudere il televoto? I voti non saranno più accettati e le modifiche torneranno disponibili.',
        confirmLabel: 'Chiudi',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) void this.closeTelevote();
    });
  }

  private async closeTelevote(): Promise<void> {
    try {
      const result = await firstValueFrom(this.eventsApi.updateEventVotingState(this.eventId(), true, this.authToken()));
      this.votingStateChange.emit({ votingClosed: result.votingClosed });
      this.error.set(null);
      this.toast.success('Televoto chiuso');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore nella chiusura del televoto');
    }
  }

  protected confirmResetRanking(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Azzera classifica',
        message:
          'Tutti i voti saranno cancellati definitivamente e si ricomincia da capo. I codici giudice non revocati torneranno attivi (lo stesso codice resta valido).',
        detail: this.eventName() ? `Evento: ${this.eventName()}` : undefined,
        confirmLabel: 'Sì, azzera i voti',
        confirmVariant: 'danger',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) void this.resetRanking();
    });
  }

  private async resetRanking(): Promise<void> {
    try {
      await firstValueFrom(this.eventsApi.resetEventVotes(this.eventId(), this.authToken()));
      this.error.set(null);
      this.toast.success('Classifica azzerata, codici giudice riattivati');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Errore nell'azzeramento della classifica");
    }
  }
}
