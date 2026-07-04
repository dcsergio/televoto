import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "..", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing data
  await prisma.vote.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.event.deleteMany();

  const event = await prisma.event.create({
    data: {
      name: "Festival della Canzone 2026",
      subtitle: "Vota il tuo artista preferito",
      active: true,
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
