import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PartialRankingEntry, PartialRankings, RankingsApi } from '../../api/rankings.api';
import { formatScore } from '../../shared/format-score.util';
import { pluralize } from '../../shared/pluralize.util';

function getMedalEmoji(position: number): string {
  if (position === 1) return '\u{1F947}';
  if (position === 2) return '\u{1F948}';
  if (position === 3) return '\u{1F949}';
  return '  ';
}

interface RankingColumn {
  title: string;
  entries: PartialRankingEntry[];
  scoreLabel: string;
  scoreKey: 'avgQualificata' | 'avgPopolare' | 'finalScore';
  voteCountKey: 'qualifiedVoteCount' | 'popularVoteCount' | 'totalVoteCount';
  emptyMessage: string;
  /** C7 — footnote explaining a score that looks off without context (e.g. "Media qualificata: 0.67"). */
  note?: string;
}

@Component({
  selector: 'app-partial-rankings-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './partial-rankings-panel.html',
})
export class PartialRankingsPanelComponent {
  private readonly rankingsApi = inject(RankingsApi);

  readonly eventId = input.required<string>();
  readonly authToken = input.required<string>();

  protected readonly rankings = signal<PartialRankings | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly getMedalEmoji = getMedalEmoji;
  protected readonly formatScore = formatScore;
  protected readonly pluralize = pluralize;

  constructor() {
    effect(() => {
      void this.loadRankings(this.eventId(), this.authToken());
    });
  }

  /**
   * Public so the hosting `VotingProgressDashboardComponent` can drive it from the
   * single consolidated "Aggiorna" control and from the shared SSE-stream refresh.
   */
  async loadRankings(eventId?: string, authToken?: string): Promise<void> {
    const id = eventId ?? this.eventId();
    const token = authToken ?? this.authToken();
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.rankingsApi.fetchPartialRankings(id, token));
      this.rankings.set(data);
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore');
    } finally {
      this.loading.set(false);
    }
  }

  protected columns(): RankingColumn[] {
    const r = this.rankings();
    if (!r) return [];
    const eligible = r.eligibleQualifiedJudges;
    return [
      {
        title: 'Giuria',
        entries: r.qualified,
        scoreLabel: 'Media',
        scoreKey: 'avgQualificata',
        voteCountKey: 'qualifiedVoteCount',
        emptyMessage: 'Nessun voto di giuria registrato.',
        note: `Media su ${eligible} ${pluralize(eligible, 'giurato eleggibile', 'giurati eleggibili')} — le mancate votazioni contano come astensione.`,
      },
      {
        title: 'Televoto',
        entries: r.popular,
        scoreLabel: 'Media',
        scoreKey: 'avgPopolare',
        voteCountKey: 'popularVoteCount',
        emptyMessage: 'Nessun voto del pubblico registrato.',
      },
      {
        title: 'Classifica Ponderata',
        entries: r.weighted,
        scoreLabel: 'Punteggio',
        scoreKey: 'finalScore',
        voteCountKey: 'totalVoteCount',
        emptyMessage: 'Nessun voto registrato.',
      },
    ];
  }

  protected scoreOf(entry: PartialRankingEntry, key: RankingColumn['scoreKey']): number {
    return entry[key];
  }

  protected voteCountOf(entry: PartialRankingEntry, key: RankingColumn['voteCountKey']): number {
    return entry[key];
  }
}
