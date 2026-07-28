import { Router } from "express";
import { requireRootAuth } from "../middleware/auth.middleware.js";
import { parseBody } from "../validation/validate.js";
import { rootLoginSchema, rootPasswordChangeSchema, eventManagerLoginSchema } from "../validation/auth.schemas.js";
import { changeRootPassword, eventManagerLogin, rootLogin } from "../services/auth.service.js";

export const authRouter = Router();

authRouter.post("/api/auth/root/login", async (req, res) => {
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

authRouter.post("/api/auth/event/login", async (req, res) => {
  const { eventId, password } = parseBody(eventManagerLoginSchema, req.body);
  const result = await eventManagerLogin(eventId, password);
  res.json(result);
});
