import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel: string;
  hideCancel?: boolean;
  /**
   * `danger` paints the confirm button as destructive (`.btn-danger`) and
   * prefixes the title with a warning-icon chip — for actions that delete
   * data irreversibly (start voting = full vote wipe, revoke, reset).
   * Defaults to `primary`.
   */
  confirmVariant?: 'primary' | 'danger';
  /** Optional extra line rendered under the message, e.g. the event name in bold. */
  detail?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatIconModule],
  template: `
    <div class="surface-card bg-bg-secondary p-6 shadow-lift">
      <div class="flex items-start gap-3">
        @if (data.confirmVariant === 'danger') {
          <span
            class="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
            style="background: color-mix(in srgb, var(--color-signal-danger) 15%, transparent); color: var(--color-signal-danger)"
          >
            <mat-icon aria-hidden="true">warning</mat-icon>
          </span>
        }
        <div class="min-w-0">
          <h2 class="text-xl font-semibold text-text-primary">{{ data.title }}</h2>
          <p class="mt-3 text-sm text-text-secondary">{{ data.message }}</p>
          @if (data.detail) {
            <p class="mt-2 text-sm font-semibold text-text-primary">{{ data.detail }}</p>
          }
        </div>
      </div>
      <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        @if (!data.hideCancel) {
          <button type="button" (click)="dialogRef.close(false)" class="btn btn-ghost">Annulla</button>
        }
        <button
          type="button"
          (click)="dialogRef.close(true)"
          [class]="data.confirmVariant === 'danger' ? 'btn btn-danger' : 'btn btn-primary'"
        >
          {{ data.confirmLabel }}
        </button>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  protected readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent, boolean>);
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
