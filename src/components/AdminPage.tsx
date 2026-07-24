import { useCallback, useEffect, useMemo, useState } from "react";
import type { SyntheticEvent } from "react";
import type { CandidateData } from "../types";
import {
  fetchCandidates,
  fetchEventState,
  startEvent,
  updateEventVotingState,
  addCandidate,
  updateCandidate,
  deleteCandidate,
  resetEventVotes,
  fetchEvents,
  createEvent,
  updateEvent,
  type AdminEventSummary,
} from "../api";
import { EVENT_NAME_SEPARATOR } from "../eventNameDisplay";
import { JudgeCodeManager } from "./JudgeCodeManager";
import { VotingProgressDashboard } from "./VotingProgressDashboard";

const eventCodeRegex = /^\d{1,5}$/;

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
  readonly initialEventId?: string;
  readonly initialEventCode?: string;
  readonly onVotingStateChange?: (votingClosed: boolean) => void;
}

export function AdminPage({ initialEventId, initialEventCode, onVotingStateChange }: AdminPageProps) {
  const [events, setEvents] = useState<AdminEventSummary[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [updatingSelectedEventName, setUpdatingSelectedEventName] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialEventId ?? null);
  const [selectedEventNameDraft, setSelectedEventNameDraft] = useState("");
  const [newEvent, setNewEvent] = useState({
    code: "",
    name: "",
    subtitle: "",
  });

  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [loading, setLoading] = useState(false);
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

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const loadEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const data = await fetchEvents();
      setEvents(data);
      setEventsError(null);
      setSelectedEventId((currentId) => {
        if (currentId && data.some((event) => event.id === currentId)) {
          return currentId;
        }

        if (initialEventId && data.some((event) => event.id === initialEventId)) {
          return initialEventId;
        }

        if (initialEventCode) {
          const match = data.find((event) => event.code === initialEventCode);
          if (match) return match.id;
        }

        return data[0]?.id ?? null;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore";
      setEventsError(msg);
    } finally {
      setLoadingEvents(false);
    }
  }, [initialEventCode, initialEventId]);

  const loadCandidates = useCallback(async () => {
    if (!selectedEvent) {
      setCandidates([]);
      setVotingClosed(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [data, eventState] = await Promise.all([
        fetchCandidates(selectedEvent.id),
        fetchEventState(selectedEvent.id),
      ]);
      setCandidates(data);
      setVotingClosed(eventState.votingClosed);
      onVotingStateChange?.(eventState.votingClosed);
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
  }, [onVotingStateChange, selectedEvent]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  useEffect(() => {
    setSelectedEventNameDraft(selectedEvent?.name ?? "");
  }, [selectedEvent?.id, selectedEvent?.name]);

  async function handleCreateEvent(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedCode = newEvent.code.trim();
    const trimmedName = newEvent.name.trim();
    const trimmedSubtitle = newEvent.subtitle.trim();

    if (!trimmedName) {
      setError("Il nome evento è obbligatorio");
      setStatusMessage(null);
      return;
    }

    if (trimmedCode && !eventCodeRegex.test(trimmedCode)) {
      setError("Il codice evento deve contenere da 1 a 5 cifre");
      setStatusMessage(null);
      return;
    }

    try {
      setCreatingEvent(true);
      const createdEvent = await createEvent({
        code: trimmedCode || undefined,
        name: trimmedName,
        subtitle: trimmedSubtitle || undefined,
      });

      setEvents((previous) => {
        const next = [createdEvent, ...previous];
        next.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        return next;
      });
      setSelectedEventId(createdEvent.id);
      setNewEvent({ code: "", name: "", subtitle: "" });
      setError(null);
      setStatusMessage(`Evento creato con codice ${createdEvent.code}.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore";
      setError(msg);
      setStatusMessage(null);
    } finally {
      setCreatingEvent(false);
    }
  }

  async function handleAddCandidate(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedEvent) return;

    if (!newCandidate.name) {
      setError("Il nome del candidato è obbligatorio");
      setStatusMessage(null);
      return;
    }

    try {
      const nextNumber = Number.parseInt(getNextNumber(candidates), 10);
      const candidate = await addCandidate(
        selectedEvent.id,
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

  async function handleRenameSelectedEvent(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedEvent) return;

    const trimmedName = selectedEventNameDraft.trim();
    if (!trimmedName) {
      setError("Il nome evento è obbligatorio");
      setStatusMessage(null);
      return;
    }

    if (trimmedName === selectedEvent.name) {
      setStatusMessage("Nessuna modifica da salvare.");
      setError(null);
      return;
    }

    try {
      setUpdatingSelectedEventName(true);
      const updatedEvent = await updateEvent(selectedEvent.id, { name: trimmedName });
      setEvents((previous) =>
        previous.map((event) =>
          event.id === updatedEvent.id ? { ...event, name: updatedEvent.name, subtitle: updatedEvent.subtitle } : event
        )
      );
      setSelectedEventNameDraft(updatedEvent.name);
      setError(null);
      setStatusMessage("Nome evento aggiornato con successo.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore";
      setError(msg);
      setStatusMessage(null);
    } finally {
      setUpdatingSelectedEventName(false);
    }
  }

  async function handleUpdateCandidate(
    id: string,
    updates: Partial<Pick<CandidateData, "name" | "subtitle" | "color" | "number">>
  ) {
    try {
      const updated = await updateCandidate(id, updates);
      setCandidates(candidates.map((candidate) => (candidate.id === id ? updated : candidate)));
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
          const remaining = candidates.filter((candidate) => candidate.id !== id);
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
    if (!selectedEvent) return;

    openConfirmationModal({
      title: "Avvia gara",
      message: "Vuoi avviare la gara? I voti precedenti saranno azzerati e i candidati verranno rinumerati progressivamente.",
      confirmLabel: "Avvia",
      onConfirm: async () => {
        closeConfirmationModal();
        try {
          const result = await startEvent(selectedEvent.id);
          setCandidates(result.candidates);
          setVotingClosed(result.votingClosed);
          onVotingStateChange?.(result.votingClosed);
          setEvents((previous) =>
            previous.map((event) =>
              event.id === selectedEvent.id ? { ...event, votingClosed: result.votingClosed, active: true } : event
            )
          );
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
    if (!selectedEvent) return;

    openConfirmationModal({
      title: "Chiudi televoto",
      message: "Vuoi chiudere il televoto? I voti non saranno più accettati e le modifiche torneranno disponibili.",
      confirmLabel: "Chiudi",
      onConfirm: async () => {
        closeConfirmationModal();
        try {
          const result = await updateEventVotingState(selectedEvent.id, true);
          setVotingClosed(result.votingClosed);
          onVotingStateChange?.(result.votingClosed);
          setEvents((previous) =>
            previous.map((event) =>
              event.id === selectedEvent.id ? { ...event, votingClosed: result.votingClosed } : event
            )
          );
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
    if (!selectedEvent) return;

    openConfirmationModal({
      title: "Azzera classifica",
      message: "Vuoi azzerare tutti i voti e ricominciare da capo?",
      confirmLabel: "Azzera",
      onConfirm: async () => {
        closeConfirmationModal();
        try {
          await resetEventVotes(selectedEvent.id);
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
  const modificationLockMessage = "Disponibile solo a televoto chiuso";

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-text-primary">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Admin - Gestione Eventi e Candidati</h1>

        <div className="mb-8 rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold mb-4">Eventi</h2>

          {loadingEvents ? (
            <div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr,1fr]">
              <div className="space-y-3">
                <label htmlFor="admin-selected-event" className="text-sm text-text-secondary">Evento da gestire</label>
                <select
                  id="admin-selected-event"
                  value={selectedEventId ?? ""}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value || null);
                    setEditing(null);
                    setEditDraft(null);
                    setStatusMessage(null);
                  }}
                  className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-3 py-2 text-text-primary"
                >
                  <option value="">Seleziona evento</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.code} - {event.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={loadEvents}
                  className="rounded-2xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-text-secondary hover:bg-slate-700 transition"
                >
                  Aggiorna elenco eventi
                </button>
                {selectedEvent && (
                  <div className="space-y-2 rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                    <p className="text-sm text-text-secondary">
                      Evento corrente: <span className="font-semibold text-text-primary">{selectedEvent.name}</span> (codice {selectedEvent.code})
                    </p>
                    <form onSubmit={handleRenameSelectedEvent} className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={selectedEventNameDraft}
                        onChange={(e) => setSelectedEventNameDraft(e.target.value)}
                        placeholder="Nuovo nome evento"
                        className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-text-primary"
                      />
                      <button
                        type="submit"
                        disabled={updatingSelectedEventName}
                        className="rounded-2xl border border-accent-cyan/50 bg-accent-cyan/20 px-4 py-2 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/30 transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingSelectedEventName ? "Salvataggio..." : "Rinomina evento"}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-cyan">Crea nuovo evento</p>
                <label className="space-y-1 block">
                  <span className="text-sm text-text-secondary">Nome evento</span>
                  <input
                    type="text"
                    value={newEvent.name}
                    onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                    placeholder={`Es. Finale regionale ${EVENT_NAME_SEPARATOR} GRAN FINALE`}
                    className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-3 py-2 text-text-primary"
                  />
                  <p className="text-xs text-text-muted">
                    Per evidenziare l'ultima parte del titolo in Hero e Hall of Fame usa il separatore
                    {" "}<span className="font-semibold text-text-secondary">{EVENT_NAME_SEPARATOR}</span>
                    {" "}(esempio: "Festival Regionale {EVENT_NAME_SEPARATOR} GRAN FINALE").
                  </p>
                </label>
                <label className="space-y-1 block">
                  <span className="text-sm text-text-secondary">Sottotitolo (opzionale)</span>
                  <input
                    type="text"
                    value={newEvent.subtitle}
                    onChange={(e) => setNewEvent({ ...newEvent, subtitle: e.target.value })}
                    placeholder="Es. Edizione 2026"
                    className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-3 py-2 text-text-primary"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="text-sm text-text-secondary">Codice evento (opzionale, 1-5 cifre)</span>
                  <input
                    type="text"
                    value={newEvent.code}
                    onChange={(e) => setNewEvent({ ...newEvent, code: e.target.value })}
                    placeholder="Es. 01234"
                    className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-3 py-2 text-text-primary"
                  />
                </label>
                <button
                  type="submit"
                  disabled={creatingEvent}
                  className="w-full rounded-2xl bg-accent-cyan px-4 py-2 font-semibold text-slate-900 hover:bg-accent-cyan/90 transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingEvent ? "Creazione..." : "Crea evento"}
                </button>
              </form>
            </div>
          )}

          {eventsError && (
            <div className="mt-4 rounded-lg border border-red-500 bg-red-500/20 p-3 text-red-300">
              {eventsError}
            </div>
          )}
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

        {!selectedEvent ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 text-text-secondary">
            Seleziona o crea un evento per iniziare la gestione candidati.
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center min-h-[240px]">
            <div className="w-10 h-10 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-6 inline-flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm">
              <span className="font-semibold">Stato evento:</span>
              <span className={votingClosed ? "text-cyan-300" : "text-emerald-300"}>{currentStatus}</span>
              <span className="text-text-secondary">
                {votingClosed ? "La gara non è avviata." : "Il televoto è attivo e le modifiche sono bloccate."}
              </span>
            </div>

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

            <div className="sticky top-4 z-20 mb-6 rounded-2xl border border-slate-700/90 bg-slate-900/90 p-4 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-4">
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
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-red-200">Danger zone</p>
                <button
                  type="button"
                  onClick={confirmResetRanking}
                  className="mt-2 rounded-2xl bg-red-500/20 px-4 py-2 text-red-200 border border-red-500/30 hover:bg-red-500/30 transition"
                >
                  Azzera classifica
                </button>
              </div>
            </div>

            <div className="mb-8 p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div>
                <h2 className="text-xl font-semibold mb-4">Aggiungi Nuovo Candidato</h2>
              </div>
              <form onSubmit={handleAddCandidate} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-text-secondary">Nome candidato</span>
                  <input
                    type="text"
                    placeholder="Es. Marco Rossi"
                    value={newCandidate.name}
                    onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                    disabled={!votingClosed}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-text-primary placeholder-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  </label>
                </div>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-text-secondary">Titolo performance (opzionale)</span>
                  <input
                    type="text"
                    placeholder="Es. Brano / coreografia"
                    value={newCandidate.subtitle}
                    onChange={(e) => setNewCandidate({ ...newCandidate, subtitle: e.target.value })}
                    disabled={!votingClosed}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-text-primary placeholder-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>
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
                  {modificationsLocked && (
                    <p className="text-sm text-amber-200">{modificationLockMessage}</p>
                  )}
                </div>
              </form>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Candidati Attuali ({candidates.length})</h2>
              {candidates.length === 0 ? (
                <p className="text-text-secondary">Nessun candidato ancora.</p>
              ) : (
                candidates.map((candidate) => (
                  <div key={candidate.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center gap-4 relative">
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: candidate.color }}
                    />
                    <div className="flex-1">
                      <div className="font-semibold">{candidate.name}</div>
                      {candidate.subtitle && <div className="text-text-secondary text-sm">{candidate.subtitle}</div>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          editing === candidate.id ? cancelEditingCandidate() : startEditingCandidate(candidate)
                        }
                        disabled={modificationsLocked}
                        title={modificationsLocked ? modificationLockMessage : "Modifica candidato"}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {editing === candidate.id ? "Annulla" : "Modifica"}
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDeleteCandidate(candidate.id)}
                        disabled={modificationsLocked}
                        title={modificationsLocked ? modificationLockMessage : "Elimina candidato"}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-sm transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Elimina
                      </button>
                    </div>

                    {editing === candidate.id && editDraft && (
                      <div className="mt-4 w-full rounded-2xl border border-slate-600 bg-slate-900/80 p-4">
                        <div className="grid gap-3 md:grid-cols-[1fr,1fr,auto]">
                          <label className="space-y-1">
                            <span className="text-xs uppercase tracking-[0.12em] text-text-secondary">Nome</span>
                            <input
                              type="text"
                              value={editDraft.name}
                              onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                              className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm"
                              placeholder="Nome"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs uppercase tracking-[0.12em] text-text-secondary">Performance</span>
                            <input
                              type="text"
                              value={editDraft.subtitle}
                              onChange={(e) => setEditDraft({ ...editDraft, subtitle: e.target.value })}
                              className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm"
                              placeholder="Nome performance"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs uppercase tracking-[0.12em] text-text-secondary">Colore</span>
                            <input
                              type="color"
                              value={editDraft.color}
                              onChange={(e) => setEditDraft({ ...editDraft, color: e.target.value })}
                              className="h-10 w-16 rounded cursor-pointer border-0"
                            />
                          </label>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveEditingCandidate(candidate.id)}
                            className="rounded-2xl bg-accent-cyan px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-accent-cyan/90 transition"
                          >
                            Salva
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditingCandidate}
                            className="rounded-2xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-text-secondary hover:bg-slate-700 transition"
                          >
                            Annulla
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <JudgeCodeManager eventId={selectedEvent.id} eventCode={selectedEvent.code} />

            <VotingProgressDashboard eventId={selectedEvent.id} votingClosed={votingClosed} />
          </>
        )}
      </div>
    </div>
  );
}
