import { Router } from "express";
import { voteRateLimiter } from "../middleware/rate-limit.middleware.js";
import { parseBody } from "../validation/validate.js";
import { castVoteSchema } from "../validation/vote.schemas.js";
import { castVote } from "../services/vote.service.js";
import * as judgeTokenService from "../services/judge-token.service.js";

export const votesRouter = Router();

votesRouter.post("/api/vote", voteRateLimiter, async (req, res) => {
  const body = parseBody(castVoteSchema, req.body);
  const result = await castVote(body);
  res.json(result);
  void judgeTokenService.broadcastJudgeTokenSnapshot(result.eventId);
});
