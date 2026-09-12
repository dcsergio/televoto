import { Routes } from '@angular/router';
import { VotingShellComponent } from './pages/voting-shell/voting-shell';
import { AdminShellComponent } from './pages/admin-shell/admin-shell';
import { EventManagerShellComponent } from './pages/event-manager-shell/event-manager-shell';
import { ScoreComponent } from './components/score/score';

export const routes: Routes = [
  { path: '', component: AdminShellComponent },
  { path: 'vote', component: VotingShellComponent },
  { path: 'manager', component: EventManagerShellComponent },
  { path: 'score', component: ScoreComponent },
  { path: '**', redirectTo: '' },
];
