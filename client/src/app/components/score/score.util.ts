import { RankingEntry } from '../../api/rankings.api';
import { formatScore } from '../../shared/format-score.util';

function escapeCsvField(value: string | number): string {
  const text = String(value);
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function rankingsToCsv(entries: RankingEntry[]): string {
  const header = ['Posizione', 'Numero', 'Nome', 'Punteggio', 'Voti giuria', 'Voti pubblico'];
  const rows = entries.map((entry, index) => [
    index + 1,
    entry.number,
    entry.name,
    formatScore(entry.finalScore),
    entry.qualifiedVoteCount,
    entry.popularVoteCount,
  ]);
  return [header, ...rows].map((row) => row.map(escapeCsvField).join(';')).join('\r\n');
}

export function getMedalEmoji(position: number): string {
  switch (position) {
    case 0:
      return '\u{1F947}';
    case 1:
      return '\u{1F948}';
    case 2:
      return '\u{1F949}';
    default:
      return '  ';
  }
}

export function getButtonLabel(options: {
  showWinner: boolean;
  revealedCount: number;
  rankingsLength: number;
  isAboutToRevealThirdPlace: boolean;
  isThirdPlaceStage: boolean;
  isFinalistsStage: boolean;
}): string {
  const { showWinner, revealedCount, rankingsLength, isAboutToRevealThirdPlace, isThirdPlaceStage, isFinalistsStage } =
    options;
  if (showWinner) return 'Vincitore rivelato';
  if (revealedCount >= rankingsLength) return 'Sipario — classifica completa';
  if (isFinalistsStage) return 'Apri la busta';
  if (isThirdPlaceStage) return 'Vai alla finale a due';
  if (isAboutToRevealThirdPlace) return 'Proclama il terzo classificato';
  if (revealedCount === 0) return 'Si parte';
  return 'Prossimo verdetto';
}

export function getFinalistLabel(index: number, showWinner: boolean, hasTopTie: boolean): string {
  if (showWinner && hasTopTie) return 'Vincitore';
  if (showWinner) return index === 0 ? 'Vincitore' : '2º classificato';
  if (index === 0) return 'Finalista 1';
  return 'Finalista 2';
}

/**
 * Phase label for the ceremony progress indicator. Replaces the "Rivelati X/Y"
 * counter, which froze during the third-place and finale-a-due beats
 * (audit D3 / E4).
 */
export function getRevealPhaseLabel(options: {
  showWinner: boolean;
  isFinalistsStage: boolean;
  isThirdPlaceStage: boolean;
  revealedCount: number;
  heroPosition: number;
}): string {
  const { showWinner, isFinalistsStage, isThirdPlaceStage, revealedCount, heroPosition } = options;
  if (showWinner) return 'Vincitore';
  if (isFinalistsStage) return 'Finale a due';
  if (isThirdPlaceStage) return '3º posto';
  if (revealedCount > 0 && heroPosition > 0) return `${heroPosition}º posto`;
  return 'Classifica non iniziata';
}
