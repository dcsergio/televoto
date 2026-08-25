import { prisma } from "../db/prisma.js";
import type { PasswordRecord } from "../lib/password.js";

const eventSummarySelect = {
  id: true,
  code: true,
  name: true,
  subtitle: true,
  active: true,
  votingClosed: true,
  weightQualificata: true,
  weightPopolare: true,
  enableTrimmedMean: true,
  trimmedMeanPercentage: true,
  popularVoteMode: true,
  createdAt: true,
} as const;

export function findEventIdByCode(code: string) {
  return prisma.event.findUnique({ where: { code }, select: { id: true } });
}

export function findManyEventsSummary() {
  return prisma.event.findMany({ orderBy: { createdAt: "desc" }, select: eventSummarySelect });
}

export type CreateEventRepoInput = {
  code: string;
  name: string;
  subtitle: string | null;
  managerPasswordRecord: PasswordRecord;
  popularVoteMode: "NUMERIC" | "SINGLE";
};

export function createEvent(input: CreateEventRepoInput) {
  return prisma.event.create({
    data: {
      code: input.code,
      name: input.name,
      subtitle: input.subtitle,
      active: true,
      votingClosed: true,
      popularVoteMode: input.popularVoteMode,
      managerCredential: { create: input.managerPasswordRecord },
    },
    select: eventSummarySelect,
  });
}

export function findEventByCodeWithCandidates(code: string) {
  return prisma.event.findUnique({
    where: { code },
    include: { candidates: { orderBy: { number: "asc" } } },
  });
}

export function findEventPublicDetail(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      code: true,
      name: true,
      subtitle: true,
      active: true,
      votingClosed: true,
      weightQualificata: true,
      weightPopolare: true,
      enableTrimmedMean: true,
      trimmedMeanPercentage: true,
      popularVoteMode: true,
    },
  });
}

export type EventUpdateData = {
  name?: string;
  subtitle?: string | null;
  weightQualificata?: number;
  weightPopolare?: number;
  enableTrimmedMean?: boolean;
  trimmedMeanPercentage?: number;
};

export function updateEventSummary(eventId: string, data: EventUpdateData) {
  return prisma.event.update({ where: { id: eventId }, data, select: eventSummarySelect });
}

export function findEventBasic(eventId: string) {
  return prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
}

export function updateVotingState(eventId: string, votingClosed: boolean) {
  return prisma.event.update({
    where: { id: eventId },
    data: { votingClosed },
    select: { id: true, votingClosed: true },
  });
}

export function findEventCodeById(eventId: string) {
  return prisma.event.findUnique({ where: { id: eventId }, select: { code: true } });
}

export function setEventArchivedState(eventId: string, archived: boolean) {
  return prisma.event.update({ where: { id: eventId }, data: { active: !archived }, select: eventSummarySelect });
}

export function findEventForClone(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    include: {
      candidates: { orderBy: { number: "asc" } },
      managerCredential: true,
    },
  });
}

export type EventCloneSource = NonNullable<Awaited<ReturnType<typeof findEventForClone>>>;

export function cloneEvent(source: EventCloneSource, code: string, name: string) {
  return prisma.event.create({
    data: {
      code,
      name,
      subtitle: source.subtitle,
      active: true,
      votingClosed: true,
      weightQualificata: source.weightQualificata,
      weightPopolare: source.weightPopolare,
      enableTrimmedMean: source.enableTrimmedMean,
      trimmedMeanPercentage: source.trimmedMeanPercentage,
      popularVoteMode: source.popularVoteMode,
      candidates: {
        create: source.candidates.map((candidate) => ({
          number: candidate.number,
          name: candidate.name,
          subtitle: candidate.subtitle,
          color: candidate.color,
          templateId: candidate.templateId,
        })),
      },
      managerCredential: source.managerCredential
        ? {
            create: {
              passwordHash: source.managerCredential.passwordHash,
              passwordSalt: source.managerCredential.passwordSalt,
              passwordIterations: source.managerCredential.passwordIterations,
            },
          }
        : undefined,
    },
    select: eventSummarySelect,
  });
}

export async function findEventTurnout(eventId: string) {
  const votedCondition = { OR: [{ finalizedAt: { not: null } }, { status: "SUBMITTED" as const }] };

  const [qualifiedTotal, qualifiedVoted, popularTotal, popularVoted] = await Promise.all([
    prisma.judgeToken.count({ where: { eventId, type: "QUALIFICATA", revokedAt: null } }),
    prisma.judgeToken.count({ where: { eventId, type: "QUALIFICATA", revokedAt: null, ...votedCondition } }),
    prisma.judgeToken.count({ where: { eventId, type: "POPOLARE", revokedAt: null } }),
    prisma.judgeToken.count({ where: { eventId, type: "POPOLARE", revokedAt: null, ...votedCondition } }),
  ]);

  return { qualifiedTotal, qualifiedVoted, popularTotal, popularVoted };
}

export function findEventRankingSettings(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      votingClosed: true,
      weightQualificata: true,
      weightPopolare: true,
      enableTrimmedMean: true,
      trimmedMeanPercentage: true,
      popularVoteMode: true,
    },
  });
}
