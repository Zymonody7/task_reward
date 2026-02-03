import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { apiSuccess, apiError } from "@/lib/api/response";
import { TaskType } from "@/lib/types";

export async function GET() {
  try {
    const rows = await db.select().from(tasks);
    const list = rows.map((r) => ({
      id: String(r.id),
      title: r.title,
      type: r.type as TaskType,
      reward: r.reward,
      enabled: r.enabled,
    }));
    return apiSuccess(list);
  } catch (e) {
    console.error("GET /api/tasks", e);
    return apiError("UNKNOWN_ERROR", "Failed to fetch tasks", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title =
      typeof body?.title === "string" ? body.title.trim() : "";
    const type =
      body?.type === "DAILY" || body?.type === "ONE_TIME"
        ? body.type
        : TaskType.ONE_TIME;
    const reward = typeof body?.reward === "number" ? body.reward : Number(body?.reward) || 10;
    const enabled = body?.enabled !== false;

    if (!title) {
      return apiError("VALIDATION_ERROR", "Task title is required", 400);
    }
    if (reward <= 0) {
      return apiError("VALIDATION_ERROR", "Reward must be positive", 400);
    }

    const [inserted] = await db
      .insert(tasks)
      .values({ title, type, reward, enabled })
      .returning({
        id: tasks.id,
        title: tasks.title,
        type: tasks.type,
        reward: tasks.reward,
        enabled: tasks.enabled,
      });
    if (!inserted) {
      return apiError("UNKNOWN_ERROR", "Failed to create task", 500);
    }
    return apiSuccess(
      {
        id: String(inserted.id),
        title: inserted.title,
        type: inserted.type as TaskType,
        reward: inserted.reward,
        enabled: inserted.enabled,
      },
      201
    );
  } catch (e) {
    console.error("POST /api/tasks", e);
    return apiError("UNKNOWN_ERROR", "Failed to create task", 500);
  }
}
