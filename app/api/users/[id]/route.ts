import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, pointRecords, completions } from "@/lib/db/schema";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getSession } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;
  try {
    const session = await getSession();
    if (!session) {
      return apiError("UNAUTHORIZED", "Login required", 401);
    }
    // Regular users can only view themselves; admin can view any user
    if (session.role !== "admin" && session.userId !== userId) {
      return apiError("FORBIDDEN", "You can only view your own details", 403);
    }
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return apiError("NOT_FOUND", "User not found", 404);
    }
    const records = await db
      .select()
      .from(pointRecords)
      .where(eq(pointRecords.userId, userId))
      .orderBy(desc(pointRecords.createdAt));
    const userCompletions = await db
      .select()
      .from(completions)
      .where(eq(completions.userId, userId));
    return apiSuccess({
      user: { id: String(user.id), name: user.name, points: user.points },
      records: records.map((r) => ({
        id: String(r.id),
        userId: String(r.userId),
        taskId: String(r.taskId),
        taskTitle: r.taskTitle,
        delta: r.delta,
        createdAt: r.createdAt!.toISOString(),
        note: r.note ?? undefined,
      })),
      completions: userCompletions.map((c) => ({
        userId: String(c.userId),
        taskId: String(c.taskId),
        date: c.date,
      })),
    });
  } catch (e) {
    console.error("GET /api/users/[id]", e);
    return apiError("UNKNOWN_ERROR", "Failed to fetch user details", 500);
  }
}
