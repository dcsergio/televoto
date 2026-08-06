import { z } from "zod";
import { normalizeEventCode, normalizeEventName, normalizePassword } from "../lib/normalize.js";
import { passwordField } from "./fields.js";

// Mirrors the original imperative validation order exactly (name -> managerPassword
// -> code -> subtitle), stopping at the first failing check, same as the original
// if/else-if chain in the monolithic route handler.
export const createEventSchema = z
  .object({
    code: z.unknown().optional(),
    name: z.unknown().optional(),
    subtitle: z.unknown().optional(),
    managerPassword: z.unknown().optional(),
    popularVoteMode: z.unknown().optional(),
  })
  .transform((body, ctx) => {
    const name = normalizeEventName(body.name);
    if (!name) {
      ctx.addIssue({ code: "custom", message: "Il nome evento è obbligatorio" });
      return z.NEVER;
    }

    const managerPassword = normalizePassword(body.managerPassword);
    if (!managerPassword) {
      ctx.addIssue({ code: "custom", message: "La password manager evento è obbligatoria (minimo 8 caratteri)" });
      return z.NEVER;
    }

    const hasCustomCode = typeof body.code === "string" && body.code.trim().length > 0;
    const requestedCode = hasCustomCode ? normalizeEventCode(body.code) : null;
    if (hasCustomCode && !requestedCode) {
      ctx.addIssue({ code: "custom", message: "Codice evento non valido (1-5 cifre)" });
      return z.NEVER;
    }

    const subtitle =
      typeof body.subtitle === "string" && body.subtitle.trim().length > 0 ? body.subtitle.trim() : null;

    const popularVoteMode = body.popularVoteMode === "SINGLE" ? ("SINGLE" as const) : ("NUMERIC" as const);

    return { name, managerPassword, requestedCode, subtitle, popularVoteMode };
  });

export const setManagerPasswordSchema = z.object({
  password: passwordField("Password manager evento non valida (minimo 8 caratteri)"),
});

export const votingStateSchema = z.object({
  votingClosed: z.boolean({ error: "Stato votazione non valido" }),
});
