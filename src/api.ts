import type { EventData, CandidateData } from "./types";

const BASE = "/api";

export interface AuthSession {
  token: string;
  role: "root" | "event_manager";
  eventId?: string;
  expiresAt: string;
}

function withAuthHeaders(authToken: string, includeJson = false): HeadersInit {
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${authToken}`,
  };
}

async function readErrorMessage(res: Response, fallback: string) {
  const raw = await res.text().catch(() => "");
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    return typeof parsed.error === "string" && parsed.error ? parsed.error : fallback;
  } catch {
    return raw || fallback;
  }
}

export async function fetchEventByCode(eventCode: string): Promise<EventData> {
  const res = await fetch(`${BASE}/events/by-code/${encodeURIComponent(eventCode)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const serverMessage = typeof data.error === "string" ? data.error : "";
    const statusLabel = `HTTP ${res.status}`;
    throw new Error(serverMessage ? `${serverMessage} (${statusLabel})` : `Errore caricamento evento (${statusLabel})`);
  }
  return res.json();
}

export interface AdminEventSummary {
  id: string;
  code: string;
  name: string;
  subtitle: string | null;
  active: boolean;
  votingClosed: boolean;
  createdAt: string;
}

export async function loginRoot(password: string): Promise<AuthSession> {
  const res = await fetch(`${BASE}/auth/root/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Autenticazione root fallita"));
  }
  return res.json();
}

export async function updateRootPassword(authToken: string, currentPassword: string, newPassword: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/auth/root/password`, {
    method: "POST",
    headers: withAuthHeaders(authToken, true),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Aggiornamento password root non riuscito"));
  }
  return res.json();
}

export async function loginEventManager(eventId: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${BASE}/auth/event/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, password }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Autenticazione manager evento fallita"));
  }
  return res.json();
}

export async function fetchEvents(authToken: string): Promise<AdminEventSummary[]> {
  const res = await fetch(`${BASE}/events`, {
    headers: withAuthHeaders(authToken),
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let serverMessage = "";
    try {
      const parsed = raw ? JSON.parse(raw) : {};
      serverMessage = typeof parsed.error === "string" ? parsed.error : "";
    } catch {
      serverMessage = raw;
    }
    const statusLabel = `HTTP ${res.status}`;
    throw new Error(
      serverMessage
        ? `${serverMessage} (${statusLabel})`
        : `Errore nel caricamento eventi (${statusLabel})`
    );
  }
  return res.json();
}

export async function createEvent(input: {
  managerPassword: string;
  code?: string;
  name: string;
  subtitle?: string;
}, authToken: string): Promise<AdminEventSummary> {
  const res = await fetch(`${BASE}/events`, {
    method: "POST",
    headers: withAuthHeaders(authToken, true),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let serverMessage = "";
    try {
      const parsed = raw ? JSON.parse(raw) : {};
      serverMessage = typeof parsed.error === "string" ? parsed.error : "";
    } catch {
      serverMessage = raw;
    }
    const statusLabel = `HTTP ${res.status}`;
    throw new Error(
      serverMessage
        ? `${serverMessage} (${statusLabel})`
        : `Errore nella creazione evento (${statusLabel})`
    );
  }
  return res.json();
}

export async function updateEvent(
  eventId: string,
  input: Partial<{ name: string; subtitle: string | null }>,
  authToken: string
): Promise<AdminEventSummary> {
  const res = await fetch(`${BASE}/events/${eventId}`, {
    method: "PUT",
    headers: withAuthHeaders(authToken, true),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let serverMessage = "";
    try {
      const parsed = raw ? JSON.parse(raw) : {};
      serverMessage = typeof parsed.error === "string" ? parsed.error : "";
    } catch {
      serverMessage = raw;
    }
    const statusLabel = `HTTP ${res.status}`;
    throw new Error(
      serverMessage
        ? `${serverMessage} (${statusLabel})`
        : `Errore nell'aggiornamento evento (${statusLabel})`
    );
  }
  return res.json();
}

export async function updateEventManagerPassword(eventId: string, password: string, authToken: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/events/${eventId}/manager-password`, {
    method: "PUT",
    headers: withAuthHeaders(authToken, true),
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Aggiornamento password evento non riuscito"));
  }
  return res.json();
}

export async function fetchEventState(eventId: string): Promise<{ id: string; code: string; votingClosed: boolean }> {
  const res = await fetch(`${BASE}/events/${eventId}`);
  if (!res.ok) throw new Error("Errore nel caricamento stato evento");
  return res.json();
}

export async function updateEventVotingState(eventId: string, votingClosed: boolean, authToken: string) {
  const res = await fetch(`${BASE}/events/${eventId}/voting-state`, {
    method: "PUT",
    headers: withAuthHeaders(authToken, true),
    body: JSON.stringify({ votingClosed }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Errore nell'aggiornamento dello stato");
  }
  return res.json();
}

export async function resetEventVotes(eventId: string, authToken: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/events/${eventId}/votes`, {
    method: "DELETE",
    headers: withAuthHeaders(authToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Errore nell'azzeramento della classifica");
  }
  return res.json();
}

export async function startEvent(
  eventId: string,
  authToken: string
): Promise<{ ok: boolean; votingClosed: boolean; candidates: CandidateData[] }> {
  const res = await fetch(`${BASE}/events/${eventId}/start`, {
    method: "POST",
    headers: withAuthHeaders(authToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Errore nell'avvio della gara");
  }
  return res.json();
}

export async function castVote(
  candidateId: string,
  score: number,
  judgeToken: string
): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidateId, score, judgeToken }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Errore nel voto");
  }
  return res.json();
}

export interface VotingProgressJudge {
  id: string;
  label: string | null;
  tokenPreview: string;
  status: "active" | "used" | "revoked";
  votesCast: number;
  votesRequired: number;
  missingCandidates: Array<{ id: string; number: number; name: string }>;
}

export interface VotingProgress {
  candidateCount: number;
  totalJudges: number;
  activeJudges: number;
  finalizedJudges: number;
  revokedJudges: number;
  judges: VotingProgressJudge[];
  incompleteCandidates: Array<{
    candidateId: string;
    candidateNumber: number;
    candidateName: string;
    missingJudgeCount: number;
  }>;
}

export async function fetchVotingProgress(eventId: string, authToken: string): Promise<VotingProgress> {
  const res = await fetch(`${BASE}/events/${eventId}/voting-progress`, {
    headers: withAuthHeaders(authToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Errore nel caricamento progresso voti");
  }
  return res.json();
}

// Admin API functions
export async function fetchCandidates(eventId: string, authToken: string): Promise<CandidateData[]> {
  const res = await fetch(`${BASE}/candidates/${eventId}`, {
    headers: withAuthHeaders(authToken),
  });
  if (!res.ok) throw new Error("Errore nel caricamento candidati");
  return res.json();
}

export async function addCandidate(
  eventId: string,
  number: number,
  name: string,
  authToken: string,
  subtitle?: string,
  color?: string
): Promise<CandidateData> {
  const res = await fetch(`${BASE}/candidates`, {
    method: "POST",
    headers: withAuthHeaders(authToken, true),
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
  data: Partial<{ name: string; subtitle: string | null; color: string; number: number }>,
  authToken: string
): Promise<CandidateData> {
  const res = await fetch(`${BASE}/candidates/${id}`, {
    method: "PUT",
    headers: withAuthHeaders(authToken, true),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Errore nell'aggiornamento");
  }
  return res.json();
}

export async function deleteCandidate(id: string, authToken: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/candidates/${id}`, {
    method: "DELETE",
    headers: withAuthHeaders(authToken),
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

export type JudgeTokenStatus = "active" | "used" | "revoked" | "invalid";

export interface JudgeTokenRecord {
  id: string;
  label: string | null;
  tokenPreview: string;
  createdAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  status: Exclude<JudgeTokenStatus, "invalid">;
}

export interface GeneratedJudgeToken extends JudgeTokenRecord {
  token: string;
  url: string;
}

export interface JudgeTokenValidationResult {
  valid: boolean;
  status: JudgeTokenStatus;
  message: string;
  votes?: Record<string, number>;
  code?: JudgeTokenRecord & { eventId: string; votes?: Record<string, number> };
}

export async function fetchJudgeTokens(eventId: string, authToken: string): Promise<JudgeTokenRecord[]> {
  const res = await fetch(`${BASE}/events/${eventId}/judge-tokens`, {
    headers: withAuthHeaders(authToken),
  });
  if (!res.ok) throw new Error("Errore nel caricamento codici giudice");
  return res.json();
}

export function buildJudgeTokenStreamUrl(eventId: string, authToken: string) {
  const params = new URLSearchParams({ authToken });
  return `${BASE}/events/${eventId}/judge-tokens/stream?${params.toString()}`;
}

export async function generateJudgeTokens(
  eventId: string,
  input: { count: number; labelPrefix?: string; origin?: string },
  authToken: string
): Promise<{ ok: boolean; codes: GeneratedJudgeToken[] }> {
  const res = await fetch(`${BASE}/events/${eventId}/judge-tokens`, {
    method: "POST",
    headers: withAuthHeaders(authToken, true),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Errore nella generazione codici");
  }
  return res.json();
}

export async function validateJudgeToken(token: string, eventCode?: string): Promise<JudgeTokenValidationResult> {
  const res = await fetch(`${BASE}/judge-tokens/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, eventCode }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return {
      valid: false,
      status: data.status || "invalid",
      message: data.error || data.message || "Codice non valido",
    };
  }
  return res.json();
}

export async function finalizeJudgeToken(token: string, eventCode?: string): Promise<JudgeTokenValidationResult> {
  const res = await fetch(`${BASE}/judge-tokens/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, eventCode }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Errore nel blocco del codice");
  }
  return res.json();
}

export async function revokeJudgeToken(id: string, authToken: string): Promise<JudgeTokenRecord> {
  const res = await fetch(`${BASE}/judge-tokens/${id}/revoke`, {
    method: "POST",
    headers: withAuthHeaders(authToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Errore nella revoca del codice");
  }
  return res.json();
}
