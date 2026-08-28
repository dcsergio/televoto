import "dotenv/config";
import crypto from "node:crypto";
import { Pool } from "pg";

const databaseUrl = process.env["SUPABASE_DATABASE_URL"] ?? process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL environment variable");
}

const databaseSchema = process.env["DATABASE_SCHEMA"]?.trim() || "televoto";
const passwordHashIterations = 210000;

function createPasswordRecord(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    passwordHash: crypto.pbkdf2Sync(password, salt, passwordHashIterations, 64, "sha512").toString("hex"),
    passwordSalt: salt,
    passwordIterations: passwordHashIterations,
  };
}

const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DROP SCHEMA IF EXISTS "${databaseSchema}" CASCADE;`);
    await client.query(`CREATE SCHEMA "${databaseSchema}";`);
    await client.query(`SET search_path TO "${databaseSchema}";`);

    await client.query(`CREATE TYPE "${databaseSchema}".voter_type AS ENUM ('QUALIFICATA', 'POPOLARE');`);
    await client.query(`CREATE TYPE "${databaseSchema}".voter_status AS ENUM ('ACTIVE', 'SUBMITTED');`);
    await client.query(`CREATE TYPE "${databaseSchema}".popular_vote_mode AS ENUM ('NUMERIC', 'PREFERENCE');`);

    await client.query(`
      CREATE TABLE "${databaseSchema}".event (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "subtitle" TEXT,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "voting_closed" BOOLEAN NOT NULL DEFAULT FALSE,
        "weight_qualificata" INTEGER NOT NULL DEFAULT 70,
        "weight_popolare" INTEGER NOT NULL DEFAULT 30,
        "enable_trimmed_mean" BOOLEAN NOT NULL DEFAULT FALSE,
        "trimmed_mean_percentage" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
        "popular_vote_mode" "${databaseSchema}".popular_vote_mode NOT NULL DEFAULT 'NUMERIC',
        "max_preferences" INTEGER NOT NULL DEFAULT 1,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "event_weight_sum_100_check" CHECK ("weight_qualificata" + "weight_popolare" = 100),
        CONSTRAINT "event_trimmed_mean_percentage_check" CHECK ("trimmed_mean_percentage" >= 0 AND "trimmed_mean_percentage" < 50)
      );
    `);

    await client.query(`
      CREATE TABLE "${databaseSchema}".root_credential (
        "id" TEXT NOT NULL PRIMARY KEY,
        "password_hash" TEXT NOT NULL,
        "password_salt" TEXT NOT NULL,
        "password_iterations" INTEGER NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE "${databaseSchema}".event_manager_credential (
        "id" TEXT NOT NULL PRIMARY KEY,
        "event_id" TEXT NOT NULL UNIQUE,
        "password_hash" TEXT NOT NULL,
        "password_salt" TEXT NOT NULL,
        "password_iterations" INTEGER NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "event_manager_credential_event_id_fkey"
          FOREIGN KEY ("event_id") REFERENCES "${databaseSchema}".event ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await client.query(
      `CREATE INDEX "event_manager_credential_event_id_idx" ON "${databaseSchema}".event_manager_credential ("event_id");`
    );

    await client.query(`
      CREATE TABLE "${databaseSchema}".candidate_template (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "subtitle" TEXT,
        "color" TEXT NOT NULL DEFAULT '#6366f1'
      );
    `);

    await client.query(`
      CREATE TABLE "${databaseSchema}".candidate (
        "id" TEXT NOT NULL PRIMARY KEY,
        "event_id" TEXT NOT NULL,
        "number" INTEGER NOT NULL,
        "name" TEXT NOT NULL,
        "subtitle" TEXT,
        "color" TEXT NOT NULL DEFAULT '#6366f1',
        "template_id" TEXT,
        CONSTRAINT "candidate_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "${databaseSchema}".event ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "candidate_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "${databaseSchema}".candidate_template ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "candidate_event_id_number_key" UNIQUE ("event_id", "number")
      );
    `);

    await client.query(`
      CREATE TABLE "${databaseSchema}".judge_token (
        "id" TEXT NOT NULL PRIMARY KEY,
        "event_id" TEXT NOT NULL,
        "label" TEXT,
        "type" "${databaseSchema}".voter_type NOT NULL DEFAULT 'QUALIFICATA',
        "status" "${databaseSchema}".voter_status NOT NULL DEFAULT 'ACTIVE',
        "token_hash" TEXT NOT NULL UNIQUE,
        "token_preview" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "finalized_at" TIMESTAMPTZ,
        "used_at" TIMESTAMPTZ,
        "revoked_at" TIMESTAMPTZ,
        CONSTRAINT "judge_token_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "${databaseSchema}".event ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await client.query(`CREATE INDEX "judge_token_event_id_idx" ON "${databaseSchema}".judge_token ("event_id");`);

    await client.query(`
      CREATE TABLE "${databaseSchema}".vote (
        "id" TEXT NOT NULL PRIMARY KEY,
        "candidate_id" TEXT NOT NULL,
        "device_id" TEXT,
        "judge_token_id" TEXT,
        "score" INTEGER,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "vote_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "${databaseSchema}".candidate ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "vote_judge_token_id_fkey" FOREIGN KEY ("judge_token_id") REFERENCES "${databaseSchema}".judge_token ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "vote_candidate_id_device_id_key" UNIQUE ("candidate_id", "device_id"),
        CONSTRAINT "vote_candidate_id_judge_token_id_key" UNIQUE ("candidate_id", "judge_token_id")
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
      INSERT INTO "${databaseSchema}".event (
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
      )
      VALUES ($1, $2, $3, $4, TRUE, FALSE, 70, 30, FALSE, 10.0)
      `,
      [eventId, "00001", "Festival della Canzone 2026", "Vota il tuo artista preferito"]
    );

    await client.query(
      `
      INSERT INTO "${databaseSchema}".root_credential ("id", "password_hash", "password_salt", "password_iterations")
      VALUES ($1, $2, $3, $4)
      `,
      ["root", rootPasswordRecord.passwordHash, rootPasswordRecord.passwordSalt, rootPasswordRecord.passwordIterations]
    );

    await client.query(
      `
      INSERT INTO "${databaseSchema}".event_manager_credential ("id", "event_id", "password_hash", "password_salt", "password_iterations")
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        crypto.randomUUID(),
        eventId,
        managerPasswordRecord.passwordHash,
        managerPasswordRecord.passwordSalt,
        managerPasswordRecord.passwordIterations,
      ]
    );

    for (const candidate of candidates) {
      await client.query(
        `INSERT INTO "${databaseSchema}".candidate ("id", "event_id", "number", "name", "subtitle", "color") VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), eventId, candidate.number, candidate.name, candidate.subtitle, candidate.color]
      );
    }

    await client.query("COMMIT");

    const eventCount = await client.query(`SELECT COUNT(*)::int AS count FROM "${databaseSchema}".event;`);
    const candidateCount = await client.query(`SELECT COUNT(*)::int AS count FROM "${databaseSchema}".candidate;`);
    const rootCredentialCount = await client.query(`SELECT COUNT(*)::int AS count FROM "${databaseSchema}".root_credential;`);

    console.log(
      JSON.stringify({
        ok: true,
        schema: databaseSchema,
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
