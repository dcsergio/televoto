import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import QRCode from "qrcode";
import type { GeneratedJudgeToken, JudgeTokenRecord, JudgeTokenValidationResult } from "../api";
import { fetchJudgeTokens, generateJudgeTokens, revokeJudgeToken, validateJudgeToken } from "../api";

interface JudgeCodeManagerProps {
  readonly eventId: string;
}

const defaultGeneratorForm = {
  count: 5,
  length: 32,
  labelPrefix: "Giudice",
  baseUrl: "",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("it-IT");
}

function getStatusLabel(status: JudgeTokenRecord["status"] | "invalid") {
  if (status === "used") return "Usato";
  if (status === "revoked") return "Revocato";
  if (status === "invalid") return "Non valido";
  return "Attivo";
}

function getStatusClass(status: JudgeTokenRecord["status"] | "invalid") {
  if (status === "used") return "border-amber-500/30 bg-amber-500/15 text-amber-200";
  if (status === "revoked") return "border-red-500/30 bg-red-500/15 text-red-200";
  if (status === "invalid") return "border-slate-500/30 bg-slate-500/15 text-slate-200";
  return "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
}

async function copyToClipboard(value: string) {
  await globalThis.navigator.clipboard.writeText(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function QrCodePreview({ value, label }: { readonly value: string; readonly label: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setQrDataUrl(null);
    setQrError(false);

    QRCode.toDataURL(value, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
      color: {
        dark: "#e2e8f0",
        light: "#0f172acc",
      },
    })
      .then((url: string) => {
        if (!cancelled) {
          setQrDataUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  if (qrError) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
        Impossibile generare il QR per questo link.
      </div>
    );
  }

  if (!qrDataUrl) {
    return (
      <div className="flex h-[124px] w-[124px] items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-xs text-text-secondary">
        QR...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <img
        src={qrDataUrl}
        alt={label}
        className="h-[124px] w-[124px] rounded-xl border border-slate-700 bg-slate-950 p-1"
      />
      <a
        href={qrDataUrl}
        download={`${label}.png`}
        className="inline-flex rounded-lg border border-slate-700 px-2 py-1 text-[11px] font-semibold text-text-primary transition hover:bg-slate-800"
      >
        Scarica PNG
      </a>
    </div>
  );
}

export function JudgeCodeManager({ eventId }: JudgeCodeManagerProps) {
  const [tokens, setTokens] = useState<JudgeTokenRecord[]>([]);
  const [generatedTokens, setGeneratedTokens] = useState<GeneratedJudgeToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [validationInput, setValidationInput] = useState("");
  const [validationResult, setValidationResult] = useState<JudgeTokenValidationResult | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatorForm, setGeneratorForm] = useState(() => ({
    ...defaultGeneratorForm,
    baseUrl: globalThis.location.origin,
  }));
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const applyTokenSnapshot = useCallback((snapshot: JudgeTokenRecord[]) => {
    setTokens(snapshot);
    setGeneratedTokens((prev) =>
      prev.map((token) => {
        const updated = snapshot.find((entry) => entry.id === token.id);
        return updated ? { ...token, ...updated } : token;
      })
    );
  }, []);

  const loadTokens = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchJudgeTokens(eventId);
      applyTokenSnapshot(data);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Errore nel caricamento codici";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [eventId, applyTokenSnapshot]);

  useEffect(() => {
    loadTokens();
    setGeneratedTokens([]);
    setValidationInput("");
    setValidationResult(null);
  }, [loadTokens]);

  useEffect(() => {
    const stream = new EventSource(`/api/events/${eventId}/judge-tokens/stream`);

    stream.onmessage = (message) => {
      try {
        const payload = JSON.parse(message.data) as { eventId: string; tokens: JudgeTokenRecord[] };
        if (payload.eventId === eventId) {
          applyTokenSnapshot(payload.tokens);
          setError(null);
        }
      } catch {
        setError("Aggiornamento live non valido");
      }
    };

    stream.onerror = () => {
      setError(null);
    };

    return () => stream.close();
  }, [eventId, applyTokenSnapshot]);

  const handleGenerate = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGenerating(true);
    setError(null);

    try {
      const originInput = generatorForm.baseUrl.trim();
      if (!originInput) {
        throw new Error("Inserisci un Base URL valido");
      }

      let origin: string;
      try {
        origin = new URL(originInput).origin;
      } catch {
        throw new Error("Base URL non valido. Esempio: https://televoto.it");
      }

      const result = await generateJudgeTokens(eventId, {
        count: generatorForm.count,
        length: generatorForm.length,
        labelPrefix: generatorForm.labelPrefix,
        origin,
      });
      setGeneratedTokens(result.codes);
      setValidationResult(null);
      setValidationInput("");
      await loadTokens();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Errore nella generazione";
      setError(message);
    } finally {
      setGenerating(false);
    }
  }, [eventId, generatorForm, loadTokens]);

  const handleValidate = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validationInput.trim()) {
      setValidationResult({
        valid: false,
        status: "invalid",
        message: "Inserisci un codice da validare.",
      });
      return;
    }

    setValidationLoading(true);
    setError(null);

    try {
      const result = await validateJudgeToken(validationInput.trim());
      setValidationResult(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Errore nella validazione";
      setError(message);
    } finally {
      setValidationLoading(false);
    }
  }, [validationInput]);

  const handleRevoke = useCallback(async (id: string) => {
    setRevokingId(id);
    setError(null);

    try {
      const updated = await revokeJudgeToken(id);
      setTokens((prev) => prev.map((token) => (token.id === id ? { ...token, ...updated } : token)));
      setGeneratedTokens((prev) => prev.map((token) => (token.id === id ? { ...token, ...updated } : token)));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Errore nella revoca";
      setError(message);
    } finally {
      setRevokingId(null);
    }
  }, []);

  const handleCopy = useCallback(async (value: string, successLabel: string) => {
    try {
      await copyToClipboard(value);
      setCopyMessage(successLabel);
      globalThis.setTimeout(() => setCopyMessage(null), 1500);
    } catch {
      setError("Copia non riuscita");
    }
  }, []);

  const handlePrintA4Sheet = useCallback(async () => {
    if (generatedTokens.length === 0) {
      setError("Genera prima almeno un codice.");
      return;
    }

    setError(null);

    try {
      const items = await Promise.all(
        generatedTokens.map(async (token) => {
          const qrDataUrl = await QRCode.toDataURL(token.url, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 520,
            color: {
              dark: "#111827",
              light: "#ffffff",
            },
          });

          return {
            label: token.label ?? "Codice giudice",
            token: token.token,
            url: token.url,
            qrDataUrl,
          };
        })
      );

      const popup = globalThis.open("about:blank", "_blank", "width=1200,height=900");
      if (!popup) {
        setError("Popup bloccato dal browser. Consenti i popup per stampare il foglio.");
        return;
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
          `
        )
        .join("");

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
                font-family: "Segoe UI", Arial, sans-serif;
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
              .toolbar p {
                margin: 0;
                font-size: 13px;
                color: #334155;
              }
              .toolbar button {
                border: 1px solid #0ea5e9;
                background: #e0f2fe;
                color: #0c4a6e;
                border-radius: 8px;
                font-weight: 600;
                padding: 6px 10px;
                cursor: pointer;
              }
              .content {
                padding: 10mm;
              }
              .sheet {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8mm;
              }
              .card {
                border: 1px solid #cbd5e1;
                border-radius: 4mm;
                padding: 4mm;
                break-inside: avoid;
              }
              .card img {
                width: 100%;
                max-width: 55mm;
                display: block;
                margin: 0 auto 3mm;
              }
              .card h3 {
                margin: 0 0 2mm;
                font-size: 12pt;
                text-align: center;
              }
              .code {
                margin: 0;
                font-size: 9pt;
                text-align: center;
                word-break: break-all;
                font-family: Consolas, "Courier New", monospace;
              }
              .url {
                margin: 2mm 0 0;
                font-size: 8pt;
                color: #475569;
                word-break: break-all;
              }
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
    } catch {
      setError("Errore nella generazione del foglio di stampa");
    }
  }, [generatedTokens]);

  const usedCount = tokens.filter((token) => token.status === "used").length;
  const activeCount = tokens.filter((token) => token.status === "active").length;
  const revokedCount = tokens.filter((token) => token.status === "revoked").length;
  const activeTokens = tokens.filter((token) => token.status === "active");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[18rem]">
        <div className="w-10 h-10 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <section className="mt-8 rounded-3xl border border-slate-700 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-accent-cyan">Codici giudice</p>
          <h2 className="mt-2 text-2xl font-bold text-text-primary">Gestione codici opachi</h2>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            Genera codici lunghi e non prevedibili, consegnali via QR ai giudici, valida un codice
            manualmente e revoca quelli compromessi. La lista dei codici attivi si aggiorna in tempo reale dal server.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-center">
            <div className="text-lg font-bold text-emerald-200">{activeCount}</div>
            <div className="text-emerald-100/80">Attivi</div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-center">
            <div className="text-lg font-bold text-amber-200">{usedCount}</div>
            <div className="text-amber-100/80">Usati</div>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-center">
            <div className="text-lg font-bold text-red-200">{revokedCount}</div>
            <div className="text-red-100/80">Revocati</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {copyMessage && (
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {copyMessage}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleGenerate} className="rounded-3xl border border-slate-700 bg-slate-950/60 p-5">
          <h3 className="text-lg font-semibold text-text-primary">Genera codici</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Ogni codice viene salvato nel database e mostrato in chiaro solo al momento della generazione.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">Numero</span>
              <input
                type="number"
                min={1}
                max={200}
                value={generatorForm.count}
                onChange={(event) => setGeneratorForm((prev) => ({ ...prev, count: Number(event.target.value) }))}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-text-primary outline-none"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">Lunghezza</span>
              <input
                type="number"
                min={16}
                max={64}
                value={generatorForm.length}
                onChange={(event) => setGeneratorForm((prev) => ({ ...prev, length: Number(event.target.value) }))}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-text-primary outline-none"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">Prefisso</span>
              <input
                type="text"
                value={generatorForm.labelPrefix}
                onChange={(event) => setGeneratorForm((prev) => ({ ...prev, labelPrefix: event.target.value }))}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-text-primary outline-none"
                placeholder="Giudice"
              />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">Base URL</span>
              <input
                type="url"
                value={generatorForm.baseUrl}
                onChange={(event) => setGeneratorForm((prev) => ({ ...prev, baseUrl: event.target.value }))}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-text-primary outline-none"
                placeholder="https://televoto.example.com"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={generating}
            className="mt-5 rounded-2xl bg-accent-cyan px-4 py-2 font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? "Generazione..." : "Genera codici"}
          </button>

          {generatedTokens.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-text-secondary">
                  Ultimi codici generati
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(generatedTokens.map((token) => token.url).join("\n"), "Link copiati negli appunti")}
                    className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-slate-800 transition"
                  >
                    Copia tutti i link
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintA4Sheet}
                    className="rounded-xl border border-accent-cyan/40 bg-accent-cyan/10 px-3 py-1.5 text-xs font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition"
                  >
                    Stampa foglio A4
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {generatedTokens.map((token) => (
                  <div key={token.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{token.label ?? "Codice giudice"}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-text-secondary">
                          Stato: {getStatusLabel(token.status)}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(token.status)}`}>
                        {getStatusLabel(token.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[auto_1fr]">
                      <QrCodePreview
                        value={token.url}
                        label={(token.label ?? "codice-giudice").replace(/\s+/g, "-").toLowerCase()}
                      />
                      <div className="space-y-2 text-sm">
                        <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs break-all text-text-primary">
                          {token.token}
                        </div>
                        <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs break-all text-text-secondary">
                          {token.url}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(token.token, "Codice copiato")}
                        className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-text-primary hover:bg-slate-800 transition"
                      >
                        Copia codice
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(token.url, "Link copiato")}
                        className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-text-primary hover:bg-slate-800 transition"
                      >
                        Copia URL QR
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        <div className="space-y-6">
          <form onSubmit={handleValidate} className="rounded-3xl border border-slate-700 bg-slate-950/60 p-5">
            <h3 className="text-lg font-semibold text-text-primary">Valida un codice</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Inserisci un codice opaco per verificare se è attivo, già usato o revocato.
            </p>
            <div className="mt-4 space-y-3">
              <textarea
                value={validationInput}
                onChange={(event) => setValidationInput(event.target.value)}
                rows={4}
                placeholder="Incolla qui il codice"
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-text-primary outline-none"
              />
              <button
                type="submit"
                disabled={validationLoading}
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-text-primary hover:bg-slate-800 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {validationLoading ? "Verifica..." : "Valida codice"}
              </button>
            </div>
          </form>

          {validationResult && (
            <div className="rounded-3xl border border-slate-700 bg-slate-950/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-text-primary">Risultato validazione</h3>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(validationResult.status)}`}>
                  {getStatusLabel(validationResult.status)}
                </span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">{validationResult.message}</p>
              {validationResult.code && (
                <dl className="mt-4 grid gap-3 text-sm text-text-primary">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2">
                    <dt className="text-xs uppercase tracking-[0.2em] text-text-secondary">Etichetta</dt>
                    <dd className="mt-1 font-semibold">{validationResult.code.label ?? "-"}</dd>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2">
                    <dt className="text-xs uppercase tracking-[0.2em] text-text-secondary">Creato</dt>
                    <dd className="mt-1 font-semibold">{formatDate(validationResult.code.createdAt)}</dd>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2">
                    <dt className="text-xs uppercase tracking-[0.2em] text-text-secondary">Usato</dt>
                    <dd className="mt-1 font-semibold">{formatDate(validationResult.code.usedAt)}</dd>
                  </div>
                </dl>
              )}
            </div>
          )}

          <div className="rounded-3xl border border-slate-700 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-text-primary">Codici attivi</h3>
              <button
                type="button"
                onClick={loadTokens}
                className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-slate-800 transition"
              >
                Aggiorna
              </button>
            </div>

              {activeTokens.length === 0 ? (
                <p className="mt-4 text-sm text-text-secondary">Nessun codice attivo presente per questo evento.</p>
            ) : (
              <div className="mt-4 space-y-3">
                  {activeTokens.map((token) => (
                  <div key={token.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-text-primary">{token.label ?? "Codice giudice"}</p>
                        <p className="mt-1 text-xs font-mono tracking-[0.2em] text-text-secondary">
                          {token.tokenPreview}••••
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(token.status)}`}>
                        {getStatusLabel(token.status)}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-text-secondary sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                        Creato: {formatDate(token.createdAt)}
                      </div>
                      <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                        Usato: {formatDate(token.usedAt)}
                      </div>
                      <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                        Revocato: {formatDate(token.revokedAt)}
                      </div>
                    </div>

                    {token.status === "active" && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(token.id)}
                        disabled={revokingId === token.id}
                        className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {revokingId === token.id ? "Revoca..." : "Revoca codice"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
