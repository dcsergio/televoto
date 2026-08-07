import { Router } from "express";
import { voteRateLimiter } from "../middleware/rate-limit.middleware.js";
import { parseBody } from "../validation/validate.js";
import { castVoteSchema } from "../validation/vote.schemas.js";
import { castVote } from "../services/vote.service.js";

export const votesRouter = Router();

votesRouter.post("/api/vote", voteRateLimiter, async (req, res) => {
  const body = parseBody(castVoteSchema, req.body);
  res.json(await castVote(body));
});
