import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "..", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });
const app = express();

app.use(cors());
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
    deviceId: string;
    score: number;
  };

  if (!candidateId || !deviceId || typeof score !== "number") {
    res.status(400).json({ error: "Missing fields" });
    return;
  }
  if (score < 1 || score > 10 || !Number.isInteger(score)) {
    res.status(400).json({ error: "Score must be integer 1-10" });
    return;
  }

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { event: { select: { votingClosed: true } } },
    });

    if (!candidate || candidate.event.votingClosed) {
      res.status(403).json({ error: "Le votazioni sono chiuse" });
      return;
    }

    const vote = await prisma.vote.upsert({
      where: {
        candidateId_deviceId: { candidateId, deviceId },
      },
      update: { score },
      create: { candidateId, deviceId, score },
    });
    res.json({ ok: true, vote });
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
      remainingCandidates.map((candidate, index) =>
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
      const tempBase = candidates[candidates.length - 1].number + 1;

      await prisma.$transaction(async (tx) => {
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
      .map((c) => ({
        id: c.id,
        number: c.number,
        name: c.name,
        color: c.color,
        totalScore: c.votes.reduce((sum, v) => sum + v.score, 0),
        voteCount: c.votes.length,
        avgScore: c.votes.length > 0 ? c.votes.reduce((sum, v) => sum + v.score, 0) / c.votes.length : 0,
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    res.json(rankings);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

const PORT = process.env["PORT"] || 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
