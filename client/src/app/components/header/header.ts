import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-50 backdrop-blur-xl bg-bg-primary/80 border-b border-border-glass">
      <div class="max-w-2xl mx-auto px-4 h-14 flex items-center">
        <div>
          <h1 class="text-lg font-extrabold tracking-wider uppercase neon-text leading-none">
            Televoto
          </h1>
          <p class="text-[10px] tracking-[0.2em] uppercase text-text-muted leading-none mt-0.5">
            Vota. Partecipa. Fai la differenza.
          </p>
        </div>
      </div>
    </header>
  `,
})
export class HeaderComponent {}
