export type AdminSection = 'dashboard' | 'events';

const ADMIN_SECTIONS: AdminSection[] = ['dashboard', 'events'];

export interface AdminSectionMeta {
  section: AdminSection;
  label: string;
  icon: string;
}

/** Sidenav order + labels/icons for the persistent admin navigation. */
export const ADMIN_SECTION_NAV: AdminSectionMeta[] = [
  { section: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { section: 'events', label: 'Eventi', icon: 'event' },
];

export function isAdminSection(value: string | null): value is AdminSection {
  return value !== null && (ADMIN_SECTIONS as string[]).includes(value);
}

export function adminSectionFromQueryParam(section: string | null): AdminSection {
  return isAdminSection(section) ? section : 'dashboard';
}

export const EVENT_CODE_REGEX = /^\d{1,5}$/;
