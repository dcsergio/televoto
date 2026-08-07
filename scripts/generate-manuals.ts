/**
 * Genera i PDF dei manuali Televoto a partire dai sorgenti HTML/CSS in
 * `docs/manuals/src/<locale>/<id>.html`, usando Chromium via Playwright
 * (`page.pdf()`).
 *
 * Esecuzione: `tsx scripts/generate-manuals.ts [--locale=it|en]`
 * (esposto anche come `npm run docs:manuals`)
 *
 * Se il flag `--locale` è omesso, genera i manuali per entrambe le lingue.
 * Se un sorgente HTML per una data combinazione id/locale non esiste ancora,
 * lo script salta quel file con un warning invece di interrompersi: è
 * pensato per essere eseguibile anche a manuali parzialmente scritti.
 */

import { chromium } from "playwright";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { readFile, mkdir, stat } from "node:fs/promises";
import { extname, join, resolve, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");
const srcRoot = join(repoRoot, "docs", "manuals", "src");
const outRoot = join(repoRoot, "docs", "manuals");

const LOCALES = ["it", "en"] as const;
type Locale = (typeof LOCALES)[number];

/**
 * Ogni manuale ha un filename diverso per lingua (i sorgenti/PDF inglesi
 * usano nomi in inglese, non una traduzione letterale degli id italiani).
 */
const MANUALS: Record<Locale, string>[] = [
  { it: "guida-giudici", en: "how-to-vote" },
  { it: "manuale-admin", en: "admin-manual" },
  { it: "manuale-manager", en: "manager-guide" },
  { it: "panoramica-generale", en: "general-overview" },
];

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function parseCliLocale(argv: string[]): Locale[] {
  const flag = argv.find((arg) => arg.startsWith("--locale="));
  if (!flag) return [...LOCALES];

  const value = flag.slice("--locale=".length).trim();
  if ((LOCALES as readonly string[]).includes(value)) {
    return [value as Locale];
  }

  console.warn(
    `[generate-manuals] Valore --locale="${value}" non riconosciuto, uso entrambe le lingue (${LOCALES.join(", ")}).`,
  );
  return [...LOCALES];
}

/** Piccolo file server statico per `docs/manuals/src/`, così `page.pdf()` risolve correttamente i link relativi (evitando i problemi di `file://`). */
function startStaticServer(root: string): Promise<{ server: Server; port: number }> {
  return new Promise((resolvePromise, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? "/", "http://127.0.0.1");
        const decodedPath = decodeURIComponent(url.pathname);
        const requestedPath = normalize(join(root, decodedPath));

        // Difesa base contro path traversal fuori da `root`.
        if (!requestedPath.startsWith(normalize(root) + sep) && requestedPath !== normalize(root)) {
          res.writeHead(403).end("Forbidden");
          return;
        }

        const fileStat = await stat(requestedPath).catch(() => null);
        if (!fileStat || !fileStat.isFile()) {
          res.writeHead(404).end("Not found");
          return;
        }

        const contentType = MIME_TYPES[extname(requestedPath).toLowerCase()] ?? "application/octet-stream";
        const body = await readFile(requestedPath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(body);
      } catch (err) {
        res.writeHead(500).end("Internal error");
        console.error("[generate-manuals] Errore nel server statico:", err);
      }
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Impossibile determinare la porta del server statico."));
        return;
      }
      resolvePromise({ server, port: address.port });
    });
  });
}

type JobResult =
  | { status: "generated"; id: string; filename: string; locale: Locale; outPath: string }
  | { status: "skipped"; id: string; filename: string; locale: Locale; reason: string }
  | { status: "failed"; id: string; filename: string; locale: Locale; error: unknown };

async function main() {
  const locales = parseCliLocale(process.argv.slice(2));
  const jobs: { id: string; filename: string; locale: Locale }[] = [];
  for (const locale of locales) {
    for (const manual of MANUALS) {
      jobs.push({ id: manual.it, filename: manual[locale], locale });
    }
  }

  console.log(
    `[generate-manuals] Genero ${jobs.length} manuale/i (locale: ${locales.join(", ")})...`,
  );

  const { server, port } = await startStaticServer(srcRoot);
  console.log(`[generate-manuals] Server statico avviato su http://127.0.0.1:${port} (root: ${srcRoot})`);

  const browser = await chromium.launch();
  const results: JobResult[] = [];

  try {
    for (const { id, filename, locale } of jobs) {
      const htmlPath = join(srcRoot, locale, `${filename}.html`);
      const htmlExists = await stat(htmlPath).then(
        (s) => s.isFile(),
        () => false,
      );

      if (!htmlExists) {
        const reason = `sorgente HTML non trovato: docs/manuals/src/${locale}/${filename}.html`;
        console.warn(`[generate-manuals] SKIP ${locale}/${filename}: ${reason}`);
        results.push({ status: "skipped", id, filename, locale, reason });
        continue;
      }

      const outDir = join(outRoot, locale);
      const outPath = join(outDir, `${filename}.pdf`);

      try {
        await mkdir(outDir, { recursive: true });

        const page = await browser.newPage();
        try {
          const url = `http://127.0.0.1:${port}/${locale}/${filename}.html`;
          await page.goto(url, { waitUntil: "networkidle" });
          await page.pdf({
            path: outPath,
            format: "A4",
            printBackground: true,
            margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
            displayHeaderFooter: true,
            headerTemplate: "<span></span>",
            footerTemplate:
              '<div style="font-size:9px;width:100%;text-align:center;color:#888;">Televoto — <span class="pageNumber"></span>/<span class="totalPages"></span></div>',
          });
        } finally {
          await page.close();
        }

        console.log(`[generate-manuals] OK ${locale}/${filename} -> docs/manuals/${locale}/${filename}.pdf`);
        results.push({ status: "generated", id, filename, locale, outPath });
      } catch (error) {
        console.error(`[generate-manuals] ERRORE ${locale}/${filename}:`, error);
        results.push({ status: "failed", id, filename, locale, error });
      }
    }
  } finally {
    await browser.close();
    await new Promise<void>((res) => server.close(() => res()));
  }

  const generated = results.filter((r) => r.status === "generated");
  const skipped = results.filter((r) => r.status === "skipped");
  const failed = results.filter((r) => r.status === "failed");

  console.log("\n[generate-manuals] Riepilogo:");
  console.log(`  Generati: ${generated.length}`);
  for (const r of generated) {
    console.log(`    - ${r.locale}/${r.filename}.pdf`);
  }
  console.log(`  Saltati:  ${skipped.length}`);
  for (const r of skipped) {
    console.log(`    - ${r.locale}/${r.filename}: ${r.reason}`);
  }
  console.log(`  Falliti:  ${failed.length}`);
  for (const r of failed) {
    console.log(`    - ${r.locale}/${r.filename}`);
  }

  if (jobs.length > 0 && generated.length === 0 && failed.length > 0) {
    console.error("\n[generate-manuals] Tutti i job sono falliti.");
    process.exitCode = 1;
  } else if (jobs.length > 0 && generated.length === 0 && skipped.length === jobs.length) {
    // Nessun errore fatale: semplicemente non c'è ancora nessun sorgente HTML pronto.
    console.warn("\n[generate-manuals] Nessun sorgente HTML trovato: nessun PDF generato (solo skip).");
  }
}

main().catch((error) => {
  console.error("[generate-manuals] Errore fatale:", error);
  process.exitCode = 1;
});
