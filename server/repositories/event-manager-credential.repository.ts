import { prisma } from "../db/prisma.js";
import type { PasswordRecord } from "../lib/password.js";

export function findEventManagerCredential(eventId: string) {
  return prisma.eventManagerCredential.findUnique({
    where: { eventId },
    select: { eventId: true, passwordHash: true, passwordSalt: true, passwordIterations: true },
  });
}

export function upsertEventManagerCredential(eventId: string, record: PasswordRecord) {
  return prisma.eventManagerCredential.upsert({
    where: { eventId },
    update: record,
    create: { eventId, ...record },
  });
}
