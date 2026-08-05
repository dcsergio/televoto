export type EventManagerSection = 'dashboard' | 'candidates' | 'voting-codes' | 'voting-backstage';

const EVENT_MANAGER_SECTIONS: EventManagerSection[] = ['dashboard', 'candidates', 'voting-codes', 'voting-backstage'];

export interface EventManagerSectionMeta {
  section: EventManagerSection;
  label: string;
  icon: string;
}

/** Sidenav order + labels/icons for the event-manager-only navigation (no "Eventi" entry). */
export const EVENT_MANAGER_SECTION_NAV: EventManagerSectionMeta[] = [
  { section: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { section: 'candidates', label: 'Candidati', icon: 'groups' },
  { section: 'voting-codes', label: 'Codici Voto', icon: 'qr_code_2' },
  { section: 'voting-backstage', label: 'Backstage Votazione', icon: 'insights' },
];

export function isEventManagerSection(value: string | null): value is EventManagerSection {
  return value !== null && (EVENT_MANAGER_SECTIONS as string[]).includes(value);
}

export function eventManagerSectionFromQueryParam(section: string | null): EventManagerSection {
  if (section === 'voting') return 'voting-codes';
  return isEventManagerSection(section) ? section : 'dashboard';
}
