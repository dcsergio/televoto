import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

const EVENT_CODE_REGEX = /^\d{1,5}$/;

@Component({
  selector: 'app-event-code-gate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="flex min-h-dvh items-center justify-center px-4">
      <div class="glass w-full max-w-xl p-7 sm:p-8">
        <p class="text-xs font-semibold uppercase tracking-[0.28em] text-accent-cyan">Codice evento</p>
        <h2 class="gradient-title mt-3 text-3xl font-bold uppercase leading-[0.98] sm:text-4xl">
          Inserisci il codice
        </h2>
        <p class="mt-3 max-w-[48ch] text-sm text-text-secondary text-pretty">
          Per accedere al televoto o alla classifica devi indicare un codice evento valido.
        </p>
        <form class="mt-6 flex flex-col gap-3 sm:flex-row" (ngSubmit)="handleSubmit()">
          <input
            type="text"
            inputmode="numeric"
            [ngModel]="codeInput()"
            (ngModelChange)="codeInput.set($event)"
            name="eventCode"
            placeholder="Es. 00001"
            class="field-input flex-1 font-display tabular-nums tracking-[0.1em]"
          />
          <button type="submit" class="btn btn-primary">Entra</button>
        </form>
        @if (displayError()) {
          <p class="mt-3 text-sm text-amber-300">{{ displayError() }}</p>
        }
      </div>
    </div>
  `,
})
export class EventCodeGateComponent {
  /** Parent-supplied error (e.g. an event code that failed to load). */
  readonly error = input<string | null>(null);
  /** Pre-fills the input so a user can correct a single wrong digit. */
  readonly initialCode = input<string>('');

  readonly submitCode = output<string>();

  protected readonly codeInput = signal('');
  private readonly localError = signal<string | null>(null);
  protected readonly displayError = computed(() => this.localError() ?? this.error());

  constructor() {
    effect(() => {
      const initial = this.initialCode();
      if (initial && !this.codeInput()) {
        this.codeInput.set(initial);
      }
    });
  }

  protected handleSubmit(): void {
    const trimmed = this.codeInput().trim();
    if (!EVENT_CODE_REGEX.test(trimmed)) {
      this.localError.set('Inserisci un codice evento valido (1-5 cifre).');
      return;
    }
    this.localError.set(null);
    this.submitCode.emit(trimmed);
  }
}
