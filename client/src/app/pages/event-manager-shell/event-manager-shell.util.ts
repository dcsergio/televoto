export type EventManagerSection = 'candidates' | 'voting-codes' | 'voting-backstage';

const EVENT_MANAGER_SECTIONS: EventManagerSection[] = ['candidates', 'voting-codes', 'voting-backstage'];

/** Section the manager lands on by default: the live operations hub. */
export const DEFAULT_EVENT_MANAGER_SECTION: EventManagerSection = 'voting-backstage';

export interface EventManagerSectionMeta {
  section: EventManagerSection;
  label: string;
  icon: string;
}

/** Sidenav order + labels/icons for the event-manager-only navigation (no "Eventi" entry). */
export const EVENT_MANAGER_SECTION_NAV: EventManagerSectionMeta[] = [
  { section: 'candidates', label: 'Candidati', icon: 'groups' },
  { section: 'voting-codes', label: 'Codici Voto', icon: 'qr_code_2' },
  { section: 'voting-backstage', label: 'Backstage Votazione', icon: 'insights' },
];

export function isEventManagerSection(value: string | null): value is EventManagerSection {
  return value !== null && (EVENT_MANAGER_SECTIONS as string[]).includes(value);
}

export function eventManagerSectionFromQueryParam(section: string | null): EventManagerSection {
  if (section === 'voting') return 'voting-codes';
  return isEventManagerSection(section) ? section : DEFAULT_EVENT_MANAGER_SECTION;
}
