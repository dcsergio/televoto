import "dotenv/config";

const databaseUrl = process.env["DATABASE_URL"] ?? process.env["SUPABASE_DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL environment variable");
}

const adminAuthSecret = process.env["ADMIN_AUTH_SECRET"];
if (!adminAuthSecret) {
  throw new Error("Missing ADMIN_AUTH_SECRET environment variable");
}

export const env = {
  databaseUrl,
  databaseSchema: process.env["DATABASE_SCHEMA"]?.trim() || "televoto",
  adminAuthSecret,
  rootAdminPassword: process.env["ROOT_ADMIN_PASSWORD"],
  port: process.env["PORT"] || 3001,
  nodeEnv: process.env["NODE_ENV"],
  serveClient: process.env["SERVE_CLIENT"] === "true",
};
