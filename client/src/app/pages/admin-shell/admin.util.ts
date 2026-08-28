export type AdminSection = 'dashboard' | 'create-events' | 'edit-events' | 'archived' | 'settings';

const ADMIN_SECTIONS: AdminSection[] = ['dashboard', 'create-events', 'edit-events', 'archived', 'settings'];

export interface AdminSectionMeta {
  section: AdminSection;
  label: string;
  icon: string;
}

/** Sidenav order + labels/icons for the persistent admin navigation. */
export const ADMIN_SECTION_NAV: AdminSectionMeta[] = [
  { section: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { section: 'create-events', label: 'Crea Eventi', icon: 'add_circle' },
  { section: 'edit-events', label: 'Modifica Eventi', icon: 'edit_calendar' },
  { section: 'archived', label: 'Archiviati', icon: 'archive' },
  { section: 'settings', label: 'Impostazioni', icon: 'settings' },
];

export function isAdminSection(value: string | null): value is AdminSection {
  return value !== null && (ADMIN_SECTIONS as string[]).includes(value);
}

export function adminSectionFromQueryParam(section: string | null): AdminSection {
  return isAdminSection(section) ? section : 'dashboard';
}

export const EVENT_CODE_REGEX = /^\d{1,5}$/;
