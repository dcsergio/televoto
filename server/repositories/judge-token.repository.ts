import { prisma } from "../db/prisma.js";
import type { Prisma } from "../../src/generated/prisma/client.js";
import type { VoterType } from "../types/domain.js";

const listSelect = {
  id: true,
  label: true,
  type: true,
  status: true,
  tokenPreview: true,
  createdAt: true,
  finalizedAt: true,
  usedAt: true,
  revokedAt: true,
} as const;

const detailSelect = {
  ...listSelect,
  eventId: true,
} as const;

export function findJudgeTokensByEvent(eventId: string) {
  return prisma.judgeToken.findMany({ where: { eventId }, orderBy: { createdAt: "desc" }, select: listSelect });
}

export function findJudgeTokensWithVotesForProgress(eventId: string) {
  return prisma.judgeToken.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      type: true,
      status: true,
      tokenPreview: true,
      finalizedAt: true,
      revokedAt: true,
      votes: { select: { candidateId: true, score: true } },
    },
  });
}

export function findQualifiedNonRevokedTokenIds(eventId: string) {
  return prisma.judgeToken.findMany({
    where: { eventId, type: "QUALIFICATA", revokedAt: null },
    select: { id: true },
  });
}

export type CreateJudgeTokenInput = {
  eventId: string;
  label: string | null;
  type: VoterType;
  tokenHash: string;
  tokenPreview: string;
};

export function createJudgeToken(input: CreateJudgeTokenInput, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  return client.judgeToken.create({
    data: {
      eventId: input.eventId,
      label: input.label,
      type: input.type,
      status: "ACTIVE",
      tokenHash: input.tokenHash,
      tokenPreview: input.tokenPreview,
    },
  });
}

export function findJudgeTokenById(id: string) {
  return prisma.judgeToken.findUnique({ where: { id }, select: detailSelect });
}

export function findJudgeTokenByHash(tokenHash: string) {
  return prisma.judgeToken.findUnique({ where: { tokenHash }, select: detailSelect });
}

export function findJudgeTokenByHashForVote(tokenHash: string) {
  return prisma.judgeToken.findUnique({
    where: { tokenHash },
    select: { id: true, eventId: true, type: true, status: true, finalizedAt: true, usedAt: true, revokedAt: true },
  });
}

export function finalizeJudgeToken(id: string) {
  return prisma.judgeToken.update({
    where: { id },
    data: { finalizedAt: new Date(), usedAt: new Date(), status: "SUBMITTED" },
    select: detailSelect,
  });
}

export function revokeJudgeToken(id: string, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  return client.judgeToken.update({ where: { id }, data: { revokedAt: new Date() }, select: detailSelect });
}

export function findJudgeTokenEventId(id: string) {
  return prisma.judgeToken.findUnique({ where: { id }, select: { eventId: true } });
}
