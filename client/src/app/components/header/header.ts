import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-50 backdrop-blur-xl bg-bg-primary/85 border-b border-border-glass">
      <div class="max-w-2xl mx-auto px-4 h-14 flex flex-col justify-center">
        <h1 class="leading-none">
          <img
            src="/placeholders/televoto-logo-horizontal_480x120.svg"
            alt="Televoto"
            width="132"
            height="33"
            class="h-[33px] w-auto"
          />
        </h1>
        <p class="mt-1 text-[10px] tracking-[0.22em] uppercase text-text-muted leading-none">
          Vota. Partecipa. Fai la differenza.
        </p>
      </div>
    </header>
  `,
})
export class HeaderComponent {}
