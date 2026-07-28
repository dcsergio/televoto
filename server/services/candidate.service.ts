import { prisma } from "../db/prisma.js";
import { AppError } from "../middleware/error-handler.js";
import * as candidateRepository from "../repositories/candidate.repository.js";

export async function listCandidates(eventId: string) {
  return candidateRepository.findCandidatesByEvent(eventId);
}

export type CreateCandidateInput = {
  eventId: string;
  number: number;
  name: string;
  subtitle?: string;
  color?: string;
};

export async function createCandidate(input: CreateCandidateInput) {
  return candidateRepository.createCandidate({
    eventId: input.eventId,
    number: input.number,
    name: input.name,
    subtitle: input.subtitle || null,
    color: input.color || "#6366f1",
  });
}

export async function getCandidateEventId(id: string) {
  const existing = await candidateRepository.findCandidateEventId(id);
  if (!existing) {
    throw new AppError(404, "Candidato non trovato");
  }
  return existing.eventId;
}

export type UpdateCandidateInput = {
  name?: string;
  subtitle?: string;
  color?: string;
  number?: number;
};

// Preserves the original truthy-guarded spread semantics exactly: falsy `name`,
// `color`, or `number` are silently ignored (not treated as "clear the field"),
// while `subtitle` is applied whenever it's present in the body at all (including
// empty string), matching `subtitle !== undefined` in the pre-refactor code.
export async function updateCandidate(id: string, input: UpdateCandidateInput) {
  return candidateRepository.updateCandidate(id, {
    ...(input.name && { name: input.name }),
    ...(input.subtitle !== undefined && { subtitle: input.subtitle }),
    ...(input.color && { color: input.color }),
    ...(input.number && { number: input.number }),
  });
}

export async function deleteCandidateAndRenumber(id: string) {
  const deletedCandidate = await candidateRepository.deleteCandidate(id);

  const remainingCandidates = await candidateRepository.findCandidateIdsOrdered(deletedCandidate.eventId);

  await prisma.$transaction(
    remainingCandidates.map((candidate, index) =>
      prisma.candidate.update({
        where: { id: candidate.id },
        data: { number: index + 1 },
      })
    )
  );
}
