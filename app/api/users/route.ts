import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("UNAUTHORIZED", "Login required", 401);
    }
    if (session.role !== "admin") {
      return apiError("FORBIDDEN", "Only admin can list users", 403);
    }
    const rows = await db.select().from(users);
    const list = rows.map((r) => ({
      id: String(r.id),
      name: r.name,
      points: r.points,
      username: r.username,
    }));
    return apiSuccess(list);
  } catch (e) {
    console.error("GET /api/users", e);
    return apiError("UNKNOWN_ERROR", "Failed to fetch users", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("UNAUTHORIZED", "Login required", 401);
    }
    if (session.role !== "admin") {
      return apiError("FORBIDDEN", "Only admin can create users", 403);
    }
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!name || !username || !password) {
      return apiError("VALIDATION_ERROR", "Name, username and password are required", 400);
    }
    if (password.length < 6) {
      return apiError("VALIDATION_ERROR", "Password must be at least 6 characters", 400);
    }
    const [existing] = await db.select().from(users).where(eq(users.username, username));
    if (existing) {
      return apiError("VALIDATION_ERROR", "Username already exists", 400);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [inserted] = await db
      .insert(users)
      .values({ name, username, passwordHash, role: "user", points: 0 })
      .returning({ id: users.id, name: users.name, points: users.points, username: users.username });
    if (!inserted) {
      return apiError("UNKNOWN_ERROR", "Failed to create user", 500);
    }
    return apiSuccess(
      { id: String(inserted.id), name: inserted.name, points: inserted.points, username: inserted.username },
      201
    );
  } catch (e) {
    console.error("POST /api/users", e);
    return apiError("UNKNOWN_ERROR", "Failed to create user", 500);
  }
}
