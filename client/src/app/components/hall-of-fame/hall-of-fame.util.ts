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
  if (revealedCount >= rankingsLength) return 'Classifica completa';
  if (isFinalistsStage) return 'Mostra esito finale';
  if (isThirdPlaceStage) return 'Vai alla finale a due';
  if (isAboutToRevealThirdPlace) return 'Proclama il terzo classificato';
  if (revealedCount === 0) return 'Avvia';
  return 'Mostra il prossimo posto';
}

export function getFinalistLabel(index: number, showWinner: boolean, hasTopTie: boolean): string {
  if (showWinner && hasTopTie) return 'Vincitore';
  if (showWinner && index === 0) return 'Vincitore';
  if (index === 0) return 'Finalista 1';
  return 'Finalista 2';
}
