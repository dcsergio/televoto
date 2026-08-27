import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel: string;
  hideCancel?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule],
  template: `
    <div class="surface-card bg-bg-secondary p-6 shadow-2xl">
      <h2 class="text-xl font-semibold text-text-primary">{{ data.title }}</h2>
      <p class="mt-3 text-sm text-text-secondary">{{ data.message }}</p>
      <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        @if (!data.hideCancel) {
          <button type="button" (click)="dialogRef.close(false)" class="btn btn-ghost">Annulla</button>
        }
        <button type="button" (click)="dialogRef.close(true)" class="btn btn-primary">
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
