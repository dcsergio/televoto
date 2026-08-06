import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CandidateData } from '../../models/types';
import { CandidateCardComponent } from '../candidate-card/candidate-card';

@Component({
  selector: 'app-candidate-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CandidateCardComponent],
  template: `
    <div class="flex flex-col gap-3">
      @for (candidate of candidates(); track candidate.id; let i = $index) {
        <app-candidate-card
          [candidate]="candidate"
          [selected]="candidate.id === selectedId()"
          [votedScore]="votedMap()[candidate.id] ?? null"
          [voteEnabled]="voteEnabled()"
          [voteMode]="voteMode()"
          [submitting]="submitting()"
          [delay]="i * 60"
          (pick)="pick.emit($event)"
          (vote)="vote.emit($event)"
        />
      }
    </div>
  `,
})
export class CandidateListComponent {
  readonly candidates = input.required<CandidateData[]>();
  readonly selectedId = input<string | null>(null);
  readonly votedMap = input<Record<string, number | undefined>>({});
  readonly voteEnabled = input(false);
  readonly voteMode = input<'NUMERIC' | 'SINGLE'>('NUMERIC');
  readonly submitting = input(false);

  readonly pick = output<string>();
  readonly vote = output<{ candidateId: string; score: number }>();
}
