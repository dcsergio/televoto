import { RankingEntry } from '../../api/rankings.api';

function escapeCsvField(value: string | number): string {
  const text = String(value);
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function rankingsToCsv(entries: RankingEntry[]): string {
  const header = ['Posizione', 'Numero', 'Nome', 'Punteggio', 'Voti Qualificata', 'Voti Popolare'];
  const rows = entries.map((entry, index) => [
    index + 1,
    entry.number,
    entry.name,
    entry.finalScore.toFixed(3),
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
  if (showWinner && index === 0) return 'Vincitore';
  if (index === 0) return 'Finalista 1';
  return 'Finalista 2';
}
