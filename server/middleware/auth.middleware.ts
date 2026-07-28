import type { Request, Response } from "express";
import { verifyAuthToken, type AuthPayload } from "../lib/auth-token.js";

function getBearerToken(req: Request, allowQueryToken = false) {
  const authorization = req.header("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }
  if (allowQueryToken && typeof req.query["authToken"] === "string") {
    return req.query["authToken"].trim();
  }
  return null;
}

// Plain functions (not router middleware) so each route keeps full control over
// ordering relative to its own body/existence checks, matching the pre-refactor
// monolith where some routes validate the request before auth and others check
// a resource exists (404) before auth.
export function requireRootAuth(req: Request, res: Response): AuthPayload | null {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Autenticazione root richiesta" });
    return null;
  }

  const payload = verifyAuthToken(token);
  if (!payload || payload.role !== "root") {
    res.status(401).json({ error: "Sessione root non valida o scaduta" });
    return null;
  }

  return payload;
}

export function requireEventManagerAuth(
  req: Request,
  res: Response,
  eventId: string,
  allowQueryToken = false
): AuthPayload | null {
  const token = getBearerToken(req, allowQueryToken);
  if (!token) {
    res.status(401).json({ error: "Autenticazione manager evento richiesta" });
    return null;
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    res.status(401).json({ error: "Sessione manager evento non valida o scaduta" });
    return null;
  }
  if (payload.role === "root") {
    return payload;
  }
  if (payload.role !== "event_manager" || payload.eventId !== eventId) {
    res.status(401).json({ error: "Sessione manager evento non valida o scaduta" });
    return null;
  }

  return payload;
}
