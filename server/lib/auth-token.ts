import crypto from "node:crypto";
import { env } from "../config/env.js";

export type AuthRole = "root" | "event_manager";

export type AuthPayload = {
  role: AuthRole;
  eventId?: string;
  exp: number;
};

export const authTokenTtlSeconds = 60 * 60 * 12;

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createAuthToken(payload: AuthPayload) {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", env.adminAuthSecret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token: string): AuthPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;
  const expectedSignature = crypto.createHmac("sha256", env.adminAuthSecret).update(encodedPayload).digest("base64url");
  if (signature.length !== expectedSignature.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as AuthPayload;
    if (!payload || typeof payload.exp !== "number" || typeof payload.role !== "string") return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (payload.role !== "root" && payload.role !== "event_manager") return null;
    if (payload.role === "event_manager" && (!payload.eventId || typeof payload.eventId !== "string")) return null;
    return payload;
  } catch {
    return null;
  }
}
