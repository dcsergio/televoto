import { Router } from "express";
import { requireEventManagerAuth } from "../middleware/auth.middleware.js";
import { voteRateLimiter } from "../middleware/rate-limit.middleware.js";
import { AppError } from "../middleware/error-handler.js";
import { parseBody } from "../validation/validate.js";
import { judgeTokenLookupSchema } from "../validation/judge-token.schemas.js";
import * as judgeTokenService from "../services/judge-token.service.js";
import * as judgeTokenRepository from "../repositories/judge-token.repository.js";

export const judgeTokensRouter = Router();

judgeTokensRouter.get("/api/events/:eventId/judge-tokens", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId)) return;
  res.json(await judgeTokenService.getJudgeTokenSnapshot(eventId));
});

judgeTokensRouter.get("/api/events/:eventId/judge-tokens/stream", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId, true)) return;
  await judgeTokenService.subscribeToJudgeTokenStream(eventId, res);
});

judgeTokensRouter.post("/api/events/:eventId/judge-tokens", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId)) return;

  const { count, labelPrefix, type, origin } = req.body as {
    count?: number;
    labelPrefix?: string;
    type?: unknown;
    origin?: unknown;
  };

  if (typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > 200) {
    throw new AppError(400, "Count must be between 1 and 200");
  }

  const fallbackOrigin = `${req.protocol}://${req.get("host")}`;
  const codes = await judgeTokenService.issueJudgeTokens({ eventId, count, labelPrefix, type, origin, fallbackOrigin });

  res.json({ ok: true, codes });
  void judgeTokenService.broadcastJudgeTokenSnapshot(eventId);
});

judgeTokensRouter.post("/api/judge-tokens/validate", voteRateLimiter, async (req, res) => {
  const { token, eventCode } = parseBody(judgeTokenLookupSchema, req.body);
  const result = await judgeTokenService.validateJudgeToken(token ?? "", eventCode);
  res.status(result.httpStatus).json(result.body);
});

judgeTokensRouter.post("/api/judge-tokens/finalize", voteRateLimiter, async (req, res) => {
  const { token, eventCode } = parseBody(judgeTokenLookupSchema, req.body);
  res.json(await judgeTokenService.finalizeJudgeTokenByCode(token ?? "", eventCode));
});

judgeTokensRouter.post("/api/judge-tokens/:id/reissue", async (req, res) => {
  const { id } = req.params;
  const tokenRecord = await judgeTokenRepository.findJudgeTokenEventId(id);
  if (!tokenRecord) {
    throw new AppError(404, "Codice giudice non trovato");
  }

  if (!requireEventManagerAuth(req, res, tokenRecord.eventId)) return;

  const { origin } = req.body as { origin?: unknown };
  const fallbackOrigin = `${req.protocol}://${req.get("host")}`;
  const code = await judgeTokenService.reissueJudgeToken({ id, origin, fallbackOrigin });

  res.json({ ok: true, code });
  void judgeTokenService.broadcastJudgeTokenSnapshot(tokenRecord.eventId);
});

judgeTokensRouter.post("/api/judge-tokens/:id/revoke", async (req, res) => {
  const { id } = req.params;
  const tokenRecord = await judgeTokenRepository.findJudgeTokenEventId(id);
  if (!tokenRecord) {
    throw new AppError(404, "Codice giudice non trovato");
  }

  if (!requireEventManagerAuth(req, res, tokenRecord.eventId)) return;

  const result = await judgeTokenService.revokeJudgeTokenById(id);
  res.json(result);
  void judgeTokenService.broadcastJudgeTokenSnapshot(tokenRecord.eventId);
});
