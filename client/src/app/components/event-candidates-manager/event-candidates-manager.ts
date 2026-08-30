import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { CandidatesApi } from '../../api/candidates.api';
import { CandidateData } from '../../models/types';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog';
import { ToastService } from '../../shared/toast.service';
import { CANDIDATE_COLOR_PALETTE, getNextCandidateNumber, getRandomColor } from './event-candidates-manager.util';

interface EditDraft {
  name: string;
  subtitle: string;
  color: string;
}

/**
 * Self-contained candidates CRUD panel for a single event. Parameterized by
 * eventId/authToken/votingClosed (not read from app-level state) so it can be
 * hosted by both the root admin and event-manager-only shells - same pattern
 * as JudgeCodeManagerComponent/VotingProgressDashboardComponent.
 */
@Component({
  selector: 'app-event-candidates-manager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule],
  templateUrl: './event-candidates-manager.html',
})
export class EventCandidatesManagerComponent {
  private readonly candidatesApi = inject(CandidatesApi);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly eventId = input.required<string>();
  readonly authToken = input.required<string>();
  readonly votingClosed = input.required<boolean>();

  protected readonly candidates = signal<CandidateData[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editing = signal<string | null>(null);
  protected readonly editDraft = signal<EditDraft | null>(null);
  protected readonly newCandidate = signal({ name: '', subtitle: '', color: getRandomColor() });

  /** C6 — two clear states only: «Automatico» (preview of the next colour) or «Scegli colore» (palette / picker). */
  protected readonly colorMode = signal<'auto' | 'custom'>('auto');

  protected readonly candidateColorPalette = CANDIDATE_COLOR_PALETTE;
  protected readonly modificationsLocked = computed(() => !this.votingClosed());
  protected readonly modificationLockMessage = 'Disponibile solo a televoto chiuso';
  protected readonly currentStatus = computed(() => (this.votingClosed() ? 'Televoto chiuso' : 'Televoto aperto'));

  private lastKey: string | null = null;

  constructor() {
    effect(() => {
      const key = `${this.eventId()}:${this.authToken()}`;
      if (key === this.lastKey) return;
      this.lastKey = key;
      void this.loadCandidates();
    });
  }

  private async loadCandidates(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.candidatesApi.fetchCandidates(this.eventId(), this.authToken()));
      this.candidates.set(data);
      this.newCandidate.set({ name: '', subtitle: '', color: getRandomColor() });
      this.colorMode.set('auto');
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore');
    } finally {
      this.loading.set(false);
    }
  }

  protected regenerateNewCandidateColor(): void {
    this.newCandidate.update((prev) => ({ ...prev, color: getRandomColor() }));
  }

  protected setColorMode(mode: 'auto' | 'custom'): void {
    this.colorMode.set(mode);
    if (mode === 'auto') {
      this.regenerateNewCandidateColor();
    }
  }

  protected pickCandidateColor(color: string): void {
    this.newCandidate.update((prev) => ({ ...prev, color }));
  }

  protected startEditingCandidate(candidate: CandidateData): void {
    this.editing.set(candidate.id);
    this.editDraft.set({ name: candidate.name, subtitle: candidate.subtitle ?? '', color: candidate.color });
    this.error.set(null);
  }

  protected cancelEditingCandidate(): void {
    this.editing.set(null);
    this.editDraft.set(null);
  }

  protected async saveEditingCandidate(id: string): Promise<void> {
    const draft = this.editDraft();
    if (!draft) return;
    try {
      const updated = await firstValueFrom(
        this.candidatesApi.updateCandidate(
          id,
          { name: draft.name, subtitle: draft.subtitle || null, color: draft.color },
          this.authToken(),
        ),
      );
      this.candidates.update((prev) => prev.map((c) => (c.id === id ? updated : c)));
      this.editing.set(null);
      this.editDraft.set(null);
      this.error.set(null);
      this.toast.success('Candidato aggiornato');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore');
    }
  }

  protected async handleAddCandidate(): Promise<void> {
    const draft = this.newCandidate();
    if (!draft.name) {
      this.error.set('Il nome del candidato è obbligatorio');
      return;
    }
    try {
      const nextNumber = getNextCandidateNumber(this.candidates());
      const candidate = await firstValueFrom(
        this.candidatesApi.addCandidate(
          this.eventId(),
          nextNumber,
          draft.name,
          this.authToken(),
          draft.subtitle || undefined,
          draft.color,
        ),
      );
      this.candidates.update((prev) => [...prev, candidate].sort((a, b) => a.number - b.number));
      this.newCandidate.set({ name: '', subtitle: '', color: getRandomColor() });
      this.colorMode.set('auto');
      this.error.set(null);
      this.toast.success('Candidato aggiunto');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore');
    }
  }

  protected confirmDeleteCandidate(id: string): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Elimina candidato', message: 'Sei sicuro di voler eliminare questo candidato?', confirmLabel: 'Elimina' },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) void this.deleteCandidate(id);
    });
  }

  private async deleteCandidate(id: string): Promise<void> {
    try {
      await firstValueFrom(this.candidatesApi.deleteCandidate(id, this.authToken()));
      const remaining = this.candidates().filter((c) => c.id !== id);
      const ordered = [...remaining].sort((a, b) => a.number - b.number);
      const renumbered = ordered.map((c, index) => ({ ...c, number: index + 1 }));
      this.candidates.set(renumbered);
      this.newCandidate.set({ name: '', subtitle: '', color: getRandomColor() });
      this.colorMode.set('auto');
      this.error.set(null);
      this.toast.success('Candidato eliminato');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore');
    }
  }
}
