import { JudgeTokenStatus } from '../api/judge-tokens.api';

/**
 * Single source of truth for how a judge-token status is shown to operators.
 * `used` maps to "Finalizzato" (server-side: `finalizedAt` is set / ballot locked —
 * see `getJudgeTokenStatus` in server/services/judge-token.service.ts).
 * Shared by the judge-code manager and the voting-progress dashboard.
 */
export function getJudgeTokenStatusLabel(status: JudgeTokenStatus): string {
  if (status === 'used') return 'Finalizzato';
  if (status === 'revoked') return 'Revocato';
  if (status === 'invalid') return 'Non valido';
  return 'Attivo';
}

export function getJudgeTokenStatusClass(status: JudgeTokenStatus): string {
  if (status === 'used') return 'border-amber-500/30 bg-amber-500/15 text-amber-200';
  if (status === 'revoked') return 'border-red-500/30 bg-red-500/15 text-red-200';
  if (status === 'invalid') return 'border-border-glass bg-bg-card-hover text-text-secondary';
  return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200';
}
