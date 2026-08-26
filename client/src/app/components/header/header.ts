import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-50 backdrop-blur-xl bg-bg-primary/85 border-b border-border-glass">
      <div class="max-w-2xl mx-auto px-4 h-14 flex items-center gap-2.5">
        <span class="h-4 w-1 rounded-full bg-accent-cyan"></span>
        <div>
          <h1 class="neon-text text-base font-bold tracking-[0.14em] uppercase leading-none text-text-primary">
            Televoto
          </h1>
          <p class="text-[10px] tracking-[0.22em] uppercase text-text-muted leading-none mt-1">
            Vota. Partecipa. Fai la differenza.
          </p>
        </div>
      </div>
    </header>
  `,
})
export class HeaderComponent {}
