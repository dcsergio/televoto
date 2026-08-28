import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs';
import { AuthStateService } from '../../state/auth-state.service';
import { VotingStateService } from '../../state/voting-state.service';
import { EventCodeGateComponent } from '../../components/event-code-gate/event-code-gate';
import { ProtectedPageGateComponent } from '../../components/protected-page-gate/protected-page-gate';
import { EventCandidatesManagerComponent } from '../../components/event-candidates-manager/event-candidates-manager';
import { EventLifecycleControlsComponent, VotingStateChange } from '../../components/event-lifecycle-controls/event-lifecycle-controls';
import { JudgeCodeManagerComponent } from '../../components/judge-code-manager/judge-code-manager';
import { VotingProgressDashboardComponent } from '../../components/voting-progress-dashboard/voting-progress-dashboard';
import { openScoreGuarded } from '../../shared/open-score.util';
import {
  EVENT_MANAGER_SECTION_NAV,
  EventManagerSection,
  contextualDefaultEventManagerSection,
  eventManagerSectionFromQueryParam,
} from './event-manager-shell.util';

@Component({
  selector: 'app-event-manager-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    EventCodeGateComponent,
    ProtectedPageGateComponent,
    EventCandidatesManagerComponent,
    EventLifecycleControlsComponent,
    JudgeCodeManagerComponent,
    VotingProgressDashboardComponent,
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
  protected readonly authState = inject(AuthStateService);
  protected readonly votingState = inject(VotingStateService);

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

  /** Root can operate any event's workspace without a separate manager-password prompt (backend already accepts role "root" on every manager-scoped route). */
  protected readonly activeToken = computed(() => this.authState.rootAuthToken() ?? this.authState.eventManagerAuthToken());
  protected readonly isAuthenticated = computed(() => this.activeToken() !== null);

  constructor() {
    effect(() => {
      this.sidenavOpened.set(!this.isHandset());
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
    this.router.navigate(['/']);
  }

  protected handleBackToAdmin(): void {
    this.router.navigate(['/admin']);
    if (this.isHandset()) {
      this.sidenavOpened.set(false);
    }
  }

  protected handleLogout(): void {
    this.authState.logoutRoot();
    this.authState.logoutEventManager();
    this.router.navigate(['/']);
  }

  protected handleOpenPublicVoting(): void {
    const ev = this.event();
    if (!ev) return;
    window.open(`/?eventCode=${encodeURIComponent(ev.code)}`, '_blank', 'noopener,noreferrer');
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
}
