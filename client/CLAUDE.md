# CLAUDE.md (client/)

Loaded only when working with files under `client/`. See the root `CLAUDE.md` for project-wide context.

## Theming — "Palco"

The public-facing surfaces (`/` voting, `/score` Classifica) use the **"Palco"** design language: a dark broadcast/awards look — near-black neutral stage, hairline-bordered solid surfaces (no glassmorphism), one reserved accent (electric gold `#ffb020`), Space Grotesk for display type / numerals, Inter for body. Each candidate's configured `color` is still used as a small identity accent (left rule, number, bar fill), never a full card wash.

Design tokens live in the `@theme` block of `client/src/styles.scss`. **Token names are legacy** ("Neon Dark" era): `accent-cyan` is now the gold accent, `accent-magenta` a warm secondary, etc. — only the values changed, so the ~16 files across admin/manager that use `text-accent-cyan` / `.glass` / `.gradient-title` picked up the new palette without edits. `.glass` is now a flat surface, `.gradient-title` a restrained near-white display treatment (not a rainbow), `.neon-text` just the display font. Reduced-motion is handled globally at the bottom of `styles.scss`.

`client/src/styles/_material-theme.scss` defines a custom M3 theme (`mat.theme()`, dark, yellow/orange palettes) whose system CSS variables (`--mat-sys-primary`, `--mat-sys-surface`, etc.) are re-pointed at the Palco hex values. The mixin is still named `neon-dark-theme()` for the `@include` in `styles.scss`. Angular Material components are used for genuinely interactive chrome (`MatDialog` for the confirm-destructive-action pattern — see `ConfirmDialogComponent` — and `MatSnackBar` for toasts via `ToastService`); highly custom visual elements (score buttons, candidate cards, hero banner, Classifica reveal) stay hand-rolled CSS/Tailwind. Tailwind v4 is wired via `@tailwindcss/postcss` (not `@tailwindcss/vite`, since the Angular CLI's esbuild-based builder doesn't take Vite plugins).

The Classifica presenter ceremony (`/score` in `presenterMode`) renders as full-screen broadcast title cards: one position at a time as a headline with a count-up on the final score (`CountUpDirective`, `client/src/app/shared/count-up.directive.ts`), earlier positions collapse into a ladder; gold-tinted "terzo classificato" beat, twin panels for the "finale a due", gold takeover for the winner (with "pari merito" tie handling).
