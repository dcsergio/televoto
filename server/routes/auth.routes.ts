import { Router } from "express";
import { requireEventManagerAuth, requireRootAuth } from "../middleware/auth.middleware.js";
import { loginRateLimiter } from "../middleware/rate-limit.middleware.js";
import { parseBody } from "../validation/validate.js";
import {
  rootLoginSchema,
  rootPasswordChangeSchema,
  eventManagerLoginSchema,
  eventManagerPasswordChangeSchema,
} from "../validation/auth.schemas.js";
import { changeEventManagerPassword, changeRootPassword, eventManagerLogin, rootLogin } from "../services/auth.service.js";

export const authRouter = Router();

authRouter.post("/api/auth/root/login", loginRateLimiter, async (req, res) => {
  const { password } = parseBody(rootLoginSchema, req.body);
  const result = await rootLogin(password);
  res.json(result);
});

authRouter.post("/api/auth/root/password", async (req, res) => {
  if (!requireRootAuth(req, res)) return;

  const { currentPassword, newPassword } = parseBody(rootPasswordChangeSchema, req.body);
  await changeRootPassword(currentPassword, newPassword);
  res.json({ ok: true });
});

authRouter.post("/api/auth/event/login", loginRateLimiter, async (req, res) => {
  const { eventId, password } = parseBody(eventManagerLoginSchema, req.body);
  const result = await eventManagerLogin(eventId, password);
  res.json(result);
});

authRouter.post("/api/auth/event/:eventId/password", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId)) return;

  const { currentPassword, newPassword } = parseBody(eventManagerPasswordChangeSchema, req.body);
  await changeEventManagerPassword(eventId, currentPassword, newPassword);
  res.json({ ok: true });
});
