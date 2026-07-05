import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseUrl = process.env["SUPABASE_DATABASE_URL"] ?? process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL environment variable");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const app = express();

const opaqueTokenAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const judgeTokenStreamClients = new Map<string, Set<express.Response>>();

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

function getJudgeTokenStatus(record: { finalizedAt: Date | null; revokedAt: Date | null }) {
  if (record.revokedAt) return "revoked";
  if (record.finalizedAt) return "used";
  return "active";
}

type JudgeTokenSnapshot = {
  id: string;
  label: string | null;
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
      tokenPreview: true,
      createdAt: true,
      finalizedAt: true,
      usedAt: true,
      revokedAt: true,
    },
  });

  return judgeTokens.map((token): JudgeTokenSnapshot => ({
    ...token,
    usedAt: token.finalizedAt ?? null,
    status: getJudgeTokenStatus(token),
  }));
}

async function getJudgeTokenVotes(judgeTokenId: string) {
  const votes = await prisma.vote.findMany({
    where: { judgeTokenId },
    select: {
      candidateId: true,
      score: true,
    },
  });

  return votes.reduce<Record<string, number>>((accumulator: Record<string, number>, vote: { candidateId: string; score: number }) => {
    accumulator[vote.candidateId] = vote.score;
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

// Get active event with candidates
app.get("/api/events/active", async (_req, res) => {
  const event = await prisma.event.findFirst({
    where: { active: true },
    include: {
      candidates: {
        orderBy: { number: "asc" },
      },
    },
  });
  if (!event) {
    res.status(404).json({ error: "No active event" });
    return;
  }
  res.json({
    ...event,
    votingClosed: event.votingClosed,
  });
});

app.get("/api/events/:eventId", async (req, res) => {
  const { eventId } = req.params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, subtitle: true, active: true, votingClosed: true },
  });

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(event);
});

// Get votes for a device on an event
app.get("/api/events/:eventId/votes/:deviceId", async (req, res) => {
  const { eventId, deviceId } = req.params;
  const votes = await prisma.vote.findMany({
    where: {
      deviceId,
      candidate: { eventId },
    },
    select: {
      candidateId: true,
      score: true,
    },
  });
  const map: Record<string, number> = {};
  for (const v of votes) {
    map[v.candidateId] = v.score;
  }
  res.json(map);
});

// Cast a vote
app.post("/api/vote", async (req, res) => {
  const { candidateId, deviceId, score } = req.body as {
    candidateId: string;
    deviceId?: string;
    judgeToken?: string;
    score: number;
  };

  if (!candidateId || typeof score !== "number") {
    res.status(400).json({ error: "Missing fields" });
    return;
  }
  if (score < 1 || score > 10 || !Number.isInteger(score)) {
    res.status(400).json({ error: "Score must be integer 1-10" });
    return;
  }

  if (!req.body.judgeToken) {
    res.status(403).json({ error: "Serve un codice giudice" });
    return;
  }

  if (!deviceId && !req.body.judgeToken) {
    res.status(400).json({ error: "Missing voter identity" });
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

    const judgeToken = req.body.judgeToken as string | undefined;

    if (judgeToken) {
      const tokenHash = hashOpaqueToken(judgeToken);
      const judgeRecord = await prisma.judgeToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          eventId: true,
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

      if (judgeRecord.finalizedAt) {
        res.status(403).json({ error: "Codice giudice bloccato" });
        return;
      }

      const vote = await prisma.$transaction((tx: Prisma.TransactionClient) => {
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
      return;
    }

    const vote = await prisma.vote.upsert({
      where: {
        candidateId_deviceId: { candidateId, deviceId: deviceId ?? "" },
      },
      update: { score },
      create: { candidateId, deviceId: deviceId ?? "", score },
    });
    res.json({ ok: true, vote });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.get("/api/events/:eventId/judge-tokens", async (req, res) => {
  const { eventId } = req.params;

  try {
    res.json(await getJudgeTokenSnapshot(eventId));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.get("/api/events/:eventId/judge-tokens/stream", async (req, res) => {
  const { eventId } = req.params;

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
  const { count, length, labelPrefix } = req.body as {
    count?: number;
    length?: number;
    labelPrefix?: string;
    origin?: string;
  };

  if (typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > 200) {
    res.status(400).json({ error: "Count must be between 1 and 200" });
    return;
  }

  if (typeof length !== "number" || !Number.isInteger(length) || length < 16 || length > 64) {
    res.status(400).json({ error: "Length must be between 16 and 64" });
    return;
  }

  try {
    const fallbackOrigin = `${req.protocol}://${req.get("host")}`;
    const clientOrigin = typeof req.body.origin === "string" && req.body.origin.trim()
      ? req.body.origin.trim()
      : fallbackOrigin;
    const baseUrl = new URL(clientOrigin).origin;

    const generated: Array<{
      id: string;
      label: string | null;
      token: string;
      tokenPreview: string;
      createdAt: Date;
      finalizedAt: Date | null;
      usedAt: Date | null;
      revokedAt: Date | null;
    }> = [];

    for (let index = 0; index < count; index += 1) {
      const rawToken = generateOpaqueToken(length);
      const record = await prisma.judgeToken.create({
        data: {
          eventId,
          label: labelPrefix ? `${labelPrefix} ${index + 1}` : null,
          tokenHash: hashOpaqueToken(rawToken),
          tokenPreview: rawToken.slice(0, 8),
        },
      });

      generated.push({
        id: record.id,
        label: record.label,
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
        url: `${baseUrl}/?judgeToken=${encodeURIComponent(code.token)}`,
      })),
    });
    await broadcastJudgeTokenSnapshot(eventId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

app.post("/api/judge-tokens/validate", async (req, res) => {
  const { token } = req.body as { token?: string };

  if (!token) {
    res.status(400).json({ error: "Missing token" });
    return;
  }

  try {
    const tokenHash = hashOpaqueToken(token.trim());
    const judgeToken = await prisma.judgeToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        label: true,
        eventId: true,
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
  const { token } = req.body as { token?: string };

  if (!token) {
    res.status(400).json({ error: "Missing token" });
    return;
  }

  try {
    const tokenHash = hashOpaqueToken(token.trim());
    const judgeToken = await prisma.judgeToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        eventId: true,
        label: true,
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

    if (judgeToken.revokedAt) {
      res.status(403).json({ error: "Codice giudice revocato" });
      return;
    }

    const votes = await getJudgeTokenVotes(judgeToken.id);
    const candidateCount = await prisma.candidate.count({ where: { eventId: judgeToken.eventId } });

    if (judgeToken.finalizedAt) {
      res.json({
        ok: true,
        status: "used",
        message: "Codice già bloccato",
        votes,
        code: {
          ...judgeToken,
          usedAt: judgeToken.finalizedAt ?? null,
          status: "used",
          votes,
        },
      });
      return;
    }

    if (candidateCount > 0 && Object.keys(votes).length !== candidateCount) {
      res.status(400).json({ error: "Completa tutte le preferenze prima di bloccare il codice" });
      return;
    }

    const updated = await prisma.judgeToken.update({
      where: { id: judgeToken.id },
      data: { finalizedAt: new Date(), usedAt: new Date() },
      select: {
        id: true,
        eventId: true,
        label: true,
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
    const updated = await prisma.judgeToken.update({
      where: { id },
      data: { revokedAt: new Date() },
      select: {
        id: true,
        eventId: true,
        label: true,
        tokenPreview: true,
        createdAt: true,
        finalizedAt: true,
        usedAt: true,
        revokedAt: true,
      },
    });

    res.json({
      ...updated,
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

app.put("/api/events/:eventId/voting-state", async (req, res) => {
  const { eventId } = req.params;
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
          data: { votingClosed: false },
        });
      });
    } else {
      await prisma.event.update({
        where: { id: eventId },
        data: { votingClosed: false },
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
    const candidates = await prisma.candidate.findMany({
      where: { eventId },
      include: {
        votes: {
          select: { score: true },
        },
      },
    });

    const rankings = candidates
      .map((c: { id: string; number: number; name: string; color: string; votes: { score: number }[] }) => ({
        id: c.id,
        number: c.number,
        name: c.name,
        color: c.color,
        totalScore: c.votes.reduce((sum: number, v: { score: number }) => sum + v.score, 0),
        voteCount: c.votes.length,
        avgScore: c.votes.length > 0 ? c.votes.reduce((sum: number, v: { score: number }) => sum + v.score, 0) / c.votes.length : 0,
      }))
      .sort((a: { totalScore: number }, b: { totalScore: number }) => b.totalScore - a.totalScore);

    res.json(rankings);
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
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
