import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { TaskType } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("UNAUTHORIZED", "Login required", 401);
    }
    if (session.role !== "admin") {
      return apiError("FORBIDDEN", "Only admin can update tasks", 403);
    }

    const { id: taskId } = await params;
    const body = await req.json();
    const enabled =
      typeof body?.enabled === "boolean" ? body.enabled : undefined;

    if (enabled === undefined) {
      return apiError("VALIDATION_ERROR", "enabled (boolean) is required", 400);
    }

    const [updated] = await db
      .update(tasks)
      .set({ enabled })
      .where(eq(tasks.id, taskId))
      .returning({
        id: tasks.id,
        title: tasks.title,
        type: tasks.type,
        reward: tasks.reward,
        enabled: tasks.enabled,
      });

    if (!updated) {
      return apiError("NOT_FOUND", "Task not found", 404);
    }

    return apiSuccess({
      id: String(updated.id),
      title: updated.title,
      type: updated.type as TaskType,
      reward: updated.reward,
      enabled: updated.enabled,
    });
  } catch (e) {
    console.error("PATCH /api/tasks/[id]", e);
    return apiError("UNKNOWN_ERROR", "Failed to update task", 500);
  }
}
