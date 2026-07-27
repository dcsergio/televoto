import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-qr-code-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (qrError()) {
      <div class="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
        Impossibile generare il QR per questo link.
      </div>
    } @else if (!qrDataUrl()) {
      <div
        class="flex h-[124px] w-[124px] items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-xs text-text-secondary"
      >
        QR...
      </div>
    } @else {
      <div class="space-y-2">
        <img [src]="qrDataUrl()" [alt]="label()" class="h-[124px] w-[124px] rounded-xl border border-slate-700 bg-slate-950 p-1" />
        <a
          [href]="qrDataUrl()"
          [download]="label() + '.png'"
          class="inline-flex rounded-lg border border-slate-700 px-2 py-1 text-[11px] font-semibold text-text-primary transition hover:bg-slate-800"
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
        color: { dark: '#e2e8f0', light: '#0f172acc' },
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
