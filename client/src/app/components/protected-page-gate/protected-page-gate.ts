import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-protected-page-gate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="flex min-h-dvh items-center justify-center px-4">
      <div class="glass w-full max-w-md p-7">
        <p class="text-xs font-semibold uppercase tracking-[0.28em] text-accent-cyan">Area protetta</p>
        <h2 class="gradient-title mt-3 text-2xl font-bold uppercase leading-[1] sm:text-3xl">{{ pageLabel() }}</h2>
        <p class="mt-3 text-sm text-text-secondary text-pretty">{{ passwordPrompt() }}</p>

        <form class="mt-6 space-y-3" (ngSubmit)="handleSubmit()">
          <input
            type="password"
            autofocus
            [(ngModel)]="password"
            name="password"
            [placeholder]="passwordPlaceholder()"
            class="w-full rounded-xl border border-border-glass bg-bg-secondary px-3.5 py-2.5 text-text-primary outline-none transition focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan"
          />

          @if (error()) {
            <p class="text-sm text-accent-coral">{{ error() }}</p>
          }

          <div class="flex gap-3 pt-1">
            <button
              type="submit"
              class="flex-1 rounded-xl bg-accent-cyan px-4 py-2.5 font-bold uppercase tracking-[0.06em] text-[#1a1206] transition hover:brightness-110 active:scale-95"
            >
              Accedi
            </button>
            <button
              type="button"
              (click)="cancel.emit()"
              class="rounded-xl border border-border-glass px-4 py-2.5 font-semibold text-text-secondary transition hover:bg-bg-card-hover"
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
