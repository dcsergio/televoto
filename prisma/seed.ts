import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import crypto from "node:crypto";

const databaseUrl = process.env["DATABASE_URL"] ?? process.env["SUPABASE_DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL environment variable");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const passwordHashIterations = 210000;

function createPasswordRecord(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    passwordHash: crypto.pbkdf2Sync(password, salt, passwordHashIterations, 64, "sha512").toString("hex"),
    passwordSalt: salt,
    passwordIterations: passwordHashIterations,
  };
}

async function main() {
  // Clear existing data
  await prisma.vote.deleteMany();
  await prisma.judgeToken.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.eventManagerCredential.deleteMany();
  await prisma.event.deleteMany();
  await prisma.rootCredential.deleteMany();

  const rootPassword = process.env["ROOT_ADMIN_PASSWORD"]?.trim() || "ChangeMeRoot2026!";
  await prisma.rootCredential.create({
    data: {
      id: "root",
      ...createPasswordRecord(rootPassword),
    },
  });

  const event = await prisma.event.create({
    data: {
      code: "00001",
      name: "Festival della Canzone 2026",
      subtitle: "Vota il tuo artista preferito",
      active: true,
      votingClosed: true,
      managerCredential: {
        create: createPasswordRecord("Evento2026!"),
      },
      candidates: {
        create: [
          { number: 1, name: "Luna Nera", subtitle: "Oltre le stelle", color: "#c026d3" },
          { number: 2, name: "Mare di Luci", subtitle: "Onde", color: "#f97316" },
          { number: 3, name: "Eclissi", subtitle: "Nel silenzio", color: "#06b6d4" },
          { number: 4, name: "Vento Caldo", subtitle: "Senza confini", color: "#22c55e" },
          { number: 5, name: "Specchi Rotti", subtitle: "Riflessi", color: "#8b5cf6" },
          { number: 6, name: "Illusione", subtitle: "Fino all'alba", color: "#eab308" },
        ],
      },
    },
  });

  console.log(`Seeded event: ${event.name} (${event.id})`);
  console.log("Root password seed: usa ROOT_ADMIN_PASSWORD oppure default ChangeMeRoot2026!");
  console.log("Password manager evento demo: Evento2026!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
