import { useCallback, useEffect, useState } from "react";
import { fetchPartialRankings, type PartialRankings } from "../api";

interface PartialRankingsPanelProps {
  readonly eventId: string;
  readonly authToken: string;
}

function getMedalEmoji(position: number): string {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return "  ";
}

function RankingTable({
  title,
  entries,
  scoreLabel,
  scoreKey,
  voteCountKey,
  scoreDecimals,
  emptyMessage,
}: {
  readonly title: string;
  readonly entries: PartialRankings["qualified"];
  readonly scoreLabel: string;
  readonly scoreKey: "avgQualificata" | "avgPopolare" | "finalScore";
  readonly voteCountKey: "qualifiedVoteCount" | "popularVoteCount" | "totalVoteCount";
  readonly scoreDecimals?: number;
  readonly emptyMessage: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-text-secondary">{title}</h3>
        <p className="mt-3 text-sm text-text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-text-secondary">{title}</h3>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2"
            style={{ borderLeftColor: entry.color, borderLeftWidth: "3px" }}
          >
            <span className="text-lg">{getMedalEmoji(entry.position)}</span>
            <span className="w-6 text-center text-sm font-bold text-text-secondary">#{entry.position}</span>
            <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text-primary">
                {entry.number}. {entry.name}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-accent-cyan">{entry[scoreKey].toFixed(scoreDecimals ?? 2)}</div>
              <div className="text-[10px] uppercase tracking-wider text-text-secondary">
                {scoreLabel} · {entry[voteCountKey]} voti
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PartialRankingsPanel({ eventId, authToken }: PartialRankingsPanelProps) {
  const [rankings, setRankings] = useState<PartialRankings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRankings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchPartialRankings(eventId, authToken);
      setRankings(data);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [authToken, eventId]);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  if (loading && !rankings) {
    return (
      <div className="mt-8 flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !rankings) {
    return (
      <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
        {error}
      </div>
    );
  }

  if (!rankings) return null;

  return (
    <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-accent-cyan">Classifica parziale</p>
          <h2 className="text-xl font-semibold text-text-primary">Tecnica, Popolare e Ponderata</h2>
          <p className="mt-1 text-xs text-text-secondary">
            Pesi: Qualificata {rankings.weights.qualificata}% · Popolare {rankings.weights.popolare}%
          </p>
          {rankings.event.enableTrimmedMean && (
            <p className="mt-1 text-xs text-text-secondary">
              Trimmed mean attivo al {rankings.event.trimmedMeanPercentage}% sui voti popolari
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={loadRankings}
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

      <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3">
        <p className="text-sm text-text-secondary">
          Giuria qualificata attiva: {" "}
          <span className="font-semibold text-text-primary">{rankings.eligibleQualifiedJudges}</span>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RankingTable
          title="Giuria Qualificata"
          entries={rankings.qualified}
          scoreLabel="Media"
          scoreKey="avgQualificata"
          voteCountKey="qualifiedVoteCount"
          emptyMessage="Nessun voto qualificato registrato."
        />
        <RankingTable
          title="Giuria Popolare"
          entries={rankings.popular}
          scoreLabel="Media"
          scoreKey="avgPopolare"
          voteCountKey="popularVoteCount"
          emptyMessage="Nessun voto popolare registrato."
        />
        <RankingTable
          title="Classifica Ponderata"
          entries={rankings.weighted}
          scoreLabel="Punteggio"
          scoreKey="finalScore"
          voteCountKey="totalVoteCount"
          scoreDecimals={3}
          emptyMessage="Nessun voto registrato."
        />
      </div>
    </div>
  );
}
