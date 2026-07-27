import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../shared/toast.service';

const EVENT_CODE_REGEX = /^\d{1,5}$/;

@Component({
  selector: 'app-event-code-gate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="flex min-h-dvh items-center justify-center bg-bg-primary px-4">
      <div class="w-full max-w-xl rounded-3xl border border-border-glass bg-slate-900/80 p-6 shadow-2xl">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-accent-cyan">Codice evento</p>
        <h2 class="mt-2 text-2xl font-bold text-text-primary">Inserisci il codice evento</h2>
        <p class="mt-3 text-sm text-text-secondary">
          Per accedere al televoto o alla classifica devi indicare un codice evento valido.
        </p>
        <form class="mt-5 flex flex-col gap-3 sm:flex-row" (ngSubmit)="handleSubmit()">
          <input
            type="text"
            [(ngModel)]="codeInput"
            name="eventCode"
            placeholder="Es. 00001"
            class="flex-1 rounded-2xl border border-border-glass bg-slate-800 px-4 py-2 text-text-primary outline-none ring-0"
          />
          <button
            type="submit"
            class="rounded-2xl bg-accent-cyan px-4 py-2 font-semibold text-slate-900 transition hover:opacity-90"
          >
            Entra
          </button>
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
