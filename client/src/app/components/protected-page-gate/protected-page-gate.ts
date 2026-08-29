import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-protected-page-gate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="relative isolate flex min-h-dvh items-center justify-center px-4">
      <img
        src="/placeholders/auth-gate-backdrop_1920x1200.svg"
        alt=""
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-45"
      />
      <div class="glass w-full max-w-md p-7 sm:p-8">
        <svg width="28" height="28" viewBox="0 0 30 30" class="mb-5" aria-hidden="true">
          <rect x="3" y="3" width="6" height="24" rx="2.5" fill="var(--color-accent-cyan)" />
          <rect x="12" y="9" width="6" height="18" rx="2.5" fill="var(--color-accent-cyan)" opacity="0.62" />
          <rect x="21" y="15" width="6" height="12" rx="2.5" fill="var(--color-accent-cyan)" opacity="0.36" />
        </svg>
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
            class="field-input"
          />

          @if (error()) {
            <p class="text-sm text-accent-coral">{{ error() }}</p>
          }

          <div class="flex gap-3 pt-1">
            <button type="submit" class="btn btn-primary flex-1">Accedi</button>
            <button type="button" (click)="cancel.emit()" class="btn btn-ghost">Annulla</button>
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
