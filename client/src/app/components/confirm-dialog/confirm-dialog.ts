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
    <div class="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
      <h2 class="text-xl font-semibold text-text-primary">{{ data.title }}</h2>
      <p class="mt-3 text-sm text-text-secondary">{{ data.message }}</p>
      <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        @if (!data.hideCancel) {
          <button
            type="button"
            (click)="dialogRef.close(false)"
            class="rounded-2xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-text-secondary hover:bg-slate-700 transition"
          >
            Annulla
          </button>
        }
        <button
          type="button"
          (click)="dialogRef.close(true)"
          class="rounded-2xl bg-accent-cyan px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-accent-cyan/90 transition"
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
