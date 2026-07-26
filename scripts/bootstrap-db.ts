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

    await client.query('DROP TYPE IF EXISTS "VoterStatus" CASCADE;');
    await client.query('DROP TYPE IF EXISTS "VoterType" CASCADE;');
    await client.query('DROP TABLE IF EXISTS "Vote" CASCADE;');
    await client.query('DROP TABLE IF EXISTS "JudgeToken" CASCADE;');
    await client.query('DROP TABLE IF EXISTS "Candidate" CASCADE;');
    await client.query('DROP TABLE IF EXISTS "EventManagerCredential" CASCADE;');
    await client.query('DROP TABLE IF EXISTS "CandidateTemplate" CASCADE;');
    await client.query('DROP TABLE IF EXISTS "Event" CASCADE;');
    await client.query('DROP TABLE IF EXISTS "RootCredential" CASCADE;');

    await client.query('CREATE TYPE "VoterType" AS ENUM (\'QUALIFICATA\', \'POPOLARE\');');
    await client.query('CREATE TYPE "VoterStatus" AS ENUM (\'ACTIVE\', \'SUBMITTED\');');

    await client.query(`
      CREATE TABLE "Event" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "subtitle" TEXT,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "votingClosed" BOOLEAN NOT NULL DEFAULT FALSE,
        "weightQualificata" INTEGER NOT NULL DEFAULT 70,
        "weightPopolare" INTEGER NOT NULL DEFAULT 30,
        "enableTrimmedMean" BOOLEAN NOT NULL DEFAULT FALSE,
        "trimmedMeanPercentage" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "Event_weight_sum_100_check" CHECK ("weightQualificata" + "weightPopolare" = 100),
        CONSTRAINT "Event_trimmed_mean_percentage_check" CHECK ("trimmedMeanPercentage" >= 0 AND "trimmedMeanPercentage" < 50)
      );
    `);

    await client.query(`
      CREATE TABLE "RootCredential" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "passwordHash" TEXT NOT NULL,
        "passwordSalt" TEXT NOT NULL,
        "passwordIterations" INTEGER NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE "EventManagerCredential" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "eventId" TEXT NOT NULL UNIQUE,
        "passwordHash" TEXT NOT NULL,
        "passwordSalt" TEXT NOT NULL,
        "passwordIterations" INTEGER NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "EventManagerCredential_eventId_fkey"
          FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await client.query('CREATE INDEX "EventManagerCredential_eventId_idx" ON "EventManagerCredential" ("eventId");');

    await client.query(`
      CREATE TABLE "CandidateTemplate" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "subtitle" TEXT,
        "color" TEXT NOT NULL DEFAULT '#6366f1'
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
        "templateId" TEXT,
        CONSTRAINT "Candidate_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Candidate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CandidateTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "Candidate_eventId_number_key" UNIQUE ("eventId", "number")
      );
    `);

    await client.query(`
      CREATE TABLE "JudgeToken" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "eventId" TEXT NOT NULL,
        "label" TEXT,
        "type" "VoterType" NOT NULL DEFAULT 'QUALIFICATA',
        "status" "VoterStatus" NOT NULL DEFAULT 'ACTIVE',
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
        "score" INTEGER,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "Vote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Vote_judgeTokenId_fkey" FOREIGN KEY ("judgeTokenId") REFERENCES "JudgeToken" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "Vote_candidateId_deviceId_key" UNIQUE ("candidateId", "deviceId"),
        CONSTRAINT "Vote_candidateId_judgeTokenId_key" UNIQUE ("candidateId", "judgeTokenId")
      );
    `);

    const eventId = crypto.randomUUID();
    const rootPassword = process.env["ROOT_ADMIN_PASSWORD"]?.trim() || "ChangeMeRoot2026!";
    const managerPassword = process.env["EVENT_MANAGER_PASSWORD"]?.trim() || "Evento2026!";
    const rootPasswordRecord = createPasswordRecord(rootPassword);
    const managerPasswordRecord = createPasswordRecord(managerPassword);
    const candidates = [
      { number: 1, name: "Luna Nera", subtitle: "Oltre le stelle", color: "#c026d3" },
      { number: 2, name: "Mare di Luci", subtitle: "Onde", color: "#f97316" },
      { number: 3, name: "Eclissi", subtitle: "Nel silenzio", color: "#06b6d4" },
      { number: 4, name: "Vento Caldo", subtitle: "Senza confini", color: "#22c55e" },
      { number: 5, name: "Specchi Rotti", subtitle: "Riflessi", color: "#8b5cf6" },
      { number: 6, name: "Illusione", subtitle: "Fino all'alba", color: "#eab308" },
    ] as const;

    await client.query(
      `
      INSERT INTO "Event" (
        "id",
        "code",
        "name",
        "subtitle",
        "active",
        "votingClosed",
        "weightQualificata",
        "weightPopolare",
        "enableTrimmedMean",
        "trimmedMeanPercentage"
      )
      VALUES ($1, $2, $3, $4, TRUE, FALSE, 70, 30, FALSE, 10.0)
      `,
      [eventId, "00001", "Festival della Canzone 2026", "Vota il tuo artista preferito"]
    );

    await client.query(
      `
      INSERT INTO "RootCredential" ("id", "passwordHash", "passwordSalt", "passwordIterations")
      VALUES ($1, $2, $3, $4)
      `,
      ["root", rootPasswordRecord.passwordHash, rootPasswordRecord.passwordSalt, rootPasswordRecord.passwordIterations]
    );

    await client.query(
      `
      INSERT INTO "EventManagerCredential" ("id", "eventId", "passwordHash", "passwordSalt", "passwordIterations")
      VALUES ($1, $2, $3, $4, $5)
      `,
      [crypto.randomUUID(), eventId, managerPasswordRecord.passwordHash, managerPasswordRecord.passwordSalt, managerPasswordRecord.passwordIterations]
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
    const rootCredentialCount = await client.query('SELECT COUNT(*)::int AS count FROM "RootCredential";');

    console.log(
      JSON.stringify({
        ok: true,
        eventId,
        events: eventCount.rows[0]?.count ?? 0,
        candidates: candidateCount.rows[0]?.count ?? 0,
        rootCredentials: rootCredentialCount.rows[0]?.count ?? 0,
        eventCode: "00001",
      })
    );
    console.log("Bootstrap completato. Password root/evento da variabili ROOT_ADMIN_PASSWORD ed EVENT_MANAGER_PASSWORD.");
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
