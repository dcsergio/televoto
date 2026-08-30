import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * The public-view / logout action buttons shared by the `/admin` and `/manager`
 * toolbars. Both shells rendered their own near-identical copy of these three
 * buttons and drifted (the manager copy had an icon-only "Esci" with no caption
 * and non-working tooltips because the shell never imported `MatTooltipModule`).
 *
 * Icon + `hidden sm:inline` caption on every button so the labels stay visible
 * from the `sm` breakpoint up. `testidPrefix` keeps the existing
 * `admin-*` / `event-manager-*` `data-testid`s stable for the e2e specs.
 */
@Component({
  selector: 'app-shell-toolbar-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <button
      type="button"
      mat-button
      [matTooltip]="withContext('Apri pagina voto pubblico') + ' — vista pubblica, nuova scheda'"
      [attr.aria-label]="withContext('Apri pagina voto pubblico') + ' in una nuova scheda'"
      [attr.data-testid]="testidPrefix() + '-open-voting'"
      [disabled]="disabled()"
      (click)="openVoting.emit()"
    >
      <mat-icon>how_to_vote</mat-icon>
      <span class="hidden sm:inline">Voto pubblico</span>
    </button>
    <button
      type="button"
      mat-button
      [matTooltip]="withContext('Apri Classifica') + ' — vista pubblica, nuova scheda'"
      [attr.aria-label]="withContext('Apri Classifica') + ' in una nuova scheda'"
      [attr.data-testid]="testidPrefix() + '-open-score'"
      [disabled]="disabled()"
      (click)="openScore.emit()"
    >
      <mat-icon>emoji_events</mat-icon>
      <span class="hidden sm:inline">Classifica</span>
    </button>
    <button
      type="button"
      mat-button
      [matTooltip]="logoutTooltip()"
      [attr.aria-label]="logoutTooltip()"
      [attr.data-testid]="testidPrefix() + '-toolbar-logout'"
      (click)="logout.emit()"
    >
      <mat-icon>logout</mat-icon>
      <span class="hidden sm:inline">Esci</span>
    </button>
  `,
})
export class ShellToolbarActionsComponent {
  /** `admin` or `event-manager` — prefixes the `data-testid` of each button. */
  readonly testidPrefix = input.required<string>();
  /** Disables the two "open public view" buttons while no event is selected/loaded. */
  readonly disabled = input(false);
  /** Tooltip + aria-label for the logout button (the two shells word it differently). */
  readonly logoutTooltip = input('Esci');
  /**
   * Name of the event the public-view actions target (e.g. "01234 — GRAN FINALE").
   * Folded into the two buttons' tooltip / aria-label so the operator can tell
   * which event's public view is about to open. Empty = generic wording.
   */
  readonly contextLabel = input('');

  readonly openVoting = output<void>();
  readonly openScore = output<void>();
  readonly logout = output<void>();

  protected withContext(base: string): string {
    const ctx = this.contextLabel().trim();
    return ctx ? `${base} di ${ctx}` : base;
  }
}
