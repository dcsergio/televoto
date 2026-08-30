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

/**
 * Returns the `.status-*` modifier for the shared `.status-pill` badge
 * (defined in `styles.scss`). Call sites keep `class="status-pill"` static and
 * bind this as the variant, so judge-token state runs through the one status
 * system instead of a bespoke `emerald/amber/red` family.
 */
export function getJudgeTokenStatusClass(status: JudgeTokenStatus): string {
  if (status === 'used') return 'status-warn';
  if (status === 'revoked') return 'status-danger';
  if (status === 'invalid') return 'status-neutral';
  return 'status-open';
}
