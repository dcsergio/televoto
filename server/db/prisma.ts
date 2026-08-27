import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { env } from "../config/env.js";

const pool = new Pool({ connectionString: env.databaseUrl });
const adapter = new PrismaPg(pool, { schema: env.databaseSchema });

export const prisma = new PrismaClient({ adapter });
