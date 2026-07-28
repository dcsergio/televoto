import { CandidateData } from '../../models/types';

export type AdminSection = 'dashboard' | 'events' | 'candidates' | 'voting-codes' | 'voting-backstage';

const ADMIN_SECTIONS: AdminSection[] = ['dashboard', 'events', 'candidates', 'voting-codes', 'voting-backstage'];

export interface AdminSectionMeta {
  section: AdminSection;
  label: string;
  icon: string;
}

/** Sidenav order + labels/icons for the persistent admin navigation. */
export const ADMIN_SECTION_NAV: AdminSectionMeta[] = [
  { section: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { section: 'events', label: 'Eventi', icon: 'event' },
  { section: 'candidates', label: 'Candidati', icon: 'groups' },
  { section: 'voting-codes', label: 'Codici Voto', icon: 'qr_code_2' },
  { section: 'voting-backstage', label: 'Backstage Votazione', icon: 'insights' },
];

export function isAdminSection(value: string | null): value is AdminSection {
  return value !== null && (ADMIN_SECTIONS as string[]).includes(value);
}

export function adminSectionFromQueryParam(section: string | null): AdminSection {
  if (section === 'voting') return 'voting-codes';
  return isAdminSection(section) ? section : 'dashboard';
}

export function getNextCandidateNumber(candidates: CandidateData[]): number {
  if (candidates.length === 0) return 1;
  return Math.max(...candidates.map((c) => c.number)) + 1;
}

export function getRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i += 1) {
    color += letters[Math.floor(Math.random() * letters.length)];
  }
  return color;
}

export const CANDIDATE_COLOR_PALETTE = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

export const EVENT_CODE_REGEX = /^\d{1,5}$/;
