import { Router } from "express";
import { requireEventManagerAuth } from "../middleware/auth.middleware.js";
import { getPartialRankings, getRankings } from "../services/ranking.service.js";

export const rankingsRouter = Router();

rankingsRouter.get("/api/rankings/:eventId", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId, true)) return;
  res.json(await getRankings(eventId));
});

rankingsRouter.get("/api/events/:eventId/partial-rankings", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId)) return;
  res.json(await getPartialRankings(eventId));
});
