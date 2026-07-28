import type { ZodError, ZodType } from "zod";
import { AppError } from "../middleware/error-handler.js";

function firstIssueMessage(error: ZodError, fallback: string) {
  const message = error.issues[0]?.message;
  return typeof message === "string" && message.length > 0 ? message : fallback;
}

// Parses `data` against `schema`; on failure throws an AppError(400, <italian message>)
// so it flows straight into the centralized error handler with the same shape the
// original hand-rolled `res.status(400).json({ error: ... })` checks produced.
// Called inline (not as router middleware) so callers keep full control over
// ordering relative to auth checks, exactly like the pre-refactor code.
export function parseBody<T>(schema: ZodType<T>, data: unknown, fallbackMessage = "Richiesta non valida"): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(400, firstIssueMessage(result.error, fallbackMessage));
  }
  return result.data;
}
