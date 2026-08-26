import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog';

/**
 * Opens the Classifica (`/score`) for an event in a new tab, but only once the
 * televoto is closed — otherwise it shows the "close voting first" notice.
 *
 * Shared by the admin shell, the event-manager shell and the lifecycle controls
 * so the guard and its wording stay identical everywhere.
 */
export function openScoreGuarded(dialog: MatDialog, eventCode: string, votingClosed: boolean): void {
  if (!votingClosed) {
    dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Televoto ancora aperto',
        message: 'La Classifica è accessibile solo a televoto chiuso. Chiudi il televoto per poter continuare.',
        confirmLabel: 'Ho capito',
        hideCancel: true,
      },
    });
    return;
  }
  window.open(`/score?eventCode=${encodeURIComponent(eventCode)}`, '_blank', 'noopener,noreferrer');
}
