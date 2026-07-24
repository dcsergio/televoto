import { useCallback, useEffect, useState } from "react";
import { fetchVotingProgress, type VotingProgress } from "../api";

interface VotingProgressDashboardProps {
  readonly eventId: string;
  readonly votingClosed: boolean;
  readonly authToken: string;
}

function getStatusLabel(status: VotingProgress["judges"][number]["status"]) {
  if (status === "used") return "Finalizzato";
  if (status === "revoked") return "Revocato";
  return "Attivo";
}

function getStatusClass(status: VotingProgress["judges"][number]["status"]) {
  if (status === "used") return "border-amber-500/30 bg-amber-500/15 text-amber-200";
  if (status === "revoked") return "border-red-500/30 bg-red-500/15 text-red-200";
  return "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
}

export function VotingProgressDashboard({ eventId, votingClosed, authToken }: VotingProgressDashboardProps) {
  const [progress, setProgress] = useState<VotingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchVotingProgress(eventId, authToken);
      setProgress(data);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [authToken, eventId]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  useEffect(() => {
    if (votingClosed) return;

    const intervalId = globalThis.setInterval(loadProgress, 10000);
    return () => globalThis.clearInterval(intervalId);
  }, [loadProgress, votingClosed]);

  if (loading && !progress) {
    return (
      <div className="mt-8 flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !progress) {
    return (
      <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
        {error}
      </div>
    );
  }

  if (!progress) return null;

  const activeIncompleteJudges = progress.judges.filter(
    (judge) => judge.status === "active" && judge.votesCast < judge.votesRequired
  );

  return (
    <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-accent-cyan">Backstage</p>
          <h2 className="text-xl font-semibold text-text-primary">Progresso voti giudici</h2>
        </div>
        <button
          type="button"
          onClick={loadProgress}
          disabled={loading}
          className="rounded-2xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-text-secondary hover:bg-slate-700 transition disabled:opacity-50"
        >
          {loading ? "Aggiornamento..." : "Aggiorna"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
          <div className="text-2xl font-bold text-emerald-300">{progress.activeJudges}</div>
          <div className="text-sm text-text-secondary">Giudici attivi</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
          <div className="text-2xl font-bold text-amber-300">{progress.finalizedJudges}</div>
          <div className="text-sm text-text-secondary">Finalizzati</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
          <div className="text-2xl font-bold text-red-300">{progress.revokedJudges}</div>
          <div className="text-sm text-text-secondary">Revocati</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
          <div className="text-2xl font-bold text-accent-cyan">
            {progress.finalizedJudges}/{progress.totalJudges}
          </div>
          <div className="text-sm text-text-secondary">Progresso blocco</div>
        </div>
      </div>

      {progress.candidateCount > 0 && progress.totalJudges > 0 && (
        <div className="mb-6 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
          <p className="text-sm text-cyan-100">
            {progress.finalizedJudges} giudici su {progress.totalJudges} hanno bloccato il codice.
            {activeIncompleteJudges.length > 0 && (
              <span> {activeIncompleteJudges.length} giudici attivi non hanno ancora completato tutti i voti.</span>
            )}
          </p>
        </div>
      )}

      {progress.incompleteCandidates.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-text-secondary">
            Candidati con voti incompleti
          </h3>
          <div className="space-y-2">
            {progress.incompleteCandidates.map((candidate) => (
              <div
                key={candidate.candidateId}
                className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm"
              >
                <span className="text-text-primary">
                  #{candidate.candidateNumber} {candidate.candidateName}
                </span>
                <span className="text-amber-200">
                  Mancano {candidate.missingJudgeCount} giudici
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeIncompleteJudges.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-text-secondary">
            Giudici attivi incompleti
          </h3>
          <div className="space-y-2">
            {activeIncompleteJudges.map((judge) => (
              <div
                key={judge.id}
                className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-sm text-text-primary">{judge.tokenPreview}…</span>
                    {judge.label && (
                      <span className="ml-2 text-sm text-text-secondary">{judge.label}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${getStatusClass(judge.status)}`}>
                      {getStatusLabel(judge.status)}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {judge.votesCast}/{judge.votesRequired} voti
                    </span>
                  </div>
                </div>
                {judge.missingCandidates.length > 0 && (
                  <p className="mt-2 text-xs text-text-secondary">
                    Mancano: {judge.missingCandidates.map((c) => c.name).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {progress.totalJudges === 0 && (
        <p className="text-sm text-text-secondary">Nessun codice giudice generato per questo evento.</p>
      )}
    </div>
  );
}
