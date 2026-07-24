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
  loginEventManager,
  updateEventManagerPassword,
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

type AdminSection = "events" | "candidates" | "voting-codes" | "voting-backstage";

function isAdminSection(value: string | null): value is AdminSection {
  return value === "events" || value === "candidates" || value === "voting-codes" || value === "voting-backstage";
}

function getAdminSectionFromLocation(): AdminSection {
  const section = new URLSearchParams(globalThis.location.search).get("adminSection");
  if (section === "voting") return "voting-codes";
  return isAdminSection(section) ? section : "events";
}

function setAdminSectionInLocation(section: AdminSection, historyMethod: "pushState" | "replaceState") {
  const params = new URLSearchParams(globalThis.location.search);
  params.set("adminSection", section);
  const search = params.toString();
  globalThis.history[historyMethod]({}, "", `${globalThis.location.pathname}?${search}`);
}

interface AdminPageProps {
  readonly initialEventId?: string;
  readonly initialEventCode?: string;
  readonly rootAuthToken: string | null;
  readonly onVotingStateChange?: (votingClosed: boolean) => void;
}

export function AdminPage({ initialEventId, initialEventCode, rootAuthToken, onVotingStateChange }: AdminPageProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>(() => getAdminSectionFromLocation());
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
    managerPassword: "",
  });
  const [eventManagerPasswordInput, setEventManagerPasswordInput] = useState("");
  const [eventManagerToken, setEventManagerToken] = useState<string | null>(null);
  const [authenticatingManager, setAuthenticatingManager] = useState(false);
  const [updatingManagerPassword, setUpdatingManagerPassword] = useState(false);
  const [managerPasswordDraft, setManagerPasswordDraft] = useState("");

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
  const handleSectionChange = useCallback((section: AdminSection) => {
    setActiveSection(section);
    setAdminSectionInLocation(section, "pushState");
  }, []);

  const loadEvents = useCallback(async () => {
    if (!rootAuthToken) {
      setEvents([]);
      setLoadingEvents(false);
      setEventsError("Sessione root non disponibile. Rientra nell'area admin.");
      return;
    }

    try {
      setLoadingEvents(true);
      const data = await fetchEvents(rootAuthToken);
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
  }, [initialEventCode, initialEventId, rootAuthToken]);

  const loadCandidates = useCallback(async () => {
    if (!selectedEvent || !eventManagerToken) {
      setCandidates([]);
      setVotingClosed(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [data, eventState] = await Promise.all([
        fetchCandidates(selectedEvent.id, eventManagerToken),
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
  }, [eventManagerToken, onVotingStateChange, selectedEvent]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!selectedEvent) {
      setEventManagerToken(null);
      setEventManagerPasswordInput("");
      setManagerPasswordDraft("");
      setCandidates([]);
      return;
    }
    loadCandidates();
  }, [loadCandidates, selectedEvent]);

  useEffect(() => {
    setSelectedEventNameDraft(selectedEvent?.name ?? "");
    setEventManagerToken(null);
    setEventManagerPasswordInput("");
    setManagerPasswordDraft("");
  }, [selectedEvent?.id, selectedEvent?.name]);

  useEffect(() => {
    const onPopState = () => {
      setActiveSection(getAdminSectionFromLocation());
    };
    globalThis.addEventListener("popstate", onPopState);
    return () => globalThis.removeEventListener("popstate", onPopState);
  }, []);

  async function handleCreateEvent(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rootAuthToken) {
      setError("Sessione root non valida. Rientra nell'area admin.");
      setStatusMessage(null);
      return;
    }

    const trimmedCode = newEvent.code.trim();
    const trimmedName = newEvent.name.trim();
    const trimmedSubtitle = newEvent.subtitle.trim();
    const managerPassword = newEvent.managerPassword;

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

    if (managerPassword.length < 8) {
      setError("La password manager evento deve avere almeno 8 caratteri");
      setStatusMessage(null);
      return;
    }

    try {
      setCreatingEvent(true);
      const createdEvent = await createEvent({
        code: trimmedCode || undefined,
        name: trimmedName,
        subtitle: trimmedSubtitle || undefined,
        managerPassword,
      }, rootAuthToken);

      setEvents((previous) => {
        const next = [createdEvent, ...previous];
        next.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        return next;
      });
      setSelectedEventId(createdEvent.id);
      setNewEvent({ code: "", name: "", subtitle: "", managerPassword: "" });
      setError(null);
      setStatusMessage(`Evento creato con codice ${createdEvent.code}.`);
      handleSectionChange("candidates");
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
    if (!selectedEvent || !eventManagerToken) return;

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
        eventManagerToken,
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
    if (!selectedEvent || !rootAuthToken) return;

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
      const updatedEvent = await updateEvent(selectedEvent.id, { name: trimmedName }, rootAuthToken);
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

  async function handleEventManagerLogin(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedEvent) return;

    if (eventManagerPasswordInput.length < 8) {
      setError("La password evento deve avere almeno 8 caratteri.");
      setStatusMessage(null);
      return;
    }

    try {
      setAuthenticatingManager(true);
      const session = await loginEventManager(selectedEvent.id, eventManagerPasswordInput);
      setEventManagerToken(session.token);
      setError(null);
      setStatusMessage("Accesso manager evento effettuato.");
      setEventManagerPasswordInput("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore autenticazione manager evento";
      setError(msg);
      setStatusMessage(null);
      setEventManagerToken(null);
    } finally {
      setAuthenticatingManager(false);
    }
  }

  async function handleRotateEventManagerPassword(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedEvent || !rootAuthToken) return;

    if (managerPasswordDraft.length < 8) {
      setError("La nuova password evento deve avere almeno 8 caratteri.");
      setStatusMessage(null);
      return;
    }

    try {
      setUpdatingManagerPassword(true);
      await updateEventManagerPassword(selectedEvent.id, managerPasswordDraft, rootAuthToken);
      setManagerPasswordDraft("");
      setEventManagerToken(null);
      setError(null);
      setStatusMessage("Password manager evento aggiornata con successo.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore nell'aggiornamento password evento";
      setError(msg);
      setStatusMessage(null);
    } finally {
      setUpdatingManagerPassword(false);
    }
  }

  async function handleUpdateCandidate(
    id: string,
    updates: Partial<Pick<CandidateData, "name" | "subtitle" | "color" | "number">>
  ) {
    if (!eventManagerToken) return;
    try {
      const updated = await updateCandidate(id, updates, eventManagerToken);
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
          if (!eventManagerToken) {
            throw new Error("Accesso manager evento richiesto");
          }
          await deleteCandidate(id, eventManagerToken);
          
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
          if (!eventManagerToken) {
            throw new Error("Accesso manager evento richiesto");
          }
          const result = await startEvent(selectedEvent.id, eventManagerToken);
          
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
          if (!eventManagerToken) {
            throw new Error("Accesso manager evento richiesto");
          }
          const result = await updateEventVotingState(selectedEvent.id, true, eventManagerToken);
          
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
          if (!eventManagerToken) {
            throw new Error("Accesso manager evento richiesto");
          }
          await resetEventVotes(selectedEvent.id, eventManagerToken);
          
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
  const selectedEventBadge = selectedEvent ? `${selectedEvent.code} - ${selectedEvent.name}` : "Nessun evento selezionato";

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-text-primary">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Pannello per eventi, candidati, codici giuria e backstage votazioni.
          </p>
        </header>

        <nav className="mb-6 rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => handleSectionChange("events")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeSection === "events"
                  ? "border border-accent-cyan/40 bg-accent-cyan/20 text-accent-cyan"
                  : "border border-slate-700 bg-slate-800 text-text-secondary hover:bg-slate-700"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span>Gestione eventi</span>
                <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-text-secondary">
                  {events.length}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleSectionChange("candidates")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeSection === "candidates"
                  ? "border border-accent-cyan/40 bg-accent-cyan/20 text-accent-cyan"
                  : "border border-slate-700 bg-slate-800 text-text-secondary hover:bg-slate-700"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span>Gestione candidati</span>
                <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-text-secondary">
                  {selectedEvent ? candidates.length : "-"}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleSectionChange("voting-codes")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeSection === "voting-codes"
                  ? "border border-accent-cyan/40 bg-accent-cyan/20 text-accent-cyan"
                  : "border border-slate-700 bg-slate-800 text-text-secondary hover:bg-slate-700"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span>Codici giuria</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${
                    selectedEvent
                      ? votingClosed
                        ? "border-cyan-400/30 text-cyan-300"
                        : "border-emerald-400/30 text-emerald-300"
                      : "border-slate-600 text-text-secondary"
                  }`}
                >
                  {selectedEvent ? (votingClosed ? "Chiuso" : "Aperto") : "-"}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleSectionChange("voting-backstage")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeSection === "voting-backstage"
                  ? "border border-accent-cyan/40 bg-accent-cyan/20 text-accent-cyan"
                  : "border border-slate-700 bg-slate-800 text-text-secondary hover:bg-slate-700"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span>Backstage votazioni</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${
                    selectedEvent
                      ? votingClosed
                        ? "border-cyan-400/30 text-cyan-300"
                        : "border-emerald-400/30 text-emerald-300"
                      : "border-slate-600 text-text-secondary"
                  }`}
                >
                  {selectedEvent ? (votingClosed ? "Chiuso" : "Aperto") : "-"}
                </span>
              </span>
            </button>
          </div>
        </nav>

        <section className="mb-6 rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr,auto] lg:items-end">
            <div className="space-y-2">
              <label htmlFor="admin-selected-event-global" className="text-sm text-text-secondary">
                Evento selezionato
              </label>
              <select
                id="admin-selected-event-global"
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
              {selectedEvent && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-slate-600 px-2 py-0.5 text-text-secondary">
                    {selectedEventBadge}
                  </span>
                  <span className="rounded-full border border-slate-600 px-2 py-0.5 text-text-secondary">
                    Candidati: {candidates.length}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 ${
                      votingClosed
                        ? "border-cyan-400/30 text-cyan-300"
                        : "border-emerald-400/30 text-emerald-300"
                    }`}
                  >
                    Stato: {currentStatus}
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={loadEvents}
              className="rounded-2xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-text-secondary hover:bg-slate-700 transition"
            >
              Aggiorna eventi
            </button>
          </div>
          {eventsError && (
            <div className="mt-4 rounded-lg border border-red-500 bg-red-500/20 p-3 text-red-300">
              {eventsError}
            </div>
          )}
        </section>

        {statusMessage && (
          <div className="mb-6 rounded-lg border border-emerald-500 bg-emerald-500/10 p-4 text-emerald-200">
            {statusMessage}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500 bg-red-500/20 p-4 text-red-300">
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

        {activeSection === "events" && (
          <section className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-accent-cyan">Gestione eventi</p>
              <h2 className="mt-2 text-2xl font-semibold">Anagrafica eventi</h2>
            </div>

            {loadingEvents ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
                <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                  <h3 className="text-lg font-semibold">Evento corrente</h3>
                  {selectedEvent ? (
                    <>
                      <p className="text-sm text-text-secondary">
                        {selectedEvent.code} - <span className="font-semibold text-text-primary">{selectedEvent.name}</span>
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
                          {updatingSelectedEventName ? "Salvataggio..." : "Rinomina"}
                        </button>
                      </form>
                      <form onSubmit={handleRotateEventManagerPassword} className="flex flex-col gap-2 sm:flex-row">
                        <input
                          type="password"
                          value={managerPasswordDraft}
                          onChange={(e) => setManagerPasswordDraft(e.target.value)}
                          placeholder="Nuova password manager evento"
                          className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-text-primary"
                        />
                        <button
                          type="submit"
                          disabled={updatingManagerPassword}
                          className="rounded-2xl border border-amber-400/40 bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-400/30 transition disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingManagerPassword ? "Aggiornamento..." : "Aggiorna password evento"}
                        </button>
                      </form>
                    </>
                  ) : (
                    <p className="text-sm text-text-secondary">Seleziona prima un evento.</p>
                  )}
                </div>

                <form onSubmit={handleCreateEvent} className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-cyan">Crea nuovo evento</p>
                  <label className="block space-y-1">
                    <span className="text-sm text-text-secondary">Nome evento</span>
                    <input
                      type="text"
                      value={newEvent.name}
                      onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                      placeholder={`Es. Finale regionale ${EVENT_NAME_SEPARATOR} GRAN FINALE`}
                      className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-3 py-2 text-text-primary"
                    />
                    <p className="text-xs text-text-muted">
                      Separatore titolo evidenziato: <span className="font-semibold text-text-secondary">{EVENT_NAME_SEPARATOR}</span>
                    </p>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-text-secondary">Sottotitolo (opzionale)</span>
                    <input
                      type="text"
                      value={newEvent.subtitle}
                      onChange={(e) => setNewEvent({ ...newEvent, subtitle: e.target.value })}
                      placeholder="Es. Edizione 2026"
                      className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-3 py-2 text-text-primary"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-text-secondary">Codice evento (opzionale, 1-5 cifre)</span>
                    <input
                      type="text"
                      value={newEvent.code}
                      onChange={(e) => setNewEvent({ ...newEvent, code: e.target.value })}
                      placeholder="Es. 01234"
                      className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-3 py-2 text-text-primary"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm text-text-secondary">Password manager evento (min. 8 caratteri)</span>
                    <input
                      type="password"
                      value={newEvent.managerPassword}
                      onChange={(e) => setNewEvent({ ...newEvent, managerPassword: e.target.value })}
                      placeholder="Password dedicata al manager dell'evento"
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
          </section>
        )}

        {activeSection === "candidates" && (
          <section className="space-y-6 rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-accent-cyan">Gestione candidati</p>
              <h2 className="mt-2 text-2xl font-semibold">Candidati per evento selezionato</h2>
            </div>

            {!selectedEvent ? (
              <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 text-text-secondary">
                Seleziona o crea un evento per iniziare la gestione candidati.
              </div>
            ) : !eventManagerToken ? (
              <form onSubmit={handleEventManagerLogin} className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 space-y-3">
                <p className="text-sm text-text-secondary">
                  Inserisci la password manager dell'evento selezionato per gestire candidati e giudici.
                </p>
                <input
                  type="password"
                  value={eventManagerPasswordInput}
                  onChange={(e) => setEventManagerPasswordInput(e.target.value)}
                  placeholder="Password manager evento"
                  className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-3 py-2 text-text-primary"
                />
                <button
                  type="submit"
                  disabled={authenticatingManager}
                  className="rounded-2xl bg-accent-cyan px-4 py-2 font-semibold text-slate-900 hover:bg-accent-cyan/90 transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authenticatingManager ? "Accesso..." : "Sblocca gestione evento"}
                </button>
              </form>
            ) : loading ? (
              <div className="flex items-center justify-center min-h-[240px]">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
              </div>
            ) : (
              <>
                <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm">
                  <span className="font-semibold">Stato evento:</span>
                  <span className={votingClosed ? "text-cyan-300" : "text-emerald-300"}>{currentStatus}</span>
                  <span className="text-text-secondary">
                    {votingClosed ? "Modifiche abilitate." : "Modifiche bloccate finché il televoto è aperto."}
                  </span>
                </div>

                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                  <h3 className="mb-4 text-xl font-semibold">Aggiungi nuovo candidato</h3>
                  <form onSubmit={handleAddCandidate} className="space-y-4">
                    <label className="space-y-1">
                      <span className="text-sm font-medium text-text-secondary">Nome candidato</span>
                      <input
                        type="text"
                        placeholder="Es. Marco Rossi"
                        value={newCandidate.name}
                        onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                        disabled={!votingClosed}
                        className="w-full rounded bg-slate-700 px-3 py-2 text-text-primary placeholder-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm font-medium text-text-secondary">Titolo performance (opzionale)</span>
                      <input
                        type="text"
                        placeholder="Es. Brano / coreografia"
                        value={newCandidate.subtitle}
                        onChange={(e) => setNewCandidate({ ...newCandidate, subtitle: e.target.value })}
                        disabled={!votingClosed}
                        className="w-full rounded bg-slate-700 px-3 py-2 text-text-primary placeholder-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </label>
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-600 bg-slate-900 px-3 py-2">
                          <div className="h-6 w-6 rounded" style={{ backgroundColor: newCandidate.color }} />
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
                        <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-600 bg-slate-900 px-3 py-2">
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
                        {["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"].map((paletteColor) => (
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
                        className="w-full rounded-lg bg-accent-cyan px-4 py-2 font-semibold text-slate-900 hover:bg-accent-cyan/90 transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Aggiungi candidato
                      </button>
                      {modificationsLocked && <p className="text-sm text-amber-200">{modificationLockMessage}</p>}
                    </div>
                  </form>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Candidati attuali ({candidates.length})</h3>
                  {candidates.length === 0 ? (
                    <p className="text-text-secondary">Nessun candidato ancora.</p>
                  ) : (
                    candidates.map((candidate) => (
                      <div key={candidate.id} className="relative flex items-center gap-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                        <div className="h-6 w-6 rounded" style={{ backgroundColor: candidate.color }} />
                        <div className="flex-1">
                          <div className="font-semibold">{candidate.number}. {candidate.name}</div>
                          {candidate.subtitle && <div className="text-sm text-text-secondary">{candidate.subtitle}</div>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => (editing === candidate.id ? cancelEditingCandidate() : startEditingCandidate(candidate))}
                            disabled={modificationsLocked}
                            title={modificationsLocked ? modificationLockMessage : "Modifica candidato"}
                            className="rounded bg-slate-700 px-3 py-1 text-sm transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {editing === candidate.id ? "Annulla" : "Modifica"}
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmDeleteCandidate(candidate.id)}
                            disabled={modificationsLocked}
                            title={modificationsLocked ? modificationLockMessage : "Elimina candidato"}
                            className="rounded bg-red-500/20 px-3 py-1 text-sm text-red-300 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
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
                                  className="w-full rounded border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm"
                                  placeholder="Nome"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs uppercase tracking-[0.12em] text-text-secondary">Performance</span>
                                <input
                                  type="text"
                                  value={editDraft.subtitle}
                                  onChange={(e) => setEditDraft({ ...editDraft, subtitle: e.target.value })}
                                  className="w-full rounded border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm"
                                  placeholder="Nome performance"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs uppercase tracking-[0.12em] text-text-secondary">Colore</span>
                                <input
                                  type="color"
                                  value={editDraft.color}
                                  onChange={(e) => setEditDraft({ ...editDraft, color: e.target.value })}
                                  className="h-10 w-16 cursor-pointer rounded border-0"
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
              </>
            )}
          </section>
        )}

        {(activeSection === "voting-codes" || activeSection === "voting-backstage") && (
          <section className="space-y-6 rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-accent-cyan">Gestione votazione</p>
              <h2 className="mt-2 text-2xl font-semibold">
                {activeSection === "voting-codes"
                  ? "Generazione e validazione codici giuria"
                  : "Backstage con progresso delle votazioni"}
              </h2>
            </div>

            {!selectedEvent ? (
              <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 text-text-secondary">
                Seleziona un evento per accedere alla gestione votazione.
              </div>
            ) : !eventManagerToken ? (
              <form onSubmit={handleEventManagerLogin} className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 space-y-3">
                <p className="text-sm text-text-secondary">
                  Accesso manager evento richiesto.
                </p>
                <input
                  type="password"
                  value={eventManagerPasswordInput}
                  onChange={(e) => setEventManagerPasswordInput(e.target.value)}
                  placeholder="Password manager evento"
                  className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-3 py-2 text-text-primary"
                />
                <button
                  type="submit"
                  disabled={authenticatingManager}
                  className="rounded-2xl bg-accent-cyan px-4 py-2 font-semibold text-slate-900 hover:bg-accent-cyan/90 transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authenticatingManager ? "Accesso..." : "Sblocca gestione evento"}
                </button>
              </form>
            ) : loading ? (
              <div className="flex items-center justify-center min-h-[240px]">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
              </div>
            ) : activeSection === "voting-codes" ? (
              <JudgeCodeManager eventId={selectedEvent.id} eventCode={selectedEvent.code} authToken={eventManagerToken} />
            ) : (
              <>
                <div className="rounded-2xl border border-slate-700/90 bg-slate-900/90 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-accent-cyan">Operazioni amministrative</p>
                      <p className="text-lg font-semibold text-text-primary">
                        {selectedEvent.code} - {selectedEvent.name}
                      </p>
                      <p className="text-sm text-text-secondary">Stato: {currentStatus}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={confirmStartRace}
                        disabled={!votingClosed}
                        className="rounded-2xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-emerald-200 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50 transition"
                      >
                        {startLabel}
                      </button>
                      {!votingClosed && (
                        <button
                          type="button"
                          onClick={confirmCloseTelevote}
                          className="rounded-2xl border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-amber-200 hover:bg-amber-500/30 transition"
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
                      className="mt-2 rounded-2xl border border-red-500/30 bg-red-500/20 px-4 py-2 text-red-200 hover:bg-red-500/30 transition"
                    >
                      Azzera classifica
                    </button>
                  </div>
                </div>

                <VotingProgressDashboard eventId={selectedEvent.id} votingClosed={votingClosed} authToken={eventManagerToken} />
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
