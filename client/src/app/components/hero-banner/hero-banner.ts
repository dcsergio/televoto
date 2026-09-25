import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { splitEventNameForDisplay } from '../../shared/event-name-display.util';

@Component({
  selector: 'app-hero-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative mt-6 mb-2 px-4 text-center" [class]="compact() ? 'py-3' : 'py-8'">
      <!-- alpine horizon glow behind the wordmark (DESIGN.md: hero only) -->
      @if (!compact()) {
        <div
          aria-hidden="true"
          class="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-40 w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
          style="background: var(--gradient-alpine)"
        ></div>
      }

      @if (nameParts().prefix) {
        <p class="font-semibold uppercase text-text-secondary" [class]="prefixClasses()">
          {{ nameParts().prefix }}
        </p>
      }
      <h2 class="gradient-title font-bold uppercase text-balance" [class]="titleClasses()">
        {{ nameParts().emphasized }}
      </h2>
      <div class="mx-auto h-0.5 rounded-full bg-accent-cyan/70" [class]="compact() ? 'mt-3 w-12' : 'mt-5 w-16'"></div>
      @if (subtitle()) {
        <p class="mx-auto max-w-[46ch] text-text-muted text-pretty" [class]="subtitleClasses()">
          {{ subtitle() }}
        </p>
      }
    </div>
  `,
})
export class HeroBannerComponent {
  readonly name = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly compact = input(false);

  protected readonly nameParts = computed(() => splitEventNameForDisplay(this.name()));

  protected readonly prefixClasses = computed(() =>
    this.compact()
      ? 'text-[0.65rem] tracking-[0.015em]'
      : 'text-xs md:text-sm tracking-[0.015em]',
  );

  protected readonly titleClasses = computed(() => {
    const spacing = this.nameParts().prefix ? (this.compact() ? 'mt-1' : 'mt-2') : '';
    return this.compact()
      ? `${spacing} text-2xl md:text-3xl leading-[1.05]`
      : `${spacing} text-[2.6rem] sm:text-6xl md:text-7xl leading-[1.2] tracking-[0.003em]`;
  });

  protected readonly subtitleClasses = computed(() =>
    this.compact() ? 'text-xs mt-2' : 'text-sm mt-4',
  );
}
