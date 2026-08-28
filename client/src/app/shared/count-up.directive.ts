import { Directive, ElementRef, OnDestroy, inject, input, effect } from '@angular/core';

/**
 * Animates the host element's text from 0 up to the bound number.
 * Used for the final-score reveal on the Classifica presenter stage.
 * Honors prefers-reduced-motion (renders the final value immediately).
 */
@Directive({
  selector: '[appCountUp]',
})
export class CountUpDirective implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);

  readonly appCountUp = input.required<number>();
  readonly appCountUpDecimals = input(2);
  readonly appCountUpDurationMs = input(1200);

  private frame = 0;

  constructor() {
    effect(() => {
      const target = this.appCountUp();
      const decimals = this.appCountUpDecimals();
      this.cancel();

      const prefersReduced =
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced || !Number.isFinite(target)) {
        this.render(target, decimals);
        return;
      }

      const duration = this.appCountUpDurationMs();
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        this.render(target * eased, decimals);
        if (progress < 1) {
          this.frame = requestAnimationFrame(tick);
        }
      };
      this.frame = requestAnimationFrame(tick);
    });
  }

  private render(value: number, decimals: number): void {
    this.el.nativeElement.textContent = value.toLocaleString('it-IT', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  private cancel(): void {
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
  }

  ngOnDestroy(): void {
    this.cancel();
  }
}
