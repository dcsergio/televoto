import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import {
  GeneratedJudgeToken,
  JudgeTokenRecord,
  JudgeTokenValidationResult,
  JudgeTokensApi,
} from '../../api/judge-tokens.api';
import { JudgeTokenStreamService } from '../../api/judge-token-stream.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog';
import { ToastService } from '../../shared/toast.service';
import { QrCodePreviewComponent } from './qr-code-preview';
import { PrintService } from './print.service';
import {
  formatDate,
  formatJudgeToken,
  getStatusClass,
  getStatusLabel,
  readFreshCodes,
  writeFreshCodes,
} from './judge-code-manager.util';

interface GeneratorForm {
  count: number;
  labelPrefix: string;
  voterType: 'QUALIFICATA' | 'POPOLARE';
  baseUrl: string;
}

@Component({
  selector: 'app-judge-code-manager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule, QrCodePreviewComponent],
  templateUrl: './judge-code-manager.html',
})
export class JudgeCodeManagerComponent {
  private readonly judgeTokensApi = inject(JudgeTokensApi);
  private readonly stream = inject(JudgeTokenStreamService);
  private readonly printService = inject(PrintService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly eventId = input.required<string>();
  readonly eventCode = input.required<string>();
  readonly authToken = input.required<string>();

  protected readonly tokens = signal<JudgeTokenRecord[]>([]);
  protected readonly generatedTokens = signal<GeneratedJudgeToken[]>([]);
  protected readonly loading = signal(true);
  protected readonly generating = signal(false);
  protected readonly revokingId = signal<string | null>(null);
  protected readonly reissuingId = signal<string | null>(null);
  protected readonly reissuingAll = signal(false);
  protected readonly validationInput = signal('');
  protected readonly validationResult = signal<JudgeTokenValidationResult | null>(null);
  protected readonly validationLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly copyMessage = signal<string | null>(null);
  protected readonly generatorForm = signal<GeneratorForm>({
    count: 5,
    labelPrefix: 'Giuria',
    voterType: 'QUALIFICATA',
    baseUrl: window.location.origin,
  });

  protected readonly formatJudgeToken = formatJudgeToken;
  protected readonly formatDate = formatDate;
  protected readonly getStatusLabel = getStatusLabel;
  protected readonly getStatusClass = getStatusClass;

  protected readonly usedCount = computed(() => this.tokens().filter((t) => t.status === 'used').length);
  protected readonly activeCount = computed(() => this.tokens().filter((t) => t.status === 'active').length);
  protected readonly revokedCount = computed(() => this.tokens().filter((t) => t.status === 'revoked').length);
  protected readonly activeTokens = computed(() => this.tokens().filter((t) => t.status === 'active'));
  protected readonly qualifiedTokens = computed(() => this.tokens().filter((t) => t.type === 'QUALIFICATA'));
  protected readonly popularTokens = computed(() => this.tokens().filter((t) => t.type === 'POPOLARE'));

  // C2 — one consolidated list. Freshly-generated codes (plaintext still in
  // memory) are looked up by id and rendered inline with a «nuovo» badge, QR and
  // copy affordances; every row keeps Rigenera/Revoca.
  protected readonly generatedById = computed(() => {
    const map = new Map<string, GeneratedJudgeToken>();
    for (const token of this.generatedTokens()) map.set(token.id, token);
    return map;
  });
  protected readonly hasFreshCodes = computed(() => this.generatedTokens().length > 0);
  // Per-row collapse for session-fresh codes so a long list can be tidied
  // without regenerating — visibility only, the plaintext stays cached.
  protected readonly hiddenFreshIds = signal<ReadonlySet<string>>(new Set());
  protected readonly hasStatusPills = computed(
    () => this.activeCount() + this.usedCount() + this.revokedCount() > 0,
  );
  protected readonly listTokens = computed(() => {
    const fresh = this.generatedById();
    return [...this.activeTokens()].sort(
      (a, b) => (fresh.has(b.id) ? 1 : 0) - (fresh.has(a.id) ? 1 : 0),
    );
  });
  protected readonly typeLabel = (type: 'QUALIFICATA' | 'POPOLARE'): string =>
    type === 'QUALIFICATA' ? 'Giuria' : 'Televoto';

  private lastLoadedEventId: string | null = null;

  constructor() {
    // Reset transient state + reload the snapshot when the selected event changes.
    effect(() => {
      const eventId = this.eventId();
      if (eventId === this.lastLoadedEventId) return;
      this.lastLoadedEventId = eventId;
      this.generatedTokens.set(readFreshCodes(eventId));
      this.hiddenFreshIds.set(new Set());
      this.validationInput.set('');
      this.validationResult.set(null);
      void this.loadTokens();
    });

    // Live token updates over SSE. The effect re-runs when the event or auth
    // token changes; `onCleanup` closes the previous EventSource before the next
    // one opens and also fires on component destroy — a returned function would
    // be ignored by `effect`, orphaning the connection.
    effect((onCleanup) => {
      const eventId = this.eventId();
      const url = this.judgeTokensApi.buildJudgeTokenStreamUrl(eventId, this.authToken());
      const subscription = this.stream.connect(url).subscribe({
        next: (payload) => {
          if (payload.eventId === eventId) {
            this.applyTokenSnapshot(payload.tokens);
            this.error.set(null);
          }
        },
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  private applyTokenSnapshot(snapshot: JudgeTokenRecord[]): void {
    this.tokens.set(snapshot);
    const byId = new Map(snapshot.map((entry) => [entry.id, entry]));
    this.generatedTokens.update((prev) =>
      prev
        .map((token) => {
          const updated = byId.get(token.id);
          return updated ? { ...token, ...updated } : token;
        })
        // Drop codes the server no longer knows or has revoked — their cached
        // plaintext is dead weight and must not linger in sessionStorage.
        .filter((token) => {
          const current = byId.get(token.id);
          return current != null && current.status !== 'revoked';
        }),
    );
    this.persistFreshCodes();
  }

  private persistFreshCodes(): void {
    writeFreshCodes(this.eventId(), this.generatedTokens());
  }

  protected isFreshHidden(id: string): boolean {
    return this.hiddenFreshIds().has(id);
  }

  protected toggleFreshVisibility(id: string): void {
    this.hiddenFreshIds.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected async loadTokens(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.judgeTokensApi.fetchJudgeTokens(this.eventId(), this.authToken()));
      this.applyTokenSnapshot(data);
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore nel caricamento codici');
    } finally {
      this.loading.set(false);
    }
  }

  protected updateGeneratorForm(patch: Partial<GeneratorForm>): void {
    this.generatorForm.update((prev) => ({ ...prev, ...patch }));
  }

  protected onVoterTypeChange(value: string): void {
    const type = value === 'POPOLARE' ? 'POPOLARE' : 'QUALIFICATA';
    this.updateGeneratorForm({
      voterType: type,
      labelPrefix: type === 'QUALIFICATA' ? 'Giuria' : 'Pubblico',
    });
  }

  protected async handleGenerate(): Promise<void> {
    this.generating.set(true);
    this.error.set(null);
    try {
      const form = this.generatorForm();
      const originInput = form.baseUrl.trim();
      if (!originInput) {
        throw new Error('Inserisci un Base URL valido');
      }
      let origin: string;
      try {
        origin = new URL(originInput).origin;
      } catch {
        throw new Error('Base URL non valido. Esempio: https://televoto.it');
      }

      const result = await firstValueFrom(
        this.judgeTokensApi.generateJudgeTokens(
          this.eventId(),
          { count: form.count, labelPrefix: form.labelPrefix, type: form.voterType, origin },
          this.authToken(),
        ),
      );
      this.generatedTokens.set(result.codes);
      this.hiddenFreshIds.set(new Set());
      this.persistFreshCodes();
      this.validationResult.set(null);
      this.validationInput.set('');
      await this.loadTokens();
      this.toast.success(
        result.codes.length === 1 ? '1 codice generato' : `${result.codes.length} codici generati`,
      );
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore nella generazione');
    } finally {
      this.generating.set(false);
    }
  }

  protected async handleValidate(): Promise<void> {
    const value = this.validationInput().trim();
    if (!value) {
      this.validationResult.set({ valid: false, status: 'invalid', message: 'Inserisci un codice da validare.' });
      return;
    }
    this.validationLoading.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(this.judgeTokensApi.validateJudgeToken(value, this.eventCode()));
      this.validationResult.set(result);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore nella validazione');
    } finally {
      this.validationLoading.set(false);
    }
  }

  protected confirmRevoke(id: string): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Revoca codice',
        message: 'Il codice non potrà più essere usato per votare. Continuare?',
        confirmLabel: 'Revoca',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) void this.handleRevoke(id);
    });
  }

  protected confirmReissue(id: string): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Rigenera questo codice',
        message:
          'Viene creato un codice nuovo solo per questo giudice: quello attuale (e il suo link/QR) smette di funzionare subito, mentre i voti già espressi vengono spostati sul nuovo codice. Continuare?',
        confirmLabel: 'Rigenera',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) void this.handleReissue(id);
    });
  }

  protected async handleRevoke(id: string): Promise<void> {
    this.revokingId.set(id);
    this.error.set(null);
    try {
      const updated = await firstValueFrom(this.judgeTokensApi.revokeJudgeToken(id, this.authToken()));
      this.tokens.update((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
      this.generatedTokens.update((prev) => prev.filter((t) => t.id !== id));
      this.persistFreshCodes();
      this.toast.success('Codice revocato');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore nella revoca');
    } finally {
      this.revokingId.set(null);
    }
  }

  protected confirmReissueAll(): void {
    const count = this.activeTokens().length;
    if (count === 0) {
      this.error.set('Non ci sono codici attivi da sostituire.');
      return;
    }
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Sostituisci tutti i codici',
        message: `Verranno sostituiti ${count} codici attivi con un nuovo valore: i codici attuali e i relativi link/QR smetteranno di funzionare immediatamente e andranno ridistribuiti tutti. Questo non serve per rivedere codici già generati. Continuare?`,
        confirmLabel: 'Sostituisci tutti',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) void this.handleReissueAll();
    });
  }

  protected async handleReissueAll(): Promise<void> {
    this.reissuingAll.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(
        this.judgeTokensApi.reissueAllJudgeTokens(this.eventId(), window.location.origin, this.authToken()),
      );
      this.generatedTokens.set(result.codes);
      this.hiddenFreshIds.set(new Set());
      this.persistFreshCodes();
      this.validationResult.set(null);
      this.validationInput.set('');
      await this.loadTokens();
      this.toast.success(
        result.codes.length === 1 ? '1 codice sostituito' : `${result.codes.length} codici sostituiti`,
      );
      this.copyMessage.set('Codici sostituiti: stampa o copia ora i nuovi link/QR qui sotto.');
      setTimeout(() => this.copyMessage.set(null), 5000);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore nella rigenerazione dei codici');
    } finally {
      this.reissuingAll.set(false);
    }
  }

  protected async handleReissue(id: string): Promise<void> {
    this.reissuingId.set(id);
    this.error.set(null);
    try {
      const result = await firstValueFrom(
        this.judgeTokensApi.reissueJudgeToken(id, window.location.origin, this.authToken()),
      );
      this.generatedTokens.update((prev) => [result.code, ...prev]);
      this.hiddenFreshIds.update((prev) => {
        const next = new Set(prev);
        next.delete(result.code.id);
        return next;
      });
      this.persistFreshCodes();
      await this.loadTokens();
      this.toast.success('Codice rigenerato');
      this.copyMessage.set('Nuovo codice generato: QR e link mostrati qui sotto con il badge «nuovo».');
      setTimeout(() => this.copyMessage.set(null), 4000);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore nella rigenerazione del codice');
    } finally {
      this.reissuingId.set(null);
    }
  }

  protected async handleCopy(value: string, successLabel: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.copyMessage.set(successLabel);
      setTimeout(() => this.copyMessage.set(null), 1500);
    } catch {
      this.error.set('Copia non riuscita');
    }
  }

  protected async handlePrintA4Sheet(): Promise<void> {
    if (this.generatedTokens().length === 0) {
      this.error.set('Genera prima almeno un codice.');
      return;
    }
    this.error.set(null);
    try {
      await this.printService.printA4Sheet(this.generatedTokens());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore nella generazione del foglio di stampa');
    }
  }

  protected qrLabelFor(token: GeneratedJudgeToken): string {
    return (token.label ?? 'codice-giudice').replace(/\s+/g, '-').toLowerCase();
  }

  protected copyAllLinks(): void {
    void this.handleCopy(
      this.generatedTokens()
        .map((t) => t.url)
        .join('\n'),
      'Link copiati negli appunti',
    );
  }
}
