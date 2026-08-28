import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface CloneEventDialogData {
  eventName: string;
  defaultName: string;
}

export type CloneEventDialogResult = {
  managerPassword: string;
  name: string;
  code: string | null;
} | null;

const EVENT_CODE_REGEX = /^\d{1,5}$/;

@Component({
  selector: 'app-clone-event-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, FormsModule],
  template: `
    <div class="surface-card bg-bg-secondary p-6 shadow-2xl">
      <h2 class="text-xl font-semibold text-text-primary">Clona evento</h2>
      <p class="mt-3 text-sm text-text-secondary">
        Una copia di "{{ data.eventName }}" verrà creata: scegli il nome, un codice opzionale e la
        nuova password manager.
      </p>

      <div class="mt-5 flex flex-col gap-4">
        <label class="flex flex-col gap-1 text-sm text-text-secondary">
          Nome evento
          <input
            class="field-input"
            type="text"
            [ngModel]="name()"
            (ngModelChange)="onFieldChange($event, 'name')"
          />
        </label>

        <label class="flex flex-col gap-1 text-sm text-text-secondary">
          Codice evento (opzionale)
          <input
            class="field-input"
            type="text"
            placeholder="Es. 01234 — lascia vuoto per generare"
            [ngModel]="code()"
            (ngModelChange)="onFieldChange($event, 'code')"
          />
        </label>

        <label class="flex flex-col gap-1 text-sm text-text-secondary">
          Password manager
          <input
            class="field-input"
            type="password"
            [ngModel]="password()"
            (ngModelChange)="onFieldChange($event, 'password')"
          />
        </label>

        <label class="flex flex-col gap-1 text-sm text-text-secondary">
          Conferma password
          <input
            class="field-input"
            type="password"
            [ngModel]="confirmPassword()"
            (ngModelChange)="onFieldChange($event, 'confirmPassword')"
          />
        </label>
      </div>

      @if (error()) {
        <p class="mt-3 text-sm text-accent-coral">{{ error() }}</p>
      }

      <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button type="button" (click)="dialogRef.close(null)" class="btn btn-ghost">Annulla</button>
        <button type="button" (click)="submit()" class="btn btn-primary">Clona evento</button>
      </div>
    </div>
  `,
})
export class CloneEventDialogComponent {
  protected readonly dialogRef = inject(MatDialogRef<CloneEventDialogComponent, CloneEventDialogResult>);
  protected readonly data = inject<CloneEventDialogData>(MAT_DIALOG_DATA);

  protected readonly name = signal(this.data.defaultName);
  protected readonly code = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly error = signal<string | null>(null);

  protected onFieldChange(
    value: string,
    field: 'name' | 'code' | 'password' | 'confirmPassword',
  ): void {
    this.error.set(null);
    switch (field) {
      case 'name':
        this.name.set(value);
        break;
      case 'code':
        this.code.set(value);
        break;
      case 'password':
        this.password.set(value);
        break;
      case 'confirmPassword':
        this.confirmPassword.set(value);
        break;
    }
  }

  protected submit(): void {
    const name = this.name().trim();
    const code = this.code().trim();
    const password = this.password();

    if (!name) {
      this.error.set('Il nome evento è obbligatorio');
      return;
    }
    if (code && !EVENT_CODE_REGEX.test(code)) {
      this.error.set('Il codice evento deve contenere da 1 a 5 cifre');
      return;
    }
    if (password.length < 8) {
      this.error.set('La password deve avere almeno 8 caratteri');
      return;
    }
    if (password !== this.confirmPassword()) {
      this.error.set('Le password non coincidono');
      return;
    }

    this.dialogRef.close({ managerPassword: password, name, code: code || null });
  }
}
