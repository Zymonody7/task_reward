import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { setSessionCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!username || !password) {
      return apiError("VALIDATION_ERROR", "Username and password are required", 400);
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));

    if (!user || !user.passwordHash) {
      return apiError("UNAUTHORIZED", "Invalid username or password", 401);
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return apiError("UNAUTHORIZED", "Invalid username or password", 401);
    }

    await setSessionCookie({
      userId: String(user.id),
      username: user.username,
      role: user.role as "admin" | "user",
    });

    return apiSuccess({
      username: user.username,
      role: user.role,
    });
  } catch (e) {
    console.error("POST /api/auth/login", e);
    return apiError("UNKNOWN_ERROR", "Login failed", 500);
  }
}
