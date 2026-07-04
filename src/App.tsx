import { useEffect, useState, useCallback, type FormEvent } from "react";
import type { EventData } from "./types";
import { fetchActiveEvent, fetchMyVotes, castVote } from "./api";
import { getDeviceId } from "./fingerprint";
import { Header } from "./components/Header";
import { HeroBanner } from "./components/HeroBanner";
import { CandidateList } from "./components/CandidateList";
import { ScoreSelector } from "./components/ScoreSelector";
import { VoteButton } from "./components/VoteButton";
import { Toast } from "./components/Toast";
import { AdminPage } from "./components/AdminPage";
import { HallOfFame } from "./components/HallOfFame";

export default function App() {
  const [event, setEvent] = useState<EventData | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [currentPage, setCurrentPage] = useState<"voting" | "admin" | "hof">("voting");
  const [pendingProtectedPage, setPendingProtectedPage] = useState<"admin" | "hof" | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [authorizedProtectedPages, setAuthorizedProtectedPages] = useState<Record<"admin" | "hof", boolean>>({
    admin: false,
    hof: false,
  });

  const PROTECTED_PAGE_PASSWORD = "televoto2026";

  useEffect(() => {
    async function init() {
      try {
        const [ev, did] = await Promise.all([fetchActiveEvent(), getDeviceId()]);
        setEvent(ev);
        setDeviceId(did);
        const votes = await fetchMyVotes(ev.id, did);
        setMyVotes(votes);
      } catch {
        setToast({ message: "Impossibile caricare l'evento", type: "error" });
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // When selecting a candidate, pre-fill score if already voted
  const handleSelectCandidate = useCallback(
    (candidateId: string) => {
      setSelectedCandidate(candidateId);
      if (myVotes[candidateId]) {
        setSelectedScore(myVotes[candidateId]);
      } else {
        setSelectedScore(null);
      }
    },
    [myVotes]
  );

  const handleVote = useCallback(async () => {
    if (!selectedCandidate || !selectedScore || !deviceId) return;
    setSubmitting(true);
    try {
      await castVote(selectedCandidate, deviceId, selectedScore);
      setMyVotes((prev) => ({ ...prev, [selectedCandidate]: selectedScore }));
      const candidate = event?.candidates.find((c) => c.id === selectedCandidate);
      setToast({
        message: `Voto ${selectedScore}/10 per ${candidate?.name ?? "candidato"} registrato!`,
        type: "success",
      });
      setSelectedCandidate(null);
      setSelectedScore(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Errore";
      setToast({ message: msg, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }, [selectedCandidate, selectedScore, deviceId, event]);

  const handleOpenProtectedPage = useCallback((page: "admin" | "hof") => {
    setPendingProtectedPage(page);
    setPasswordInput("");
    setPasswordError("");
  }, []);

  const handleProtectedPageSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!pendingProtectedPage) return;

      if (passwordInput === PROTECTED_PAGE_PASSWORD) {
        setAuthorizedProtectedPages((prev) => ({ ...prev, [pendingProtectedPage]: true }));
        setCurrentPage(pendingProtectedPage);
        setPendingProtectedPage(null);
        setPasswordInput("");
        setPasswordError("");
      } else {
        setPasswordError("Password errata");
      }
    },
    [passwordInput, pendingProtectedPage]
  );

  const handleProtectedPageCancel = useCallback(() => {
    setPendingProtectedPage(null);
    setPasswordInput("");
    setPasswordError("");
    setCurrentPage("voting");
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-10 h-10 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-dvh px-4">
        <p className="text-text-secondary text-lg">Nessun evento attivo al momento.</p>
      </div>
    );
  }

  if (pendingProtectedPage) {
    const pageLabel = pendingProtectedPage === "admin" ? "Admin" : "Classifica";

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
      if (!authorizedProtectedPages.admin) {
        return (
          <div className="flex min-h-dvh items-center justify-center bg-bg-primary px-4">
            <p className="text-lg text-text-secondary">Accesso non autorizzato.</p>
          </div>
        );
      }
      return (
        <AdminPage
          eventId={event.id}
          onBack={() => setCurrentPage("voting")}
        />
      );
    case "hof":
      if (!authorizedProtectedPages.hof) {
        return (
          <div className="flex min-h-dvh items-center justify-center bg-bg-primary px-4">
            <p className="text-lg text-text-secondary">Accesso non autorizzato.</p>
          </div>
        );
      }
      return (
        <HallOfFame
          eventId={event.id}
          eventName={event.name}
          onBack={() => setCurrentPage("voting")}
        />
      );
    case "voting":
    default:
      // Voting page continues below
      break;
  }

  const alreadyVoted = selectedCandidate ? !!myVotes[selectedCandidate] : false;

  return (
    <div className="flex flex-col min-h-dvh">
      <Header
        onOpenAdmin={() => handleOpenProtectedPage("admin")}
        onOpenHallOfFame={() => handleOpenProtectedPage("hof")}
      />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-8">
        <HeroBanner name={event.name} subtitle={event.subtitle} />

        <section className="mt-6">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-[0.15em] uppercase text-text-secondary mb-4">
            <span className="text-base">&#9835;</span>
            Scegli il tuo candidato
          </h2>

          <CandidateList
            candidates={event.candidates}
            selectedId={selectedCandidate}
            votedMap={myVotes}
            onSelect={handleSelectCandidate}
          />
        </section>

        {selectedCandidate && (
          <section className="mt-8 animate-fade-in-up">
            <h2 className="flex items-center gap-2 text-xs font-semibold tracking-[0.15em] uppercase text-text-secondary mb-4">
              <span className="text-base">&#9734;</span>
              Assegna il tuo punteggio
            </h2>

            <ScoreSelector
              value={selectedScore}
              onChange={setSelectedScore}
            />

            <VoteButton
              disabled={!selectedScore || submitting}
              loading={submitting}
              alreadyVoted={alreadyVoted}
              onClick={handleVote}
            />
          </section>
        )}
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
