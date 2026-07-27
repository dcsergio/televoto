import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { splitEventNameForDisplay } from '../../shared/event-name-display.util';

@Component({
  selector: 'app-hero-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative mt-6 mb-2 text-center overflow-hidden rounded-2xl px-4"
      [class.py-4]="compact()"
      [class.py-8]="!compact()"
    >
      <div class="absolute inset-0 -z-10">
        <div class="absolute top-0 left-1/4 w-40 h-40 bg-accent-magenta/20 rounded-full blur-[80px]"></div>
        <div class="absolute bottom-0 right-1/4 w-40 h-40 bg-accent-cyan/15 rounded-full blur-[80px]"></div>
        <div
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-accent-violet/10 rounded-full blur-[60px]"
        ></div>
      </div>

      @if (!compact()) {
        <div class="text-accent-cyan text-2xl mb-2">&#10022;</div>
      }

      @if (nameParts().prefix) {
        <p
          class="font-semibold tracking-wide uppercase text-text-secondary"
          [class.text-xs]="compact()"
          [class.text-sm]="!compact()"
          [class.md:text-base]="!compact()"
        >
          {{ nameParts().prefix }}
        </p>
      }
      <h2
        class="font-black uppercase gradient-title leading-tight mt-1"
        [class.text-2xl]="compact()"
        [class.md:text-3xl]="compact()"
        [class.text-4xl]="!compact()"
        [class.md:text-5xl]="!compact()"
        [class.lg:text-6xl]="!compact()"
      >
        {{ nameParts().emphasized }}
      </h2>
      @if (subtitle()) {
        <p class="text-text-muted" [class.text-xs]="compact()" [class.mt-1]="compact()" [class.text-sm]="!compact()" [class.mt-2]="!compact()">
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
}
