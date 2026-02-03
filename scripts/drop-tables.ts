/**
 * Drop all tables so db:push can recreate with UUID primary keys.
 * Run: npm run db:drop
 * Then: npm run db:push && npm run db:seed
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const drops = [
  "DROP TABLE IF EXISTS idempotency_keys CASCADE",
  "DROP TABLE IF EXISTS completions CASCADE",
  "DROP TABLE IF EXISTS point_records CASCADE",
  "DROP TABLE IF EXISTS tasks CASCADE",
  "DROP TABLE IF EXISTS users CASCADE",
];

async function run() {
  for (const q of drops) {
    await sql(q);
    console.log(q);
  }
  console.log("Done. Run: npm run db:push && npm run db:seed");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
