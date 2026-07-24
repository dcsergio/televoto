-- Televoto: allinea schema DB (Postgres/Supabase) + pulizia dati
-- Esegui questo script nello SQL Editor di Supabase.

BEGIN;

-- 1) Tabelle principali (create se mancanti)
CREATE TABLE IF NOT EXISTS "Event" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "subtitle" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "votingClosed" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "CandidateTemplate" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "subtitle" TEXT,
  "color" TEXT NOT NULL DEFAULT '#6366f1'
);

CREATE TABLE IF NOT EXISTS "Candidate" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "subtitle" TEXT,
  "color" TEXT NOT NULL DEFAULT '#6366f1',
  "templateId" TEXT
);

CREATE TABLE IF NOT EXISTS "JudgeToken" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "label" TEXT,
  "tokenHash" TEXT NOT NULL,
  "tokenPreview" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "finalizedAt" TIMESTAMPTZ,
  "usedAt" TIMESTAMPTZ,
  "revokedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "Vote" (
  "id" TEXT PRIMARY KEY,
  "candidateId" TEXT NOT NULL,
  "deviceId" TEXT,
  "judgeTokenId" TEXT,
  "score" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Allineamento colonne (per DB esistenti non aggiornati)
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "subtitle" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "votingClosed" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "subtitle" TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "color" TEXT NOT NULL DEFAULT '#6366f1';
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "templateId" TEXT;

ALTER TABLE "JudgeToken" ADD COLUMN IF NOT EXISTS "label" TEXT;
ALTER TABLE "JudgeToken" ADD COLUMN IF NOT EXISTS "tokenHash" TEXT;
ALTER TABLE "JudgeToken" ADD COLUMN IF NOT EXISTS "tokenPreview" TEXT;
ALTER TABLE "JudgeToken" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "JudgeToken" ADD COLUMN IF NOT EXISTS "finalizedAt" TIMESTAMPTZ;
ALTER TABLE "JudgeToken" ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMPTZ;
ALTER TABLE "JudgeToken" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMPTZ;

ALTER TABLE "Vote" ADD COLUMN IF NOT EXISTS "deviceId" TEXT;
ALTER TABLE "Vote" ADD COLUMN IF NOT EXISTS "judgeTokenId" TEXT;
ALTER TABLE "Vote" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3) Pulizia dati completa (struttura preservata)
TRUNCATE TABLE
  "Vote",
  "JudgeToken",
  "Candidate",
  "CandidateTemplate",
  "Event"
RESTART IDENTITY CASCADE;

-- Dopo la pulizia possiamo riallineare i NOT NULL senza conflitti sui dati legacy
ALTER TABLE "Event" ALTER COLUMN "code" SET NOT NULL;

ALTER TABLE "Candidate" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "Candidate" ALTER COLUMN "number" SET NOT NULL;
ALTER TABLE "Candidate" ALTER COLUMN "name" SET NOT NULL;

ALTER TABLE "JudgeToken" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "JudgeToken" ALTER COLUMN "tokenHash" SET NOT NULL;
ALTER TABLE "JudgeToken" ALTER COLUMN "tokenPreview" SET NOT NULL;

ALTER TABLE "Vote" ALTER COLUMN "candidateId" SET NOT NULL;
ALTER TABLE "Vote" ALTER COLUMN "score" SET NOT NULL;

-- 4) Vincoli e indici
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Event_code_key'
  ) THEN
    BEGIN
      ALTER TABLE "Event" ADD CONSTRAINT "Event_code_key" UNIQUE ("code");
    EXCEPTION
      WHEN duplicate_object OR duplicate_table THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Candidate_eventId_number_key'
  ) THEN
    BEGIN
      ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_eventId_number_key" UNIQUE ("eventId", "number");
    EXCEPTION
      WHEN duplicate_object OR duplicate_table THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'JudgeToken_tokenHash_key'
  ) THEN
    BEGIN
      ALTER TABLE "JudgeToken" ADD CONSTRAINT "JudgeToken_tokenHash_key" UNIQUE ("tokenHash");
    EXCEPTION
      WHEN duplicate_object OR duplicate_table THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Vote_candidateId_deviceId_key'
  ) THEN
    BEGIN
      ALTER TABLE "Vote" ADD CONSTRAINT "Vote_candidateId_deviceId_key" UNIQUE ("candidateId", "deviceId");
    EXCEPTION
      WHEN duplicate_object OR duplicate_table THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Vote_candidateId_judgeTokenId_key'
  ) THEN
    BEGIN
      ALTER TABLE "Vote" ADD CONSTRAINT "Vote_candidateId_judgeTokenId_key" UNIQUE ("candidateId", "judgeTokenId");
    EXCEPTION
      WHEN duplicate_object OR duplicate_table THEN NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "JudgeToken_eventId_idx" ON "JudgeToken" ("eventId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Candidate_eventId_fkey'
  ) THEN
    ALTER TABLE "Candidate"
      ADD CONSTRAINT "Candidate_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "Event"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Candidate_templateId_fkey'
  ) THEN
    ALTER TABLE "Candidate"
      ADD CONSTRAINT "Candidate_templateId_fkey"
      FOREIGN KEY ("templateId") REFERENCES "CandidateTemplate"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'JudgeToken_eventId_fkey'
  ) THEN
    ALTER TABLE "JudgeToken"
      ADD CONSTRAINT "JudgeToken_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "Event"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Vote_candidateId_fkey'
  ) THEN
    ALTER TABLE "Vote"
      ADD CONSTRAINT "Vote_candidateId_fkey"
      FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Vote_judgeTokenId_fkey'
  ) THEN
    ALTER TABLE "Vote"
      ADD CONSTRAINT "Vote_judgeTokenId_fkey"
      FOREIGN KEY ("judgeTokenId") REFERENCES "JudgeToken"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
