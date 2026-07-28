import type { VoterType } from "../types/domain.js";

const eventCodeRegex = /^\d{1,5}$/;

export function generateRandomEventCode() {
  return String(Math.floor(Math.random() * 100000)).padStart(5, "0");
}

export function normalizeEventCode(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return eventCodeRegex.test(trimmed) ? trimmed : null;
}

export function normalizeEventName(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizePassword(value: unknown) {
  if (typeof value !== "string") return null;
  if (value.length < 8 || value.length > 128) return null;
  return value;
}

export function normalizeJudgeToken(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replaceAll(/[^0-9A-Z]/g, "");
  return normalized.length > 0 ? normalized : null;
}

export function normalizeVoterType(value: unknown): VoterType | null {
  if (value === "QUALIFICATA" || value === "POPOLARE") return value;
  return null;
}
