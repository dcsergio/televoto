import { Prisma } from "../../src/generated/prisma/client.js";
import { prisma } from "../db/prisma.js";
import { AppError } from "../middleware/error-handler.js";
import { generateRandomEventCode, normalizeEventName } from "../lib/normalize.js";
import { createPasswordRecord } from "../lib/password.js";
import * as eventRepository from "../repositories/event.repository.js";
import { upsertEventManagerCredential } from "../repositories/event-manager-credential.repository.js";
import {
  findCandidateIdsOrdered,
  findCandidatesByEvent,
  updateCandidateNumber,
} from "../repositories/candidate.repository.js";
import { deleteVotesByEvent } from "../repositories/vote.repository.js";
import { resetJudgeTokensForRestart } from "../repositories/judge-token.repository.js";

const schemaOutdatedMessage = "Schema DB non aggiornato: applica le migration più recenti";

function isPrismaKnownError(e: unknown, code: string) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;
}

export async function createUniqueEventCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateRandomEventCode();
    const existing = await eventRepository.findEventIdByCode(code);
    if (!existing) return code;
  }
  throw new Error("Impossibile generare un codice evento univoco");
}

export async function resolveEventIdByCode(eventCode: string) {
  const event = await eventRepository.findEventIdByCode(eventCode);
  return event?.id ?? null;
}

export async function listEvents() {
  try {
    return await eventRepository.findManyEventsSummary();
  } catch (e: unknown) {
    if (isPrismaKnownError(e, "P2022")) {
      throw new AppError(500, schemaOutdatedMessage);
    }
    throw e;
  }
}

export type CreateEventInput = {
  name: string;
  subtitle: string | null;
  managerPassword: string;
  requestedCode: string | null;
  popularVoteMode: "NUMERIC" | "SINGLE";
};

export async function createEvent(input: CreateEventInput) {
  try {
    const code = input.requestedCode ?? (await createUniqueEventCode());
    const managerPasswordRecord = createPasswordRecord(input.managerPassword);
    return await eventRepository.createEvent({
      code,
      name: input.name,
      subtitle: input.subtitle,
      managerPasswordRecord,
      popularVoteMode: input.popularVoteMode,
    });
  } catch (e: unknown) {
    if (isPrismaKnownError(e, "P2022")) {
      throw new AppError(500, schemaOutdatedMessage);
    }
    if (isPrismaKnownError(e, "P2002")) {
      throw new AppError(409, "Codice evento già in uso");
    }
    throw e;
  }
}

export async function getEventByCode(eventCode: string) {
  try {
    const event = await eventRepository.findEventByCodeWithCandidates(eventCode);
    if (!event) return event;
    const turnout = await eventRepository.findEventTurnout(event.id);
    return { ...event, turnout };
  } catch (e: unknown) {
    if (isPrismaKnownError(e, "P2022")) {
      throw new AppError(500, schemaOutdatedMessage);
    }
    throw e;
  }
}

export async function getEventPublicDetail(eventId: string) {
  const event = await eventRepository.findEventPublicDetail(eventId);
  if (!event) return event;
  const turnout = await eventRepository.findEventTurnout(eventId);
  return { ...event, turnout };
}

export type RawEventUpdateBody = {
  name?: unknown;
  subtitle?: unknown;
  weightQualificata?: unknown;
  weightPopolare?: unknown;
  enableTrimmedMean?: unknown;
  trimmedMeanPercentage?: unknown;
};

type EventUpdateData = {
  name?: string;
  subtitle?: string | null;
  weightQualificata?: number;
  weightPopolare?: number;
  enableTrimmedMean?: boolean;
  trimmedMeanPercentage?: number;
};

export function buildEventUpdateData(body: RawEventUpdateBody): EventUpdateData {
  const updateData: EventUpdateData = {};

  if (Object.hasOwn(body, "name")) {
    const normalizedName = normalizeEventName(body.name);
    if (!normalizedName) {
      throw new AppError(400, "Il nome evento è obbligatorio");
    }
    updateData.name = normalizedName;
  }

  if (Object.hasOwn(body, "subtitle")) {
    if (body.subtitle === null) {
      updateData.subtitle = null;
    } else if (typeof body.subtitle === "string") {
      const trimmedSubtitle = body.subtitle.trim();
      updateData.subtitle = trimmedSubtitle.length > 0 ? trimmedSubtitle : null;
    } else {
      throw new AppError(400, "Sottotitolo non valido");
    }
  }

  const hasWeightQualificata = Object.hasOwn(body, "weightQualificata");
  const hasWeightPopolare = Object.hasOwn(body, "weightPopolare");
  if (hasWeightQualificata || hasWeightPopolare) {
    if (typeof body.weightQualificata !== "number" || typeof body.weightPopolare !== "number") {
      throw new AppError(400, "Inserisci entrambi i pesi come numeri interi");
    }
    if (!Number.isInteger(body.weightQualificata) || !Number.isInteger(body.weightPopolare)) {
      throw new AppError(400, "I pesi devono essere interi");
    }
    if (
      body.weightQualificata < 0 ||
      body.weightQualificata > 100 ||
      body.weightPopolare < 0 ||
      body.weightPopolare > 100
    ) {
      throw new AppError(400, "I pesi devono essere compresi tra 0 e 100");
    }
    if (body.weightQualificata + body.weightPopolare !== 100) {
      throw new AppError(400, "La somma dei pesi deve essere esattamente 100");
    }
    updateData.weightQualificata = body.weightQualificata;
    updateData.weightPopolare = body.weightPopolare;
  }

  if (Object.hasOwn(body, "enableTrimmedMean")) {
    if (typeof body.enableTrimmedMean !== "boolean") {
      throw new AppError(400, "Il flag trimmed mean non è valido");
    }
    updateData.enableTrimmedMean = body.enableTrimmedMean;
  }

  if (Object.hasOwn(body, "trimmedMeanPercentage")) {
    if (typeof body.trimmedMeanPercentage !== "number" || Number.isNaN(body.trimmedMeanPercentage)) {
      throw new AppError(400, "La percentuale trimmed mean non è valida");
    }
    if (body.trimmedMeanPercentage < 0 || body.trimmedMeanPercentage >= 50) {
      throw new AppError(400, "La percentuale trimmed mean deve essere tra 0 e 49.99");
    }
    updateData.trimmedMeanPercentage = body.trimmedMeanPercentage;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, "Nessun campo da aggiornare");
  }

  return updateData;
}

export async function updateEvent(eventId: string, body: RawEventUpdateBody) {
  const updateData = buildEventUpdateData(body);

  try {
    return await eventRepository.updateEventSummary(eventId, updateData);
  } catch (e: unknown) {
    if (isPrismaKnownError(e, "P2025")) {
      throw new AppError(404, "Evento non trovato");
    }
    throw e;
  }
}

export async function setEventManagerPassword(eventId: string, password: string) {
  const event = await eventRepository.findEventBasic(eventId);
  if (!event) {
    throw new AppError(404, "Evento non trovato");
  }

  await upsertEventManagerCredential(eventId, createPasswordRecord(password));
}

export async function setVotingState(eventId: string, votingClosed: boolean) {
  return eventRepository.updateVotingState(eventId, votingClosed);
}

export async function startEvent(eventId: string) {
  const candidates = await findCandidateIdsOrdered(eventId);

  if (candidates.length > 0) {
    const tempBase = candidates.at(-1)!.number + 1;

    await prisma.$transaction(async (tx) => {
      for (const [index, candidate] of candidates.entries()) {
        await updateCandidateNumber(candidate.id, tempBase + index + 1, tx);
      }

      for (const [index, candidate] of candidates.entries()) {
        await updateCandidateNumber(candidate.id, index + 1, tx);
      }

      await deleteVotesByEvent(eventId, tx);
      await resetJudgeTokensForRestart(eventId, tx);

      await tx.event.update({
        where: { id: eventId },
        data: { active: true, votingClosed: false },
      });
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await deleteVotesByEvent(eventId, tx);
      await resetJudgeTokensForRestart(eventId, tx);
      await tx.event.update({ where: { id: eventId }, data: { active: true, votingClosed: false } });
    });
  }

  const updatedCandidates = await findCandidatesByEvent(eventId);
  return { votingClosed: false, candidates: updatedCandidates };
}

export async function clearVotes(eventId: string) {
  await deleteVotesByEvent(eventId);
}
