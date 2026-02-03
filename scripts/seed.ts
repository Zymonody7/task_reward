/**
 * Seed DB: create users with login and default tasks (everyone must log in).
 * Config from .env / .env.local.
 * Run: npm run db:seed
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 6) {
  console.error("ADMIN_PASSWORD must be set in .env.local and at least 6 characters");
  process.exit(1);
}
const adminPassword: string = ADMIN_PASSWORD;

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

const DEMO_PASS = process.env.DEMO_USER_PASSWORD ?? "user123";

async function seed() {
  const existingAdmin = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, ADMIN_USERNAME));
  if (existingAdmin.length > 0) {
    console.log("Admin user already exists, skipping.");
  } else {
    const hash = await bcrypt.hash(adminPassword, 10);
    await db.insert(schema.users).values({
      name: "Admin",
      username: ADMIN_USERNAME,
      passwordHash: hash,
      role: "admin",
      points: 0,
    });
    console.log("Created admin:", ADMIN_USERNAME);
  }

  const toCreate = [
    { name: "Alice", username: "alice", password: DEMO_PASS, role: "user" as const },
    { name: "Bob", username: "bob", password: DEMO_PASS, role: "user" as const },
  ];
  for (const u of toCreate) {
    const existing = await db.select().from(schema.users).where(eq(schema.users.username, u.username));
    if (existing.length > 0) continue;
    const hash = await bcrypt.hash(u.password, 10);
    await db.insert(schema.users).values({
      name: u.name,
      username: u.username,
      passwordHash: hash,
      role: u.role,
      points: 0,
    });
    console.log("Created user:", u.username, "(password:", u.password + ")");
  }

  const existingTasks = await db.select().from(schema.tasks);
  if (existingTasks.length > 0) {
    console.log("Tasks already exist, skipping.");
  } else {
    const defaultTasks = [
      { title: "Welcome Bonus", type: "ONE_TIME", reward: 50, enabled: true },
      { title: "Daily Login", type: "DAILY", reward: 10, enabled: true },
      { title: "Legacy Task", type: "ONE_TIME", reward: 100, enabled: false },
    ];
    for (const t of defaultTasks) {
      await db.insert(schema.tasks).values(t);
    }
    console.log("Created default tasks:", defaultTasks.length);
  }

  console.log("Seed completed.");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
