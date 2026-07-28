import { z } from "zod";
import { passwordField } from "./fields.js";

export const rootLoginSchema = z.object({
  password: passwordField("Password root non valida (minimo 8 caratteri)"),
});

export const rootPasswordChangeSchema = z.object({
  currentPassword: passwordField("Password non valide (minimo 8 caratteri)"),
  newPassword: passwordField("Password non valide (minimo 8 caratteri)"),
});

export const eventManagerLoginSchema = z.object({
  eventId: z.string().min(1, { message: "Credenziali evento non valide" }),
  password: passwordField("Credenziali evento non valide"),
});
