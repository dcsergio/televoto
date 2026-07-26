import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import express from "express";
import cors from "cors";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseUrl = process.env["DATABASE_URL"] ?? process.env["SUPABASE_DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL environment variable");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const app = express();

const opaqueTokenAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const judgeTokenLength = 16;
const judgeTokenStreamClients = new Map<string, Set<express.Response>>();
const eventCodeRegex = /^\d{1,5}$/;
const rootCredentialId = "root";
const passwordHashIterations = 210000;
const authTokenTtlSeconds = 60 * 60 * 12;
const configuredAdminAuthSecret = process.env["ADMIN_AUTH_SECRET"];

if (!configuredAdminAuthSecret) {
  throw new Error("Missing ADMIN_AUTH_SECRET environment variable");
}
const adminAuthSecret: string = configuredAdminAuthSecret;

function generateRandomEventCode() {
  return String(Math.floor(Math.random() * 100000)).padStart(5, "0");
}

function normalizeEventCode(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return eventCodeRegex.test(trimmed) ? trimmed : null;
}

function normalizeEventName(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePassword(value: unknown) {
  if (typeof value !== "string") return null;
  if (value.length < 8 || value.length > 128) return null;
  return value;
}

function hashPassword(password: string, salt: string, iterations: number) {
  return crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
}

function createPasswordRecord(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    passwordHash: hashPassword(password, salt, passwordHashIterations),
    passwordSalt: salt,
    passwordIterations: passwordHashIterations,
  };
}

function verifyPassword(password: string, record: { passwordHash: string; passwordSalt: string; passwordIterations: number }) {
  const computed = hashPassword(password, record.passwordSalt, record.passwordIterations);
  const expected = Buffer.from(record.passwordHash, "hex");
  const actual = Buffer.from(computed, "hex");
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

type AuthRole = "root" | "event_manager";

type AuthPayload = {
  role: AuthRole;
  eventId?: string;
  exp: number;
};

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function createAuthToken(payload: AuthPayload) {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", adminAuthSecret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function verifyAuthToken(token: string): AuthPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;
  const expectedSignature = crypto.createHmac("sha256", adminAuthSecret).update(encodedPayload).digest("base64url");
  if (signature.length !== expectedSignature.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as AuthPayload;
    if (!payload || typeof payload.exp !== "number" || typeof payload.role !== "string") return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (payload.role !== "root" && payload.role !== "event_manager") return null;
    if (payload.role === "event_manager" && (!payload.eventId || typeof payload.eventId !== "string")) return null;
    return payload;
  } catch {
    return null;
  }
}

function getBearerToken(req: express.Request, allowQueryToken = false) {
  const authorization = req.header("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }
  if (allowQueryToken && typeof req.query.authToken === "string") {
    return req.query.authToken.trim();
  }
  return null;
}

function requireRootAuth(req: express.Request, res: express.Response) {
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

function requireEventManagerAuth(req: express.Request, res: express.Response, eventId: string, allowQueryToken = false) {
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

async function ensureRootCredentialExists() {
  const existing = await prisma.rootCredential.findUnique({ where: { id: rootCredentialId } });
  if (existing) return existing;

  const bootstrapPassword = normalizePassword(process.env["ROOT_ADMIN_PASSWORD"]);
  if (!bootstrapPassword) return null;

  return prisma.rootCredential.create({
    data: {
      id: rootCredentialId,
      ...createPasswordRecord(bootstrapPassword),
    },
  });
}

async function createUniqueEventCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateRandomEventCode();
    const existing = await prisma.event.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Impossibile generare un codice evento univoco");
}

async function resolveEventIdByCode(eventCode: string) {
  const event = await prisma.event.findUnique({
    where: { code: eventCode },
    select: { id: true },
  });
  return event?.id ?? null;
}

function generateOpaqueToken(length: number) {
  const bytes = crypto.randomBytes(length);
  let token = "";

  for (let index = 0; index < length; index += 1) {
    token += opaqueTokenAlphabet[bytes[index] % opaqueTokenAlphabet.length];
  }

  return token;
}

function hashOpaqueToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeJudgeToken(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replaceAll(/[^0-9A-Z]/g, "");
  return normalized.length > 0 ? normalized : null;
}

type VoterType = "QUALIFICATA" | "POPOLARE";
type VoterStatus = "ACTIVE" | "SUBMITTED";

function normalizeVoterType(value: unknown): VoterType | null {
  if (value === "QUALIFICATA" || value === "POPOLARE") return value;
  return null;
}

function getJudgeTokenStatus(record: { finalizedAt: Date | null; revokedAt: Date | null; status?: VoterStatus }) {
  if (record.revokedAt) return "revoked";
  if (record.finalizedAt || record.status === "SUBMITTED") return "used";
  return "active";
}

type JudgeTokenSnapshot = {
  id: string;
  label: string | null;
  type: VoterType;
  voterStatus: VoterStatus;
  tokenPreview: string;
  createdAt: Date;
  finalizedAt: Date | null;
  usedAt: Date | null;
  revokedAt: Date | null;
  status: "active" | "used" | "revoked";
};

async function getJudgeTokenSnapshot(eventId: string): Promise<JudgeTokenSnapshot[]> {
  const judgeTokens = await prisma.judgeToken.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      type: true,
      status: true,
      tokenPreview: true,
      createdAt: true,
      finalizedAt: true,
      usedAt: true,
      revokedAt: true,
    },
  });

  return judgeTokens.map((token): JudgeTokenSnapshot => ({
    id: token.id,
    label: token.label,
    type: token.type as VoterType,
    voterStatus: token.status as VoterStatus,
    tokenPreview: token.tokenPreview,
    createdAt: token.createdAt,
    finalizedAt: token.finalizedAt,
    revokedAt: token.revokedAt,
    usedAt: token.finalizedAt ?? null,
    status: getJudgeTokenStatus(token),
  }));
}

async function getJudgeTokenVotes(judgeTokenId: string) {
  const votes = await prisma.vote.findMany({
    where: { judgeTokenId, score: { not: null } },
    select: {
      candidateId: true,
      score: true,
    },
  });

  return votes.reduce<Record<string, number>>((accumulator: Record<string, number>, vote: { candidateId: string; score: number | null }) => {
    if (typeof vote.score === "number") {
      accumulator[vote.candidateId] = vote.score;
    }
    return accumulator;
  }, {});
}

async function sendJudgeTokenSnapshot(res: express.Response, eventId: string) {
  res.write(`data: ${JSON.stringify({ eventId, tokens: await getJudgeTokenSnapshot(eventId) })}\n\n`);
}

async function broadcastJudgeTokenSnapshot(eventId: string) {
  const clients = judgeTokenStreamClients.get(eventId);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify({ eventId, tokens: await getJudgeTokenSnapshot(eventId) });
  for (const client of clients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      clients.delete(client);
    }
  }

  if (clients.size === 0) {
    judgeTokenStreamClients.delete(eventId);
  }
}

function attachJudgeTokenStreamClient(eventId: string, res: express.Response) {
  const clients = judgeTokenStreamClients.get(eventId) ?? new Set<express.Response>();
  clients.add(res);
  judgeTokenStreamClients.set(eventId, clients);

  return () => {
    const currentClients = judgeTokenStreamClients.get(eventId);
    currentClients?.delete(res);
    if (currentClients && currentClients.size === 0) {
      judgeTokenStreamClients.delete(eventId);
    }
  };
}

app.disable("x-powered-by");
app.use(cors({ origin: false }));
app.use(express.json());

app.post("/api/auth/root/login", async (req, res) => {
  const password = normalizePassword((req.body as { password?: string })?.password);
  if (!password) {
    res.status(400).json({ error: "Password root non valida (minimo 8 caratteri)" });
    return;
  }

  try {
    const rootCredential = await ensureRootCredentialExists();
    if (!rootCredential) {
      res.status(503).json({ error: "Credenziale root non configurata. Imposta ROOT_ADMIN_PASSWORD e riavvia il server." });
      return;
    }

    if (!verifyPassword(password, rootCredential)) {
      res.status(401).json({ error: "Password root errata" });
      return;
    }

    const exp = Math.floor(Date.now() / 1000) + authTokenTtlSeconds;
    const token = createAuthToken({ role: "root", exp });
    res.json({ token, role: "root", expiresAt: new Date(exp * 1000).toISOString() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.post("/api/auth/root/password", async (req, res) => {
  if (!requireRootAuth(req, res)) return;

  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  const normalizedCurrent = normalizePassword(currentPassword);
  const normalizedNext = normalizePassword(newPassword);

  if (!normalizedCurrent || !normalizedNext) {
    res.status(400).json({ error: "Password non valide (minimo 8 caratteri)" });
    return;
  }

  try {
    const rootCredential = await ensureRootCredentialExists();
    if (!rootCredential) {
      res.status(503).json({ error: "Credenziale root non configurata." });
      return;
    }

    if (!verifyPassword(normalizedCurrent, rootCredential)) {
      res.status(401).json({ error: "Password root corrente errata" });
      return;
    }

    await prisma.rootCredential.update({
      where: { id: rootCredentialId },
      data: createPasswordRecord(normalizedNext),
    });

    res.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.post("/api/auth/event/login", async (req, res) => {
  const { eventId, password } = req.body as { eventId?: string; password?: string };
  const normalizedPassword = normalizePassword(password);

  if (!eventId || !normalizedPassword) {
    res.status(400).json({ error: "Credenziali evento non valide" });
    return;
  }

  try {
    const credential = await prisma.eventManagerCredential.findUnique({
      where: { eventId },
      select: {
        eventId: true,
        passwordHash: true,
        passwordSalt: true,
        passwordIterations: true,
      },
    });

    if (!credential || !verifyPassword(normalizedPassword, credential)) {
      res.status(401).json({ error: "Password evento errata" });
      return;
    }

    const exp = Math.floor(Date.now() / 1000) + authTokenTtlSeconds;
    const token = createAuthToken({ role: "event_manager", eventId, exp });
    res.json({ token, role: "event_manager", eventId, expiresAt: new Date(exp * 1000).toISOString() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.get("/api/events", async (req, res) => {
  if (!requireRootAuth(req, res)) return;

  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        name: true,
        subtitle: true,
        active: true,
        votingClosed: true,
        weightQualificata: true,
        weightPopolare: true,
        enableTrimmedMean: true,
        trimmedMeanPercentage: true,
        createdAt: true,
      },
    });
    res.json(events);
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2022") {
      res.status(500).json({ error: "Schema DB non aggiornato: applica le migration più recenti" });
      return;
    }
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.post("/api/events", async (req, res) => {
  if (!requireRootAuth(req, res)) return;

  const body = req.body as { code?: string; name?: string; subtitle?: string; managerPassword?: string };
  const name = normalizeEventName(body.name);
  const managerPassword = normalizePassword(body.managerPassword);

  if (!name) {
    res.status(400).json({ error: "Il nome evento è obbligatorio" });
    return;
  }

  if (!managerPassword) {
    res.status(400).json({ error: "La password manager evento è obbligatoria (minimo 8 caratteri)" });
    return;
  }

  const hasCustomCode = typeof body.code === "string" && body.code.trim().length > 0;
  const requestedCode = hasCustomCode
    ? normalizeEventCode(body.code)
    : null;

  if (hasCustomCode && !requestedCode) {
    res.status(400).json({ error: "Codice evento non valido (1-5 cifre)" });
    return;
  }

  const subtitle = typeof body.subtitle === "string" && body.subtitle.trim().length > 0
    ? body.subtitle.trim()
    : null;

  try {
    const code = requestedCode ?? await createUniqueEventCode();
    const passwordRecord = createPasswordRecord(managerPassword);
    const event = await prisma.event.create({
      data: {
        code,
        name,
        subtitle,
        active: true,
        votingClosed: true,
        managerCredential: {
          create: passwordRecord,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        subtitle: true,
        active: true,
        votingClosed: true,
        weightQualificata: true,
        weightPopolare: true,
        enableTrimmedMean: true,
        trimmedMeanPercentage: true,
        createdAt: true,
      },
    });

    res.status(201).json(event);
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2022") {
      res.status(500).json({ error: "Schema DB non aggiornato: applica le migration più recenti" });
      return;
    }

    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      res.status(409).json({ error: "Codice evento già in uso" });
      return;
    }

    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.get("/api/events/by-code/:eventCode", async (req, res) => {
  const parsedEventCode = normalizeEventCode(req.params.eventCode);
  if (!parsedEventCode) {
    res.status(400).json({ error: "Codice evento non valido" });
    return;
  }

  let event;
  try {
    event = await prisma.event.findUnique({
      where: { code: parsedEventCode },
      include: {
        candidates: {
          orderBy: { number: "asc" },
        },
      },
    });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2022") {
      res.status(500).json({ error: "Schema DB non aggiornato: applica le migration più recenti" });
      return;
    }
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
    return;
  }

  if (!event) {
    res.status(404).json({ error: "Evento non trovato" });
    return;
  }

  res.json(event);
});

app.get("/api/events/:eventId", async (req, res) => {
  const { eventId } = req.params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      code: true,
      name: true,
      subtitle: true,
      active: true,
      votingClosed: true,
      weightQualificata: true,
      weightPopolare: true,
      enableTrimmedMean: true,
      trimmedMeanPercentage: true,
    },
  });

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(event);
});

app.put("/api/events/:eventId", async (req, res) => {
  if (!requireRootAuth(req, res)) return;

  const { eventId } = req.params;
  const body = (req.body ?? {}) as {
    name?: string;
    subtitle?: string | null;
    weightQualificata?: number;
    weightPopolare?: number;
    enableTrimmedMean?: boolean;
    trimmedMeanPercentage?: number;
  };
  const updateData: {
    name?: string;
    subtitle?: string | null;
    weightQualificata?: number;
    weightPopolare?: number;
    enableTrimmedMean?: boolean;
    trimmedMeanPercentage?: number;
  } = {};

  if (Object.hasOwn(body, "name")) {
    const normalizedName = normalizeEventName(body.name);
    if (!normalizedName) {
      res.status(400).json({ error: "Il nome evento è obbligatorio" });
      return;
    }
    updateData.name = normalizedName;
  }

  if (Object.hasOwn(body, "subtitle")) {
    if (body.subtitle === null) {
      updateData.subtitle = null;
    } else if (typeof body.subtitle === "string") {
      const trimmedSubtitle = body.subtitle.trim();
      updateData.subtitle = trimmedSubtitle.length > 0 ? trimmedSubtitle : null;
    } else {
      res.status(400).json({ error: "Sottotitolo non valido" });
      return;
    }

    const hasWeightQualificata = Object.hasOwn(body, "weightQualificata");
    const hasWeightPopolare = Object.hasOwn(body, "weightPopolare");
    if (hasWeightQualificata || hasWeightPopolare) {
      if (typeof body.weightQualificata !== "number" || typeof body.weightPopolare !== "number") {
        res.status(400).json({ error: "Inserisci entrambi i pesi come numeri interi" });
        return;
      }
      if (!Number.isInteger(body.weightQualificata) || !Number.isInteger(body.weightPopolare)) {
        res.status(400).json({ error: "I pesi devono essere interi" });
        return;
      }
      if (body.weightQualificata < 0 || body.weightQualificata > 100 || body.weightPopolare < 0 || body.weightPopolare > 100) {
        res.status(400).json({ error: "I pesi devono essere compresi tra 0 e 100" });
        return;
      }
      if (body.weightQualificata + body.weightPopolare !== 100) {
        res.status(400).json({ error: "La somma dei pesi deve essere esattamente 100" });
        return;
      }
      updateData.weightQualificata = body.weightQualificata;
      updateData.weightPopolare = body.weightPopolare;
    }

    if (Object.hasOwn(body, "enableTrimmedMean")) {
      if (typeof body.enableTrimmedMean !== "boolean") {
        res.status(400).json({ error: "Il flag trimmed mean non è valido" });
        return;
      }
      updateData.enableTrimmedMean = body.enableTrimmedMean;
    }

    if (Object.hasOwn(body, "trimmedMeanPercentage")) {
      if (typeof body.trimmedMeanPercentage !== "number" || Number.isNaN(body.trimmedMeanPercentage)) {
        res.status(400).json({ error: "La percentuale trimmed mean non è valida" });
        return;
      }
      if (body.trimmedMeanPercentage < 0 || body.trimmedMeanPercentage >= 50) {
        res.status(400).json({ error: "La percentuale trimmed mean deve essere tra 0 e 49.99" });
        return;
      }
      updateData.trimmedMeanPercentage = body.trimmedMeanPercentage;
    }
  }

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "Nessun campo da aggiornare" });
    return;
  }

  try {
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      select: {
        id: true,
        code: true,
        name: true,
        subtitle: true,
        active: true,
        votingClosed: true,
        weightQualificata: true,
        weightPopolare: true,
        enableTrimmedMean: true,
        trimmedMeanPercentage: true,
        createdAt: true,
      },
    });

    res.json(updatedEvent);
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      res.status(404).json({ error: "Evento non trovato" });
      return;
    }

    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.put("/api/events/:eventId/manager-password", async (req, res) => {
  if (!requireRootAuth(req, res)) return;

  const { eventId } = req.params;
  const password = normalizePassword((req.body as { password?: string })?.password);
  if (!password) {
    res.status(400).json({ error: "Password manager evento non valida (minimo 8 caratteri)" });
    return;
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) {
      res.status(404).json({ error: "Evento non trovato" });
      return;
    }

    const passwordRecord = createPasswordRecord(password);
    await prisma.eventManagerCredential.upsert({
      where: { eventId },
      update: passwordRecord,
      create: { eventId, ...passwordRecord },
    });

    res.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

// Cast a vote (judge token required)
app.post("/api/vote", async (req, res) => {
  const { candidateId, score } = req.body as {
    candidateId: string;
    judgeToken?: string;
    score: number | null;
  };

  if (!candidateId || (score !== null && typeof score !== "number")) {
    res.status(400).json({ error: "Missing fields" });
    return;
  }
  if (typeof score === "number" && (score < 1 || score > 10 || !Number.isInteger(score))) {
    res.status(400).json({ error: "Score must be integer 1-10" });
    return;
  }

  if (!req.body.judgeToken) {
    res.status(403).json({ error: "Serve un codice giudice" });
    return;
  }

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { eventId: true, event: { select: { votingClosed: true } } },
    });

    if (!candidate || candidate.event.votingClosed) {
      res.status(403).json({ error: "Le votazioni sono chiuse" });
      return;
    }

    const judgeToken = normalizeJudgeToken(req.body.judgeToken);

    if (!judgeToken) {
      res.status(403).json({ error: "Serve un codice giudice" });
      return;
    }

    const tokenHash = hashOpaqueToken(judgeToken);
    const judgeRecord = await prisma.judgeToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        eventId: true,
        type: true,
        status: true,
        finalizedAt: true,
        usedAt: true,
        revokedAt: true,
      },
    });

    if (!judgeRecord || judgeRecord.eventId !== candidate.eventId) {
      res.status(403).json({ error: "Codice giudice non valido" });
      return;
    }

    if (judgeRecord.revokedAt) {
      res.status(403).json({ error: "Codice giudice revocato" });
      return;
    }

    if (judgeRecord.finalizedAt || judgeRecord.status === "SUBMITTED") {
      res.status(403).json({ error: "Codice giudice bloccato" });
      return;
    }

    const vote = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (score === null) {
        await tx.vote.deleteMany({
          where: {
            candidateId,
            judgeTokenId: judgeRecord.id,
          },
        });
        return null;
      }

      return tx.vote.upsert({
        where: {
          candidateId_judgeTokenId: {
            candidateId,
            judgeTokenId: judgeRecord.id,
          },
        },
        update: { score },
        create: {
          candidateId,
          score,
          judgeTokenId: judgeRecord.id,
        },
      });
    });

    res.json({ ok: true, vote });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.get("/api/events/:eventId/judge-tokens", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId)) return;

  try {
    res.json(await getJudgeTokenSnapshot(eventId));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.get("/api/events/:eventId/judge-tokens/stream", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId, true)) return;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write(": connected\n\n");

  const detach = attachJudgeTokenStreamClient(eventId, res);

  try {
    await sendJudgeTokenSnapshot(res, eventId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.write(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
  }

  req.on("close", () => {
    detach();
    res.end();
  });
});

app.post("/api/events/:eventId/judge-tokens", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId)) return;

  const { count, labelPrefix } = req.body as {
    count?: number;
    labelPrefix?: string;
    type?: VoterType;
    origin?: string;
  };

  if (typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > 200) {
    res.status(400).json({ error: "Count must be between 1 and 200" });
    return;
  }

  try {
    const voterType = normalizeVoterType(req.body?.type) ?? "QUALIFICATA";
    const fallbackOrigin = `${req.protocol}://${req.get("host")}`;
    const clientOrigin = typeof req.body.origin === "string" && req.body.origin.trim()
      ? req.body.origin.trim()
      : fallbackOrigin;
    const baseUrl = new URL(clientOrigin).origin;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { code: true },
    });

    if (!event) {
      res.status(404).json({ error: "Evento non trovato" });
      return;
    }

    const generated: Array<{
      id: string;
      label: string | null;
      type: VoterType;
      voterStatus: VoterStatus;
      token: string;
      tokenPreview: string;
      createdAt: Date;
      finalizedAt: Date | null;
      usedAt: Date | null;
      revokedAt: Date | null;
    }> = [];

    for (let index = 0; index < count; index += 1) {
      const rawToken = generateOpaqueToken(judgeTokenLength);
      const record = await prisma.judgeToken.create({
        data: {
          eventId,
          label: labelPrefix ? `${labelPrefix} ${index + 1}` : null,
          type: voterType,
          status: "ACTIVE",
          tokenHash: hashOpaqueToken(rawToken),
          tokenPreview: rawToken.slice(0, 8),
        },
      });

      generated.push({
        id: record.id,
        label: record.label,
        type: record.type as VoterType,
        voterStatus: record.status as VoterStatus,
        token: rawToken,
        tokenPreview: record.tokenPreview,
        createdAt: record.createdAt,
        finalizedAt: record.finalizedAt,
        usedAt: record.finalizedAt ?? null,
        revokedAt: record.revokedAt,
      });
    }

    res.json({
      ok: true,
      codes: generated.map((code) => ({
        ...code,
        status: getJudgeTokenStatus(code),
        url: `${baseUrl}/?${new URLSearchParams({
          eventCode: event.code,
          judgeToken: code.token,
        }).toString()}`,
      })),
    });
    await broadcastJudgeTokenSnapshot(eventId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.post("/api/judge-tokens/validate", async (req, res) => {
  const { token, eventCode } = req.body as { token?: string; eventCode?: string };
  const normalizedToken = normalizeJudgeToken(token);

  if (!normalizedToken) {
    res.status(400).json({ error: "Missing token" });
    return;
  }

  const parsedEventCode =
    eventCode === undefined ? null : normalizeEventCode(eventCode);
  if (eventCode !== undefined && !parsedEventCode) {
    res.status(400).json({ error: "Codice evento non valido" });
    return;
  }

  try {
    const tokenHash = hashOpaqueToken(normalizedToken);
    const judgeToken = await prisma.judgeToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        label: true,
        eventId: true,
        type: true,
        status: true,
        tokenPreview: true,
        createdAt: true,
        finalizedAt: true,
        usedAt: true,
        revokedAt: true,
      },
    });

    if (!judgeToken) {
      res.status(404).json({ valid: false, status: "invalid", message: "Codice non trovato" });
      return;
    }

    if (parsedEventCode) {
      const requestedEventId = await resolveEventIdByCode(parsedEventCode);
      if (!requestedEventId) {
        res.status(404).json({ valid: false, status: "invalid", message: "Evento non trovato" });
        return;
      }
      if (requestedEventId !== judgeToken.eventId) {
        res.status(403).json({ valid: false, status: "invalid", message: "Codice non valido per questo evento" });
        return;
      }
    }

    const votes = await getJudgeTokenVotes(judgeToken.id);

    const status = getJudgeTokenStatus(judgeToken);
    const valid = status === "active";
    const message =
      status === "active"
        ? "Codice valido"
        : status === "used"
          ? "Codice bloccato"
          : "Codice revocato";

    res.json({
      valid,
      status,
      message,
      votes,
      code: {
        ...judgeToken,
        voterStatus: judgeToken.status,
        usedAt: judgeToken.finalizedAt ?? null,
        status,
        votes,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.post("/api/judge-tokens/finalize", async (req, res) => {
  const { token, eventCode } = req.body as { token?: string; eventCode?: string };
  const normalizedToken = normalizeJudgeToken(token);

  if (!normalizedToken) {
    res.status(400).json({ error: "Missing token" });
    return;
  }

  const parsedEventCode =
    eventCode === undefined ? null : normalizeEventCode(eventCode);
  if (eventCode !== undefined && !parsedEventCode) {
    res.status(400).json({ error: "Codice evento non valido" });
    return;
  }

  try {
    const tokenHash = hashOpaqueToken(normalizedToken);
    const judgeToken = await prisma.judgeToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        eventId: true,
        label: true,
        type: true,
        status: true,
        tokenPreview: true,
        createdAt: true,
        finalizedAt: true,
        usedAt: true,
        revokedAt: true,
      },
    });

    if (!judgeToken) {
      res.status(404).json({ error: "Codice non trovato" });
      return;
    }

    if (parsedEventCode) {
      const requestedEventId = await resolveEventIdByCode(parsedEventCode);
      if (!requestedEventId) {
        res.status(404).json({ error: "Evento non trovato" });
        return;
      }
      if (requestedEventId !== judgeToken.eventId) {
        res.status(403).json({ error: "Codice non valido per questo evento" });
        return;
      }
    }

    if (judgeToken.revokedAt) {
      res.status(403).json({ error: "Codice giudice revocato" });
      return;
    }

    const votes = await getJudgeTokenVotes(judgeToken.id);
    const candidateCount = await prisma.candidate.count({ where: { eventId: judgeToken.eventId } });

    if (judgeToken.finalizedAt || judgeToken.status === "SUBMITTED") {
      res.json({
        ok: true,
        status: "used",
        message: "Codice già bloccato",
        votes,
        code: {
          ...judgeToken,
          voterStatus: judgeToken.status,
          usedAt: judgeToken.finalizedAt ?? null,
          status: "used",
          votes,
        },
      });
      return;
    }

    const requiresCompleteBallot = judgeToken.type === "QUALIFICATA";
    if (requiresCompleteBallot && candidateCount > 0 && Object.keys(votes).length !== candidateCount) {
      res.status(400).json({ error: "Completa tutte le preferenze prima di bloccare il codice" });
      return;
    }

    const updated = await prisma.judgeToken.update({
      where: { id: judgeToken.id },
      data: { finalizedAt: new Date(), usedAt: new Date(), status: "SUBMITTED" },
      select: {
        id: true,
        eventId: true,
        label: true,
        type: true,
        status: true,
        tokenPreview: true,
        createdAt: true,
        finalizedAt: true,
        usedAt: true,
        revokedAt: true,
      },
    });

    await broadcastJudgeTokenSnapshot(judgeToken.eventId);

    res.json({
      ok: true,
      status: getJudgeTokenStatus(updated),
      message: "Codice bloccato e voti resi definitivi",
      votes,
      code: {
        ...updated,
        voterStatus: updated.status,
        usedAt: updated.finalizedAt ?? null,
        status: getJudgeTokenStatus(updated),
        votes,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.post("/api/judge-tokens/:id/revoke", async (req, res) => {
  const { id } = req.params;

  try {
    const token = await prisma.judgeToken.findUnique({
      where: { id },
      select: { eventId: true },
    });
    if (!token) {
      res.status(404).json({ error: "Codice giudice non trovato" });
      return;
    }

    if (!requireEventManagerAuth(req, res, token.eventId)) return;

    const updated = await prisma.judgeToken.update({
      where: { id },
      data: { revokedAt: new Date() },
      select: {
        id: true,
        eventId: true,
        label: true,
        type: true,
        status: true,
        tokenPreview: true,
        createdAt: true,
        finalizedAt: true,
        usedAt: true,
        revokedAt: true,
      },
    });

    res.json({
      ...updated,
      voterStatus: updated.status,
      usedAt: updated.finalizedAt ?? null,
      status: getJudgeTokenStatus(updated),
    });
    await broadcastJudgeTokenSnapshot(updated.eventId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

// Admin: Get candidates for event
app.get("/api/candidates/:eventId", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId)) return;

  try {
    const candidates = await prisma.candidate.findMany({
      where: { eventId },
      orderBy: { number: "asc" },
    });
    res.json(candidates);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

// Admin: Add candidate
app.post("/api/candidates", async (req, res) => {
  const { eventId, number, name, subtitle, color } = req.body as {
    eventId: string;
    number: number;
    name: string;
    subtitle?: string;
    color?: string;
  };

  if (!eventId || !number || !name) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  if (!requireEventManagerAuth(req, res, eventId)) return;

  try {
    const candidate = await prisma.candidate.create({
      data: {
        eventId,
        number,
        name,
        subtitle: subtitle || null,
        color: color || "#6366f1",
      },
    });
    res.json(candidate);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

// Admin: Update candidate
app.put("/api/candidates/:id", async (req, res) => {
  const { id } = req.params;
  const { name, subtitle, color, number } = req.body as {
    name?: string;
    subtitle?: string;
    color?: string;
    number?: number;
  };

  try {
    const existing = await prisma.candidate.findUnique({
      where: { id },
      select: { eventId: true },
    });
    if (!existing) {
      res.status(404).json({ error: "Candidato non trovato" });
      return;
    }

    if (!requireEventManagerAuth(req, res, existing.eventId)) return;

    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(subtitle !== undefined && { subtitle }),
        ...(color && { color }),
        ...(number && { number }),
      },
    });
    res.json(candidate);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

// Admin: Delete candidate
app.delete("/api/candidates/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.candidate.findUnique({
      where: { id },
      select: { eventId: true },
    });
    if (!existing) {
      res.status(404).json({ error: "Candidato non trovato" });
      return;
    }

    if (!requireEventManagerAuth(req, res, existing.eventId)) return;

    const deletedCandidate = await prisma.candidate.delete({ where: { id } });

    const remainingCandidates = await prisma.candidate.findMany({
      where: { eventId: deletedCandidate.eventId },
      orderBy: { number: "asc" },
      select: { id: true },
    });

    await prisma.$transaction(
      remainingCandidates.map((candidate: { id: string }, index: number) =>
        prisma.candidate.update({
          where: { id: candidate.id },
          data: { number: index + 1 },
        })
      )
    );

    res.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.get("/api/events/:eventId/voting-progress", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId)) return;

  try {
    const [candidates, judgeTokens] = await Promise.all([
      prisma.candidate.findMany({
        where: { eventId },
        orderBy: { number: "asc" },
        select: { id: true, number: true, name: true },
      }),
      prisma.judgeToken.findMany({
        where: { eventId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          label: true,
          type: true,
          status: true,
          tokenPreview: true,
          finalizedAt: true,
          revokedAt: true,
          votes: { select: { candidateId: true, score: true } },
        },
      }),
    ]);

    const candidateCount = candidates.length;
    const qualifiedTokens = judgeTokens.filter((token) => token.type === "QUALIFICATA");
    const popularTokens = judgeTokens.filter((token) => token.type === "POPOLARE");
    const qualifiedActiveJudges = qualifiedTokens.filter((token) => !token.revokedAt && getJudgeTokenStatus(token) === "active");
    const qualifiedSubmittedJudges = qualifiedTokens.filter((token) => !token.revokedAt && getJudgeTokenStatus(token) === "used");
    const qualifiedRevokedJudges = qualifiedTokens.filter((token) => token.revokedAt);

    const judges = qualifiedTokens.map((token) => {
      const status = getJudgeTokenStatus(token);
      const votedCandidateIds = new Set(
        token.votes.filter((vote) => typeof vote.score === "number").map((vote) => vote.candidateId)
      );
      const votesCast = votedCandidateIds.size;
      const missingCandidates = candidates.filter((candidate) => !votedCandidateIds.has(candidate.id));

      return {
        id: token.id,
        label: token.label,
        type: token.type,
        voterStatus: token.status,
        tokenPreview: token.tokenPreview,
        status,
        votesCast,
        votesRequired: candidateCount,
        missingCandidates: status === "active"
          ? missingCandidates.map((candidate) => ({
              id: candidate.id,
              number: candidate.number,
              name: candidate.name,
            }))
          : [],
      };
    });

    const incompleteCandidates = candidates
      .map((candidate) => {
        const missingJudgeCount = qualifiedActiveJudges.filter(
          (judge) => !judge.votes.some((vote) => vote.candidateId === candidate.id && typeof vote.score === "number")
        ).length;

        return {
          candidateId: candidate.id,
          candidateNumber: candidate.number,
          candidateName: candidate.name,
          missingJudgeCount,
        };
      })
      .filter((entry) => entry.missingJudgeCount > 0);

    const popularValidVotes = popularTokens.flatMap((token) =>
      token.votes.filter((vote) => typeof vote.score === "number")
    );
    const popularActivatedTokens = popularTokens.filter((token) =>
      token.votes.some((vote) => typeof vote.score === "number")
    );
    const popularSubmittedTokens = popularTokens.filter((token) => !token.revokedAt && getJudgeTokenStatus(token) === "used");
    const popularActiveTokens = popularTokens.filter((token) => !token.revokedAt && getJudgeTokenStatus(token) === "active");
    const popularRevokedTokens = popularTokens.filter((token) => token.revokedAt);

    res.json({
      candidateCount,
      totalJudges: qualifiedTokens.length,
      activeJudges: qualifiedActiveJudges.length,
      finalizedJudges: qualifiedSubmittedJudges.length,
      revokedJudges: qualifiedRevokedJudges.length,
      judges,
      incompleteCandidates,
      qualified: {
        totalJudges: qualifiedTokens.length,
        activeJudges: qualifiedActiveJudges.length,
        submittedJudges: qualifiedSubmittedJudges.length,
        revokedJudges: qualifiedRevokedJudges.length,
      },
      popular: {
        totalTokens: popularTokens.length,
        activeTokens: popularActiveTokens.length,
        submittedTokens: popularSubmittedTokens.length,
        revokedTokens: popularRevokedTokens.length,
        activatedTokens: popularActivatedTokens.length,
        totalVotesCast: popularValidVotes.length,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.put("/api/events/:eventId/voting-state", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId)) return;

  const { votingClosed } = req.body as { votingClosed: boolean };

  try {
    const event = await prisma.event.update({
      where: { id: eventId },
      data: { votingClosed },
      select: { id: true, votingClosed: true },
    });
    res.json(event);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.post("/api/events/:eventId/start", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId)) return;

  try {
    const candidates = await prisma.candidate.findMany({
      where: { eventId },
      orderBy: { number: "asc" },
      select: { id: true, number: true },
    });

    if (candidates.length > 0) {
      const tempBase = candidates.at(-1)!.number + 1;

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const [index, candidate] of candidates.entries()) {
          await tx.candidate.update({
            where: { id: candidate.id },
            data: { number: tempBase + index + 1 },
          });
        }

        for (const [index, candidate] of candidates.entries()) {
          await tx.candidate.update({
            where: { id: candidate.id },
            data: { number: index + 1 },
          });
        }

        await tx.vote.deleteMany({
          where: { candidate: { eventId } },
        });

        await tx.event.update({
          where: { id: eventId },
          data: { active: true, votingClosed: false },
        });
      });
    } else {
      await prisma.event.update({
        where: { id: eventId },
        data: { active: true, votingClosed: false },
      });
    }

    const updatedCandidates = await prisma.candidate.findMany({
      where: { eventId },
      orderBy: { number: "asc" },
    });

    res.json({ ok: true, votingClosed: false, candidates: updatedCandidates });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.delete("/api/events/:eventId/votes", async (req, res) => {
  const { eventId } = req.params;
  if (!requireEventManagerAuth(req, res, eventId)) return;

  try {
    await prisma.vote.deleteMany({
      where: { candidate: { eventId } },
    });
    res.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

// Hall of Fame: Get rankings for event
app.get("/api/rankings/:eventId", async (req, res) => {
  const { eventId } = req.params;

  try {
    const [event, candidates, qualifiedTokenIds] = await Promise.all([
      prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          weightQualificata: true,
          weightPopolare: true,
          enableTrimmedMean: true,
          trimmedMeanPercentage: true,
        },
      }),
      prisma.candidate.findMany({
        where: { eventId },
        orderBy: { number: "asc" },
        select: { id: true, number: true, name: true, color: true },
      }),
      prisma.judgeToken.findMany({
        where: {
          eventId,
          type: "QUALIFICATA",
          revokedAt: null,
        },
        select: { id: true },
      }),
    ]);

    if (!event) {
      res.status(404).json({ error: "Evento non trovato" });
      return;
    }
    const eventSettings = event;

    const eligibleQualifiedJudgeCount = qualifiedTokenIds.length;

    const votes = await prisma.vote.findMany({
      where: {
        candidate: { eventId },
        judgeToken: { revokedAt: null },
        score: { not: null },
      },
      select: {
        candidateId: true,
        score: true,
        judgeToken: {
          select: {
            type: true,
          },
        },
      },
    });

    function computeTrimmedMean(rawValues: number[]) {
      if (rawValues.length === 0) return 0;
      if (!eventSettings.enableTrimmedMean) {
        return rawValues.reduce((sum, value) => sum + value, 0) / rawValues.length;
      }

      const sorted = [...rawValues].sort((a, b) => a - b);
      const trimEachSide = Math.floor(sorted.length * (eventSettings.trimmedMeanPercentage / 100));
      if (trimEachSide <= 0 || trimEachSide * 2 >= sorted.length) {
        return sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
      }
      const trimmed = sorted.slice(trimEachSide, sorted.length - trimEachSide);
      if (trimmed.length === 0) return 0;
      return trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length;
    }

    const votesByCandidate = new Map<string, { qualifiedScores: number[]; popularScores: number[] }>();
    for (const candidate of candidates) {
      votesByCandidate.set(candidate.id, { qualifiedScores: [], popularScores: [] });
    }

    for (const vote of votes) {
      if (typeof vote.score !== "number") continue;
      const bucket = votesByCandidate.get(vote.candidateId);
      if (!bucket) continue;
      if (!vote.judgeToken) continue;
      if (vote.judgeToken.type === "QUALIFICATA") {
        bucket.qualifiedScores.push(vote.score);
      } else {
        bucket.popularScores.push(vote.score);
      }
    }

    const rankings = candidates
      .map((candidate) => {
        const candidateVotes = votesByCandidate.get(candidate.id) ?? { qualifiedScores: [], popularScores: [] };
        const qualifiedSum = candidateVotes.qualifiedScores.reduce((sum, score) => sum + score, 0);
        const avgQualificata = eligibleQualifiedJudgeCount > 0 ? qualifiedSum / eligibleQualifiedJudgeCount : 0;
        const avgPopolare = computeTrimmedMean(candidateVotes.popularScores);
        const finalScore = (avgQualificata * (eventSettings.weightQualificata / 100)) + (avgPopolare * (eventSettings.weightPopolare / 100));
        const totalValidVotes = candidateVotes.qualifiedScores.length + candidateVotes.popularScores.length;

        return {
          id: candidate.id,
          number: candidate.number,
          name: candidate.name,
          color: candidate.color,
          totalScore: finalScore,
          finalScore,
          voteCount: totalValidVotes,
          avgScore: totalValidVotes > 0 ? (qualifiedSum + candidateVotes.popularScores.reduce((sum, score) => sum + score, 0)) / totalValidVotes : 0,
          avgQualificata,
          avgPopolare,
          qualifiedVoteCount: candidateVotes.qualifiedScores.length,
          popularVoteCount: candidateVotes.popularScores.length,
        };
      })
      .sort((a, b) => {
        const scoreDiff = b.finalScore - a.finalScore;
        if (Math.abs(scoreDiff) <= 0.001) {
          const qualifiedDiff = b.avgQualificata - a.avgQualificata;
          if (Math.abs(qualifiedDiff) > 0.001) return qualifiedDiff;
          return a.number - b.number;
        }
        return scoreDiff;
      });

    res.json(rankings);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

// Backstage partial rankings: split by jury type
app.get("/api/events/:eventId/partial-rankings", async (req, res) => {
  const { eventId } = req.params;

  if (!requireEventManagerAuth(req, res, eventId)) return;

  try {
    const [event, candidates, qualifiedTokenIds] = await Promise.all([
      prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          weightQualificata: true,
          weightPopolare: true,
          enableTrimmedMean: true,
          trimmedMeanPercentage: true,
        },
      }),
      prisma.candidate.findMany({
        where: { eventId },
        orderBy: { number: "asc" },
        select: { id: true, number: true, name: true, color: true },
      }),
      prisma.judgeToken.findMany({
        where: {
          eventId,
          type: "QUALIFICATA",
          revokedAt: null,
        },
        select: { id: true },
      }),
    ]);

    if (!event) {
      res.status(404).json({ error: "Evento non trovato" });
      return;
    }
    const eventSettings = event;

    const eligibleQualifiedJudgeCount = qualifiedTokenIds.length;

    const votes = await prisma.vote.findMany({
      where: {
        candidate: { eventId },
        judgeToken: { revokedAt: null },
        score: { not: null },
      },
      select: {
        candidateId: true,
        score: true,
        judgeToken: {
          select: {
            type: true,
          },
        },
      },
    });

    function computeTrimmedMean(rawValues: number[]) {
      if (rawValues.length === 0) return 0;
      if (!eventSettings.enableTrimmedMean) {
        return rawValues.reduce((sum, value) => sum + value, 0) / rawValues.length;
      }

      const sorted = [...rawValues].sort((a, b) => a - b);
      const trimEachSide = Math.floor(sorted.length * (eventSettings.trimmedMeanPercentage / 100));
      if (trimEachSide <= 0 || trimEachSide * 2 >= sorted.length) {
        return sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
      }
      const trimmed = sorted.slice(trimEachSide, sorted.length - trimEachSide);
      if (trimmed.length === 0) return 0;
      return trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length;
    }

    const votesByCandidate = new Map<string, { qualifiedScores: number[]; popularScores: number[] }>();
    for (const candidate of candidates) {
      votesByCandidate.set(candidate.id, { qualifiedScores: [], popularScores: [] });
    }

    for (const vote of votes) {
      if (typeof vote.score !== "number") continue;
      const bucket = votesByCandidate.get(vote.candidateId);
      if (!bucket) continue;
      if (!vote.judgeToken) continue;
      if (vote.judgeToken.type === "QUALIFICATA") {
        bucket.qualifiedScores.push(vote.score);
      } else {
        bucket.popularScores.push(vote.score);
      }
    }

    const baseEntries = candidates.map((candidate) => {
      const candidateVotes = votesByCandidate.get(candidate.id) ?? { qualifiedScores: [], popularScores: [] };
      const qualifiedSum = candidateVotes.qualifiedScores.reduce((sum, score) => sum + score, 0);
      const avgQualificata = eligibleQualifiedJudgeCount > 0 ? qualifiedSum / eligibleQualifiedJudgeCount : 0;
      const avgPopolare = computeTrimmedMean(candidateVotes.popularScores);
      const finalScore = (avgQualificata * (eventSettings.weightQualificata / 100)) + (avgPopolare * (eventSettings.weightPopolare / 100));
      return {
        id: candidate.id,
        number: candidate.number,
        name: candidate.name,
        color: candidate.color,
        avgQualificata,
        avgPopolare,
        finalScore,
        qualifiedVoteCount: candidateVotes.qualifiedScores.length,
        popularVoteCount: candidateVotes.popularScores.length,
        totalVoteCount: candidateVotes.qualifiedScores.length + candidateVotes.popularScores.length,
      };
    });

    const weightedRankings = [...baseEntries]
      .sort((a, b) => {
        const diff = b.finalScore - a.finalScore;
        if (Math.abs(diff) <= 0.001) {
          const qualifiedDiff = b.avgQualificata - a.avgQualificata;
          if (Math.abs(qualifiedDiff) > 0.001) return qualifiedDiff;
          return a.number - b.number;
        }
        return diff;
      })
      .map((entry, index) => ({ ...entry, position: index + 1 }));

    const qualifiedRankings = [...baseEntries]
      .sort((a, b) => {
        const diff = b.avgQualificata - a.avgQualificata;
        if (Math.abs(diff) <= 0.001) return a.number - b.number;
        return diff;
      })
      .map((entry, index) => ({ ...entry, position: index + 1 }));

    const popularRankings = [...baseEntries]
      .sort((a, b) => {
        const diff = b.avgPopolare - a.avgPopolare;
        if (Math.abs(diff) <= 0.001) return a.number - b.number;
        return diff;
      })
      .map((entry, index) => ({ ...entry, position: index + 1 }));

    res.json({
      qualified: qualifiedRankings,
      popular: popularRankings,
      weighted: weightedRankings,
      weights: {
        qualificata: eventSettings.weightQualificata,
        popolare: eventSettings.weightPopolare,
      },
      eligibleQualifiedJudges: eligibleQualifiedJudgeCount,
      event: {
        enableTrimmedMean: eventSettings.enableTrimmedMean,
        trimmedMeanPercentage: eventSettings.trimmedMeanPercentage,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

const shouldServeClient = process.env["NODE_ENV"] === "production" || process.env["SERVE_CLIENT"] === "true";
const clientDistPath = path.resolve(__dirname, "..", "dist");
const clientIndexPath = path.join(clientDistPath, "index.html");

if (shouldServeClient && fs.existsSync(clientIndexPath)) {
  app.use(express.static(clientDistPath));

  const sendClientApp = (_req: express.Request, res: express.Response) => {
    res.sendFile(clientIndexPath);
  };

  app.get("/", sendClientApp);
  app.get("/admin", sendClientApp);
  app.get("/hof", sendClientApp);
}

const PORT = process.env["PORT"] || 3001;

const isDirectExecution = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (isDirectExecution) {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

export default app;
