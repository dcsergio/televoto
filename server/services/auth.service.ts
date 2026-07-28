import { createAuthToken, authTokenTtlSeconds, type AuthRole } from "../lib/auth-token.js";
import { createPasswordRecord, verifyPassword } from "../lib/password.js";
import { normalizePassword } from "../lib/normalize.js";
import { AppError } from "../middleware/error-handler.js";
import { env } from "../config/env.js";
import {
  createRootCredential,
  findRootCredential,
  updateRootCredentialPassword,
} from "../repositories/root-credential.repository.js";
import { findEventManagerCredential } from "../repositories/event-manager-credential.repository.js";

export async function ensureRootCredentialExists() {
  const existing = await findRootCredential();
  if (existing) return existing;

  const bootstrapPassword = normalizePassword(env.rootAdminPassword);
  if (!bootstrapPassword) return null;

  return createRootCredential(createPasswordRecord(bootstrapPassword));
}

type AuthTokenResult = { token: string; role: AuthRole; expiresAt: string };

function issueToken(role: AuthRole, eventId?: string): AuthTokenResult {
  const exp = Math.floor(Date.now() / 1000) + authTokenTtlSeconds;
  const token = createAuthToken(eventId ? { role, eventId, exp } : { role, exp });
  return { token, role, expiresAt: new Date(exp * 1000).toISOString() };
}

export async function rootLogin(password: string): Promise<AuthTokenResult> {
  const rootCredential = await ensureRootCredentialExists();
  if (!rootCredential) {
    throw new AppError(503, "Credenziale root non configurata. Imposta ROOT_ADMIN_PASSWORD e riavvia il server.");
  }

  if (!verifyPassword(password, rootCredential)) {
    throw new AppError(401, "Password root errata");
  }

  return issueToken("root");
}

export async function changeRootPassword(currentPassword: string, newPassword: string): Promise<void> {
  const rootCredential = await ensureRootCredentialExists();
  if (!rootCredential) {
    throw new AppError(503, "Credenziale root non configurata.");
  }

  if (!verifyPassword(currentPassword, rootCredential)) {
    throw new AppError(401, "Password root corrente errata");
  }

  await updateRootCredentialPassword(createPasswordRecord(newPassword));
}

export async function eventManagerLogin(
  eventId: string,
  password: string
): Promise<AuthTokenResult & { eventId: string }> {
  const credential = await findEventManagerCredential(eventId);

  if (!credential || !verifyPassword(password, credential)) {
    throw new AppError(401, "Password evento errata");
  }

  const { token, role, expiresAt } = issueToken("event_manager", eventId);
  return { token, role, eventId, expiresAt };
}
