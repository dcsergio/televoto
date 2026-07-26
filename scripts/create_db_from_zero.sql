-- Televoto - bootstrap completo DB PostgreSQL (DROP + CREATE)
-- ATTENZIONE: questo script elimina completamente tutte le tabelle applicative.

BEGIN;

DROP TYPE IF EXISTS "VoterStatus" CASCADE;
DROP TYPE IF EXISTS "VoterType" CASCADE;
DROP TABLE IF EXISTS "Vote" CASCADE;
DROP TABLE IF EXISTS "JudgeToken" CASCADE;
DROP TABLE IF EXISTS "Candidate" CASCADE;
DROP TABLE IF EXISTS "EventManagerCredential" CASCADE;
DROP TABLE IF EXISTS "CandidateTemplate" CASCADE;
DROP TABLE IF EXISTS "Event" CASCADE;
DROP TABLE IF EXISTS "RootCredential" CASCADE;

CREATE TYPE "VoterType" AS ENUM ('QUALIFICATA', 'POPOLARE');
CREATE TYPE "VoterStatus" AS ENUM ('ACTIVE', 'SUBMITTED');

CREATE TABLE "Event" (
  "id" TEXT PRIMARY KEY,
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

CREATE TABLE "RootCredential" (
  "id" TEXT PRIMARY KEY,
  "passwordHash" TEXT NOT NULL,
  "passwordSalt" TEXT NOT NULL,
  "passwordIterations" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "EventManagerCredential" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "passwordSalt" TEXT NOT NULL,
  "passwordIterations" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "EventManagerCredential_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "EventManagerCredential_eventId_idx" ON "EventManagerCredential" ("eventId");

CREATE TABLE "CandidateTemplate" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "subtitle" TEXT,
  "color" TEXT NOT NULL DEFAULT '#6366f1'
);

CREATE TABLE "Candidate" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "subtitle" TEXT,
  "color" TEXT NOT NULL DEFAULT '#6366f1',
  "templateId" TEXT,
  CONSTRAINT "Candidate_eventId_number_key" UNIQUE ("eventId", "number"),
  CONSTRAINT "Candidate_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Candidate_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "CandidateTemplate"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "JudgeToken" (
  "id" TEXT PRIMARY KEY,
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
  CONSTRAINT "JudgeToken_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "JudgeToken_eventId_idx" ON "JudgeToken" ("eventId");

CREATE TABLE "Vote" (
  "id" TEXT PRIMARY KEY,
  "candidateId" TEXT NOT NULL,
  "deviceId" TEXT,
  "judgeTokenId" TEXT,
  "score" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Vote_candidateId_deviceId_key" UNIQUE ("candidateId", "deviceId"),
  CONSTRAINT "Vote_candidateId_judgeTokenId_key" UNIQUE ("candidateId", "judgeTokenId"),
  CONSTRAINT "Vote_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Vote_judgeTokenId_fkey"
    FOREIGN KEY ("judgeTokenId") REFERENCES "JudgeToken"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- Root bootstrap:
-- password di default: ChangeMeRoot2026!
-- Cambiarla subito via API /api/auth/root/password.
-- Manager demo evento:
-- password di default: Evento2026!
INSERT INTO "RootCredential" (
  "id",
  "passwordHash",
  "passwordSalt",
  "passwordIterations"
) VALUES (
  'root',
  'b0c5f197cb0008f6d2745f98dab1ddcf7ebc6498ecf94117b2a72512414da75ad6d4b6fe61304681f021e1c39e73c73742718f49d7074d2491751b42befda9ea',
  '8f6e5ab8c1974d9c8d21321153857624',
  210000
);

WITH seeded_event AS (
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
  ) VALUES (
    'ev_demo_2026',
    '00001',
    'Festival della Canzone 2026',
    'Vota il tuo artista preferito',
    TRUE,
    TRUE,
    70,
    30,
    FALSE,
    10.0
  )
  RETURNING "id"
)
INSERT INTO "EventManagerCredential" (
  "id",
  "eventId",
  "passwordHash",
  "passwordSalt",
  "passwordIterations"
)
SELECT
  'mgr_demo_2026',
  seeded_event."id",
  '664840f0ccb4cd4d00d532cb354d9aeaed828be0f4a2f9290e4169dd058254a851d3f62817a3e2257ac13ab759b1e7009dde59273ba8e2b58f24d8b2a40b7467',
  '43f325a271782253cbf4e1544c7031e3',
  210000
FROM seeded_event;

COMMIT;
