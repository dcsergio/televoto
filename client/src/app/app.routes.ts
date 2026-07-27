import { Routes } from '@angular/router';
import { VotingShellComponent } from './pages/voting-shell/voting-shell';
import { AdminShellComponent } from './pages/admin-shell/admin-shell';
import { HallOfFameComponent } from './components/hall-of-fame/hall-of-fame';

export const routes: Routes = [
  { path: '', component: VotingShellComponent },
  { path: 'admin', component: AdminShellComponent },
  { path: 'hof', component: HallOfFameComponent },
  { path: '**', redirectTo: '' },
];
