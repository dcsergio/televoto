import { useEffect, useState } from "react";
import type { RankingEntry } from "../api";
import { fetchRankings } from "../api";

interface HallOfFameProps {
  eventId: string;
  eventName: string;
  onBack: () => void;
}

export function HallOfFame({ eventId, eventName, onBack }: HallOfFameProps) {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);

  useEffect(() => {
    loadRankings();
  }, [eventId]);

  useEffect(() => {
    setRevealedIndices([]);
  }, [eventId]);

  async function loadRankings() {
    try {
      setLoading(true);
      const data = await fetchRankings(eventId);
      setRankings(data);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore nel caricamento";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const getMedalEmoji = (position: number): string => {
    switch (position) {
      case 0:
        return "🥇";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return "  ";
    }
  };

  const handleRevealNext = () => {
    if (rankings.length === 0 || revealedIndices.length >= rankings.length) return;

    const nextIndex = rankings.length - 1 - revealedIndices.length;
    const nextRevealed = [...revealedIndices, nextIndex].sort((a, b) => a - b);
    setRevealedIndices(nextRevealed);
  };

  const visibleEntries = rankings.filter((_, index) => revealedIndices.includes(index));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-10 h-10 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-text-primary">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="mb-6 px-4 py-2 bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan rounded-lg transition"
        >
          ← Indietro
        </button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">🏆 Classifica</h1>
          <p className="text-text-secondary text-lg">{eventName}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {rankings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary text-lg">Nessun voto ancora registrato.</p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-accent-cyan">Reveal progressivo</p>
                <p className="text-lg font-semibold text-text-primary">
                  Mostra la classifica dal fondo verso l’alto
                </p>
              </div>
              <button
                onClick={handleRevealNext}
                disabled={revealedIndices.length >= rankings.length}
                className="rounded-lg bg-accent-cyan px-4 py-2 font-semibold text-slate-900 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {revealedIndices.length >= rankings.length
                  ? "Classifica completa"
                  : revealedIndices.length === 0
                    ? "Avvia"
                    : "Mostra il prossimo posto"}
              </button>
            </div>

            <div className="space-y-4">
              {visibleEntries.map((entry) => {
                const index = rankings.findIndex((item) => item.id === entry.id);
                return (
                  <div
                    key={entry.id}
                    className="p-6 bg-gradient-to-r rounded-lg border transition hover:shadow-lg animate-fade-in-up"
                    style={{
                      borderColor: entry.color,
                      backgroundColor: `${entry.color}15`,
                    }}
                  >
                    <div className="flex items-center gap-6">
                      <div className="text-center min-w-16">
                        <div className="text-3xl">{getMedalEmoji(index)}</div>
                        <div className="text-2xl font-bold text-text-secondary">#{index + 1}</div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <h2 className="text-xl font-bold">{entry.name}</h2>
                        </div>
                        <div className="text-text-secondary text-sm">Numero: {entry.number}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-3xl font-bold text-accent-cyan">{entry.totalScore}</div>
                        <div className="text-text-secondary text-sm">Punti Totali</div>
                        <div className="mt-2 text-text-secondary text-sm">
                          {entry.voteCount > 0 && (
                            <>
                              <div>Voti: {entry.voteCount}</div>
                              <div>Media: {entry.avgScore.toFixed(1)}</div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          backgroundColor: entry.color,
                          width: `${rankings.length > 0 ? (entry.totalScore / rankings[0].totalScore) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Summary Stats */}
        {rankings.length > 0 && (
          <div className="mt-12 p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Statistiche Evento</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold text-accent-cyan">
                  {rankings.reduce((sum, r) => sum + r.voteCount, 0)}
                </div>
                <div className="text-text-secondary text-sm">Voti Totali</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent-cyan">{rankings.length}</div>
                <div className="text-text-secondary text-sm">Candidati</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent-cyan">
                  {(rankings.reduce((sum, r) => sum + r.totalScore, 0) / rankings.length).toFixed(1)}
                </div>
                <div className="text-text-secondary text-sm">Punti Medi</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
