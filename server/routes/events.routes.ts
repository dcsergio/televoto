import { Router } from "express";
import { requireEventManagerAuth, requireRootAuth } from "../middleware/auth.middleware.js";
import { parseBody } from "../validation/validate.js";
import { createEventSchema, setManagerPasswordSchema, votingStateSchema } from "../validation/event.schemas.js";
import { normalizeEventCode } from "../lib/normalize.js";
import { AppError } from "../middleware/error-handler.js";
import * as eventService from "../services/event.service.js";
import { getVotingProgress } from "../services/voting-progress.service.js";

export const eventsRouter = Router();

eventsRouter.get("/api/events", async (req, res) => {
  if (!requireRootAuth(req, res)) return;
  res.json(await eventService.listEvents());
});

eventsRouter.post("/api/events", async (req, res) => {
  if (!requireRootAuth(req, res)) return;

  const { name, managerPassword, requestedCode, subtitle, popularVoteMode } = parseBody(createEventSchema, req.body);
  const event = await eventService.createEvent({ name, subtitle, managerPassword, requestedCode, popularVoteMode });
  res.status(201).json(event);
});

eventsRouter.get("/api/events/by-code/:eventCode", async (req, res) => {
  const parsedEventCode = normalizeEventCode(req.params.eventCode);
  if (!parsedEventCode) {
    throw new AppError(400, "Codice evento non valido");
  }

  const event = await eventService.getEventByCode(parsedEventCode);
  if (!event) {
    throw new AppError(404, "Evento non trovato");
  }

  res.json(event);
});

eventsRouter.get("/api/events/:eventId", async (req, res) => {
  const { eventId } = req.params;
  const event = await eventService.getEventPublicDetail(eventId);

  if (!event) {
    throw new AppError(404, "Event not found");
  }

  res.json(event);
});

eventsRouter.put("/api/events/:eventId", async (req, res) => {
  if (!requireRootAuth(req, res)) return;

  const { eventId } = req.params;
  const updatedEvent = await eventService.updateEvent(eventId, req.body ?? {});
  res.json(updatedEvent);
});

eventsRouter.put("/api/events/:eventId/manager-password", async (req, res) => {
  if (!requireRootAuth(req, res)) return;

  const { eventId } = req.params;
  const { password } = parseBody(setManagerPasswordSchema, req.body);
  await eventService.setEventManagerPassword(eventId, password);
  res.json({ ok: true });
});

eventsRouter.get("/api/events/:eventId/voting-progress", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId)) return;

  res.json(await getVotingProgress(eventId));
});

eventsRouter.put("/api/events/:eventId/voting-state", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId)) return;

  const { votingClosed } = parseBody(votingStateSchema, req.body);
  res.json(await eventService.setVotingState(eventId, votingClosed));
});

eventsRouter.post("/api/events/:eventId/start", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId)) return;

  const result = await eventService.startEvent(eventId);
  res.json({ ok: true, votingClosed: result.votingClosed, candidates: result.candidates });
});

eventsRouter.delete("/api/events/:eventId/votes", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId)) return;

  await eventService.clearVotes(eventId);
  res.json({ ok: true });
});
