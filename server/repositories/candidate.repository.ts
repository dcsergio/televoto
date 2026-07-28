import { prisma } from "../db/prisma.js";
import type { Prisma } from "../../src/generated/prisma/client.js";

export function findCandidatesByEvent(eventId: string) {
  return prisma.candidate.findMany({ where: { eventId }, orderBy: { number: "asc" } });
}

export function findCandidatesForRanking(eventId: string) {
  return prisma.candidate.findMany({
    where: { eventId },
    orderBy: { number: "asc" },
    select: { id: true, number: true, name: true, color: true },
  });
}

export type CreateCandidateRepoInput = {
  eventId: string;
  number: number;
  name: string;
  subtitle: string | null;
  color: string;
};

export function createCandidate(input: CreateCandidateRepoInput) {
  return prisma.candidate.create({ data: input });
}

export function findCandidateEventId(id: string) {
  return prisma.candidate.findUnique({ where: { id }, select: { eventId: true } });
}

export type UpdateCandidateRepoInput = Partial<{
  name: string;
  subtitle: string;
  color: string;
  number: number;
}>;

export function updateCandidate(id: string, data: UpdateCandidateRepoInput) {
  return prisma.candidate.update({ where: { id }, data });
}

export function deleteCandidate(id: string) {
  return prisma.candidate.delete({ where: { id } });
}

export function findCandidateIdsOrdered(eventId: string) {
  return prisma.candidate.findMany({
    where: { eventId },
    orderBy: { number: "asc" },
    select: { id: true, number: true },
  });
}

export function updateCandidateNumber(id: string, number: number, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  return client.candidate.update({ where: { id }, data: { number } });
}

export function findCandidateVoteCheck(candidateId: string) {
  return prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { eventId: true, event: { select: { votingClosed: true } } },
  });
}

export function countCandidatesByEvent(eventId: string) {
  return prisma.candidate.count({ where: { eventId } });
}
