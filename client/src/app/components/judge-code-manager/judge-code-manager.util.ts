export {
  getJudgeTokenStatusLabel as getStatusLabel,
  getJudgeTokenStatusClass as getStatusClass,
} from '../../shared/judge-token-status.util';

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
