import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { splitEventNameForDisplay } from '../../shared/event-name-display.util';

@Component({
  selector: 'app-hero-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative mt-6 mb-2 text-center px-4"
      [class.py-3]="compact()"
      [class.py-7]="!compact()"
    >
      @if (nameParts().prefix) {
        <p
          class="font-semibold tracking-[0.2em] uppercase text-text-secondary text-xs"
          [class.md:text-sm]="!compact()"
        >
          {{ nameParts().prefix }}
        </p>
      }
      <h2
        class="gradient-title font-bold uppercase leading-[1.05]"
        [class.mt-1]="nameParts().prefix"
        [class.text-2xl]="compact()"
        [class.md:text-3xl]="compact()"
        [class.text-4xl]="!compact()"
        [class.md:text-5xl]="!compact()"
        [class.lg:text-6xl]="!compact()"
      >
        {{ nameParts().emphasized }}
      </h2>
      <div class="mx-auto mt-3 h-px w-16 bg-accent-cyan/60"></div>
      @if (subtitle()) {
        <p class="text-text-muted" [class.text-xs]="compact()" [class.mt-2]="compact()" [class.text-sm]="!compact()" [class.mt-3]="!compact()">
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
