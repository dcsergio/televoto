import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { firstValueFrom, map } from 'rxjs';
import { AuthStateService } from '../../state/auth-state.service';
import { VotingStateService } from '../../state/voting-state.service';
import { AuthApi } from '../../api/auth.api';
import { AdminEventSummary, EventsApi } from '../../api/events.api';
import { EVENT_NAME_SEPARATOR } from '../../shared/event-name-display.util';
import { ProtectedPageGateComponent } from '../../components/protected-page-gate/protected-page-gate';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog';
import { CloneEventDialogComponent } from '../../components/clone-event-dialog/clone-event-dialog';
import { ToastService } from '../../shared/toast.service';
import { openScoreGuarded } from '../../shared/open-score.util';
import { ADMIN_SECTION_NAV, AdminSection, EVENT_CODE_REGEX, adminSectionFromQueryParam } from './admin.util';

@Component({
  selector: 'app-admin-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ProtectedPageGateComponent,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  host: { class: 'theme-pro' },
  templateUrl: './admin-shell.html',
})
export class AdminShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApi);
  private readonly eventsApi = inject(EventsApi);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly dialog = inject(MatDialog);
  protected readonly authState = inject(AuthStateService);
  protected readonly votingState = inject(VotingStateService);
  protected readonly toast = inject(ToastService);

  protected readonly passwordError = signal('');

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly activeSection = signal<AdminSection>(
    adminSectionFromQueryParam(this.route.snapshot.queryParamMap.get('adminSection')),
  );

  protected readonly adminSectionNav = ADMIN_SECTION_NAV;
  protected readonly isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map((result) => result.matches)),
    { initialValue: false },
  );
  protected readonly sidenavMode = computed<'over' | 'side'>(() => (this.isHandset() ? 'over' : 'side'));
  protected readonly sidenavOpened = signal(true);

  protected readonly events = signal<AdminEventSummary[]>([]);
  protected readonly loadingEvents = signal(false);
  protected readonly eventsError = signal<string | null>(null);
  protected readonly creatingEvent = signal(false);
  protected readonly updatingSelectedEventName = signal(false);
  protected readonly updatingRootPassword = signal(false);
  protected readonly selectedEventId = signal<string | null>(null);
  protected readonly selectedEventNameDraft = signal('');
  protected readonly newEvent = signal({ code: '', name: '', subtitle: '', managerPassword: '', popularVoteMode: 'NUMERIC' as 'NUMERIC' | 'PREFERENCE', maxPreferences: 1 });
  protected readonly updatingVotingSettings = signal(false);
  protected readonly eventSettingsDraft = signal({
    weightQualificata: 70,
    enableTrimmedMean: false,
    trimmedMeanPercentage: 10,
  });
  /** Peso Popolare non è mai editato direttamente: è sempre il complemento a 100 del peso Qualificata. */
  protected readonly eventSettingsWeightPopolare = computed(() => 100 - this.eventSettingsDraft().weightQualificata);
  protected readonly updatingManagerPassword = signal(false);
  protected readonly managerPasswordDraft = signal('');
  protected readonly rootPasswordDraft = signal({ currentPassword: '', newPassword: '', confirmPassword: '' });

  protected readonly eventNameSeparator = EVENT_NAME_SEPARATOR;

  protected readonly selectedEvent = computed(
    () => this.events().find((event) => event.id === this.selectedEventId()) ?? null,
  );
  protected readonly selectedEventBadge = computed(() => {
    const ev = this.selectedEvent();
    return ev ? `${ev.code} - ${ev.name}` : 'Nessun evento selezionato';
  });
  protected readonly selectedEventVotingClosed = computed(() => this.selectedEvent()?.votingClosed ?? true);
  protected readonly selectedEventStatusLabel = computed(() =>
    this.selectedEventVotingClosed() ? 'Televoto chiuso' : 'Televoto aperto',
  );
  protected readonly selectedEventPopularVoteMode = computed(() => this.selectedEvent()?.popularVoteMode ?? 'NUMERIC');
  protected readonly isPreferenceVoteEvent = computed(() => this.selectedEventPopularVoteMode() === 'PREFERENCE');

  /** Non-archived events: used for selection, the dashboard event grid, and the toolbar selector. */
  protected readonly activeEvents = computed(() => this.events().filter((e) => e.active));
  /** Archived events: shown only in the dedicated "Archiviati" section. */
  protected readonly archivedEvents = computed(() => this.events().filter((e) => !e.active));

  /** Cross-event snapshot for the Dashboard "overview" cards. */
  protected readonly eventsOverview = computed(() => {
    const list = this.events();
    return {
      total: list.length,
      active: list.filter((e) => e.active).length,
      votingOpen: list.filter((e) => e.active && !e.votingClosed).length,
      votingClosed: list.filter((e) => e.active && e.votingClosed).length,
    };
  });

  protected readonly archivingEventId = signal<string | null>(null);
  protected readonly cloningEventId = signal<string | null>(null);

  private lastEventCode: string | null = null;
  /**
   * Guards the two auto-load effects below so the initial `GET /api/events` fires
   * exactly once. Without it, an empty event list (fresh DB / all events deleted)
   * keeps `events()` empty, `eventsError()` null and `loadingEvents()` false after
   * a successful load — i.e. the effect condition stays true and re-fires forever.
   * Manual reloads go through `refreshEvents()`, which calls `loadEvents()` directly.
   */
  private eventsLoadKicked = false;

  constructor() {
    // Sidenav starts closed on handset (opened via the toolbar menu button)
    // and always open in "side" mode on larger viewports.
    effect(() => {
      this.sidenavOpened.set(!this.isHandset());
    });

    effect(() => {
      const code = this.queryParamMap().get('eventCode');
      if (code === this.lastEventCode) return;
      this.lastEventCode = code;
      if (code) {
        void this.votingState.loadEventByCode(code, false);
      }
    });

    effect(() => {
      if (!this.authState.isRootAuthenticated() || this.eventsLoadKicked) return;
      const ev = this.votingState.event();
      if (this.selectedEventId() || !ev) return;
      this.eventsLoadKicked = true;
      void this.loadEvents(ev.id, ev.code);
    });

    effect(() => {
      if (!this.authState.isRootAuthenticated() || this.eventsLoadKicked) return;
      // If the URL carries an eventCode, let the effect above load with that
      // context once the event resolves (or fails) instead of racing it here.
      const code = this.queryParamMap().get('eventCode');
      if (code && !this.votingState.event() && !this.votingState.eventLoadError()) return;
      this.eventsLoadKicked = true;
      void this.loadEvents();
    });

    effect(() => {
      const ev = this.selectedEvent();
      this.selectedEventNameDraft.set(ev?.name ?? '');
      this.eventSettingsDraft.set({
        weightQualificata: ev?.weightQualificata ?? 70,
        enableTrimmedMean: ev?.enableTrimmedMean ?? false,
        trimmedMeanPercentage: ev?.trimmedMeanPercentage ?? 10,
      });
      this.managerPasswordDraft.set('');
    });
  }

  private async loadEvents(initialEventId?: string, initialEventCode?: string): Promise<void> {
    const token = this.authState.rootAuthToken();
    if (!token) {
      this.events.set([]);
      this.loadingEvents.set(false);
      this.eventsError.set("Sessione root non disponibile. Rientra nell'area admin.");
      return;
    }
    this.loadingEvents.set(true);
    try {
      const data = await firstValueFrom(this.eventsApi.fetchEvents(token));
      this.events.set(data);
      this.eventsError.set(null);

      const activeData = data.filter((e) => e.active);
      const currentId = this.selectedEventId();
      if (currentId && data.some((e) => e.id === currentId)) {
        // keep current selection
      } else if (initialEventId && data.some((e) => e.id === initialEventId)) {
        this.selectedEventId.set(initialEventId);
      } else if (initialEventCode) {
        const match = data.find((e) => e.code === initialEventCode);
        this.selectedEventId.set(match?.id ?? activeData[0]?.id ?? null);
      } else {
        this.selectedEventId.set(activeData[0]?.id ?? null);
      }
    } catch (err) {
      this.eventsError.set(err instanceof Error ? err.message : 'Errore');
    } finally {
      this.loadingEvents.set(false);
    }
  }

  protected refreshEvents(): void {
    void this.loadEvents();
  }

  protected toggleSidenav(): void {
    this.sidenavOpened.update((opened) => !opened);
  }

  protected handleNavSelect(section: AdminSection): void {
    this.handleSectionChange(section);
    if (this.isHandset()) {
      this.sidenavOpened.set(false);
    }
  }

  protected handleOpenPublicVoting(): void {
    const ev = this.selectedEvent();
    if (!ev) return;
    window.open(`/?eventCode=${encodeURIComponent(ev.code)}`, '_blank', 'noopener,noreferrer');
  }

  protected handleOpenScore(): void {
    const ev = this.selectedEvent();
    if (!ev) return;
    openScoreGuarded(this.dialog, ev.code, ev.votingClosed);
  }

  /**
   * Opens the dedicated single-event workspace (candidati, codici voto, backstage). Root's session
   * in this tab is reused there, no extra password prompt — this relies on the browser copying
   * sessionStorage into the new tab, which only happens when an opener relationship exists, so this
   * link intentionally omits `noopener`/`noreferrer` (target is same-origin, so reverse-tabnabbing
   * via `window.opener` is not a concern here).
   */
  protected handleManageEvent(eventId: string): void {
    this.selectEvent(eventId);
    const ev = this.events().find((e) => e.id === eventId);
    if (!ev) return;
    window.open(`/manager?eventCode=${encodeURIComponent(ev.code)}`, '_blank');
  }

  protected handleLogout(): void {
    this.authState.logoutRoot();
    this.authState.logoutEventManager();
    // Allow the auto-load effects to fire again on the next login within this tab.
    this.eventsLoadKicked = false;
    this.events.set([]);
    this.selectedEventId.set(null);
    this.eventsError.set(null);
  }

  protected async handleLoginSubmit(password: string): Promise<void> {
    try {
      await this.authState.loginRoot(password);
      this.passwordError.set('');
    } catch (err) {
      this.passwordError.set(err instanceof Error ? err.message : 'Password errata');
    }
  }

  protected handleLoginCancel(): void {
    this.passwordError.set('');
    this.router.navigate(['/']);
  }

  protected handleSectionChange(section: AdminSection): void {
    this.activeSection.set(section);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { adminSection: section },
      queryParamsHandling: 'merge',
    });
  }

  protected selectEvent(eventId: string): void {
    this.selectedEventId.set(eventId || null);
  }

  protected async handleCreateEvent(): Promise<void> {
    const token = this.authState.rootAuthToken();
    if (!token) {
      this.toast.error("Sessione root non valida. Rientra nell'area admin.");
      return;
    }
    const draft = this.newEvent();
    const trimmedCode = draft.code.trim();
    const trimmedName = draft.name.trim();
    const trimmedSubtitle = draft.subtitle.trim();

    if (!trimmedName) {
      this.toast.error('Il nome evento è obbligatorio');
      return;
    }
    if (trimmedCode && !EVENT_CODE_REGEX.test(trimmedCode)) {
      this.toast.error('Il codice evento deve contenere da 1 a 5 cifre');
      return;
    }
    if (draft.managerPassword.length < 8) {
      this.toast.error('La password manager evento deve avere almeno 8 caratteri');
      return;
    }

    this.creatingEvent.set(true);
    try {
      const created = await firstValueFrom(
        this.eventsApi.createEvent(
          {
            code: trimmedCode || undefined,
            name: trimmedName,
            subtitle: trimmedSubtitle || undefined,
            managerPassword: draft.managerPassword,
            popularVoteMode: draft.popularVoteMode,
            maxPreferences: draft.maxPreferences,
          },
          token,
        ),
      );
      this.events.update((prev) => [created, ...prev].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
      this.selectedEventId.set(created.id);
      this.newEvent.set({ code: '', name: '', subtitle: '', managerPassword: '', popularVoteMode: 'NUMERIC', maxPreferences: 1 });
      this.toast.success('Evento creato');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Errore');
    } finally {
      this.creatingEvent.set(false);
    }
  }

  protected async handleRenameSelectedEvent(): Promise<void> {
    const ev = this.selectedEvent();
    const token = this.authState.rootAuthToken();
    if (!ev || !token) return;
    const trimmedName = this.selectedEventNameDraft().trim();
    if (!trimmedName) {
      this.toast.error('Il nome evento è obbligatorio');
      return;
    }
    if (trimmedName === ev.name) {
      return;
    }
    this.updatingSelectedEventName.set(true);
    try {
      const updated = await firstValueFrom(this.eventsApi.updateEvent(ev.id, { name: trimmedName }, token));
      this.events.update((prev) =>
        prev.map((e) => (e.id === updated.id ? { ...e, name: updated.name, subtitle: updated.subtitle } : e)),
      );
      this.selectedEventNameDraft.set(updated.name);
      this.toast.success('Nome evento aggiornato');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Errore');
    } finally {
      this.updatingSelectedEventName.set(false);
    }
  }

  protected async handleUpdateVotingSettings(): Promise<void> {
    const ev = this.selectedEvent();
    const token = this.authState.rootAuthToken();
    if (!ev || !token) return;

    const { weightQualificata, trimmedMeanPercentage, enableTrimmedMean } = this.eventSettingsDraft();
    const weightPopolare = this.eventSettingsWeightPopolare();
    if (!Number.isInteger(weightQualificata)) {
      this.toast.error('Il peso deve essere un numero intero.');
      return;
    }
    if (weightQualificata < 0 || weightQualificata > 100) {
      this.toast.error('Il peso deve essere compreso tra 0 e 100.');
      return;
    }
    if (trimmedMeanPercentage < 0 || trimmedMeanPercentage >= 50) {
      this.toast.error('La percentuale trimmed mean deve essere tra 0 e 49.99.');
      return;
    }

    this.updatingVotingSettings.set(true);
    try {
      const updated = await firstValueFrom(
        this.eventsApi.updateEvent(
          ev.id,
          { weightQualificata, weightPopolare, enableTrimmedMean, trimmedMeanPercentage },
          token,
        ),
      );
      this.events.update((prev) =>
        prev.map((e) =>
          e.id === updated.id
            ? {
                ...e,
                weightQualificata: updated.weightQualificata,
                weightPopolare: updated.weightPopolare,
                enableTrimmedMean: updated.enableTrimmedMean,
                trimmedMeanPercentage: updated.trimmedMeanPercentage,
              }
            : e,
        ),
      );
      this.toast.success('Impostazioni votazione aggiornate');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : "Errore nell'aggiornamento impostazioni votazione");
    } finally {
      this.updatingVotingSettings.set(false);
    }
  }

  protected async handleUpdateRootPassword(): Promise<void> {
    const token = this.authState.rootAuthToken();
    if (!token) {
      this.toast.error("Sessione root non valida. Rientra nell'area admin.");
      return;
    }
    const { currentPassword, newPassword, confirmPassword } = this.rootPasswordDraft();
    if (currentPassword.length < 8 || newPassword.length < 8) {
      this.toast.error('Le password root devono avere almeno 8 caratteri.');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.toast.error('La conferma della nuova password root non corrisponde.');
      return;
    }
    this.updatingRootPassword.set(true);
    try {
      await firstValueFrom(this.authApi.updateRootPassword(token, currentPassword, newPassword));
      this.rootPasswordDraft.set({ currentPassword: '', newPassword: '', confirmPassword: '' });
      this.toast.success('Password root aggiornata');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : "Errore nell'aggiornamento password root");
    } finally {
      this.updatingRootPassword.set(false);
    }
  }

  protected async handleRotateEventManagerPassword(): Promise<void> {
    const ev = this.selectedEvent();
    const token = this.authState.rootAuthToken();
    if (!ev || !token) return;
    const password = this.managerPasswordDraft();
    if (password.length < 8) {
      this.toast.error('La nuova password evento deve avere almeno 8 caratteri.');
      return;
    }
    this.updatingManagerPassword.set(true);
    try {
      await firstValueFrom(this.eventsApi.updateEventManagerPassword(ev.id, password, token));
      this.managerPasswordDraft.set('');
      this.toast.success('Password evento aggiornata');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : "Errore nell'aggiornamento password evento");
    } finally {
      this.updatingManagerPassword.set(false);
    }
  }

  protected handleArchiveEvent(eventId: string): void {
    const ev = this.events().find((e) => e.id === eventId);
    if (!ev) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Archivia evento',
        message: `Vuoi archiviare "${ev.name}"? Non sarà più visibile tra gli eventi attivi, ma potrà essere ripristinato in qualsiasi momento dalla sezione Archiviati.`,
        confirmLabel: 'Archivia',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) void this.setEventArchivedState(eventId, true);
    });
  }

  protected handleUnarchiveEvent(eventId: string): void {
    void this.setEventArchivedState(eventId, false);
  }

  private async setEventArchivedState(eventId: string, archived: boolean): Promise<void> {
    const token = this.authState.rootAuthToken();
    if (!token) {
      this.toast.error("Sessione root non valida. Rientra nell'area admin.");
      return;
    }
    this.archivingEventId.set(eventId);
    try {
      const updated = await firstValueFrom(this.eventsApi.updateEventArchivedState(eventId, archived, token));
      this.events.update((prev) => prev.map((e) => (e.id === updated.id ? { ...e, active: updated.active } : e)));
      if (archived && this.selectedEventId() === eventId) {
        this.selectedEventId.set(this.activeEvents().find((e) => e.id !== eventId)?.id ?? null);
      }
      this.toast.success(archived ? 'Evento archiviato' : 'Evento ripristinato');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : "Errore nell'aggiornamento dell'archiviazione");
    } finally {
      this.archivingEventId.set(null);
    }
  }

  protected handleCloneEvent(eventId: string): void {
    const ev = this.events().find((e) => e.id === eventId);
    if (!ev) return;
    const ref = this.dialog.open(CloneEventDialogComponent, {
      data: { eventName: ev.name, defaultName: `${ev.name} (copia)` },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) void this.cloneEvent(eventId, result);
    });
  }

  private async cloneEvent(
    eventId: string,
    input: { managerPassword: string; name: string; code: string | null },
  ): Promise<void> {
    const token = this.authState.rootAuthToken();
    if (!token) {
      this.toast.error("Sessione root non valida. Rientra nell'area admin.");
      return;
    }
    this.cloningEventId.set(eventId);
    try {
      const cloned = await firstValueFrom(this.eventsApi.cloneEvent(eventId, input, token));
      this.events.update((prev) => [cloned, ...prev].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
      this.selectedEventId.set(cloned.id);
      this.handleSectionChange('edit-events');
      this.toast.success('Evento clonato');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Errore nella clonazione evento');
    } finally {
      this.cloningEventId.set(null);
    }
  }
}
