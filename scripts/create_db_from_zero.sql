-- Televoto - bootstrap completo DB PostgreSQL (DROP + CREATE) nello schema "televoto"
-- ATTENZIONE: questo script elimina completamente lo schema applicativo "televoto".

BEGIN;

DROP SCHEMA IF EXISTS televoto CASCADE;
CREATE SCHEMA televoto;

CREATE TYPE televoto.voter_type AS ENUM ('QUALIFICATA', 'POPOLARE');
CREATE TYPE televoto.voter_status AS ENUM ('ACTIVE', 'SUBMITTED');
CREATE TYPE televoto.popular_vote_mode AS ENUM ('NUMERIC', 'PREFERENCE');

CREATE TABLE televoto.event (
  "id"                      TEXT PRIMARY KEY,
  "code"                    TEXT NOT NULL UNIQUE,
  "name"                    TEXT NOT NULL,
  "subtitle"                TEXT,
  "active"                  BOOLEAN NOT NULL DEFAULT TRUE,
  "voting_closed"           BOOLEAN NOT NULL DEFAULT FALSE,
  "weight_qualificata"      INTEGER NOT NULL DEFAULT 70,
  "weight_popolare"         INTEGER NOT NULL DEFAULT 30,
  "enable_trimmed_mean"     BOOLEAN NOT NULL DEFAULT FALSE,
  "trimmed_mean_percentage" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
  "popular_vote_mode"       televoto.popular_vote_mode NOT NULL DEFAULT 'NUMERIC',
  "max_preferences"         INTEGER NOT NULL DEFAULT 1,
  "created_at"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "event_weight_sum_100_check" CHECK ("weight_qualificata" + "weight_popolare" = 100),
  CONSTRAINT "event_trimmed_mean_percentage_check" CHECK ("trimmed_mean_percentage" >= 0 AND "trimmed_mean_percentage" < 50)
);

CREATE TABLE televoto.root_credential (
  "id"                  TEXT PRIMARY KEY,
  "password_hash"       TEXT NOT NULL,
  "password_salt"       TEXT NOT NULL,
  "password_iterations" INTEGER NOT NULL,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE televoto.event_manager_credential (
  "id"                  TEXT PRIMARY KEY,
  "event_id"            TEXT NOT NULL UNIQUE,
  "password_hash"       TEXT NOT NULL,
  "password_salt"       TEXT NOT NULL,
  "password_iterations" INTEGER NOT NULL,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "event_manager_credential_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES televoto.event ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "event_manager_credential_event_id_idx"
  ON televoto.event_manager_credential ("event_id");

CREATE TABLE televoto.candidate_template (
  "id"       TEXT PRIMARY KEY,
  "name"     TEXT NOT NULL,
  "subtitle" TEXT,
  "color"    TEXT NOT NULL DEFAULT '#6366f1'
);

CREATE TABLE televoto.candidate (
  "id"          TEXT PRIMARY KEY,
  "event_id"    TEXT NOT NULL,
  "number"      INTEGER NOT NULL,
  "name"        TEXT NOT NULL,
  "subtitle"    TEXT,
  "color"       TEXT NOT NULL DEFAULT '#6366f1',
  "template_id" TEXT,
  CONSTRAINT "candidate_event_id_number_key" UNIQUE ("event_id", "number"),
  CONSTRAINT "candidate_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES televoto.event ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "candidate_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES televoto.candidate_template ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE televoto.judge_token (
  "id"            TEXT PRIMARY KEY,
  "event_id"      TEXT NOT NULL,
  "label"         TEXT,
  "type"          televoto.voter_type NOT NULL DEFAULT 'QUALIFICATA',
  "status"        televoto.voter_status NOT NULL DEFAULT 'ACTIVE',
  "token_hash"    TEXT NOT NULL UNIQUE,
  "token_preview" TEXT NOT NULL,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "finalized_at"  TIMESTAMPTZ,
  "used_at"       TIMESTAMPTZ,
  "revoked_at"    TIMESTAMPTZ,
  CONSTRAINT "judge_token_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES televoto.event ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "judge_token_event_id_idx" ON televoto.judge_token ("event_id");

CREATE TABLE televoto.vote (
  "id"             TEXT PRIMARY KEY,
  "candidate_id"   TEXT NOT NULL,
  "device_id"      TEXT,
  "judge_token_id" TEXT,
  "score"          INTEGER,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "vote_candidate_id_device_id_key" UNIQUE ("candidate_id", "device_id"),
  CONSTRAINT "vote_candidate_id_judge_token_id_key" UNIQUE ("candidate_id", "judge_token_id"),
  CONSTRAINT "vote_candidate_id_fkey"
    FOREIGN KEY ("candidate_id") REFERENCES televoto.candidate ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "vote_judge_token_id_fkey"
    FOREIGN KEY ("judge_token_id") REFERENCES televoto.judge_token ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- Root bootstrap:
-- password di default: ChangeMeRoot2026!
-- Cambiarla subito via API /api/auth/root/password.
-- Manager demo evento:
-- password di default: Evento2026!
INSERT INTO televoto.root_credential (
  "id",
  "password_hash",
  "password_salt",
  "password_iterations"
) VALUES (
  'root',
  'b0c5f197cb0008f6d2745f98dab1ddcf7ebc6498ecf94117b2a72512414da75ad6d4b6fe61304681f021e1c39e73c73742718f49d7074d2491751b42befda9ea',
  '8f6e5ab8c1974d9c8d21321153857624',
  210000
);

WITH seeded_event AS (
  INSERT INTO televoto.event (
    "id",
    "code",
    "name",
    "subtitle",
    "active",
    "voting_closed",
    "weight_qualificata",
    "weight_popolare",
    "enable_trimmed_mean",
    "trimmed_mean_percentage"
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
INSERT INTO televoto.event_manager_credential (
  "id",
  "event_id",
  "password_hash",
  "password_salt",
  "password_iterations"
)
SELECT
  'mgr_demo_2026',
  seeded_event."id",
  '664840f0ccb4cd4d00d532cb354d9aeaed828be0f4a2f9290e4169dd058254a851d3f62817a3e2257ac13ab759b1e7009dde59273ba8e2b58f24d8b2a40b7467',
  '43f325a271782253cbf4e1544c7031e3',
  210000
FROM seeded_event;

COMMIT;
