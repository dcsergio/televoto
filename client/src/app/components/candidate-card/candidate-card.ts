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
      class="w-full animate-fade-in-up rounded-2xl transition-all duration-300 btn-tactile"
      [ngClass]="containerClasses()"
      [style.animation-delay.ms]="delay()"
    >
      <button
        type="button"
        (click)="pick.emit(candidate().id)"
        class="w-full flex items-center gap-3 md:gap-4 p-3.5 md:p-4 text-left touch-manipulation"
      >
        <div
          class="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center flex-shrink-0"
          [style.background-color]="candidate().color + '20'"
          [style.border-left]="'3px solid ' + candidate().color"
        >
          <svg width="48" height="48" viewBox="0 0 48 48">
            @switch (shapeIndex()) {
              @case (0) {
                <circle cx="24" cy="24" r="14" [attr.fill]="candidate().color" opacity="0.9" />
              }
              @case (1) {
                <polygon points="24,10 38,38 10,38" [attr.fill]="candidate().color" opacity="0.9" />
              }
              @case (2) {
                <rect x="12" y="12" width="24" height="24" rx="4" [attr.fill]="candidate().color" opacity="0.9" />
              }
              @case (3) {
                <polygon points="24,8 40,24 24,40 8,24" [attr.fill]="candidate().color" opacity="0.9" />
              }
              @case (4) {
                <polygon points="24,8 38,18 34,36 14,36 10,18" [attr.fill]="candidate().color" opacity="0.9" />
              }
              @default {
                <circle cx="20" cy="20" r="12" [attr.fill]="candidate().color" opacity="0.7" />
                <circle cx="28" cy="28" r="12" [attr.fill]="candidate().color" opacity="0.5" />
              }
            }
          </svg>
        </div>

        <span
          class="text-2xl md:text-3xl font-black tabular-nums"
          [style.color]="candidate().color"
          [style.opacity]="isVoted() && !selected() ? 0.45 : 0.8"
        >
          {{ candidate().number.toString().padStart(2, '0') }}
        </span>

        <div class="flex-1 min-w-0">
          <p
            class="font-extrabold text-sm md:text-base uppercase tracking-wide text-text-primary truncate"
            [ngClass]="{ 'opacity-60': isVoted() && !selected() }"
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
              class="flex items-center gap-1 text-[11px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20"
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
              <span class="text-[10px] font-black text-emerald-400">&#10003;</span>
            }
          </div>
        </div>
      </button>

      @if (selected() && voteEnabled()) {
        <div class="px-4 pb-4 pt-0 animate-slide-down">
          <div
            class="relative -mt-4 rounded-3xl border border-slate-700 bg-slate-950/95 p-4 shadow-xl shadow-slate-950/30"
          >
            <div class="mb-3.5 flex items-center justify-between gap-4">
              <div>
                <p class="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-bold">Voto rapido</p>
                <p class="mt-1 text-sm font-bold text-text-primary">Seleziona un punteggio</p>
              </div>
              @if (submitting()) {
                <span class="text-xs font-semibold text-accent-cyan animate-pulse">Salvataggio...</span>
              }
            </div>
            @if (voteMode() === 'SINGLE') {
              <button
                type="button"
                [disabled]="submitting()"
                (click)="vote.emit({ candidateId: candidate().id, score: 1 })"
                class="w-full rounded-2xl bg-accent-cyan px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-slate-900 transition hover:bg-accent-cyan/90 disabled:cursor-not-allowed disabled:opacity-60"
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
      'animate-pulse-neon': selected,
      'scale-[1.01]': selected,
      'glass-voted': !selected && voted,
      'border-emerald-500/20': !selected && voted,
      glass: !selected && !voted,
      'hover:bg-bg-card-hover': !selected && !voted,
    };
  });

  protected readonly statusDotClasses = computed(() => {
    const selected = this.selected();
    const voted = this.isVoted();
    return {
      'border-accent-cyan': selected,
      'bg-accent-cyan/20': selected,
      'border-emerald-500': !selected && voted,
      'bg-emerald-500/25': !selected && voted,
      'border-text-muted/40': !selected && !voted,
    };
  });
}
