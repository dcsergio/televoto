import { Router } from "express";
import { castVote } from "../services/vote.service.js";

export const votesRouter = Router();

votesRouter.post("/api/vote", async (req, res) => {
  res.json(await castVote(req.body as { candidateId?: unknown; judgeToken?: unknown; score?: unknown }));
});
