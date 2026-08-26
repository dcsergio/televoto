import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { CandidateData } from '../../models/types';
import { ScoreSelectorComponent } from '../score-selector/score-selector';

@Component({
  selector: 'app-candidate-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, ScoreSelectorComponent],
  template: `
    <div
      class="w-full animate-fade-in-up overflow-hidden rounded-2xl border btn-tactile transition-all duration-300"
      [ngClass]="containerClasses()"
      [style.animation-delay.ms]="delay()"
    >
      <button
        type="button"
        (click)="pick.emit(candidate().id)"
        class="relative w-full flex items-center gap-3 md:gap-4 p-3.5 md:p-4 text-left touch-manipulation"
      >
        <span class="absolute inset-y-0 left-0 w-[3px]" [style.background-color]="candidate().color"></span>

        <div
          class="w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          [style.background-color]="candidate().color + '1f'"
        >
          <svg width="44" height="44" viewBox="0 0 48 48" aria-hidden="true">
            @switch (shapeIndex()) {
              @case (0) {
                <circle cx="24" cy="24" r="13" [attr.fill]="candidate().color" opacity="0.9" />
              }
              @case (1) {
                <polygon points="24,10 38,38 10,38" [attr.fill]="candidate().color" opacity="0.9" />
              }
              @case (2) {
                <rect x="12" y="12" width="24" height="24" rx="5" [attr.fill]="candidate().color" opacity="0.9" />
              }
              @case (3) {
                <polygon points="24,8 40,24 24,40 8,24" [attr.fill]="candidate().color" opacity="0.9" />
              }
              @case (4) {
                <polygon points="24,8 38,18 34,36 14,36 10,18" [attr.fill]="candidate().color" opacity="0.9" />
              }
              @default {
                <circle cx="20" cy="20" r="11" [attr.fill]="candidate().color" opacity="0.7" />
                <circle cx="28" cy="28" r="11" [attr.fill]="candidate().color" opacity="0.5" />
              }
            }
          </svg>
        </div>

        <span
          class="font-display text-3xl md:text-4xl font-bold tabular-nums tracking-[-0.04em]"
          [style.color]="candidate().color"
          [style.opacity]="isVoted() && !selected() ? 0.4 : 0.95"
        >
          {{ candidate().number.toString().padStart(2, '0') }}
        </span>

        <div class="flex-1 min-w-0">
          <p
            class="font-semibold text-sm md:text-base uppercase tracking-[0.04em] text-text-primary truncate"
            [ngClass]="{ 'opacity-55': isVoted() && !selected() }"
          >
            {{ candidate().name }}
          </p>
          @if (candidate().subtitle) {
            <p class="text-xs md:text-sm text-text-muted truncate">{{ candidate().subtitle }}</p>
          }
        </div>

        <div class="flex items-center gap-3 flex-shrink-0">
          @if (isVoted()) {
            <span
              class="flex items-center gap-1 text-[11px] font-bold text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded-full border border-accent-cyan/25 tabular-nums"
            >
              <span class="text-xs">&#10003;</span>
              @if (voteMode() === 'SINGLE') {
                <span>Votato</span>
              } @else {
                <span>{{ votedScore() }}/10</span>
              }
            </span>
          }
          <div
            class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200"
            [ngClass]="statusDotClasses()"
          >
            @if (selected()) {
              <div class="w-2.5 h-2.5 rounded-full bg-accent-cyan"></div>
            } @else if (isVoted()) {
              <span class="text-[10px] font-bold text-accent-cyan">&#10003;</span>
            }
          </div>
        </div>
      </button>

      @if (selected() && voteEnabled()) {
        <div class="px-3.5 pb-3.5 md:px-4 md:pb-4 animate-slide-down">
          <div class="rounded-2xl border border-border-glass bg-bg-secondary p-4">
            <div class="mb-3.5 flex items-center justify-between gap-4">
              <p class="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-bold">
                Seleziona un punteggio
              </p>
              @if (submitting()) {
                <span class="text-xs font-semibold text-accent-cyan animate-pulse">Salvataggio...</span>
              }
            </div>
            @if (voteMode() === 'SINGLE') {
              <button
                type="button"
                [disabled]="submitting()"
                (click)="vote.emit({ candidateId: candidate().id, score: 1 })"
                class="w-full rounded-xl bg-accent-cyan px-4 py-3 text-sm font-bold uppercase tracking-[0.06em] text-[#1a1206] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Vota questo candidato
              </button>
            } @else {
              <app-score-selector [value]="votedScore()" (change)="vote.emit({ candidateId: candidate().id, score: $event })" />
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class CandidateCardComponent {
  readonly candidate = input.required<CandidateData>();
  readonly selected = input(false);
  readonly votedScore = input<number | null>(null);
  readonly submitting = input(false);
  readonly delay = input(0);
  readonly voteEnabled = input(false);
  readonly voteMode = input<'NUMERIC' | 'SINGLE'>('NUMERIC');

  readonly pick = output<string>();
  readonly vote = output<{ candidateId: string; score: number }>();

  protected readonly isVoted = computed(() => this.votedScore() !== null);
  protected readonly shapeIndex = computed(() => (this.candidate().number - 1) % 6);

  protected readonly containerClasses = computed(() => {
    const selected = this.selected();
    const voted = this.isVoted();
    return {
      'glass-selected': selected,
      'border-border-neon': selected,
      'scale-[1.01]': selected,
      'glass-voted': !selected && voted,
      glass: !selected && !voted,
      'border-border-glass': !selected,
      'hover:bg-bg-card-hover': !selected && !voted,
      'hover:-translate-y-0.5': !selected && !voted,
      'hover:shadow-lift': !selected && !voted,
    };
  });

  protected readonly statusDotClasses = computed(() => {
    const selected = this.selected();
    const voted = this.isVoted();
    return {
      'border-accent-cyan': selected || (!selected && voted),
      'bg-accent-cyan/20': selected,
      'bg-accent-cyan/10': !selected && voted,
      'border-text-muted/40': !selected && !voted,
    };
  });
}
