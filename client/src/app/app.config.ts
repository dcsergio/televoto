import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';

import { routes } from './app.routes';
import { authInterceptor } from './api/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Every MatDialog in the app is an admin/manager confirm dialog, and those
    // shells render on the light "Studio" theme (`.theme-pro`). The dialog opens
    // in the CDK overlay, outside the shell subtree, so it needs the class on its
    // own pane to pick up the light tokens. A public-side dialog would override.
    { provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: { panelClass: 'theme-pro' } },
  ]
};
