import { z } from "zod";
import {
  normalizeEventCode,
  normalizeEventName,
  normalizeJudgeToken,
  normalizePassword,
  normalizeVoterType,
} from "../lib/normalize.js";

// These wrap the pre-existing normalize* functions so zod-driven validation is
// guaranteed to accept/reject the exact same inputs as the original hand-rolled
// checks (same edge cases: type coercion, trimming, length bounds, etc.), while
// giving each call site its own Italian error message to match the original text.

export const passwordField = (message: string) =>
  z
    .custom<string>((value) => normalizePassword(value) !== null, { message })
    .transform((value) => normalizePassword(value) as string);

export const eventCodeField = (message: string) =>
  z
    .custom<string>((value) => normalizeEventCode(value) !== null, { message })
    .transform((value) => normalizeEventCode(value) as string);

export const eventNameField = (message: string) =>
  z
    .custom<string>((value) => normalizeEventName(value) !== null, { message })
    .transform((value) => normalizeEventName(value) as string);

export const judgeTokenField = (message: string) =>
  z
    .custom<string>((value) => normalizeJudgeToken(value) !== null, { message })
    .transform((value) => normalizeJudgeToken(value) as string);

export const voterTypeField = () =>
  z
    .custom<unknown>(() => true)
    .transform((value) => normalizeVoterType(value));
