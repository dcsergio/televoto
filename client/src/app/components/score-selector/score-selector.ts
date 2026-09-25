import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-score-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <div class="grid grid-cols-5 gap-2.5 md:grid-cols-10 md:gap-3 w-full">
        @for (score of scores; track score) {
          <button
            type="button"
            (click)="change.emit(score)"
            class="score-btn"
            [class.active]="value() === score"
            [style.background]="value() === score ? 'var(--color-twilight-plum)' : fillFor(score)"
            [style.color]="value() === score ? 'var(--color-bone)' : textFor(score)"
          >
            {{ score }}
          </button>
        }
      </div>
      <div class="flex justify-between mt-2.5 px-0.5">
        <span class="text-[10px] uppercase tracking-[0.015em] text-text-muted font-semibold">Minimo</span>
        <span class="text-[10px] uppercase tracking-[0.015em] text-text-muted font-semibold">Massimo</span>
      </div>
    </div>
  `,
})
export class ScoreSelectorComponent {
  readonly value = input<number | null>(null);
  readonly change = output<number>();

  protected readonly scores = Array.from({ length: 10 }, (_, i) => i + 1);

  /** Carbon Iris warming toward Twilight Plum — the row reads as a meter that fills toward 10. */
  protected fillFor(score: number): string {
    const pct = Math.round(10 + (score / 10) * 45);
    return `color-mix(in srgb, var(--color-twilight-plum) ${pct}%, var(--color-carbon-iris))`;
  }

  protected textFor(score: number): string {
    return score >= 6 ? 'var(--color-bone)' : 'var(--color-ash)';
  }
}
