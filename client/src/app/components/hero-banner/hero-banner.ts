import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { splitEventNameForDisplay } from '../../shared/event-name-display.util';

@Component({
  selector: 'app-hero-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative px-4 text-center" [class]="compact() ? 'mt-4 mb-1 py-3' : 'mt-6 mb-2 py-9'">
      <!-- ambient stage pool behind the title -->
      @if (!compact()) {
        <div
          aria-hidden="true"
          class="pointer-events-none absolute left-1/2 top-[42%] -z-10 h-44 w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] opacity-80 blur-3xl"
          style="background: radial-gradient(ellipse at center, rgba(255,176,32,0.16), transparent 72%)"
        ></div>
      }

      <!-- signature mark: descending bars -->
      <svg
        [attr.width]="compact() ? 22 : 30"
        [attr.height]="compact() ? 22 : 30"
        viewBox="0 0 30 30"
        class="mx-auto"
        [class]="compact() ? 'mb-2' : 'mb-4'"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="6" height="24" rx="2.5" fill="var(--color-accent-cyan)" />
        <rect x="12" y="9" width="6" height="18" rx="2.5" fill="var(--color-accent-cyan)" opacity="0.62" />
        <rect x="21" y="15" width="6" height="12" rx="2.5" fill="var(--color-accent-cyan)" opacity="0.36" />
      </svg>

      @if (nameParts().prefix) {
        <p
          class="flex items-center justify-center gap-3 font-semibold uppercase text-text-secondary"
          [class]="prefixClasses()"
        >
          <span aria-hidden="true" class="h-px w-6 bg-current opacity-40"></span>
          <span>{{ nameParts().prefix }}</span>
          <span aria-hidden="true" class="h-px w-6 bg-current opacity-40"></span>
        </p>
      }
      <h2 class="gradient-title font-bold uppercase text-balance" [class]="titleClasses()">
        {{ nameParts().emphasized }}
      </h2>
      <div class="mx-auto rounded-full bg-accent-cyan/70" [class]="compact() ? 'mt-3 h-0.5 w-12' : 'mt-5 h-0.5 w-16'"></div>
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
      ? 'text-[0.65rem] tracking-[0.22em]'
      : 'text-xs md:text-sm tracking-[0.34em]',
  );

  protected readonly titleClasses = computed(() => {
    const spacing = this.nameParts().prefix ? (this.compact() ? 'mt-1' : 'mt-3') : '';
    return this.compact()
      ? `${spacing} text-2xl md:text-3xl leading-[1.05]`
      : `${spacing} text-[2.6rem] sm:text-6xl md:text-7xl leading-[0.95] tracking-[-0.045em]`;
  });

  protected readonly subtitleClasses = computed(() =>
    this.compact() ? 'text-xs mt-2' : 'text-sm mt-4',
  );
}
