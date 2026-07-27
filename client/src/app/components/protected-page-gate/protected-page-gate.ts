import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-protected-page-gate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="flex min-h-dvh items-center justify-center bg-bg-primary px-4">
      <div class="w-full max-w-md rounded-2xl border border-border-glass bg-slate-900/80 p-6 shadow-2xl">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-accent-cyan">Area protetta</p>
        <h2 class="mt-2 text-2xl font-bold text-text-primary">{{ pageLabel() }}</h2>
        <p class="mt-3 text-sm text-text-secondary">{{ passwordPrompt() }}</p>

        <form class="mt-6 space-y-3" (ngSubmit)="handleSubmit()">
          <input
            type="password"
            autofocus
            [(ngModel)]="password"
            name="password"
            [placeholder]="passwordPlaceholder()"
            class="w-full rounded-lg border border-border-glass bg-slate-800 px-3 py-2 text-text-primary outline-none ring-0"
          />

          @if (error()) {
            <p class="text-sm text-red-400">{{ error() }}</p>
          }

          <div class="flex gap-3">
            <button
              type="submit"
              class="flex-1 rounded-lg bg-accent-cyan px-4 py-2 font-semibold text-slate-900 transition hover:opacity-90"
            >
              Accedi
            </button>
            <button
              type="button"
              (click)="cancel.emit()"
              class="rounded-lg border border-border-glass px-4 py-2 font-semibold text-text-secondary transition hover:bg-slate-800"
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class ProtectedPageGateComponent {
  readonly pageLabel = input.required<string>();
  readonly passwordPrompt = input.required<string>();
  readonly passwordPlaceholder = input.required<string>();
  readonly error = input<string | null>(null);

  readonly submitPassword = output<string>();
  readonly cancel = output<void>();

  protected password = '';

  protected handleSubmit(): void {
    this.submitPassword.emit(this.password);
  }
}
