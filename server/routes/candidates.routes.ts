import { Router } from "express";
import { requireEventManagerAuth } from "../middleware/auth.middleware.js";
import { parseBody } from "../validation/validate.js";
import { createCandidateSchema, updateCandidateSchema } from "../validation/candidate.schemas.js";
import * as candidateService from "../services/candidate.service.js";

export const candidatesRouter = Router();

candidatesRouter.get("/api/candidates/:eventId", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId)) return;
  res.json(await candidateService.listCandidates(eventId));
});

candidatesRouter.post("/api/candidates", async (req, res) => {
  const { eventId, number, name, subtitle, color } = parseBody(createCandidateSchema, req.body);
  if (!requireEventManagerAuth(req, res, eventId)) return;
  res.json(await candidateService.createCandidate({ eventId, number, name, subtitle, color }));
});

candidatesRouter.put("/api/candidates/:id", async (req, res) => {
  const { id } = req.params;
  const eventId = await candidateService.getCandidateEventId(id);
  if (!requireEventManagerAuth(req, res, eventId)) return;

  const body = parseBody(updateCandidateSchema, req.body);
  res.json(await candidateService.updateCandidate(id, body));
});

candidatesRouter.delete("/api/candidates/:id", async (req, res) => {
  const { id } = req.params;
  const eventId = await candidateService.getCandidateEventId(id);
  if (!requireEventManagerAuth(req, res, eventId)) return;

  await candidateService.deleteCandidateAndRenumber(id);
  res.json({ ok: true });
});
