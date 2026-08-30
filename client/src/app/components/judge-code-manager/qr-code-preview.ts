import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-qr-code-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (qrError()) {
      <div class="notice notice-danger text-xs"><span>Impossibile generare il QR per questo link.</span></div>
    } @else if (!qrDataUrl()) {
      <div
        class="flex h-[124px] w-[124px] items-center justify-center rounded-xl border border-border-glass bg-bg-primary text-xs text-text-secondary"
      >
        QR...
      </div>
    } @else {
      <div class="space-y-2">
        <img [src]="qrDataUrl()" [alt]="label()" class="h-[124px] w-[124px] rounded-xl border border-border-glass bg-bg-primary p-1" />
        <a
          [href]="qrDataUrl()"
          [download]="label() + '.png'"
          class="inline-flex rounded-lg border border-border-glass px-2 py-1 text-[0.625rem] font-semibold text-text-primary transition hover:bg-bg-secondary"
        >
          Scarica PNG
        </a>
      </div>
    }
  `,
})
export class QrCodePreviewComponent {
  readonly value = input.required<string>();
  readonly label = input.required<string>();

  protected readonly qrDataUrl = signal<string | null>(null);
  protected readonly qrError = signal(false);

  constructor() {
    effect(() => {
      const value = this.value();
      this.qrDataUrl.set(null);
      this.qrError.set(false);
      let cancelled = false;

      QRCode.toDataURL(value, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 240,
        color: { dark: '#f4f4f5', light: '#0f0f12cc' },
      })
        .then((url) => {
          if (!cancelled) this.qrDataUrl.set(url);
        })
        .catch(() => {
          if (!cancelled) this.qrError.set(true);
        });

      return () => {
        cancelled = true;
      };
    });
  }
}
