import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { EventsApi } from '../../api/events.api';
import { CandidateData } from '../../models/types';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog';

export interface VotingStateChange {
  votingClosed: boolean;
  candidates?: CandidateData[];
}

/**
 * Start race / close televoto / reset ranking controls for a single event.
 * Input/output-driven (no app-level state injected) so it can be hosted by
 * both the root admin and event-manager-only shells, matching
 * JudgeCodeManagerComponent/VotingProgressDashboardComponent.
 */
@Component({
  selector: 'app-event-lifecycle-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './event-lifecycle-controls.html',
})
export class EventLifecycleControlsComponent {
  private readonly eventsApi = inject(EventsApi);
  private readonly dialog = inject(MatDialog);

  readonly eventId = input.required<string>();
  readonly eventCode = input.required<string>();
  readonly eventName = input.required<string>();
  readonly authToken = input.required<string>();
  readonly votingClosed = input.required<boolean>();

  readonly votingStateChange = output<VotingStateChange>();

  protected readonly error = signal<string | null>(null);
  protected readonly startLabel = computed(() => (this.votingClosed() ? 'Avvia gara' : 'Televoto aperto'));
  protected readonly currentStatus = computed(() => (this.votingClosed() ? 'Televoto chiuso' : 'Televoto aperto'));

  protected handleOpenScore(): void {
    if (!this.votingClosed()) {
      this.notifyVotingStillOpen();
      return;
    }
    window.open(`/score?eventCode=${encodeURIComponent(this.eventCode())}`, '_blank', 'noopener,noreferrer');
  }

  private notifyVotingStillOpen(): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Televoto ancora aperto',
        message: 'La Classifica è accessibile solo a televoto chiuso. Chiudi il televoto per poter continuare.',
        confirmLabel: 'Ho capito',
      },
    });
  }

  protected confirmStartRace(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Avvia gara',
        message: 'Vuoi avviare la gara? I voti precedenti saranno azzerati e i candidati verranno rinumerati progressivamente.',
        confirmLabel: 'Avvia',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) void this.startRace();
    });
  }

  private async startRace(): Promise<void> {
    try {
      const result = await firstValueFrom(this.eventsApi.startEvent(this.eventId(), this.authToken()));
      this.votingStateChange.emit({ votingClosed: result.votingClosed, candidates: result.candidates });
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Errore nell'avvio della gara");
    }
  }

  protected confirmCloseTelevote(): void {
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
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore nella chiusura del televoto');
    }
  }

  protected confirmResetRanking(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Azzera classifica', message: 'Vuoi azzerare tutti i voti e ricominciare da capo?', confirmLabel: 'Azzera' },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) void this.resetRanking();
    });
  }

  private async resetRanking(): Promise<void> {
    try {
      await firstValueFrom(this.eventsApi.resetEventVotes(this.eventId(), this.authToken()));
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Errore nell'azzeramento della classifica");
    }
  }
}
