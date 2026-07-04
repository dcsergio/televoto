import type { EventData, CandidateData } from "./types";

const BASE = "/api";

export async function fetchActiveEvent(): Promise<EventData> {
  const res = await fetch(`${BASE}/events/active`);
  if (!res.ok) throw new Error("Nessun evento attivo");
  return res.json();
}

export async function fetchMyVotes(
  eventId: string,
  deviceId: string
): Promise<Record<string, number>> {
  const res = await fetch(`${BASE}/events/${eventId}/votes/${deviceId}`);
  if (!res.ok) return {};
  return res.json();
}

export async function castVote(
  candidateId: string,
  deviceId: string,
  score: number
): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidateId, deviceId, score }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Errore nel voto");
  }
  return res.json();
}

// Admin API functions
export async function fetchCandidates(eventId: string): Promise<CandidateData[]> {
  const res = await fetch(`${BASE}/candidates/${eventId}`);
  if (!res.ok) throw new Error("Errore nel caricamento candidati");
  return res.json();
}

export async function addCandidate(
  eventId: string,
  number: number,
  name: string,
  subtitle?: string,
  color?: string
): Promise<CandidateData> {
  const res = await fetch(`${BASE}/candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, number, name, subtitle, color }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Errore nell'aggiunta candidato");
  }
  return res.json();
}

export async function updateCandidate(
  id: string,
  data: Partial<{ name: string; subtitle: string; color: string; number: number }>
): Promise<CandidateData> {
  const res = await fetch(`${BASE}/candidates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Errore nell'aggiornamento");
  }
  return res.json();
}

export async function deleteCandidate(id: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/candidates/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Errore nella cancellazione");
  }
  return res.json();
}

export interface RankingEntry {
  id: string;
  number: number;
  name: string;
  color: string;
  totalScore: number;
  voteCount: number;
  avgScore: number;
}

export async function fetchRankings(eventId: string): Promise<RankingEntry[]> {
  const res = await fetch(`${BASE}/rankings/${eventId}`);
  if (!res.ok) throw new Error("Errore nel caricamento classifica");
  return res.json();
}
