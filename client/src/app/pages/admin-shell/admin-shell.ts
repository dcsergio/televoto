import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
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
import { CandidatesApi } from '../../api/candidates.api';
import { JudgeTokensApi, JudgeTokenRecord } from '../../api/judge-tokens.api';
import { CandidateData } from '../../models/types';
import { EVENT_NAME_SEPARATOR } from '../../shared/event-name-display.util';
import { ProtectedPageGateComponent } from '../../components/protected-page-gate/protected-page-gate';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog';
import { JudgeCodeManagerComponent } from '../../components/judge-code-manager/judge-code-manager';
import { VotingProgressDashboardComponent } from '../../components/voting-progress-dashboard/voting-progress-dashboard';
import {
  ADMIN_SECTION_NAV,
  AdminSection,
  CANDIDATE_COLOR_PALETTE,
  EVENT_CODE_REGEX,
  adminSectionFromQueryParam,
  getNextCandidateNumber,
  getRandomColor,
} from './admin.util';

interface EditDraft {
  name: string;
  subtitle: string;
  color: string;
}

@Component({
  selector: 'app-admin-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ProtectedPageGateComponent,
    JudgeCodeManagerComponent,
    VotingProgressDashboardComponent,
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
  private readonly dialog = inject(MatDialog);
  private readonly authApi = inject(AuthApi);
  private readonly eventsApi = inject(EventsApi);
  private readonly candidatesApi = inject(CandidatesApi);
  private readonly judgeTokensApi = inject(JudgeTokensApi);
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

  protected readonly dashboardJudgeTokens = signal<JudgeTokenRecord[]>([]);
  protected readonly dashboardJudgeTokensLoading = signal(false);

  protected readonly events = signal<AdminEventSummary[]>([]);
  protected readonly loadingEvents = signal(false);
  protected readonly eventsError = signal<string | null>(null);
  protected readonly creatingEvent = signal(false);
  protected readonly updatingSelectedEventName = signal(false);
  protected readonly updatingRootPassword = signal(false);
  protected readonly selectedEventId = signal<string | null>(null);
  protected readonly selectedEventNameDraft = signal('');
  protected readonly newEvent = signal({ code: '', name: '', subtitle: '', managerPassword: '' });
  protected readonly eventManagerPasswordInput = signal('');
  protected readonly updatingVotingSettings = signal(false);
  protected readonly eventSettingsDraft = signal({
    weightQualificata: 70,
    weightPopolare: 30,
    enableTrimmedMean: false,
    trimmedMeanPercentage: 10,
  });
  protected readonly eventManagerToken = signal<string | null>(null);
  protected readonly authenticatingManager = signal(false);
  protected readonly updatingManagerPassword = signal(false);
  protected readonly managerPasswordDraft = signal('');
  protected readonly rootPasswordDraft = signal({ currentPassword: '', newPassword: '', confirmPassword: '' });

  protected readonly candidates = signal<CandidateData[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly editing = signal<string | null>(null);
  protected readonly editDraft = signal<EditDraft | null>(null);
  protected readonly votingClosed = signal(true);
  protected readonly newCandidate = signal({ name: '', subtitle: '', color: getRandomColor() });

  protected readonly eventNameSeparator = EVENT_NAME_SEPARATOR;
  protected readonly candidateColorPalette = CANDIDATE_COLOR_PALETTE;

  protected readonly selectedEvent = computed(
    () => this.events().find((event) => event.id === this.selectedEventId()) ?? null,
  );
  protected readonly modificationsLocked = computed(() => !this.votingClosed());
  protected readonly startLabel = computed(() => (this.votingClosed() ? 'Avvia gara' : 'Televoto aperto'));
  protected readonly currentStatus = computed(() => (this.votingClosed() ? 'Televoto chiuso' : 'Televoto aperto'));
  protected readonly modificationLockMessage = 'Disponibile solo a televoto chiuso';
  protected readonly selectedEventBadge = computed(() => {
    const ev = this.selectedEvent();
    return ev ? `${ev.code} - ${ev.name}` : 'Nessun evento selezionato';
  });

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

  /** Judge-token breakdown for the currently selected event, shown on the Dashboard. */
  protected readonly judgeTokenStats = computed(() => {
    const tokens = this.dashboardJudgeTokens();
    return {
      total: tokens.length,
      qualificata: tokens.filter((t) => t.type === 'QUALIFICATA').length,
      popolare: tokens.filter((t) => t.type === 'POPOLARE').length,
      active: tokens.filter((t) => t.status === 'active').length,
      used: tokens.filter((t) => t.status === 'used').length,
      revoked: tokens.filter((t) => t.status === 'revoked').length,
    };
  });

  private lastEventCode: string | null = null;
  private lastCandidatesKey: string | null = null;

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
        weightPopolare: ev?.weightPopolare ?? 30,
        enableTrimmedMean: ev?.enableTrimmedMean ?? false,
        trimmedMeanPercentage: ev?.trimmedMeanPercentage ?? 10,
      });
      this.eventManagerToken.set(null);
      this.eventManagerPasswordInput.set('');
      this.managerPasswordDraft.set('');
    });

    effect(() => {
      const ev = this.selectedEvent();
      const token = this.eventManagerToken();
      if (!ev || !token) {
        this.candidates.set([]);
        this.votingClosed.set(true);
        this.dashboardJudgeTokens.set([]);
        return;
      }
      const key = `${ev.id}:${token}`;
      if (key === this.lastCandidatesKey) return;
      this.lastCandidatesKey = key;
      void this.loadCandidates();
      void this.loadDashboardJudgeTokens();
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

  private async loadCandidates(): Promise<void> {
    const ev = this.selectedEvent();
    const token = this.eventManagerToken();
    if (!ev || !token) return;
    this.loading.set(true);
    try {
      const [data, eventState] = await Promise.all([
        firstValueFrom(this.candidatesApi.fetchCandidates(ev.id, token)),
        firstValueFrom(this.eventsApi.fetchEventState(ev.id)),
      ]);
      this.candidates.set(data);
      this.votingClosed.set(eventState.votingClosed);
      this.newCandidate.set({ name: '', subtitle: '', color: getRandomColor() });
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDashboardJudgeTokens(): Promise<void> {
    const ev = this.selectedEvent();
    const token = this.eventManagerToken();
    if (!ev || !token) return;
    this.dashboardJudgeTokensLoading.set(true);
    try {
      const data = await firstValueFrom(this.judgeTokensApi.fetchJudgeTokens(ev.id, token));
      this.dashboardJudgeTokens.set(data);
    } catch {
      this.dashboardJudgeTokens.set([]);
    } finally {
      this.dashboardJudgeTokensLoading.set(false);
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

  /** Jump straight into a section for a given event, used by Dashboard quick-manage shortcuts. */
  protected goToEventSection(eventId: string, section: AdminSection): void {
    this.selectEvent(eventId);
    this.handleNavSelect(section);
  }

  protected handleOpenPublicVoting(): void {
    const ev = this.selectedEvent();
    if (!ev) return;
    window.open(`/?eventCode=${encodeURIComponent(ev.code)}`, '_blank', 'noopener,noreferrer');
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
    if (section === 'dashboard' && this.eventManagerToken()) {
      void this.loadDashboardJudgeTokens();
    }
  }

  protected selectEvent(eventId: string): void {
    this.selectedEventId.set(eventId || null);
    this.editing.set(null);
    this.editDraft.set(null);
    this.statusMessage.set(null);
  }

  protected handleOpenHallOfFame(): void {
    const ev = this.selectedEvent();
    if (!ev) return;
    window.open(`/hof?eventCode=${encodeURIComponent(ev.code)}`, '_blank', 'noopener,noreferrer');
  }

  protected async handleCreateEvent(): Promise<void> {
    const token = this.authState.rootAuthToken();
    if (!token) {
      this.error.set("Sessione root non valida. Rientra nell'area admin.");
      this.statusMessage.set(null);
      return;
    }
    const draft = this.newEvent();
    const trimmedCode = draft.code.trim();
    const trimmedName = draft.name.trim();
    const trimmedSubtitle = draft.subtitle.trim();

    if (!trimmedName) {
      this.error.set('Il nome evento è obbligatorio');
      this.statusMessage.set(null);
      return;
    }
    if (trimmedCode && !EVENT_CODE_REGEX.test(trimmedCode)) {
      this.error.set('Il codice evento deve contenere da 1 a 5 cifre');
      this.statusMessage.set(null);
      return;
    }
    if (draft.managerPassword.length < 8) {
      this.error.set('La password manager evento deve avere almeno 8 caratteri');
      this.statusMessage.set(null);
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
          },
          token,
        ),
      );
      this.events.update((prev) => [created, ...prev].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
      this.selectedEventId.set(created.id);
      this.newEvent.set({ code: '', name: '', subtitle: '', managerPassword: '' });
      this.error.set(null);
      this.statusMessage.set(`Evento creato con codice ${created.code}.`);
      this.handleSectionChange('candidates');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore');
      this.statusMessage.set(null);
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
      this.statusMessage.set(null);
      return;
    }
    if (trimmedName === ev.name) {
      this.statusMessage.set('Nessuna modifica da salvare.');
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
      this.statusMessage.set('Nome evento aggiornato con successo.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore');
      this.statusMessage.set(null);
    } finally {
      this.updatingSelectedEventName.set(false);
    }
  }

  protected async handleUpdateVotingSettings(): Promise<void> {
    const ev = this.selectedEvent();
    const token = this.authState.rootAuthToken();
    if (!ev || !token) return;

    const { weightQualificata, weightPopolare, trimmedMeanPercentage, enableTrimmedMean } = this.eventSettingsDraft();
    if (!Number.isInteger(weightQualificata) || !Number.isInteger(weightPopolare)) {
      this.error.set('I pesi devono essere numeri interi.');
      this.statusMessage.set(null);
      return;
    }
    if (weightQualificata < 0 || weightQualificata > 100 || weightPopolare < 0 || weightPopolare > 100) {
      this.error.set('I pesi devono essere compresi tra 0 e 100.');
      this.statusMessage.set(null);
      return;
    }
    if (weightQualificata + weightPopolare !== 100) {
      this.error.set('La somma dei pesi deve essere esattamente 100.');
      this.statusMessage.set(null);
      return;
    }
    if (trimmedMeanPercentage < 0 || trimmedMeanPercentage >= 50) {
      this.error.set('La percentuale trimmed mean deve essere tra 0 e 49.99.');
      this.statusMessage.set(null);
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
      this.statusMessage.set('Impostazioni pesatura aggiornate con successo.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Errore nell'aggiornamento impostazioni votazione");
      this.statusMessage.set(null);
    } finally {
      this.updatingVotingSettings.set(false);
    }
  }

  protected async handleUpdateRootPassword(): Promise<void> {
    const token = this.authState.rootAuthToken();
    if (!token) {
      this.error.set("Sessione root non valida. Rientra nell'area admin.");
      this.statusMessage.set(null);
      return;
    }
    const { currentPassword, newPassword, confirmPassword } = this.rootPasswordDraft();
    if (currentPassword.length < 8 || newPassword.length < 8) {
      this.error.set('Le password root devono avere almeno 8 caratteri.');
      this.statusMessage.set(null);
      return;
    }
    if (newPassword !== confirmPassword) {
      this.error.set('La conferma della nuova password root non corrisponde.');
      this.statusMessage.set(null);
      return;
    }
    this.updatingRootPassword.set(true);
    try {
      await firstValueFrom(this.authApi.updateRootPassword(token, currentPassword, newPassword));
      this.rootPasswordDraft.set({ currentPassword: '', newPassword: '', confirmPassword: '' });
      this.error.set(null);
      this.statusMessage.set('Password root aggiornata con successo.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Errore nell'aggiornamento password root");
      this.statusMessage.set(null);
    } finally {
      this.updatingRootPassword.set(false);
    }
  }

  protected async handleEventManagerLogin(): Promise<void> {
    const ev = this.selectedEvent();
    if (!ev) return;
    const password = this.eventManagerPasswordInput();
    if (password.length < 8) {
      this.error.set('La password evento deve avere almeno 8 caratteri.');
      this.statusMessage.set(null);
      return;
    }
    this.authenticatingManager.set(true);
    try {
      const session = await firstValueFrom(this.authApi.loginEventManager(ev.id, password));
      this.eventManagerToken.set(session.token);
      this.error.set(null);
      this.statusMessage.set('Accesso manager evento effettuato.');
      this.eventManagerPasswordInput.set('');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore autenticazione manager evento');
      this.statusMessage.set(null);
      this.eventManagerToken.set(null);
    } finally {
      this.authenticatingManager.set(false);
    }
  }

  protected async handleRotateEventManagerPassword(): Promise<void> {
    const ev = this.selectedEvent();
    const token = this.authState.rootAuthToken();
    if (!ev || !token) return;
    const password = this.managerPasswordDraft();
    if (password.length < 8) {
      this.error.set('La nuova password evento deve avere almeno 8 caratteri.');
      this.statusMessage.set(null);
      return;
    }
    this.updatingManagerPassword.set(true);
    try {
      await firstValueFrom(this.eventsApi.updateEventManagerPassword(ev.id, password, token));
      this.managerPasswordDraft.set('');
      this.eventManagerToken.set(null);
      this.error.set(null);
      this.statusMessage.set('Password manager evento aggiornata con successo.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Errore nell'aggiornamento password evento");
      this.statusMessage.set(null);
    } finally {
      this.updatingManagerPassword.set(false);
    }
  }

  protected regenerateNewCandidateColor(): void {
    this.newCandidate.update((prev) => ({ ...prev, color: getRandomColor() }));
  }

  protected startEditingCandidate(candidate: CandidateData): void {
    this.editing.set(candidate.id);
    this.editDraft.set({ name: candidate.name, subtitle: candidate.subtitle ?? '', color: candidate.color });
    this.error.set(null);
    this.statusMessage.set(null);
  }

  protected cancelEditingCandidate(): void {
    this.editing.set(null);
    this.editDraft.set(null);
  }

  protected async saveEditingCandidate(id: string): Promise<void> {
    const draft = this.editDraft();
    const token = this.eventManagerToken();
    if (!draft || !token) return;
    try {
      const updated = await firstValueFrom(
        this.candidatesApi.updateCandidate(
          id,
          { name: draft.name, subtitle: draft.subtitle || null, color: draft.color },
          token,
        ),
      );
      this.candidates.update((prev) => prev.map((c) => (c.id === id ? updated : c)));
      this.editing.set(null);
      this.editDraft.set(null);
      this.error.set(null);
      this.statusMessage.set('Candidato aggiornato con successo.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore');
      this.statusMessage.set(null);
    }
  }

  protected async handleAddCandidate(): Promise<void> {
    const ev = this.selectedEvent();
    const token = this.eventManagerToken();
    if (!ev || !token) return;
    const draft = this.newCandidate();
    if (!draft.name) {
      this.error.set('Il nome del candidato è obbligatorio');
      this.statusMessage.set(null);
      return;
    }
    try {
      const nextNumber = getNextCandidateNumber(this.candidates());
      const candidate = await firstValueFrom(
        this.candidatesApi.addCandidate(ev.id, nextNumber, draft.name, token, draft.subtitle || undefined, draft.color),
      );
      this.candidates.update((prev) => [...prev, candidate].sort((a, b) => a.number - b.number));
      this.newCandidate.set({ name: '', subtitle: '', color: getRandomColor() });
      this.error.set(null);
      this.statusMessage.set('Nuovo candidato aggiunto correttamente.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore');
      this.statusMessage.set(null);
    }
  }

  protected confirmDeleteCandidate(id: string): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Elimina candidato', message: 'Sei sicuro di voler eliminare questo candidato?', confirmLabel: 'Elimina' },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) void this.deleteCandidate(id);
    });
  }

  private async deleteCandidate(id: string): Promise<void> {
    const token = this.eventManagerToken();
    try {
      if (!token) throw new Error('Accesso manager evento richiesto');
      await firstValueFrom(this.candidatesApi.deleteCandidate(id, token));
      const remaining = this.candidates().filter((c) => c.id !== id);
      const ordered = [...remaining].sort((a, b) => a.number - b.number);
      const renumbered = ordered.map((c, index) => ({ ...c, number: index + 1 }));
      this.candidates.set(renumbered);
      this.newCandidate.set({ name: '', subtitle: '', color: getRandomColor() });
      this.error.set(null);
      this.statusMessage.set('Candidato eliminato e numerazione aggiornata.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore');
      this.statusMessage.set(null);
    }
  }

  protected confirmStartRace(): void {
    const ev = this.selectedEvent();
    if (!ev) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Avvia gara',
        message: 'Vuoi avviare la gara? I voti precedenti saranno azzerati e i candidati verranno rinumerati progressivamente.',
        confirmLabel: 'Avvia',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) void this.startRace();
    });
  }

  private async startRace(): Promise<void> {
    const ev = this.selectedEvent();
    const token = this.eventManagerToken();
    if (!ev) return;
    try {
      if (!token) throw new Error('Accesso manager evento richiesto');
      const result = await firstValueFrom(this.eventsApi.startEvent(ev.id, token));
      this.candidates.set(result.candidates);
      this.votingClosed.set(result.votingClosed);
      this.events.update((prev) =>
        prev.map((e) => (e.id === ev.id ? { ...e, votingClosed: result.votingClosed, active: true } : e)),
      );
      this.newCandidate.set({ name: '', subtitle: '', color: getRandomColor() });
      this.editing.set(null);
      this.error.set(null);
      this.statusMessage.set('Gara avviata: voti azzerati e televoto sbloccato.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Errore nell'avvio della gara");
      this.statusMessage.set(null);
    }
  }

  protected confirmCloseTelevote(): void {
    const ev = this.selectedEvent();
    if (!ev) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Chiudi televoto',
        message: 'Vuoi chiudere il televoto? I voti non saranno più accettati e le modifiche torneranno disponibili.',
        confirmLabel: 'Chiudi',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) void this.closeTelevote();
    });
  }

  private async closeTelevote(): Promise<void> {
    const ev = this.selectedEvent();
    const token = this.eventManagerToken();
    if (!ev) return;
    try {
      if (!token) throw new Error('Accesso manager evento richiesto');
      const result = await firstValueFrom(this.eventsApi.updateEventVotingState(ev.id, true, token));
      this.votingClosed.set(result.votingClosed);
      this.events.update((prev) => prev.map((e) => (e.id === ev.id ? { ...e, votingClosed: result.votingClosed } : e)));
      this.error.set(null);
      this.statusMessage.set('Televoto chiuso con successo. Puoi modificare nuovamente i candidati.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Errore nella chiusura del televoto');
      this.statusMessage.set(null);
    }
  }

  protected confirmResetRanking(): void {
    const ev = this.selectedEvent();
    if (!ev) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Azzera classifica', message: 'Vuoi azzerare tutti i voti e ricominciare da capo?', confirmLabel: 'Azzera' },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) void this.resetRanking();
    });
  }

  private async resetRanking(): Promise<void> {
    const ev = this.selectedEvent();
    const token = this.eventManagerToken();
    if (!ev) return;
    try {
      if (!token) throw new Error('Accesso manager evento richiesto');
      await firstValueFrom(this.eventsApi.resetEventVotes(ev.id, token));
      this.error.set(null);
      this.statusMessage.set('Classifica azzerata con successo.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "Errore nell'azzeramento della classifica");
      this.statusMessage.set(null);
    }
  }
}
