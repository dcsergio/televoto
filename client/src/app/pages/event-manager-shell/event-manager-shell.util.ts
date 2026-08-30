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

/**
 * Contextual landing section for a freshly-opened event when the URL carries no
 * explicit `adminSection`: an event with no candidates opens on «Candidati», one
 * that has candidates but is still closed opens on «Codici Voto», and an event
 * with voting open opens on the live «Backstage».
 */
export function contextualDefaultEventManagerSection(input: {
  candidateCount: number;
  votingClosed: boolean;
}): EventManagerSection {
  if (input.candidateCount === 0) return 'candidates';
  if (input.votingClosed) return 'voting-codes';
  return 'voting-backstage';
}

export type LifecycleStepState = 'done' | 'current' | 'todo';

export interface LifecycleStep {
  key: 'candidates' | 'codes' | 'televoto' | 'classifica';
  label: string;
  /** Section to switch to on click, or `null` for «Classifica» (the separate `/score` tab). */
  section: EventManagerSection | null;
  state: LifecycleStepState;
}

/**
 * Slim orientation stepper for the manager evening — «Candidati → Codici →
 * Televoto → Classifica» ("crea" already happened: the event exists).
 *
 * The operator's place is derived from the *same two inputs* as
 * {@link contextualDefaultEventManagerSection}, so the stepper and the
 * contextual landing section never contradict each other:
 *   - no candidates yet ............ current = «Candidati»
 *   - candidates, televoto chiuso .. current = «Codici» (setup, prima dell'avvio)
 *   - televoto aperto ............. current = «Televoto»
 *
 * A single pointer walks the ordered list: every step before it is `done`,
 * every step after it is `todo`. This keeps exactly one accent-lit marker per
 * view (the "una sola luce" rule). «Classifica» sits on the separate `/score`
 * tab, so it never auto-lights as `current` here — it stays clickable and the
 * caller routes the click through `handleOpenScore()`. The read is a truthful
 * "sei più o meno qui", not a precise state machine (there is no persisted
 * "il televoto è già stato aperto" flag to lean on).
 */
export function lifecycleSteps(input: {
  candidateCount: number;
  votingClosed: boolean;
}): LifecycleStep[] {
  const meta: Omit<LifecycleStep, 'state'>[] = [
    { key: 'candidates', label: 'Candidati', section: 'candidates' },
    { key: 'codes', label: 'Codici', section: 'voting-codes' },
    { key: 'televoto', label: 'Televoto', section: 'voting-backstage' },
    { key: 'classifica', label: 'Classifica', section: null },
  ];

  const currentKey: LifecycleStep['key'] =
    input.candidateCount === 0 ? 'candidates' : input.votingClosed ? 'codes' : 'televoto';
  const currentIndex = meta.findIndex((step) => step.key === currentKey);

  return meta.map((step, index) => ({
    ...step,
    state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo',
  }));
}
