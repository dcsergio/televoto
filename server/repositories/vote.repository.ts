import { prisma } from "../db/prisma.js";
import type { Prisma } from "../../src/generated/prisma/client.js";

export function deleteVotesByEvent(eventId: string, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  return client.vote.deleteMany({ where: { candidate: { eventId } } });
}

export function findVotesByJudgeToken(judgeTokenId: string) {
  return prisma.vote.findMany({
    where: { judgeTokenId, score: { not: null } },
    select: { candidateId: true, score: true },
  });
}

export function findVotesForRanking(eventId: string) {
  return prisma.vote.findMany({
    where: { candidate: { eventId }, judgeToken: { revokedAt: null }, score: { not: null } },
    select: { candidateId: true, score: true, judgeToken: { select: { type: true } } },
  });
}
