import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../shared/toast.service';

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
            [(ngModel)]="codeInput"
            name="eventCode"
            placeholder="Es. 00001"
            class="field-input flex-1 font-display tabular-nums tracking-[0.1em]"
          />
          <button type="submit" class="btn btn-primary">Entra</button>
        </form>
      </div>
    </div>
  `,
})
export class EventCodeGateComponent {
  private readonly toast = inject(ToastService);

  readonly submitCode = output<string>();

  protected codeInput = '';

  protected handleSubmit(): void {
    const trimmed = this.codeInput.trim();
    if (!EVENT_CODE_REGEX.test(trimmed)) {
      this.toast.error('Inserisci un codice evento valido (1-5 cifre).');
      return;
    }
    this.submitCode.emit(trimmed);
  }
}
