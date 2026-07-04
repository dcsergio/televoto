import { useEffect, useState } from "react";
import type { SyntheticEvent } from "react";
import type { CandidateData } from "../types";
import { fetchCandidates, fetchEventState, startEvent, updateEventVotingState, addCandidate, updateCandidate, deleteCandidate, resetEventVotes } from "../api";

function getNextNumber(candidates: CandidateData[]) {
  if (candidates.length === 0) return "1";
  return String(Math.max(...candidates.map((c) => c.number)) + 1);
}

function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i += 1) {
    color += letters[Math.floor(Math.random() * letters.length)];
  }
  return color;
}

interface AdminPageProps {
  readonly eventId: string;
  readonly onBack: () => void;
  readonly onVotingStateChange: (votingClosed: boolean) => void;
}

export function AdminPage({ eventId, onBack, onVotingStateChange }: AdminPageProps) {
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; subtitle: string; color: string } | null>(null);
  const [votingClosed, setVotingClosed] = useState(true);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    subtitle: "",
    color: getRandomColor(),
  });
  const [confirmationModal, setConfirmationModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    loadCandidates();
  }, [eventId]);

  async function loadCandidates() {
    try {
      setLoading(true);
      const [data, eventState] = await Promise.all([
        fetchCandidates(eventId),
        fetchEventState(eventId),
      ]);
      setCandidates(data);
      setVotingClosed(eventState.votingClosed);
      onVotingStateChange(eventState.votingClosed);
      setNewCandidate({
        name: "",
        subtitle: "",
        color: getRandomColor(),
      });
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCandidate(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newCandidate.name) {
      setError("Il nome del candidato è obbligatorio");
      setStatusMessage(null);
      return;
    }

    try {
      const nextNumber = Number.parseInt(getNextNumber(candidates), 10);
      const candidate = await addCandidate(
        eventId,
        nextNumber,
        newCandidate.name,
        newCandidate.subtitle || undefined,
        newCandidate.color
      );
      const updatedCandidates = [...candidates, candidate].sort((a, b) => a.number - b.number);
      setCandidates(updatedCandidates);
      setNewCandidate({
        name: "",
        subtitle: "",
        color: getRandomColor(),
      });
      setError(null);
      setStatusMessage("Nuovo candidato aggiunto correttamente.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore";
      setError(msg);
      setStatusMessage(null);
    }
  }

  async function handleUpdateCandidate(id: string, updates: Partial<CandidateData>) {
    try {
      const updated = await updateCandidate(id, updates as any);
      setCandidates(candidates.map((c) => (c.id === id ? updated : c)));
      setEditing(null);
      setEditDraft(null);
      setError(null);
      setStatusMessage("Candidato aggiornato con successo.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore";
      setError(msg);
      setStatusMessage(null);
    }
  }

  function startEditingCandidate(candidate: CandidateData) {
    setEditing(candidate.id);
    setEditDraft({
      name: candidate.name,
      subtitle: candidate.subtitle || "",
      color: candidate.color,
    });
    setError(null);
    setStatusMessage(null);
  }

  function cancelEditingCandidate() {
    setEditing(null);
    setEditDraft(null);
  }

  async function saveEditingCandidate(id: string) {
    if (!editDraft) return;
    await handleUpdateCandidate(id, {
      name: editDraft.name,
      subtitle: editDraft.subtitle || null,
      color: editDraft.color,
    });
  }

  function openConfirmationModal(config: {
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }) {
    setConfirmationModal({ open: true, ...config });
  }

  function closeConfirmationModal() {
    setConfirmationModal(null);
  }

  async function confirmDeleteCandidate(id: string) {
    openConfirmationModal({
      title: "Elimina candidato",
      message: "Sei sicuro di voler eliminare questo candidato?",
      confirmLabel: "Elimina",
      onConfirm: async () => {
        closeConfirmationModal();
        try {
          await deleteCandidate(id);
          const remaining = candidates.filter((c) => c.id !== id);
          const orderedRemaining = [...remaining].sort((a, b) => a.number - b.number);
          const renumbered = orderedRemaining.map((candidate, index) => ({ ...candidate, number: index + 1 }));
          setCandidates(renumbered);
          setNewCandidate({
            name: "",
            subtitle: "",
            color: getRandomColor(),
          });
          setError(null);
          setStatusMessage("Candidato eliminato e numerazione aggiornata.");
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Errore";
          setError(msg);
          setStatusMessage(null);
        }
      },
    });
  }

  async function confirmStartRace() {
    openConfirmationModal({
      title: "Avvia gara",
      message: "Vuoi avviare la gara? I voti precedenti saranno azzerati e i candidati verranno rinumerati progressivamente.",
      confirmLabel: "Avvia",
      onConfirm: async () => {
        closeConfirmationModal();
        try {
          const result = await startEvent(eventId);
          setCandidates(result.candidates);
          setVotingClosed(result.votingClosed);
          onVotingStateChange(result.votingClosed);
          setNewCandidate({
            name: "",
            subtitle: "",
            color: getRandomColor(),
          });
          setEditing(null);
          setError(null);
          setStatusMessage("Gara avviata: voti azzerati e televoto sbloccato.");
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Errore nell'avvio della gara";
          setError(msg);
          setStatusMessage(null);
        }
      },
    });
  }

  async function confirmCloseTelevote() {
    openConfirmationModal({
      title: "Chiudi televoto",
      message: "Vuoi chiudere il televoto? I voti non saranno più accettati e le modifiche torneranno disponibili.",
      confirmLabel: "Chiudi",
      onConfirm: async () => {
        closeConfirmationModal();
        try {
          const result = await updateEventVotingState(eventId, true);
          setVotingClosed(result.votingClosed);
          onVotingStateChange(result.votingClosed);
          setError(null);
          setStatusMessage("Televoto chiuso con successo. Puoi modificare nuovamente i candidati.");
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Errore nella chiusura del televoto";
          setError(msg);
          setStatusMessage(null);
        }
      },
    });
  }

  async function confirmResetRanking() {
    openConfirmationModal({
      title: "Azzera classifica",
      message: "Vuoi azzerare tutti i voti e ricominciare da capo?",
      confirmLabel: "Azzera",
      onConfirm: async () => {
        closeConfirmationModal();
        try {
          await resetEventVotes(eventId);
          setError(null);
          setStatusMessage("Classifica azzerata con successo.");
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Errore nell'azzeramento della classifica";
          setError(msg);
          setStatusMessage(null);
        }
      },
    });
  }

  const modificationsLocked = !votingClosed;
  const startLabel = votingClosed ? "Avvia gara" : "Televoto aperto";
  const currentStatus = votingClosed ? "Televoto chiuso" : "Televoto aperto";

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

        <h1 className="text-3xl font-bold mb-4">Admin - Gestione Candidati</h1>

        <div className="mb-6 inline-flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm">
          <span className="font-semibold">Stato evento:</span>
          <span className={votingClosed ? "text-cyan-300" : "text-emerald-300"}>{currentStatus}</span>
          <span className="text-text-secondary">{votingClosed ? "La gara non è avviata." : "Il televoto è attivo e le modifiche sono bloccate."}</span>
        </div>

        {statusMessage && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500 rounded-lg text-emerald-200">
            {statusMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {confirmationModal?.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
            <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-text-primary">{confirmationModal.title}</h2>
                <p className="mt-3 text-sm text-text-secondary">{confirmationModal.message}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeConfirmationModal}
                  className="rounded-2xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-text-secondary hover:bg-slate-700 transition"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={confirmationModal.onConfirm}
                  className="rounded-2xl bg-accent-cyan px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-accent-cyan/90 transition"
                >
                  {confirmationModal.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-accent-cyan">Operazioni amministrative</p>
            <p className="text-lg font-semibold text-text-primary">Gestisci candidati e avvia la gara</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={confirmStartRace}
              disabled={!votingClosed}
              className="rounded-2xl bg-emerald-500/20 px-4 py-2 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50 transition"
            >
              {startLabel}
            </button>
            {!votingClosed && (
              <button
                type="button"
                onClick={confirmCloseTelevote}
                className="rounded-2xl bg-amber-500/20 px-4 py-2 text-amber-200 border border-amber-500/30 hover:bg-amber-500/30 transition"
              >
                Chiudi televoto
              </button>
            )}
            <button
              type="button"
              onClick={confirmResetRanking}
              className="rounded-2xl bg-red-500/20 px-4 py-2 text-red-200 border border-red-500/30 hover:bg-red-500/30 transition"
            >
              Azzera classifica
            </button>
          </div>
        </div>

        {/* Add New Candidate Form */}
        <div className="mb-8 p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Aggiungi Nuovo Candidato</h2>
          <form onSubmit={handleAddCandidate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <input
                type="text"
                placeholder="Nome"
                value={newCandidate.name}
                onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                disabled={!votingClosed}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-text-primary placeholder-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <input
              type="text"
              placeholder="Nome performance"
              value={newCandidate.subtitle}
              onChange={(e) => setNewCandidate({ ...newCandidate, subtitle: e.target.value })}
              disabled={!votingClosed}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-text-primary placeholder-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-600 bg-slate-900 px-3 py-2">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: newCandidate.color }}
                  />
                  <span className="text-sm text-text-secondary">Colore assegnato automaticamente</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewCandidate({ ...newCandidate, color: getRandomColor() })}
                  disabled={!votingClosed}
                  className="rounded-2xl border border-slate-600 px-4 py-2 text-sm text-text-primary hover:bg-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Rigenera colore
                </button>
                <label className="flex items-center gap-2 rounded-2xl border border-slate-600 bg-slate-900 px-3 py-2 cursor-pointer">
                  <span className="text-sm text-text-secondary">Palette personalizzata</span>
                  <input
                    type="color"
                    value={newCandidate.color}
                    onChange={(e) => setNewCandidate({ ...newCandidate, color: e.target.value })}
                    disabled={!votingClosed}
                    className="h-10 w-12 cursor-pointer border-0 p-0 disabled:cursor-not-allowed"
                  />
                </label>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  "#ef4444",
                  "#f59e0b",
                  "#10b981",
                  "#3b82f6",
                  "#8b5cf6",
                ].map((paletteColor) => (
                  <button
                    key={paletteColor}
                    type="button"
                    onClick={() => setNewCandidate({ ...newCandidate, color: paletteColor })}
                    disabled={!votingClosed}
                    className="h-10 rounded-full border-2 transition disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      backgroundColor: paletteColor,
                      borderColor: newCandidate.color === paletteColor ? "#fff" : "transparent",
                    }}
                  />
                ))}
              </div>
              <button
                type="submit"
                disabled={!votingClosed}
                className="w-full px-4 py-2 bg-accent-cyan text-slate-900 font-semibold rounded-lg hover:bg-accent-cyan/90 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Aggiungi Candidato
              </button>
            </div>
          </form>
        </div>

        {/* Candidates List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Candidati Attuali ({candidates.length})</h2>
          {candidates.length === 0 ? (
            <p className="text-text-secondary">Nessun candidato ancora.</p>
          ) : (
            candidates.map((candidate) => (
              <div key={candidate.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center gap-4">
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: candidate.color }}
                />
                <div className="flex-1">
                  <div className="font-semibold">
                    {candidate.name}
                  </div>
                  {candidate.subtitle && <div className="text-text-secondary text-sm">{candidate.subtitle}</div>}
                </div>
                {!modificationsLocked && (
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        editing === candidate.id ? cancelEditingCandidate() : startEditingCandidate(candidate)
                      }
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition"
                    >
                      {editing === candidate.id ? "Annulla" : "Modifica"}
                    </button>
                    <button
                      onClick={() => confirmDeleteCandidate(candidate.id)}
                      className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-sm transition"
                    >
                      Elimina
                    </button>
                  </div>
                )}

                {editing === candidate.id && editDraft && (
                  <div className="absolute right-4 bg-slate-800 p-4 rounded-lg border border-slate-700 w-80 z-10">
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editDraft.name}
                        onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm"
                        placeholder="Nome"
                      />
                      <input
                        type="text"
                        value={editDraft.subtitle}
                        onChange={(e) => setEditDraft({ ...editDraft, subtitle: e.target.value })}
                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm"
                        placeholder="Nome performance"
                      />
                      <input
                        type="color"
                        value={editDraft.color}
                        onChange={(e) => setEditDraft({ ...editDraft, color: e.target.value })}
                        className="w-full h-10 rounded cursor-pointer border-0"
                      />
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => saveEditingCandidate(candidate.id)}
                          className="flex-1 rounded-2xl bg-accent-cyan px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-accent-cyan/90 transition"
                        >
                          Salva
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingCandidate}
                          className="flex-1 rounded-2xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-text-secondary hover:bg-slate-700 transition"
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
