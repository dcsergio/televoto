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
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { firstValueFrom, map } from 'rxjs';
import { AuthStateService } from '../../state/auth-state.service';
import { VotingStateService } from '../../state/voting-state.service';
import { AuthApi } from '../../api/auth.api';
import { AdminEventSummary, EventsApi } from '../../api/events.api';
import { EVENT_NAME_SEPARATOR } from '../../shared/event-name-display.util';
import { ProtectedPageGateComponent } from '../../components/protected-page-gate/protected-page-gate';
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
  templateUrl: './admin-shell.html',
})
export class AdminShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApi);
  private readonly eventsApi = inject(EventsApi);
  private readonly breakpointObserver = inject(BreakpointObserver);
  protected readonly authState = inject(AuthStateService);
  protected readonly votingState = inject(VotingStateService);

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
  protected readonly newEvent = signal({ code: '', name: '', subtitle: '', managerPassword: '', popularVoteMode: 'NUMERIC' as 'NUMERIC' | 'SINGLE' });
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

  protected readonly error = signal<string | null>(null);

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
  protected readonly isSingleVoteEvent = computed(() => this.selectedEventPopularVoteMode() === 'SINGLE');

  /** Cross-event snapshot for the Dashboard "overview" cards. */
  protected readonly eventsOverview = computed(() => {
    const list = this.events();
    return {
      total: list.length,
      active: list.filter((e) => e.active).length,
      votingOpen: list.filter((e) => !e.votingClosed).length,
      votingClosed: list.filter((e) => e.votingClosed).length,
    };
  });

  private lastEventCode: string | null = null;

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
      if (!this.authState.isRootAuthenticated()) return;
      const ev = this.votingState.event();
      if (this.selectedEventId() || !ev) return;
      void this.loadEvents(ev.id, ev.code);
    });

    effect(() => {
      if (this.authState.isRootAuthenticated() && this.events().length === 0 && !this.loadingEvents() && this.eventsError() === null) {
        void this.loadEvents();
      }
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

      const currentId = this.selectedEventId();
      if (currentId && data.some((e) => e.id === currentId)) {
        // keep current selection
      } else if (initialEventId && data.some((e) => e.id === initialEventId)) {
        this.selectedEventId.set(initialEventId);
      } else if (initialEventCode) {
        const match = data.find((e) => e.code === initialEventCode);
        this.selectedEventId.set(match?.id ?? data[0]?.id ?? null);
      } else {
        this.selectedEventId.set(data[0]?.id ?? null);
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

  protected handleOpenHallOfFame(): void {
    const ev = this.selectedEvent();
    if (!ev) return;
    window.open(`/hof?eventCode=${encodeURIComponent(ev.code)}`, '_blank', 'noopener,noreferrer');
  }

  /** Opens the dedicated single-event workspace (candidati, codici voto, backstage). Root's session in this tab is reused there, no extra password prompt. */
  protected handleManageEvent(eventId: string): void {
    this.selectEvent(eventId);
    const ev = this.events().find((e) => e.id === eventId);
    if (!ev) return;
    window.open(`/manager?eventCode=${encodeURIComponent(ev.code)}`, '_blank', 'noopener,noreferrer');
  }

  protected handleLogout(): void {
    this.authState.logoutRoot();
    this.authState.logoutEventManager();
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
      this.error.set("Sessione root non valida. Rientra nell'area admin.");
      return;
    }
    const draft = this.newEvent();
    const trimmedCode = draft.code.trim();
    const trimmedName = draft.name.trim();
    const trimmedSubtitle = draft.subtitle.trim();

    if (!trimmedName) {
      this.error.set('Il nome evento è obbligatorio');
      return;
    }
    if (trimmedCode && !EVENT_CODE_REGEX.test(trimmedCode)) {
      this.error.set('Il codice evento deve contenere da 1 a 5 cifre');
      return;
    }
    if (draft.managerPassword.length < 8) {
      this.error.set('La password manager evento deve avere almeno 8 caratteri');
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
          },
          token,
        ),
      );
      this.events.update((prev) => [created, ...prev].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
      this.selectedEventId.set(created.id);
      this.newEvent.set({ code: '', name: '', subtitle: '', managerPassword: '', popularVoteMode: 'NUMERIC' });
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore');
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
      this.error.set('Il nome evento è obbligatorio');
      return;
    }
    if (trimmedName === ev.name) {
      this.error.set(null);
      return;
    }
    this.updatingSelectedEventName.set(true);
    try {
      const updated = await firstValueFrom(this.eventsApi.updateEvent(ev.id, { name: trimmedName }, token));
      this.events.update((prev) =>
        prev.map((e) => (e.id === updated.id ? { ...e, name: updated.name, subtitle: updated.subtitle } : e)),
      );
      this.selectedEventNameDraft.set(updated.name);
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore');
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
      this.error.set('Il peso deve essere un numero intero.');
      return;
    }
    if (weightQualificata < 0 || weightQualificata > 100) {
      this.error.set('Il peso deve essere compreso tra 0 e 100.');
      return;
    }
    if (trimmedMeanPercentage < 0 || trimmedMeanPercentage >= 50) {
      this.error.set('La percentuale trimmed mean deve essere tra 0 e 49.99.');
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
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Errore nell'aggiornamento impostazioni votazione");
    } finally {
      this.updatingVotingSettings.set(false);
    }
  }

  protected async handleUpdateRootPassword(): Promise<void> {
    const token = this.authState.rootAuthToken();
    if (!token) {
      this.error.set("Sessione root non valida. Rientra nell'area admin.");
      return;
    }
    const { currentPassword, newPassword, confirmPassword } = this.rootPasswordDraft();
    if (currentPassword.length < 8 || newPassword.length < 8) {
      this.error.set('Le password root devono avere almeno 8 caratteri.');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.error.set('La conferma della nuova password root non corrisponde.');
      return;
    }
    this.updatingRootPassword.set(true);
    try {
      await firstValueFrom(this.authApi.updateRootPassword(token, currentPassword, newPassword));
      this.rootPasswordDraft.set({ currentPassword: '', newPassword: '', confirmPassword: '' });
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Errore nell'aggiornamento password root");
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
      this.error.set('La nuova password evento deve avere almeno 8 caratteri.');
      return;
    }
    this.updatingManagerPassword.set(true);
    try {
      await firstValueFrom(this.eventsApi.updateEventManagerPassword(ev.id, password, token));
      this.managerPasswordDraft.set('');
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Errore nell'aggiornamento password evento");
    } finally {
      this.updatingManagerPassword.set(false);
    }
  }
}
