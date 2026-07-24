import { useCallback, useEffect, useState } from "react";
import type { RankingEntry } from "../api";
import { fetchRankings } from "../api";
import { splitEventNameForDisplay } from "../eventNameDisplay";

interface HallOfFameProps {
  readonly eventId: string;
  readonly eventCode: string;
  readonly eventName: string;
  readonly votingClosed: boolean;
  readonly onCloseTelevote: () => Promise<void>;
}

function getButtonLabel({
  showWinner,
  revealedCount,
  rankingsLength,
  isAboutToRevealThirdPlace,
  isThirdPlaceStage,
  isFinalistsStage,
}: {
  showWinner: boolean;
  revealedCount: number;
  rankingsLength: number;
  isAboutToRevealThirdPlace: boolean;
  isThirdPlaceStage: boolean;
  isFinalistsStage: boolean;
}) {
  if (showWinner) return "Vincitore rivelato";
  if (revealedCount >= rankingsLength) return "Classifica completa";
  if (isFinalistsStage) return "Mostra esito finale";
  if (isThirdPlaceStage) return "Vai alla finale a due";
  if (isAboutToRevealThirdPlace) return "Proclama il terzo classificato";
  if (revealedCount === 0) return "Avvia";
  return "Mostra il prossimo posto";
}

function getFinalistLabel(index: number, showWinner: boolean, hasTopTie: boolean) {
  if (showWinner && hasTopTie) return "Vincitore";
  if (showWinner && index === 0) return "Vincitore";
  if (index === 0) return "Finalista 1";
  return "Finalista 2";
}

export function HallOfFame({
  eventId,
  eventCode,
  eventName,
  votingClosed,
  onCloseTelevote,
}: HallOfFameProps) {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [showFinalistsStage, setShowFinalistsStage] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [closingTelevote, setClosingTelevote] = useState(false);
  const [presenterMode, setPresenterMode] = useState(false);

  const loadRankings = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await fetchRankings(eventId);
      setRankings(data);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore nel caricamento";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  useEffect(() => {
    setRevealedIndices([]);
    setShowFinalistsStage(false);
    setShowWinner(false);
  }, [eventId]);

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

  const nonFinalistCount = Math.max(rankings.length - 2, 0);
  const nextRevealIndex = rankings.length - 1 - revealedIndices.length;
  const showFinalists = showFinalistsStage || showWinner;
  const isFinalistsStage = showFinalistsStage && !showWinner;
  const isAboutToRevealThirdPlace =
    rankings.length > 2 && nextRevealIndex === 2 && !showFinalistsStage && !showWinner;
  const isThirdPlaceStage = rankings.length > 2 && revealedIndices.includes(2) && !showFinalistsStage && !showWinner;
  const revealStarted = revealedIndices.length > 0 || showFinalistsStage || showWinner;
  const finalists = rankings.slice(0, 2);
  const hasTopTie = rankings.length > 1 && rankings[0].totalScore === rankings[1].totalScore;
  const visibleEntries = rankings.filter((_, index) => revealedIndices.includes(index));
  const revealDisabled =
    rankings.length === 0 || showWinner || (rankings.length < 2 && revealedIndices.length >= rankings.length);
  const canUndo = showWinner || showFinalistsStage || revealedIndices.length > 0;
  const buttonLabel = getButtonLabel({
    showWinner,
    revealedCount: revealedIndices.length,
    rankingsLength: rankings.length,
    isAboutToRevealThirdPlace,
    isThirdPlaceStage,
    isFinalistsStage,
  });
  const closeTelevoteLabel = votingClosed ? "Televoto chiuso" : closingTelevote ? "Chiusura..." : "Chiudi televoto";
  const { prefix: eventNamePrefix, emphasized: eventNameEmphasized } = splitEventNameForDisplay(eventName);

  const handleRevealNext = useCallback(() => {
    if (rankings.length === 0 || showWinner) return;

    if (isFinalistsStage) {
      setShowWinner(true);
      return;
    }

    if (rankings.length >= 2 && revealedIndices.length >= nonFinalistCount) {
      setShowFinalistsStage(true);
      return;
    }

    if (revealedIndices.length >= rankings.length) return;

    const nextIndex = rankings.length - 1 - revealedIndices.length;
    const nextRevealed = [...revealedIndices, nextIndex].sort((a, b) => a - b);
    setRevealedIndices(nextRevealed);
  }, [isFinalistsStage, nonFinalistCount, rankings.length, revealedIndices, showWinner]);

  const handleUndoReveal = useCallback(() => {
    if (showWinner) {
      setShowWinner(false);
      return;
    }

    if (showFinalistsStage) {
      setShowFinalistsStage(false);
      return;
    }

    if (revealedIndices.length === 0) return;

    const lastRevealed = Math.min(...revealedIndices);
    setRevealedIndices(revealedIndices.filter((index) => index !== lastRevealed));
  }, [revealedIndices, showFinalistsStage, showWinner]);

  const handleRefreshRankings = useCallback(async () => {
    await loadRankings({ silent: true });
  }, [loadRankings]);

  const handleTogglePresenterMode = useCallback(async () => {
    if (presenterMode) {
      setPresenterMode(false);
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      }
      return;
    }

    setPresenterMode(true);
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen API non disponibile: usa solo la modalità presentazione CSS
    }
  }, [presenterMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPresenterMode(false);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => undefined);
        }
        return;
      }

      if (rankings.length === 0) return;

      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        handleRevealNext();
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        handleUndoReveal();
        return;
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        void handleTogglePresenterMode();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [handleRevealNext, handleTogglePresenterMode, handleUndoReveal, rankings.length]);

  const handleCloseTelevote = async () => {
    if (votingClosed || closingTelevote) return;

    setClosingTelevote(true);
    try {
      await onCloseTelevote();
    } finally {
      setClosingTelevote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-10 h-10 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const controlBar = (
    <div className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-800/70 p-4 ${presenterMode ? "fixed bottom-4 left-4 right-4 z-50 opacity-90 hover:opacity-100" : ""}`}>
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-accent-cyan">Reveal progressivo</p>
        <p className="text-lg font-semibold text-text-primary">
          Mostra la classifica dal fondo verso l'alto
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          Stato televoto: {votingClosed ? "chiuso" : "aperto"}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          Rivelati {showWinner ? rankings.length : revealedIndices.length}/{rankings.length}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Scorciatoie: Spazio/Invio prossimo · Backspace annulla · F presentazione · Esc esci
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleRefreshRankings}
          disabled={refreshing}
          className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 font-semibold text-text-secondary transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshing ? "Aggiornamento..." : "Aggiorna classifica"}
        </button>
        <button
          type="button"
          onClick={handleUndoReveal}
          disabled={!canUndo}
          className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 font-semibold text-text-secondary transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Annulla ultimo
        </button>
        <button
          type="button"
          onClick={handleTogglePresenterMode}
          className="rounded-lg border border-violet-500/30 bg-violet-500/20 px-4 py-2 font-semibold text-violet-200 transition hover:bg-violet-500/30"
        >
          {presenterMode ? "Esci presentazione" : "Modalità presentazione"}
        </button>
        <button
          type="button"
          onClick={handleCloseTelevote}
          disabled={votingClosed || closingTelevote}
          className="rounded-lg border border-amber-500/30 bg-amber-500/20 px-4 py-2 font-semibold text-amber-200 transition hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {closeTelevoteLabel}
        </button>
        <button
          type="button"
          onClick={handleRevealNext}
          disabled={revealDisabled}
          className="rounded-lg bg-accent-cyan px-4 py-2 font-semibold text-slate-900 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-dvh bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-text-primary ${presenterMode ? "fixed inset-0 z-40 overflow-y-auto" : ""}`}
    >
      <div className={`mx-auto px-4 py-8 ${presenterMode ? "max-w-6xl pt-12" : "max-w-4xl"}`}>
        {!presenterMode && !revealStarted && (
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">🏆 Classifica</h1>
            {eventNamePrefix && <p className="text-text-secondary text-lg">{eventNamePrefix}</p>}
            <p className="text-2xl font-black uppercase gradient-title leading-tight">{eventNameEmphasized}</p>
            <p className="text-text-secondary text-sm mt-1">Codice evento: {eventCode}</p>
          </div>
        )}

        {presenterMode && (
          <div className="mb-8 text-center">
            {eventNamePrefix && (
              <p className="text-text-secondary text-xl font-semibold uppercase tracking-wide">{eventNamePrefix}</p>
            )}
            <h1 className="text-5xl font-black uppercase gradient-title leading-tight mb-2">🏆 {eventNameEmphasized}</h1>
            <p className="text-text-secondary text-lg">Classifica finale</p>
          </div>
        )}

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
            {controlBar}

            <div className="space-y-4">
              {!presenterMode && visibleEntries.length === 0 && !showFinalists && (
                <div
                  className="w-full rounded-2xl border border-accent-cyan/40 bg-accent-cyan/10 p-5 text-left transition hover:bg-accent-cyan/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <p className="text-sm uppercase tracking-[0.2em] text-accent-cyan">Avvio classifica</p>
                  <p className="mt-2 text-xl font-semibold text-text-primary">Premi “{buttonLabel}” per iniziare il reveal</p>
                </div>
              )}

              {showFinalists && finalists.length > 0 && (
                <div className={`grid gap-4 ${showWinner && !hasTopTie ? "lg:grid-cols-1" : showWinner && hasTopTie ? "lg:grid-cols-2" : "lg:grid-cols-2"}`}>
                  {finalists.map((entry, index) => {
                    const isWinnerCard = showWinner && (hasTopTie || index === 0);
                    return (
                      <div
                        key={entry.id}
                        className={`rounded-2xl border p-6 transition-all duration-700 ${
                          isWinnerCard
                            ? "scale-[1.05] border-amber-400/80 bg-gradient-to-br from-amber-500/30 via-slate-800 to-slate-900 shadow-[0_0_40px_rgba(251,191,36,0.35)]"
                            : "border-slate-700 bg-slate-800/70"
                        }`}
                        style={{ borderColor: entry.color }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm uppercase tracking-[0.2em] text-text-secondary">
                              {getFinalistLabel(index, showWinner, hasTopTie)}
                            </p>
                            <h2 className={`flex items-center gap-2 font-bold ${isWinnerCard ? "text-3xl" : "text-xl"}`}>
                              {showWinner && isWinnerCard && <span className="text-2xl">{getMedalEmoji(index)}</span>}
                              <span>{entry.name}</span>
                            </h2>
                            {hasTopTie && showWinner && (
                              <p className="mt-2 text-sm font-semibold uppercase tracking-[0.15em] text-sky-300">
                                Pari merito
                              </p>
                            )}
                          </div>
                          {isWinnerCard && (
                            <div className="rounded-full bg-amber-400/20 px-3 py-1 text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
                              {hasTopTie ? "Co-vincitore" : "Campione"}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: entry.color }} />
                          <p className="text-sm text-text-secondary">Numero: {entry.number}</p>
                        </div>

                        <div className="mt-6 flex items-end justify-between gap-4">
                          {showWinner && isWinnerCard ? (
                            <div>
                              <div className={`font-bold text-accent-cyan ${isWinnerCard ? "text-4xl" : "text-3xl"}`}>
                                {entry.totalScore}
                              </div>
                              <div className="text-sm text-text-secondary">Punti Totali</div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {visibleEntries.map((entry) => {
                const index = rankings.findIndex((item) => item.id === entry.id);
                const isThirdPlaceCard = isThirdPlaceStage && index === 2;
                return (
                  <div
                    key={entry.id}
                    className={`p-6 rounded-lg border transition hover:shadow-lg animate-fade-in-up ${
                      isThirdPlaceCard ? "bg-gradient-to-br from-amber-500/20 via-slate-800 to-slate-900 shadow-[0_0_30px_rgba(251,191,36,0.18)]" : "bg-gradient-to-r"
                    }`}
                    style={{
                      borderColor: entry.color,
                      backgroundColor: isThirdPlaceCard ? undefined : `${entry.color}15`,
                    }}
                  >
                    <div className="flex items-center gap-6">
                      <div className="text-center min-w-16">
                        <div className="text-2xl font-bold text-text-secondary">#{index + 1}</div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <h2 className="flex items-center gap-2 text-xl font-bold">
                            <span className="text-2xl">{getMedalEmoji(index)}</span>
                            <span>{entry.name}</span>
                          </h2>
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

        {!presenterMode && rankings.length > 0 && !revealStarted && (
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
