import { Injectable } from '@angular/core';
import QRCode from 'qrcode';
import { GeneratedJudgeToken } from '../../api/judge-tokens.api';
import { escapeHtml, formatJudgeToken } from './judge-code-manager.util';

/**
 * Builds a self-contained `@media print` HTML document for the A4 hand-out of
 * voting codes. It deliberately does NOT use the app's "Palco/Studio" design
 * tokens: this is ink on paper (slate/sky hexes for print contrast, `mm` radii,
 * a monospace face for the code) and must render identically regardless of the
 * screen theme. Design-system audits can skip this file.
 */
@Injectable({ providedIn: 'root' })
export class PrintService {
  async printA4Sheet(tokens: GeneratedJudgeToken[]): Promise<void> {
    const items = await Promise.all(
      tokens.map(async (token) => {
        const qrDataUrl = await QRCode.toDataURL(token.url, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 520,
          color: { dark: '#111827', light: '#ffffff' },
        });
        return {
          label: token.label ?? 'Codice giudice',
          token: formatJudgeToken(token.token),
          url: token.url,
          qrDataUrl,
        };
      }),
    );

    const popup = window.open('about:blank', '_blank', 'width=1200,height=900');
    if (!popup) {
      throw new Error('Popup bloccato dal browser. Consenti i popup per stampare il foglio.');
    }

    const cardsHtml = items
      .map(
        (item) => `
          <article class="card">
            <img src="${item.qrDataUrl}" alt="QR ${escapeHtml(item.label)}" />
            <h3>${escapeHtml(item.label)}</h3>
            <p class="code">${escapeHtml(item.token)}</p>
            <p class="url">${escapeHtml(item.url)}</p>
          </article>
        `,
      )
      .join('');

    popup.document.open();
    popup.document.write(`
      <!doctype html>
      <html lang="it">
        <head>
          <meta charset="UTF-8" />
          <title>Stampa QR Giudici</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: "Inter", system-ui, -apple-system, sans-serif;
              color: #0f172a;
              background: #ffffff;
            }
            .toolbar {
              position: sticky;
              top: 0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 8px;
              padding: 10px 14px;
              border-bottom: 1px solid #e2e8f0;
              background: #f8fafc;
            }
            .toolbar p { margin: 0; font-size: 13px; color: #334155; }
            .toolbar button {
              border: 1px solid #0ea5e9;
              background: #e0f2fe;
              color: #0c4a6e;
              border-radius: 8px;
              font-weight: 600;
              padding: 6px 10px;
              cursor: pointer;
            }
            .content { padding: 10mm; }
            .sheet { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8mm; }
            .card { border: 1px solid #cbd5e1; border-radius: 4mm; padding: 4mm; break-inside: avoid; }
            .card img { width: 100%; max-width: 55mm; display: block; margin: 0 auto 3mm; }
            .card h3 { margin: 0 0 2mm; font-size: 12pt; text-align: center; }
            .code {
              margin: 0;
              font-size: 9pt;
              text-align: center;
              word-break: break-all;
              font-family: Consolas, "Courier New", monospace;
            }
            .url { margin: 2mm 0 0; font-size: 8pt; color: #475569; word-break: break-all; }
            @media print {
              .toolbar { display: none; }
              .content { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <p>Foglio QR A4 pronto. Se la stampa non parte automaticamente, usa il pulsante.</p>
            <button onclick="window.print()">Stampa ora</button>
          </div>
          <main class="content">
            <section class="sheet">${cardsHtml}</section>
          </main>
          <script>
            window.addEventListener("load", () => {
              setTimeout(() => window.print(), 200);
            });
          </script>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
  }
}
