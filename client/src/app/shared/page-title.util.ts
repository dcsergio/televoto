import { splitEventNameForDisplay } from './event-name-display.util';

const APP_NAME = 'Televoto';

/** Collapses an event name ("Prefisso // Titolo") to a single line for the browser tab. */
function flattenEventName(name: string | null | undefined): string {
  if (!name) return '';
  const { prefix, emphasized } = splitEventNameForDisplay(name);
  return [prefix, emphasized].filter(Boolean).join(' ');
}

/**
 * Builds the `<title>` for a page as "Sezione · Nome Evento", falling back to
 * "Sezione · Televoto" when no event is loaded. Keeps the operator's browser
 * tabs distinguishable when admin/manager/score/voto are open side by side.
 */
export function buildPageTitle(section: string, eventName?: string | null): string {
  const event = flattenEventName(eventName);
  return event ? `${section} · ${event}` : `${section} · ${APP_NAME}`;
}
