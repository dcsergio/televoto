import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
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
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { firstValueFrom, map } from 'rxjs';
import { AuthStateService } from '../../state/auth-state.service';
import { VotingStateService } from '../../state/voting-state.service';
import { JudgeTokensApi, JudgeTokenRecord } from '../../api/judge-tokens.api';
import { EventCodeGateComponent } from '../../components/event-code-gate/event-code-gate';
import { ProtectedPageGateComponent } from '../../components/protected-page-gate/protected-page-gate';
import { EventCandidatesManagerComponent } from '../../components/event-candidates-manager/event-candidates-manager';
import { EventLifecycleControlsComponent, VotingStateChange } from '../../components/event-lifecycle-controls/event-lifecycle-controls';
import { JudgeCodeManagerComponent } from '../../components/judge-code-manager/judge-code-manager';
import { VotingProgressDashboardComponent } from '../../components/voting-progress-dashboard/voting-progress-dashboard';
import {
  EVENT_MANAGER_SECTION_NAV,
  EventManagerSection,
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
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
  ],
  templateUrl: './event-manager-shell.html',
})
export class EventManagerShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly judgeTokensApi = inject(JudgeTokensApi);
  private readonly breakpointObserver = inject(BreakpointObserver);
  protected readonly authState = inject(AuthStateService);
  protected readonly votingState = inject(VotingStateService);

  protected readonly passwordError = signal('');

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly eventCode = computed(() => this.queryParamMap().get('eventCode'));
  protected readonly activeSection = signal<EventManagerSection>(
    eventManagerSectionFromQueryParam(this.route.snapshot.queryParamMap.get('adminSection')),
  );

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

  protected readonly judgeTokens = signal<JudgeTokenRecord[]>([]);
  protected readonly judgeTokensLoading = signal(false);
  protected readonly judgeTokenStats = computed(() => {
    const tokens = this.judgeTokens();
    return {
      total: tokens.length,
      qualificata: tokens.filter((t) => t.type === 'QUALIFICATA').length,
      popolare: tokens.filter((t) => t.type === 'POPOLARE').length,
      active: tokens.filter((t) => t.status === 'active').length,
      used: tokens.filter((t) => t.status === 'used').length,
      revoked: tokens.filter((t) => t.status === 'revoked').length,
    };
  });

  private lastJudgeTokensKey: string | null = null;

  constructor() {
    effect(() => {
      this.sidenavOpened.set(!this.isHandset());
    });

    effect(() => {
      void this.votingState.loadEventByCode(this.eventCode(), false);
    });

    effect(() => {
      const ev = this.event();
      const token = this.activeToken();
      if (!ev || !token) {
        this.judgeTokens.set([]);
        return;
      }
      const key = `${ev.id}:${token}`;
      if (key === this.lastJudgeTokensKey) return;
      this.lastJudgeTokensKey = key;
      void this.loadJudgeTokens(ev.id, token);
    });
  }

  private async loadJudgeTokens(eventId: string, token: string): Promise<void> {
    this.judgeTokensLoading.set(true);
    try {
      const data = await firstValueFrom(this.judgeTokensApi.fetchJudgeTokens(eventId, token));
      this.judgeTokens.set(data);
    } catch {
      this.judgeTokens.set([]);
    } finally {
      this.judgeTokensLoading.set(false);
    }
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

  protected handleOpenHallOfFame(): void {
    const ev = this.event();
    if (!ev) return;
    window.open(`/hof?eventCode=${encodeURIComponent(ev.code)}`, '_blank', 'noopener,noreferrer');
  }

  protected handleVotingStateChange(change: VotingStateChange): void {
    this.votingState.event.update((prev) =>
      prev ? { ...prev, votingClosed: change.votingClosed, candidates: change.candidates ?? prev.candidates } : prev,
    );
  }
}
