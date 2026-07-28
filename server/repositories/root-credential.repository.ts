import { prisma } from "../db/prisma.js";
import type { PasswordRecord } from "../lib/password.js";

const rootCredentialId = "root";

export function findRootCredential() {
  return prisma.rootCredential.findUnique({ where: { id: rootCredentialId } });
}

export function createRootCredential(record: PasswordRecord) {
  return prisma.rootCredential.create({ data: { id: rootCredentialId, ...record } });
}

export function updateRootCredentialPassword(record: PasswordRecord) {
  return prisma.rootCredential.update({ where: { id: rootCredentialId }, data: record });
}
