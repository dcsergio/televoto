import type { GeneratedJudgeToken } from '../../api/judge-tokens.api';

export {
  getJudgeTokenStatusLabel as getStatusLabel,
  getJudgeTokenStatusClass as getStatusClass,
} from '../../shared/judge-token-status.util';

/**
 * Session-scoped cache of freshly-generated plaintext codes (token + URL), keyed
 * per event. The server only ever stores codes hashed, so once the operator
 * navigates away from "Codici Voto" the plaintext is unrecoverable — this keeps
 * the QR + link visible for codes generated in the current browser session so a
 * lost printout mid-event doesn't force "Sostituisci tutti i codici" (which
 * invalidates every other distributed link). Cleared when the tab closes, same
 * lifetime as the auth tokens.
 */
const FRESH_CODES_KEY_PREFIX = 'televoto:fresh-codes:';

export function freshCodesStorageKey(eventId: string): string {
  return `${FRESH_CODES_KEY_PREFIX}${eventId}`;
}

export function readFreshCodes(eventId: string): GeneratedJudgeToken[] {
  try {
    const raw = sessionStorage.getItem(freshCodesStorageKey(eventId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GeneratedJudgeToken[]) : [];
  } catch {
    return [];
  }
}

export function writeFreshCodes(eventId: string, codes: GeneratedJudgeToken[]): void {
  try {
    if (codes.length === 0) {
      sessionStorage.removeItem(freshCodesStorageKey(eventId));
      return;
    }
    sessionStorage.setItem(freshCodesStorageKey(eventId), JSON.stringify(codes));
  } catch {
    /* private window / quota exceeded — non-fatal, codes stay in memory for this view */
  }
}

export function clearFreshCodes(eventId: string): void {
  try {
    sessionStorage.removeItem(freshCodesStorageKey(eventId));
  } catch {
    /* ignore */
  }
}

export function formatJudgeToken(value: string): string {
  const normalized = value.replaceAll(/[^0-9A-Z]/gi, '').toUpperCase();
  return normalized.match(/.{1,4}/g)?.join('-') ?? normalized;
}

export function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('it-IT');
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
