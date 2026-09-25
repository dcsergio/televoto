import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';

export type StudioTheme = 'light' | 'dark';

const STUDIO_THEME_KEY = 'votosubito.studioTheme';
/** Class set on `<html>`: `styles.scss` re-points the `.theme-pro` tokens to dark under it. */
const STUDIO_DARK_CLASS = 'studio-dark';

function readStoredTheme(): StudioTheme {
  try {
    return localStorage.getItem(STUDIO_THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function writeStoredTheme(theme: StudioTheme): void {
  try {
    localStorage.setItem(STUDIO_THEME_KEY, theme);
  } catch {
    // localStorage unavailable (e.g. private mode) - fall back to in-memory only
  }
}

/**
 * Light/dark choice for the "Studio" workspaces (admin `/` and `/manager`).
 * Persisted to localStorage (a per-browser display preference, unlike the auth
 * tokens) and applied as a class on `<html>` rather than on the shell host, so
 * the CDK overlay panes (dialogs, select panel) — which carry `.theme-pro` but
 * render outside the shell — follow the same choice. Public pages never carry
 * `.theme-pro`, so the class has no effect there.
 */
@Injectable({ providedIn: 'root' })
export class ThemeStateService {
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<StudioTheme>(readStoredTheme());

  constructor() {
    effect(() => {
      this.document.documentElement.classList.toggle(STUDIO_DARK_CLASS, this.theme() === 'dark');
    });
  }

  toggle(): void {
    const next: StudioTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    writeStoredTheme(next);
  }
}
