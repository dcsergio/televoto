import { JudgeTokenStatus } from '../../api/judge-tokens.api';

export function formatJudgeToken(value: string): string {
  const normalized = value.replaceAll(/[^0-9A-Z]/gi, '').toUpperCase();
  return normalized.match(/.{1,4}/g)?.join('-') ?? normalized;
}

export function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('it-IT');
}

export function getStatusLabel(status: JudgeTokenStatus): string {
  if (status === 'used') return 'Usato';
  if (status === 'revoked') return 'Revocato';
  if (status === 'invalid') return 'Non valido';
  return 'Attivo';
}

export function getStatusClass(status: JudgeTokenStatus): string {
  if (status === 'used') return 'border-amber-500/30 bg-amber-500/15 text-amber-200';
  if (status === 'revoked') return 'border-red-500/30 bg-red-500/15 text-red-200';
  if (status === 'invalid') return 'border-slate-500/30 bg-slate-500/15 text-slate-200';
  return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200';
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
