import type { Prisma } from "../../src/generated/prisma/client.js";
import { prisma } from "../db/prisma.js";
import { AppError } from "../middleware/error-handler.js";
import { normalizeJudgeToken } from "../lib/normalize.js";
import { hashOpaqueToken } from "../lib/opaque-token.js";
import * as candidateRepository from "../repositories/candidate.repository.js";
import * as judgeTokenRepository from "../repositories/judge-token.repository.js";

export type CastVoteInput = { candidateId?: unknown; judgeToken?: unknown; score?: unknown };

export async function castVote(input: CastVoteInput) {
  const candidateId = input.candidateId;
  const score = input.score;

  if (typeof candidateId !== "string" || !candidateId || (score !== null && typeof score !== "number")) {
    throw new AppError(400, "Missing fields");
  }
  if (typeof score === "number" && (score < 1 || score > 10 || !Number.isInteger(score))) {
    throw new AppError(400, "Score must be integer 1-10");
  }
  if (!input.judgeToken) {
    throw new AppError(403, "Serve un codice giudice");
  }

  const candidate = await candidateRepository.findCandidateVoteCheck(candidateId);
  if (!candidate || candidate.event.votingClosed) {
    throw new AppError(403, "Le votazioni sono chiuse");
  }

  const judgeToken = normalizeJudgeToken(input.judgeToken);
  if (!judgeToken) {
    throw new AppError(403, "Serve un codice giudice");
  }

  const tokenHash = hashOpaqueToken(judgeToken);
  const judgeRecord = await judgeTokenRepository.findJudgeTokenByHashForVote(tokenHash);

  if (!judgeRecord || judgeRecord.eventId !== candidate.eventId) {
    throw new AppError(403, "Codice giudice non valido");
  }
  if (judgeRecord.revokedAt) {
    throw new AppError(403, "Codice giudice revocato");
  }
  if (judgeRecord.finalizedAt || judgeRecord.status === "SUBMITTED") {
    throw new AppError(403, "Codice giudice bloccato");
  }

  const isPreferenceVote = judgeRecord.type === "POPOLARE" && candidate.event.popularVoteMode === "PREFERENCE";
  if (isPreferenceVote && typeof score === "number" && score !== 1) {
    throw new AppError(400, "In modalità preferenza il punteggio è sempre 1");
  }

  const vote = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (score === null) {
      await tx.vote.deleteMany({ where: { candidateId, judgeTokenId: judgeRecord.id } });
      return null;
    }

    if (isPreferenceVote) {
      const currentVoteCount = await tx.vote.count({
        where: { judgeTokenId: judgeRecord.id, candidateId: { not: candidateId } },
      });

      if (currentVoteCount >= candidate.event.maxPreferences) {
        throw new AppError(400, `Puoi esprimere al massimo ${candidate.event.maxPreferences} preferenza/e`);
      }
    }

    return tx.vote.upsert({
      where: { candidateId_judgeTokenId: { candidateId, judgeTokenId: judgeRecord.id } },
      update: { score },
      create: { candidateId, score, judgeTokenId: judgeRecord.id },
    });
  });

  return { ok: true, vote, eventId: candidate.eventId };
}
