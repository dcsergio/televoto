import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.show(message, 'toast-success');
  }

  error(message: string): void {
    this.show(message, 'toast-error');
  }

  private show(message: string, panelClass: string): void {
    this.snackBar.open(message, undefined, {
      duration: 3500,
      panelClass: ['app-toast', panelClass],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
}
