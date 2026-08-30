import { splitEventNameForDisplay } from './event-name-display.util';

const APP_NAME = 'Televoto';

/** Collapses an event name ("Prefisso // Titolo") to a single line for the browser tab. */
function flattenEventName(name: string | null | undefined): string {
  if (!name) return '';
  const { prefix, emphasized } = splitEventNameForDisplay(name);
  return [prefix, emphasized].filter(Boolean).join(' ');
}

/**
 * Builds the `<title>` for a page as "Sezione · [codice] Nome Evento", falling
 * back to "Sezione · Televoto" when no event is loaded. Keeps the operator's
 * browser tabs distinguishable when several events' admin/manager/score/voto
 * tabs are open side by side during a live evening.
 */
export function buildPageTitle(section: string, eventName?: string | null, eventCode?: string | null): string {
  const event = flattenEventName(eventName);
  if (!event) return `${section} · ${APP_NAME}`;
  return eventCode ? `${section} · ${eventCode} ${event}` : `${section} · ${event}`;
}
