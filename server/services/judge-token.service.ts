import type { Response } from "express";
import { prisma } from "../db/prisma.js";
import { AppError } from "../middleware/error-handler.js";
import { generateOpaqueToken, hashOpaqueToken, judgeTokenLength } from "../lib/opaque-token.js";
import { normalizeEventCode, normalizeJudgeToken, normalizeVoterType } from "../lib/normalize.js";
import * as judgeTokenRepository from "../repositories/judge-token.repository.js";
import * as voteRepository from "../repositories/vote.repository.js";
import * as eventRepository from "../repositories/event.repository.js";
import { countCandidatesByEvent } from "../repositories/candidate.repository.js";
import { resolveEventIdByCode } from "./event.service.js";
import type { JudgeTokenSnapshot, VoterStatus, VoterType } from "../types/domain.js";

const judgeTokenStreamClients = new Map<string, Set<Response>>();

export function getJudgeTokenStatus(record: {
  finalizedAt: Date | null;
  revokedAt: Date | null;
  status?: VoterStatus;
}) {
  if (record.revokedAt) return "revoked" as const;
  if (record.finalizedAt || record.status === "SUBMITTED") return "used" as const;
  return "active" as const;
}

export async function getJudgeTokenSnapshot(eventId: string): Promise<JudgeTokenSnapshot[]> {
  const judgeTokens = await judgeTokenRepository.findJudgeTokensByEvent(eventId);

  return judgeTokens.map(
    (token): JudgeTokenSnapshot => ({
      id: token.id,
      label: token.label,
      type: token.type as VoterType,
      voterStatus: token.status as VoterStatus,
      tokenPreview: token.tokenPreview,
      createdAt: token.createdAt,
      finalizedAt: token.finalizedAt,
      revokedAt: token.revokedAt,
      usedAt: token.finalizedAt ?? null,
      status: getJudgeTokenStatus(token),
    })
  );
}

async function getJudgeTokenVotes(judgeTokenId: string) {
  const votes = await voteRepository.findVotesByJudgeToken(judgeTokenId);
  return votes.reduce<Record<string, number>>((accumulator, vote) => {
    if (typeof vote.score === "number") {
      accumulator[vote.candidateId] = vote.score;
    }
    return accumulator;
  }, {});
}

export async function broadcastJudgeTokenSnapshot(eventId: string) {
  const clients = judgeTokenStreamClients.get(eventId);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify({ eventId, tokens: await getJudgeTokenSnapshot(eventId) });
  for (const client of clients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      clients.delete(client);
    }
  }

  if (clients.size === 0) {
    judgeTokenStreamClients.delete(eventId);
  }
}

export async function subscribeToJudgeTokenStream(eventId: string, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write(": connected\n\n");

  const clients = judgeTokenStreamClients.get(eventId) ?? new Set<Response>();
  clients.add(res);
  judgeTokenStreamClients.set(eventId, clients);

  const detach = () => {
    const currentClients = judgeTokenStreamClients.get(eventId);
    currentClients?.delete(res);
    if (currentClients && currentClients.size === 0) {
      judgeTokenStreamClients.delete(eventId);
    }
  };

  try {
    res.write(`data: ${JSON.stringify({ eventId, tokens: await getJudgeTokenSnapshot(eventId) })}\n\n`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.write(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
  }

  res.req.on("close", () => {
    detach();
    res.end();
  });
}

export type IssueJudgeTokensInput = {
  eventId: string;
  count: number;
  labelPrefix?: string;
  type?: unknown;
  origin?: unknown;
  fallbackOrigin: string;
};

// Does NOT broadcast the SSE update itself — callers must do so after sending the
// HTTP response, matching the original handler which responded to the caller first
// and only then (fire-and-forget) pushed the SSE snapshot, so issuing many tokens
// never adds broadcast latency to the caller's own request.
export async function issueJudgeTokens(input: IssueJudgeTokensInput) {
  const voterType = normalizeVoterType(input.type) ?? "QUALIFICATA";
  const clientOrigin = typeof input.origin === "string" && input.origin.trim() ? input.origin.trim() : input.fallbackOrigin;
  const baseUrl = new URL(clientOrigin).origin;

  const event = await eventRepository.findEventCodeById(input.eventId);
  if (!event) {
    throw new AppError(404, "Evento non trovato");
  }

  const generated: Array<{
    id: string;
    label: string | null;
    type: VoterType;
    voterStatus: VoterStatus;
    token: string;
    tokenPreview: string;
    createdAt: Date;
    finalizedAt: Date | null;
    usedAt: Date | null;
    revokedAt: Date | null;
  }> = [];

  for (let index = 0; index < input.count; index += 1) {
    const rawToken = generateOpaqueToken(judgeTokenLength);
    const record = await judgeTokenRepository.createJudgeToken({
      eventId: input.eventId,
      label: input.labelPrefix ? `${input.labelPrefix} ${index + 1}` : null,
      type: voterType,
      tokenHash: hashOpaqueToken(rawToken),
      tokenPreview: rawToken.slice(0, 8),
    });

    generated.push({
      id: record.id,
      label: record.label,
      type: record.type as VoterType,
      voterStatus: record.status as VoterStatus,
      token: rawToken,
      tokenPreview: record.tokenPreview,
      createdAt: record.createdAt,
      finalizedAt: record.finalizedAt,
      usedAt: record.finalizedAt ?? null,
      revokedAt: record.revokedAt,
    });
  }

  return generated.map((code) => ({
    ...code,
    status: getJudgeTokenStatus(code),
    url: `${baseUrl}/?${new URLSearchParams({ eventCode: event.code, judgeToken: code.token }).toString()}`,
  }));
}

export type ReissueJudgeTokenInput = {
  id: string;
  origin?: unknown;
  fallbackOrigin: string;
};

// A judge who lost their code gets a fresh one instead of the old code being
// shown again (the server only ever stores a hash, never the plaintext).
// Partial votes already cast under the old token move to the new one so the
// judge doesn't lose progress; the old token is revoked in the same transaction.
export async function reissueJudgeToken(input: ReissueJudgeTokenInput) {
  const oldToken = await judgeTokenRepository.findJudgeTokenById(input.id);
  if (!oldToken) {
    throw new AppError(404, "Codice giudice non trovato");
  }

  const status = getJudgeTokenStatus(oldToken);
  if (status !== "active") {
    throw new AppError(400, "Puoi rigenerare solo un codice attivo, non ancora bloccato o revocato");
  }

  const event = await eventRepository.findEventCodeById(oldToken.eventId);
  if (!event) {
    throw new AppError(404, "Evento non trovato");
  }

  const clientOrigin = typeof input.origin === "string" && input.origin.trim() ? input.origin.trim() : input.fallbackOrigin;
  const baseUrl = new URL(clientOrigin).origin;

  const rawToken = generateOpaqueToken(judgeTokenLength);

  const record = await prisma.$transaction(async (tx) => {
    const created = await judgeTokenRepository.createJudgeToken(
      {
        eventId: oldToken.eventId,
        label: oldToken.label,
        type: oldToken.type as VoterType,
        tokenHash: hashOpaqueToken(rawToken),
        tokenPreview: rawToken.slice(0, 8),
      },
      tx,
    );
    await voteRepository.updateVotesJudgeToken(oldToken.id, created.id, tx);
    await judgeTokenRepository.revokeJudgeToken(oldToken.id, tx);
    return created;
  });

  return {
    id: record.id,
    label: record.label,
    type: record.type as VoterType,
    voterStatus: record.status as VoterStatus,
    tokenPreview: record.tokenPreview,
    createdAt: record.createdAt,
    finalizedAt: record.finalizedAt,
    usedAt: record.finalizedAt ?? null,
    revokedAt: record.revokedAt,
    status: getJudgeTokenStatus(record),
    token: rawToken,
    url: `${baseUrl}/?${new URLSearchParams({ eventCode: event.code, judgeToken: rawToken }).toString()}`,
  };
}

type JudgeTokenLookup =
  | { kind: "not_found" }
  | { kind: "event_not_found" }
  | { kind: "wrong_event" }
  | { kind: "found"; token: NonNullable<Awaited<ReturnType<typeof judgeTokenRepository.findJudgeTokenByHash>>> };

async function lookupJudgeTokenForCode(rawToken: string, rawEventCode: string | undefined): Promise<JudgeTokenLookup> {
  const normalizedToken = normalizeJudgeToken(rawToken);
  if (!normalizedToken) {
    throw new AppError(400, "Missing token");
  }

  const parsedEventCode = rawEventCode === undefined ? null : normalizeEventCode(rawEventCode);
  if (rawEventCode !== undefined && !parsedEventCode) {
    throw new AppError(400, "Codice evento non valido");
  }

  const tokenHash = hashOpaqueToken(normalizedToken);
  const judgeToken = await judgeTokenRepository.findJudgeTokenByHash(tokenHash);
  if (!judgeToken) {
    return { kind: "not_found" };
  }

  if (parsedEventCode) {
    const requestedEventId = await resolveEventIdByCode(parsedEventCode);
    if (!requestedEventId) {
      return { kind: "event_not_found" };
    }
    if (requestedEventId !== judgeToken.eventId) {
      return { kind: "wrong_event" };
    }
  }

  return { kind: "found", token: judgeToken };
}

export type ValidateJudgeTokenResult = { httpStatus: number; body: Record<string, unknown> };

export async function validateJudgeToken(rawToken: string, rawEventCode: string | undefined): Promise<ValidateJudgeTokenResult> {
  const lookup = await lookupJudgeTokenForCode(rawToken, rawEventCode);

  if (lookup.kind === "not_found") {
    return { httpStatus: 404, body: { valid: false, status: "invalid", message: "Codice non trovato" } };
  }
  if (lookup.kind === "event_not_found") {
    return { httpStatus: 404, body: { valid: false, status: "invalid", message: "Evento non trovato" } };
  }
  if (lookup.kind === "wrong_event") {
    return { httpStatus: 403, body: { valid: false, status: "invalid", message: "Codice non valido per questo evento" } };
  }

  const judgeToken = lookup.token;
  const votes = await getJudgeTokenVotes(judgeToken.id);
  const status = getJudgeTokenStatus(judgeToken);
  const valid = status === "active";
  const message = status === "active" ? "Codice valido" : status === "used" ? "Codice bloccato" : "Codice revocato";

  return {
    httpStatus: 200,
    body: {
      valid,
      status,
      message,
      votes,
      code: { ...judgeToken, voterStatus: judgeToken.status, usedAt: judgeToken.finalizedAt ?? null, status, votes },
    },
  };
}

// Broadcasts the SSE update itself (unlike issueJudgeTokens/revokeJudgeTokenById)
// because the original handler awaited the broadcast *before* responding here.
export async function finalizeJudgeTokenByCode(rawToken: string, rawEventCode: string | undefined) {
  const lookup = await lookupJudgeTokenForCode(rawToken, rawEventCode);

  if (lookup.kind === "not_found") throw new AppError(404, "Codice non trovato");
  if (lookup.kind === "event_not_found") throw new AppError(404, "Evento non trovato");
  if (lookup.kind === "wrong_event") throw new AppError(403, "Codice non valido per questo evento");

  const judgeToken = lookup.token;
  if (judgeToken.revokedAt) {
    throw new AppError(403, "Codice giudice revocato");
  }

  const votes = await getJudgeTokenVotes(judgeToken.id);

  if (judgeToken.finalizedAt || judgeToken.status === "SUBMITTED") {
    return {
      ok: true,
      status: "used" as const,
      message: "Codice già bloccato",
      votes,
      code: {
        ...judgeToken,
        voterStatus: judgeToken.status,
        usedAt: judgeToken.finalizedAt ?? null,
        status: "used" as const,
        votes,
      },
    };
  }

  const candidateCount = await countCandidatesByEvent(judgeToken.eventId);

  const requiresCompleteBallot = judgeToken.type === "QUALIFICATA";
  if (requiresCompleteBallot && candidateCount > 0 && Object.keys(votes).length !== candidateCount) {
    throw new AppError(400, "Completa tutte le preferenze prima di bloccare il codice");
  }

  const updated = await judgeTokenRepository.finalizeJudgeToken(judgeToken.id);
  await broadcastJudgeTokenSnapshot(judgeToken.eventId);

  return {
    ok: true,
    status: getJudgeTokenStatus(updated),
    message: "Codice bloccato e voti resi definitivi",
    votes,
    code: {
      ...updated,
      voterStatus: updated.status,
      usedAt: updated.finalizedAt ?? null,
      status: getJudgeTokenStatus(updated),
      votes,
    },
  };
}

// Does NOT broadcast — see issueJudgeTokens note above; the caller broadcasts
// after responding.
export async function revokeJudgeTokenById(id: string) {
  const updated = await judgeTokenRepository.revokeJudgeToken(id);
  return {
    ...updated,
    voterStatus: updated.status,
    usedAt: updated.finalizedAt ?? null,
    status: getJudgeTokenStatus(updated),
  };
}
