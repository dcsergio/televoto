/**
 * Single source of truth for how a numeric score is shown to a human.
 *
 * Italian locale (comma decimal separator, e.g. `2,77`) and a fixed 2-decimal
 * precision everywhere — jury averages, popular averages and the weighted final
 * score all read the same way, on the manager backstage and on the public
 * Classifica / presenter stage.
 */
const scoreFormatter = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a score for display: `it-IT`, always 2 decimals. Non-finite → `—`. */
export function formatScore(value: number): string {
  return Number.isFinite(value) ? scoreFormatter.format(value) : '—';
}
