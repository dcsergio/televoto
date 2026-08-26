/**
 * Genera i PDF dei manuali Televoto a partire dai sorgenti Typst in
 * `docs/manuals/typ/<locale>/<id>.typ`, invocando il binario `typst`.
 *
 * Esecuzione: `tsx scripts/generate-manuals-typ.ts [--locale=it|en]`
 * (esposto anche come `npm run docs:manuals:typ`)
 *
 * I sorgenti condividono `docs/manuals/typ/lib.typ` (sistema tipografico:
 * palette, cover, indice, callout, card, tabelle). L'output finisce in
 * `docs/manuals/<locale>/<id>.pdf`, gli stessi percorsi usati dalla vecchia
 * pipeline HTML/Chromium (`scripts/generate-manuals.ts`).
 *
 * Requisito: `typst` deve essere installato e nel PATH (https://typst.app).
 * Se un sorgente `.typ` per una data combinazione id/locale non esiste, lo
 * script lo salta con un warning invece di interrompersi.
 */

import { spawnSync } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");
const typRoot = join(repoRoot, "docs", "manuals", "typ");
const outRoot = join(repoRoot, "docs", "manuals");

const LOCALES = ["it", "en"] as const;
type Locale = (typeof LOCALES)[number];

/** Ogni manuale ha un filename diverso per lingua (vedi generate-manuals.ts). */
const MANUALS: Record<Locale, string>[] = [
  { it: "guida-giudici", en: "how-to-vote" },
  { it: "manuale-admin", en: "admin-manual" },
  { it: "manuale-manager", en: "manager-guide" },
  { it: "panoramica-generale", en: "general-overview" },
];

function parseCliLocale(argv: string[]): Locale[] {
  const flag = argv.find((arg) => arg.startsWith("--locale="));
  if (!flag) return [...LOCALES];
  const value = flag.slice("--locale=".length).trim();
  if ((LOCALES as readonly string[]).includes(value)) return [value as Locale];
  console.warn(
    `[generate-manuals-typ] Valore --locale="${value}" non riconosciuto, uso entrambe le lingue (${LOCALES.join(", ")}).`,
  );
  return [...LOCALES];
}

async function fileExists(path: string): Promise<boolean> {
  return stat(path).then(
    (s) => s.isFile(),
    () => false,
  );
}

async function main() {
  const locales = parseCliLocale(process.argv.slice(2));
  const jobs: { id: string; filename: string; locale: Locale }[] = [];
  for (const locale of locales) {
    for (const manual of MANUALS) {
      jobs.push({ id: manual.it, filename: manual[locale], locale });
    }
  }

  // Verifica che `typst` sia disponibile.
  const probe = spawnSync("typst", ["--version"], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) {
    console.error(
      "[generate-manuals-typ] Binario `typst` non trovato nel PATH. Installa Typst: https://github.com/typst/typst#installation",
    );
    process.exitCode = 1;
    return;
  }
  console.log(`[generate-manuals-typ] ${probe.stdout.trim()}`);

  const generated: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const { filename, locale } of jobs) {
    const src = join(typRoot, locale, `${filename}.typ`);
    if (!(await fileExists(src))) {
      const reason = `sorgente Typst non trovato: docs/manuals/typ/${locale}/${filename}.typ`;
      console.warn(`[generate-manuals-typ] SKIP ${locale}/${filename}: ${reason}`);
      skipped.push(`${locale}/${filename}`);
      continue;
    }

    const outDir = join(outRoot, locale);
    await mkdir(outDir, { recursive: true });
    const out = join(outDir, `${filename}.pdf`);

    const res = spawnSync("typst", ["compile", "--root", typRoot, src, out], {
      encoding: "utf8",
      stdio: ["ignore", "inherit", "inherit"],
    });

    if (res.status === 0) {
      console.log(`[generate-manuals-typ] OK ${locale}/${filename} -> docs/manuals/${locale}/${filename}.pdf`);
      generated.push(`${locale}/${filename}`);
    } else {
      console.error(`[generate-manuals-typ] ERRORE ${locale}/${filename}`);
      failed.push(`${locale}/${filename}`);
    }
  }

  console.log("\n[generate-manuals-typ] Riepilogo:");
  console.log(`  Generati: ${generated.length}`);
  for (const r of generated) console.log(`    - ${r}.pdf`);
  console.log(`  Saltati:  ${skipped.length}`);
  for (const r of skipped) console.log(`    - ${r}`);
  console.log(`  Falliti:  ${failed.length}`);
  for (const r of failed) console.log(`    - ${r}`);

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("[generate-manuals-typ] Errore fatale:", error);
  process.exitCode = 1;
});
