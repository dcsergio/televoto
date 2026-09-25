import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { firstValueFrom, map } from 'rxjs';
import { AuthStateService } from '../../state/auth-state.service';
import { ThemeStateService } from '../../state/theme-state.service';
import { VotingStateService } from '../../state/voting-state.service';
import { AuthApi } from '../../api/auth.api';
import { EventsApi } from '../../api/events.api';
import { EventCodeGateComponent } from '../../components/event-code-gate/event-code-gate';
import { ProtectedPageGateComponent } from '../../components/protected-page-gate/protected-page-gate';
import { EventCandidatesManagerComponent } from '../../components/event-candidates-manager/event-candidates-manager';
import { EventLifecycleControlsComponent, VotingStateChange } from '../../components/event-lifecycle-controls/event-lifecycle-controls';
import { JudgeCodeManagerComponent } from '../../components/judge-code-manager/judge-code-manager';
import { VotingProgressDashboardComponent } from '../../components/voting-progress-dashboard/voting-progress-dashboard';
import { ShellToolbarActionsComponent } from '../../components/shell-toolbar-actions/shell-toolbar-actions';
import { ToastService } from '../../shared/toast.service';
import { openScoreGuarded } from '../../shared/open-score.util';
import { buildPageTitle } from '../../shared/page-title.util';
import {
  EVENT_MANAGER_SECTION_NAV,
  EventManagerSection,
  LifecycleStep,
  contextualDefaultEventManagerSection,
  eventManagerSectionFromQueryParam,
  lifecycleSteps as buildLifecycleSteps,
} from './event-manager-shell.util';

@Component({
  selector: 'app-event-manager-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    EventCodeGateComponent,
    ProtectedPageGateComponent,
    EventCandidatesManagerComponent,
    EventLifecycleControlsComponent,
    JudgeCodeManagerComponent,
    VotingProgressDashboardComponent,
    ShellToolbarActionsComponent,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
  ],
  host: { class: 'theme-pro' },
  templateUrl: './event-manager-shell.html',
})
export class EventManagerShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly dialog = inject(MatDialog);
  private readonly authApi = inject(AuthApi);
  private readonly eventsApi = inject(EventsApi);
  protected readonly authState = inject(AuthStateService);
  protected readonly votingState = inject(VotingStateService);
  protected readonly toast = inject(ToastService);
  private readonly title = inject(Title);
  // Instantiated here (not only in the toolbar) so the saved light/dark choice
  // also applies to the event-code / password gates shown before login.
  private readonly themeState = inject(ThemeStateService);

  protected readonly passwordError = signal('');

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly eventCode = computed(() => this.queryParamMap().get('eventCode'));
  protected readonly activeSection = signal<EventManagerSection>(
    eventManagerSectionFromQueryParam(this.route.snapshot.queryParamMap.get('adminSection')),
  );

  /** True when the operator arrived with an explicit `?adminSection=` — suppresses the contextual default (C8). */
  private readonly hadExplicitSection = this.route.snapshot.queryParamMap.get('adminSection') !== null;
  private contextualDefaultApplied = false;

  protected readonly sectionNav = EVENT_MANAGER_SECTION_NAV;
  protected readonly isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map((result) => result.matches)),
    { initialValue: false },
  );
  protected readonly sidenavMode = computed<'over' | 'side'>(() => (this.isHandset() ? 'over' : 'side'));
  protected readonly sidenavOpened = signal(true);

  protected readonly event = this.votingState.event;
  protected readonly loading = this.votingState.loading;

  /** Slim «Candidati → Codici → Votazione → Classifica» orientation stepper in the shell header. */
  protected readonly lifecycleSteps = computed(() =>
    buildLifecycleSteps({
      candidateCount: this.event()?.candidates?.length ?? 0,
      votingClosed: this.event()?.votingClosed ?? true,
    }),
  );

  /** Root can operate any event's workspace without a separate manager-password prompt (backend already accepts role "root" on every manager-scoped route). */
  protected readonly activeToken = computed(() => this.authState.rootAuthToken() ?? this.authState.eventManagerAuthToken());
  protected readonly isAuthenticated = computed(() => this.activeToken() !== null);

  protected readonly eventNameDraft = signal('');
  protected readonly updatingEventName = signal(false);
  protected readonly eventPasswordDraft = signal({ currentPassword: '', newPassword: '', confirmPassword: '' });
  protected readonly updatingEventPassword = signal(false);

  /** Which settings block just saved — drives the inline "Salvato" confirmation. */
  protected readonly savedFlash = signal<'name' | 'password' | null>(null);

  protected readonly eventNameDirty = computed(() => {
    const ev = this.event();
    const draft = this.eventNameDraft().trim();
    return !!ev && draft.length > 0 && draft !== ev.name;
  });

  constructor() {
    effect(() => {
      this.sidenavOpened.set(!this.isHandset());
    });

    effect(() => {
      this.title.setTitle(buildPageTitle('Regia', this.event()?.name, this.event()?.code));
    });

    effect(() => {
      void this.votingState.loadEventByCode(this.eventCode(), false);
    });

    // C8 — contextual landing section for a freshly-opened event (only when the
    // URL didn't pin one). Runs once, after the event resolves.
    effect(() => {
      const ev = this.event();
      if (!ev || this.hadExplicitSection || this.contextualDefaultApplied) return;
      this.contextualDefaultApplied = true;
      const section = contextualDefaultEventManagerSection({
        candidateCount: ev.candidates?.length ?? 0,
        votingClosed: ev.votingClosed,
      });
      if (section !== this.activeSection()) {
        this.handleSectionChange(section);
      }
    });

    effect(() => {
      this.eventNameDraft.set(this.event()?.name ?? '');
    });
  }

  private flashSaved(key: 'name' | 'password'): void {
    this.savedFlash.set(key);
    setTimeout(() => {
      if (this.savedFlash() === key) this.savedFlash.set(null);
    }, 2500);
  }

  protected toggleSidenav(): void {
    this.sidenavOpened.update((opened) => !opened);
  }

  protected handleNavSelect(section: EventManagerSection): void {
    this.handleSectionChange(section);
    if (this.isHandset()) {
      this.sidenavOpened.set(false);
    }
  }

  protected handleSectionChange(section: EventManagerSection): void {
    this.activeSection.set(section);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { adminSection: section },
      queryParamsHandling: 'merge',
    });
  }

  protected handleLifecycleStepSelect(step: LifecycleStep): void {
    if (step.section) {
      this.handleNavSelect(step.section);
    } else {
      this.handleOpenScore();
    }
  }

  protected handleEventCodeSubmit(code: string): void {
    // Drop the stale error so a corrected code isn't stuck on the dead-end URL.
    this.votingState.eventLoadError.set(null);

    if (code === this.eventCode()) {
      // Same code re-submitted (retry after a failed load): the query param
      // wouldn't change, so trigger the reload explicitly.
      void this.votingState.loadEventByCode(code, false);
      return;
    }

    this.router.navigate([], { relativeTo: this.route, queryParams: { eventCode: code }, queryParamsHandling: 'merge' });
  }

  protected async handleLoginSubmit(password: string): Promise<void> {
    const ev = this.event();
    if (!ev) {
      this.passwordError.set('Evento non disponibile');
      return;
    }
    try {
      await this.authState.loginEventManager(ev.id, password);
      this.passwordError.set('');
    } catch (err) {
      this.passwordError.set(err instanceof Error ? err.message : 'Password errata');
    }
  }

  protected handleLoginCancel(): void {
    this.passwordError.set('');
    this.router.navigate(['/vote']);
  }

  protected handleBackToAdmin(): void {
    this.router.navigate(['/']);
    if (this.isHandset()) {
      this.sidenavOpened.set(false);
    }
  }

  protected handleLogout(): void {
    this.authState.logoutRoot();
    this.authState.logoutEventManager();
    this.router.navigate(['/vote']);
  }

  protected handleOpenPublicVoting(): void {
    const ev = this.event();
    if (!ev) return;
    window.open(`/vote?eventCode=${encodeURIComponent(ev.code)}`, '_blank', 'noopener,noreferrer');
  }

  protected handleOpenScore(): void {
    const ev = this.event();
    if (!ev) return;
    openScoreGuarded(this.dialog, ev.code, ev.votingClosed);
  }

  protected handleVotingStateChange(change: VotingStateChange): void {
    this.votingState.event.update((prev) =>
      prev ? { ...prev, votingClosed: change.votingClosed, candidates: change.candidates ?? prev.candidates } : prev,
    );
  }

  protected async handleUpdateEventName(): Promise<void> {
    const ev = this.event();
    const token = this.activeToken();
    if (!ev || !token) return;
    const trimmedName = this.eventNameDraft().trim();
    if (!trimmedName) {
      this.toast.error("Il nome evento è obbligatorio");
      return;
    }
    if (trimmedName === ev.name) {
      return;
    }
    this.updatingEventName.set(true);
    try {
      const updated = await firstValueFrom(this.eventsApi.updateEventNameAsManager(ev.id, trimmedName, token));
      this.votingState.event.update((prev) => (prev ? { ...prev, name: updated.name } : prev));
      this.eventNameDraft.set(updated.name);
      this.flashSaved('name');
      this.toast.success('Nome evento aggiornato');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Errore');
    } finally {
      this.updatingEventName.set(false);
    }
  }

  protected async handleUpdateEventPassword(): Promise<void> {
    const ev = this.event();
    const token = this.activeToken();
    if (!ev || !token) return;
    const { currentPassword, newPassword, confirmPassword } = this.eventPasswordDraft();
    if (currentPassword.length < 8 || newPassword.length < 8) {
      this.toast.error('Le password evento devono avere almeno 8 caratteri.');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.toast.error('La conferma della nuova password non corrisponde.');
      return;
    }
    this.updatingEventPassword.set(true);
    try {
      await firstValueFrom(this.authApi.changeEventManagerPassword(ev.id, token, currentPassword, newPassword));
      this.eventPasswordDraft.set({ currentPassword: '', newPassword: '', confirmPassword: '' });
      this.flashSaved('password');
      this.toast.success('Password evento aggiornata');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : "Errore nell'aggiornamento password evento");
    } finally {
      this.updatingEventPassword.set(false);
    }
  }
}
