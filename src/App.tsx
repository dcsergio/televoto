import { useEffect, useState, useCallback, useRef } from "react";
import type { FormEvent } from "react";
import type { EventData } from "./types";
import {
  fetchEventByCode,
  fetchEventState,
  castVote,
  updateEventVotingState,
  finalizeJudgeToken,
  validateJudgeToken,
} from "./api";
import { Header } from "./components/Header";
import { HeroBanner } from "./components/HeroBanner";
import { CandidateList } from "./components/CandidateList";
import { Toast } from "./components/Toast";
import { AdminPage } from "./components/AdminPage";
import { HallOfFame } from "./components/HallOfFame";

type AppRoute = "voting" | "admin" | "hof";

function getRouteFromPath(pathname: string): AppRoute {
  if (pathname === "/admin") return "admin";
  if (pathname === "/hof") return "hof";
  return "voting";
}

function getPathFromRoute(route: AppRoute): string {
  if (route === "admin") return "/admin";
  if (route === "hof") return "/hof";
  return "/";
}

function getJudgeTokenFromLocation() {
  const token = new URLSearchParams(globalThis.location.search).get("judgeToken");
  if (!token) return null;
  const normalized = token.trim().toUpperCase().replaceAll(/[^0-9A-Z]/g, "");
  return normalized.length > 0 ? normalized : null;
}

function getEventCodeFromLocation() {
  return new URLSearchParams(globalThis.location.search).get("eventCode");
}

const eventCodeRegex = /^\d{1,5}$/;
const judgeTokenSegmentCount = 4;
const judgeTokenSegmentLength = 4;

function normalizeJudgeTokenInput(value: string) {
  return value.trim().toUpperCase().replaceAll(/[^0-9A-Z]/g, "");
}

function splitJudgeTokenSegments(value: string) {
  const normalized = normalizeJudgeTokenInput(value);
  return Array.from({ length: judgeTokenSegmentCount }, (_, index) =>
    normalized.slice(index * judgeTokenSegmentLength, (index + 1) * judgeTokenSegmentLength)
  );
}

function joinJudgeTokenSegments(segments: string[]) {
  return segments.join("");
}

type JudgeAccessStatus = "idle" | "loading" | "valid" | "used" | "revoked" | "invalid";

interface JudgeAccessState {
  status: JudgeAccessStatus;
  message?: string;
}

export default function App() {
  const initialEventCode = getEventCodeFromLocation();
  const initialJudgeToken = getJudgeTokenFromLocation();
  const [event, setEvent] = useState<EventData | null>(null);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventLoadError, setEventLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [pathname, setPathname] = useState(() => globalThis.location.pathname);
  const [eventCode, setEventCode] = useState<string | null>(initialEventCode);
  const [eventCodeInput, setEventCodeInput] = useState(initialEventCode ?? "");
  const [judgeToken, setJudgeToken] = useState<string | null>(initialJudgeToken);
  const [judgeAccess, setJudgeAccess] = useState<JudgeAccessState>(
    initialJudgeToken ? { status: "loading" } : { status: "idle" }
  );
  const [judgeFinalizeOpen, setJudgeFinalizeOpen] = useState(false);
  const [finalizingJudgeToken, setFinalizingJudgeToken] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const judgeCodeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [authorizedProtectedPages, setAuthorizedProtectedPages] = useState<Record<"admin" | "hof", boolean>>({
    admin: false,
    hof: false,
  });
  const [manualJudgeCodeSegments, setManualJudgeCodeSegments] = useState<string[]>(() =>
    splitJudgeTokenSegments("")
  );

  const PROTECTED_PAGE_PASSWORD = "t";

  const currentPage = getRouteFromPath(pathname);
  const protectedPage = currentPage === "voting" ? null : currentPage;
  const needsProtectedAccess = protectedPage ? !authorizedProtectedPages[protectedPage] : false;
  const judgeMode = Boolean(judgeToken && eventCode);

  const navigateTo = useCallback((route: AppRoute, replace = false) => {
    const nextPath = getPathFromRoute(route);
    const historyMethod = replace ? "replaceState" : "pushState";
    const query = new URLSearchParams(globalThis.location.search);
    const search = query.toString();
    globalThis.history[historyMethod]({}, "", search ? `${nextPath}?${search}` : nextPath);
    setPathname(nextPath);
  }, []);

  useEffect(() => {
    async function init() {
      if (!eventCode) {
        setEvent(null);
        setLoading(false);
        setEventLoadError(null);
        return;
      }

      setLoading(true);
      setEventLoadError(null);
      try {
        const ev = await fetchEventByCode(eventCode);
        setEvent(ev);
        if (!judgeMode) {
          setMyVotes({});
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Impossibile caricare l'evento";
        setEventLoadError(msg);
        setToast({ message: msg, type: "error" });
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [eventCode, judgeMode]);

  const VOTING_STATE_POLL_MS = 7000;

  useEffect(() => {
    if (!event || event.votingClosed || currentPage !== "voting") return;

    let cancelled = false;

    const pollVotingState = async () => {
      try {
        const state = await fetchEventState(event.id);
        if (cancelled) return;
        if (state.votingClosed) {
          setEvent((prev) => (prev ? { ...prev, votingClosed: true } : prev));
        }
      } catch {
        // Polling silenzioso: il prossimo ciclo riproverà
      }
    };

    const intervalId = globalThis.setInterval(pollVotingState, VOTING_STATE_POLL_MS);

    return () => {
      cancelled = true;
      globalThis.clearInterval(intervalId);
    };
  }, [event, currentPage]);

  useEffect(() => {
    const handlePopState = () => {
      const nextEventCode = getEventCodeFromLocation();
      const nextJudgeToken = getJudgeTokenFromLocation();
      setPathname(globalThis.location.pathname);
      setEventCode(nextEventCode);
      setEventCodeInput(nextEventCode ?? "");
      setJudgeToken(nextJudgeToken);
      setJudgeAccess(nextJudgeToken && nextEventCode ? { status: "loading" } : { status: "idle" });
      setPasswordInput("");
      setPasswordError("");
    };

    globalThis.addEventListener("popstate", handlePopState);
    return () => globalThis.removeEventListener("popstate", handlePopState);
  }, []);

  // When selecting a candidate, pre-fill score if already voted
  const handleSelectCandidate = useCallback(
    (candidateId: string) => {
      setSelectedCandidate(candidateId);
    },
    []
  );

  const handleVote = useCallback(
    async (candidateId: string, score: number) => {
      if (!candidateId || !judgeToken) return;
      setSubmitting(true);
      try {
        await castVote(candidateId, score, judgeToken);
        setMyVotes((prev) => ({ ...prev, [candidateId]: score }));
        setSelectedCandidate(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Errore";
        setToast({ message: msg, type: "error" });
      } finally {
        setSubmitting(false);
      }
    },
    [judgeToken]
  );

  useEffect(() => {
    if (!needsProtectedAccess) return;

    const frame = globalThis.requestAnimationFrame(() => {
      passwordInputRef.current?.focus();
      passwordInputRef.current?.select();
    });

    return () => globalThis.cancelAnimationFrame(frame);
  }, [needsProtectedAccess]);

  useEffect(() => {
    if (!judgeToken || !eventCode) {
      setJudgeAccess({ status: "idle" });
      return;
    }

    let cancelled = false;
    setJudgeAccess({ status: "loading" });
    setMyVotes({});
    setSelectedCandidate(null);

    validateJudgeToken(judgeToken, eventCode)
      .then((result) => {
        if (cancelled) return;
        setJudgeAccess({
          status: result.valid ? "valid" : result.status === "active" ? "invalid" : result.status,
          message: result.message,
        });
        setMyVotes(result.votes ?? result.code?.votes ?? {});
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Codice non valido";
        setJudgeAccess({ status: "invalid", message: msg });
        setMyVotes({});
      });

    return () => {
      cancelled = true;
    };
  }, [judgeToken, eventCode]);

  const handleProtectedPageSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (passwordInput === PROTECTED_PAGE_PASSWORD) {
        if (protectedPage) {
          setAuthorizedProtectedPages((prev) => ({ ...prev, [protectedPage]: true }));
        }
        setPasswordInput("");
        setPasswordError("");
      } else {
        setPasswordError("Password errata");
      }
    },
    [passwordInput, protectedPage]
  );

  const handleCloseTelevote = useCallback(async () => {
    if (!event) return;

    try {
      const updated = await updateEventVotingState(event.id, true);
      setEvent((prev) => (prev ? { ...prev, votingClosed: updated.votingClosed } : prev));
      setToast({ message: "Televoto chiuso con successo.", type: "success" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Errore nella chiusura del televoto";
      setToast({ message: msg, type: "error" });
    }
  }, [event]);

  const handleFinalizeJudgeCode = useCallback(async () => {
    if (!judgeToken || !eventCode) return;
    setFinalizingJudgeToken(true);

    try {
      const result = await finalizeJudgeToken(judgeToken, eventCode);
      setJudgeAccess({
        status: result.status === "used" ? "used" : "valid",
        message: result.message,
      });
      setMyVotes(result.votes ?? result.code?.votes ?? myVotes);
      setJudgeFinalizeOpen(false);
      setToast({ message: result.message || "Codice bloccato", type: "success" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Errore nel blocco del codice";
      setToast({ message: msg, type: "error" });
    } finally {
      setFinalizingJudgeToken(false);
    }
  }, [eventCode, judgeToken, myVotes]);


  const handleProtectedPageCancel = useCallback(() => {
    setPasswordInput("");
    setPasswordError("");
    navigateTo("voting");
  }, [navigateTo]);

  const handleEventCodeSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedEventCode = eventCodeInput.trim();

      if (!eventCodeRegex.test(trimmedEventCode)) {
        setToast({ message: "Inserisci un codice evento valido (1-5 cifre).", type: "error" });
        return;
      }

      const nextSearch = new URLSearchParams(globalThis.location.search);
      nextSearch.set("eventCode", trimmedEventCode);
      globalThis.history.pushState({}, "", `${globalThis.location.pathname}?${nextSearch.toString()}`);
      setEventCode(trimmedEventCode);
    },
    [eventCodeInput]
  );

  const handleManualJudgeCodeSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedJudgeCode = joinJudgeTokenSegments(manualJudgeCodeSegments);

      if (trimmedJudgeCode.length !== judgeTokenSegmentCount * judgeTokenSegmentLength) {
        setToast({ message: "Inserisci un codice voto valido.", type: "error" });
        return;
      }

      if (!eventCode) {
        setToast({ message: "Inserisci prima il codice evento.", type: "error" });
        return;
      }

      const nextSearch = new URLSearchParams(globalThis.location.search);
      nextSearch.set("eventCode", eventCode);
      nextSearch.set("judgeToken", trimmedJudgeCode);
      globalThis.history.pushState({}, "", `${globalThis.location.pathname}?${nextSearch.toString()}`);
      setJudgeToken(trimmedJudgeCode);
      setJudgeAccess({ status: "loading" });
    },
    [eventCode, manualJudgeCodeSegments]
  );

  const handleManualJudgeCodeSegmentChange = useCallback((index: number, value: string) => {
    const normalized = normalizeJudgeTokenInput(value);

    if (normalized.length > judgeTokenSegmentLength) {
      const nextSegments = splitJudgeTokenSegments(normalized);
      setManualJudgeCodeSegments(nextSegments);
      const targetIndex = Math.min(
        Math.floor((normalized.length - 1) / judgeTokenSegmentLength),
        judgeTokenSegmentCount - 1
      );
      judgeCodeInputRefs.current[targetIndex]?.focus();
      judgeCodeInputRefs.current[targetIndex]?.setSelectionRange(judgeTokenSegmentLength, judgeTokenSegmentLength);
      return;
    }

    setManualJudgeCodeSegments((prev) => {
      const next = [...prev];
      next[index] = normalized.slice(0, judgeTokenSegmentLength);
      return next;
    });

    if (normalized.length === judgeTokenSegmentLength && index < judgeTokenSegmentCount - 1) {
      judgeCodeInputRefs.current[index + 1]?.focus();
      judgeCodeInputRefs.current[index + 1]?.select();
    }
  }, []);

  const handleManualJudgeCodeSegmentKeyDown = useCallback(
    (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Backspace" && !manualJudgeCodeSegments[index] && index > 0) {
        const previousInput = judgeCodeInputRefs.current[index - 1];
        previousInput?.focus();
        previousInput?.setSelectionRange(judgeTokenSegmentLength, judgeTokenSegmentLength);
      }

      if (event.key === "ArrowLeft" && index > 0) {
        judgeCodeInputRefs.current[index - 1]?.focus();
      }

      if (event.key === "ArrowRight" && index < judgeTokenSegmentCount - 1) {
        judgeCodeInputRefs.current[index + 1]?.focus();
      }
    },
    [manualJudgeCodeSegments]
  );

  const handleManualJudgeCodeSegmentPaste = useCallback((event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text");
    const nextSegments = splitJudgeTokenSegments(pasted);
    setManualJudgeCodeSegments(nextSegments);

    const lastFilledIndex = Math.min(
      Math.max(Math.ceil(normalizeJudgeTokenInput(pasted).length / judgeTokenSegmentLength) - 1, 0),
      judgeTokenSegmentCount - 1
    );
    judgeCodeInputRefs.current[lastFilledIndex]?.focus();
    judgeCodeInputRefs.current[lastFilledIndex]?.select();
  }, []);

  const isJudgeAccessRejected = judgeMode && (judgeAccess.status === "invalid" || judgeAccess.status === "revoked");
  const isJudgeVoteLocked = judgeAccess.status === "used";
  const appLoading = loading || (judgeMode && judgeAccess.status === "loading");

  if (appLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-10 h-10 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!eventCode && currentPage !== "admin") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg-primary px-4">
        <div className="w-full max-w-xl rounded-3xl border border-border-glass bg-slate-900/80 p-6 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-cyan">Codice evento</p>
          <h2 className="mt-2 text-2xl font-bold text-text-primary">Inserisci il codice evento</h2>
          <p className="mt-3 text-sm text-text-secondary">
            Per accedere al televoto o alla classifica devi indicare un codice evento valido.
          </p>
          <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={handleEventCodeSubmit}>
            <input
              type="text"
              value={eventCodeInput}
              onChange={(event) => setEventCodeInput(event.target.value)}
              placeholder="Es. 00001"
              className="flex-1 rounded-2xl border border-border-glass bg-slate-800 px-4 py-2 text-text-primary outline-none ring-0"
            />
            <button
              type="submit"
              className="rounded-2xl bg-accent-cyan px-4 py-2 font-semibold text-slate-900 transition hover:opacity-90"
            >
              Entra
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!event && currentPage !== "admin") {
    if (eventLoadError) {
      return (
        <div className="flex items-center justify-center min-h-dvh px-4">
          <p className="text-text-secondary text-lg text-center">Errore API: {eventLoadError}</p>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-dvh px-4">
        <p className="text-text-secondary text-lg">Evento non trovato per il codice inserito.</p>
      </div>
    );
  }

  if (isJudgeAccessRejected && judgeAccess.message) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg-primary px-4">
        <div className="w-full max-w-xl rounded-3xl border border-border-glass bg-slate-900/80 p-6 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-cyan">Accesso giudice</p>
          <h2 className="mt-2 text-2xl font-bold text-text-primary">Codice non disponibile</h2>
          <p className="mt-3 text-sm text-text-secondary">{judgeAccess.message}</p>
        </div>
      </div>
    );
  }

  if (needsProtectedAccess && protectedPage) {
    const pageLabel = protectedPage === "admin" ? "Admin" : "Classifica";

    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg-primary px-4">
        <div className="w-full max-w-md rounded-2xl border border-border-glass bg-slate-900/80 p-6 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-cyan">
            Area protetta
          </p>
          <h2 className="mt-2 text-2xl font-bold text-text-primary">{pageLabel}</h2>
          <p className="mt-3 text-sm text-text-secondary">
            Inserisci la password per accedere a questa sezione.
          </p>

          <form className="mt-6 space-y-3" onSubmit={handleProtectedPageSubmit}>
            <input
              type="password"
              ref={passwordInputRef}
              autoFocus
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-border-glass bg-slate-800 px-3 py-2 text-text-primary outline-none ring-0"
            />

            {passwordError && (
              <p className="text-sm text-red-400">{passwordError}</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-accent-cyan px-4 py-2 font-semibold text-slate-900 transition hover:opacity-90"
              >
                Accedi
              </button>
              <button
                type="button"
                onClick={handleProtectedPageCancel}
                className="rounded-lg border border-border-glass px-4 py-2 font-semibold text-text-secondary transition hover:bg-slate-800"
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  switch (currentPage) {
    case "admin":
      return (
        <AdminPage
          initialEventId={event?.id}
          initialEventCode={event?.code}
        />
      );
    case "hof":
      if (!event) {
        return (
          <div className="flex items-center justify-center min-h-dvh px-4">
            <p className="text-text-secondary text-lg">Evento non trovato per il codice inserito.</p>
          </div>
        );
      }
      return (
        <HallOfFame
          eventId={event.id}
          eventCode={event.code}
          eventName={event.name}
          votingClosed={event.votingClosed}
          onCloseTelevote={handleCloseTelevote}
        />
      );
    case "voting":
    default:
      // Voting page continues below
      break;
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-dvh px-4">
        <p className="text-text-secondary text-lg">Evento non trovato per il codice inserito.</p>
      </div>
    );
  }

  const votingClosed = event.votingClosed;
  const canVote = !votingClosed && judgeMode && judgeAccess.status === "valid";
  const candidateListEnabled = canVote;
  const judgeVotesCount = Object.keys(myVotes).length;
  const allJudgeVotesCast = Boolean(
    judgeMode &&
      judgeAccess.status === "valid" &&
      event.candidates.length > 0 &&
      event.candidates.every((candidate) => myVotes[candidate.id] !== undefined)
  );

  return (
    <div className="flex flex-col min-h-dvh">
      <Header />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-8">
        {!votingClosed && !judgeMode && (
          <div className="mb-6 rounded-3xl border border-slate-600 bg-slate-900/70 p-5 text-center text-slate-100 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] font-semibold text-accent-cyan">Accesso richiesto</p>
            <p className="mt-1 text-base">
              Per votare hai bisogno del Codice Voto. Scansiona il QR code direttamente con la fotocamera del tuo
              cellulare, oppure inserisci il codice qui sotto.
            </p>
            <form className="mt-4 flex flex-col gap-3" onSubmit={handleManualJudgeCodeSubmit}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {manualJudgeCodeSegments.map((segment, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      judgeCodeInputRefs.current[index] = element;
                    }}
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="one-time-code"
                    value={segment}
                    maxLength={judgeTokenSegmentLength}
                    onChange={(event) => handleManualJudgeCodeSegmentChange(index, event.target.value)}
                    onKeyDown={(event) => handleManualJudgeCodeSegmentKeyDown(index, event)}
                    onPaste={handleManualJudgeCodeSegmentPaste}
                    placeholder="XXXX"
                    className="w-full rounded-2xl border border-border-glass bg-slate-800 px-4 py-3 text-center font-mono text-lg uppercase tracking-[0.25em] text-text-primary outline-none ring-0"
                  />
                ))}
              </div>
              <button
                type="submit"
                className="self-start rounded-2xl bg-accent-cyan px-4 py-2 font-semibold text-slate-900 transition hover:opacity-90"
              >
                Vai al voto
              </button>
            </form>
          </div>
        )}

        {judgeMode && judgeAccess.status === "valid" && (
          <div className="mb-6 rounded-3xl border border-cyan-400/40 bg-cyan-500/10 p-5 text-cyan-100 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] font-semibold">Modalità giudice</p>
            <p className="mt-1 text-base">
              Preferenze registrate: {judgeVotesCount}/{event.candidates.length}. Puoi modificare ogni voto finché non confermi il blocco.
            </p>
            {allJudgeVotesCast && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-300/30 bg-cyan-950/30 px-4 py-3">
                <span className="text-sm text-cyan-50">Tutte le preferenze sono state espresse.</span>
                <button
                  type="button"
                  onClick={() => setJudgeFinalizeOpen(true)}
                  className="rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                >
                  Conferma e blocca codice
                </button>
              </div>
            )}
          </div>
        )}

        {judgeMode && isJudgeVoteLocked && (
          <div className="mb-6 rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-5 text-emerald-100 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] font-semibold">Codice bloccato</p>
            <p className="mt-1 text-base">I voti sono definitivi e non modificabili.</p>
          </div>
        )}

        {votingClosed && (
          <div className="mb-6 rounded-3xl border border-amber-400/40 bg-amber-500/10 p-5 text-center text-amber-100 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] font-semibold">Televoto chiuso</p>
            <p className="mt-1 text-base">Non è più possibile esprimere voti.</p>
          </div>
        )}

        <HeroBanner name={event.name} subtitle={event.subtitle} />

        <section className="mt-6">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-[0.15em] uppercase text-text-secondary mb-4">
            <span className="text-base" aria-hidden="true">&#9835;</span>
            Scegli il tuo candidato
          </h2>

          <CandidateList
            candidates={event.candidates}
            selectedId={selectedCandidate}
            votedMap={myVotes}
            onSelect={candidateListEnabled ? handleSelectCandidate : () => undefined}
            onVote={candidateListEnabled ? handleVote : undefined}
            submitting={submitting}
          />
        </section>

        {votingClosed && (
          <div className="mt-8 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-6 text-amber-100 text-center">
            Il televoto è stato chiuso. I voti non sono più accettati.
          </div>
        )}
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {judgeFinalizeOpen && judgeToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-cyan">Conferma giudice</p>
            <h2 className="mt-2 text-2xl font-bold text-text-primary">Bloccare il codice?</h2>
            <p className="mt-3 text-sm text-text-secondary">
              Dopo la conferma, le preferenze diventano definitive e non potranno più essere modificate da nessun dispositivo.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setJudgeFinalizeOpen(false)}
                className="rounded-2xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-text-secondary hover:bg-slate-700 transition"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleFinalizeJudgeCode}
                disabled={finalizingJudgeToken}
                className="rounded-2xl bg-accent-cyan px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-accent-cyan/90 transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {finalizingJudgeToken ? "Blocco in corso..." : "Conferma e blocca"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
