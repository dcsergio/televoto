import { useEffect, useState } from "react";
import type { CandidateData } from "../types";
import { fetchCandidates, addCandidate, updateCandidate, deleteCandidate } from "../api";

interface AdminPageProps {
  eventId: string;
  onBack: () => void;
}

export function AdminPage({ eventId, onBack }: AdminPageProps) {
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [newCandidate, setNewCandidate] = useState({
    number: "",
    name: "",
    subtitle: "",
    color: "#6366f1",
  });

  useEffect(() => {
    loadCandidates();
  }, [eventId]);

  async function loadCandidates() {
    try {
      setLoading(true);
      const data = await fetchCandidates(eventId);
      setCandidates(data);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCandidate(e: React.FormEvent) {
    e.preventDefault();
    if (!newCandidate.number || !newCandidate.name) {
      setError("Numero e nome sono obbligatori");
      return;
    }

    try {
      const candidate = await addCandidate(
        eventId,
        parseInt(newCandidate.number),
        newCandidate.name,
        newCandidate.subtitle || undefined,
        newCandidate.color
      );
      setCandidates([...candidates, candidate].sort((a, b) => a.number - b.number));
      setNewCandidate({ number: "", name: "", subtitle: "", color: "#6366f1" });
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore";
      setError(msg);
    }
  }

  async function handleUpdateCandidate(id: string, updates: Partial<CandidateData>) {
    try {
      const updated = await updateCandidate(id, updates as any);
      setCandidates(candidates.map((c) => (c.id === id ? updated : c)));
      setEditing(null);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore";
      setError(msg);
    }
  }

  async function handleDeleteCandidate(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questo candidato?")) return;
    try {
      await deleteCandidate(id);
      setCandidates(candidates.filter((c) => c.id !== id));
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore";
      setError(msg);
    }
  }

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

        <h1 className="text-3xl font-bold mb-8">Admin - Gestione Candidati</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Add New Candidate Form */}
        <div className="mb-8 p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Aggiungi Nuovo Candidato</h2>
          <form onSubmit={handleAddCandidate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Numero"
                value={newCandidate.number}
                onChange={(e) => setNewCandidate({ ...newCandidate, number: e.target.value })}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-text-primary placeholder-text-secondary"
              />
              <input
                type="text"
                placeholder="Nome"
                value={newCandidate.name}
                onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-text-primary placeholder-text-secondary"
              />
            </div>
            <input
              type="text"
              placeholder="Sottotitolo (opzionale)"
              value={newCandidate.subtitle}
              onChange={(e) => setNewCandidate({ ...newCandidate, subtitle: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-text-primary placeholder-text-secondary"
            />
            <div className="flex gap-4">
              <input
                type="color"
                value={newCandidate.color}
                onChange={(e) => setNewCandidate({ ...newCandidate, color: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-accent-cyan text-slate-900 font-semibold rounded-lg hover:bg-accent-cyan/90 transition"
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
                    {candidate.number}. {candidate.name}
                  </div>
                  {candidate.subtitle && <div className="text-text-secondary text-sm">{candidate.subtitle}</div>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(editing === candidate.id ? null : candidate.id)}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition"
                  >
                    {editing === candidate.id ? "Annulla" : "Modifica"}
                  </button>
                  <button
                    onClick={() => handleDeleteCandidate(candidate.id)}
                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-sm transition"
                  >
                    Elimina
                  </button>
                </div>

                {editing === candidate.id && (
                  <div className="absolute right-4 bg-slate-800 p-4 rounded-lg border border-slate-700 w-80 z-10">
                    <div className="space-y-2">
                      <input
                        type="text"
                        defaultValue={candidate.name}
                        onBlur={(e) =>
                          handleUpdateCandidate(candidate.id, { ...candidate, name: e.target.value })
                        }
                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm"
                        placeholder="Nome"
                      />
                      <input
                        type="text"
                        defaultValue={candidate.subtitle || ""}
                        onBlur={(e) =>
                          handleUpdateCandidate(candidate.id, {
                            ...candidate,
                            subtitle: e.target.value,
                          })
                        }
                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm"
                        placeholder="Sottotitolo"
                      />
                      <input
                        type="color"
                        defaultValue={candidate.color}
                        onChange={(e) =>
                          handleUpdateCandidate(candidate.id, { ...candidate, color: e.target.value })
                        }
                        className="w-full h-8 rounded cursor-pointer"
                      />
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
