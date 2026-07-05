import "dotenv/config";
import crypto from "node:crypto";
import { Pool } from "pg";

const databaseUrl = process.env["SUPABASE_DATABASE_URL"] ?? process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL environment variable");
}

const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query('DROP TABLE IF EXISTS "Vote";');
    await client.query('DROP TABLE IF EXISTS "JudgeToken";');
    await client.query('DROP TABLE IF EXISTS "Candidate";');
    await client.query('DROP TABLE IF EXISTS "Event";');

    await client.query(`
      CREATE TABLE "Event" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "subtitle" TEXT,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "votingClosed" BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE "Candidate" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "eventId" TEXT NOT NULL,
        "number" INTEGER NOT NULL,
        "name" TEXT NOT NULL,
        "subtitle" TEXT,
        "color" TEXT NOT NULL DEFAULT '#6366f1',
        CONSTRAINT "Candidate_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Candidate_eventId_number_key" UNIQUE ("eventId", "number")
      );
    `);

    await client.query(`
      CREATE TABLE "JudgeToken" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "eventId" TEXT NOT NULL,
        "label" TEXT,
        "tokenHash" TEXT NOT NULL UNIQUE,
        "tokenPreview" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "finalizedAt" TIMESTAMPTZ,
        "usedAt" TIMESTAMPTZ,
        "revokedAt" TIMESTAMPTZ,
        CONSTRAINT "JudgeToken_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await client.query('CREATE INDEX "JudgeToken_eventId_idx" ON "JudgeToken" ("eventId");');

    await client.query(`
      CREATE TABLE "Vote" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "candidateId" TEXT NOT NULL,
        "deviceId" TEXT,
        "judgeTokenId" TEXT,
        "score" INTEGER NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "Vote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Vote_judgeTokenId_fkey" FOREIGN KEY ("judgeTokenId") REFERENCES "JudgeToken" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "Vote_candidateId_deviceId_key" UNIQUE ("candidateId", "deviceId"),
        CONSTRAINT "Vote_candidateId_judgeTokenId_key" UNIQUE ("candidateId", "judgeTokenId")
      );
    `);

    const eventId = crypto.randomUUID();
    const candidates = [
      { number: 1, name: "Luna Nera", subtitle: "Oltre le stelle", color: "#c026d3" },
      { number: 2, name: "Mare di Luci", subtitle: "Onde", color: "#f97316" },
      { number: 3, name: "Eclissi", subtitle: "Nel silenzio", color: "#06b6d4" },
      { number: 4, name: "Vento Caldo", subtitle: "Senza confini", color: "#22c55e" },
      { number: 5, name: "Specchi Rotti", subtitle: "Riflessi", color: "#8b5cf6" },
      { number: 6, name: "Illusione", subtitle: "Fino all'alba", color: "#eab308" },
    ] as const;

    await client.query(
      'INSERT INTO "Event" ("id", "name", "subtitle", "active", "votingClosed") VALUES ($1, $2, $3, TRUE, FALSE)',
      [eventId, "Festival della Canzone 2026", "Vota il tuo artista preferito"]
    );

    for (const candidate of candidates) {
      await client.query(
        'INSERT INTO "Candidate" ("id", "eventId", "number", "name", "subtitle", "color") VALUES ($1, $2, $3, $4, $5, $6)',
        [crypto.randomUUID(), eventId, candidate.number, candidate.name, candidate.subtitle, candidate.color]
      );
    }

    await client.query("COMMIT");

    const eventCount = await client.query('SELECT COUNT(*)::int AS count FROM "Event";');
    const candidateCount = await client.query('SELECT COUNT(*)::int AS count FROM "Candidate";');

    console.log(
      JSON.stringify({
        ok: true,
        eventId,
        events: eventCount.rows[0]?.count ?? 0,
        candidates: candidateCount.rows[0]?.count ?? 0,
      })
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
