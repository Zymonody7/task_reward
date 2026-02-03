import type { ApiResponse, TaskType } from "@/lib/types";

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

async function request<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
  const { body, ...init } = options ?? {};
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    return {
      success: false,
      error: json.error ?? {
        code: "UNKNOWN_ERROR",
        message: res.statusText || "Request failed",
      },
    };
  }
  return json as ApiResponse<T>;
}

const base = "";

export const apiClient = {
  users: {
    list: () =>
      request<{ id: string; name: string; points: number; username: string }[]>(`${base}/api/users`),
    create: (data: { name: string; username: string; password: string }) =>
      request<{ id: string; name: string; points: number; username: string }>(`${base}/api/users`, {
        method: "POST",
        body: data,
      }),
    getDetails: (id: string) =>
      request<{
        user: { id: string; name: string; points: number };
        records: Array<{
          id: string;
          userId: string;
          taskId: string;
          taskTitle: string;
          delta: number;
          createdAt: string;
          note?: string;
        }>;
        completions: Array<{ userId: string; taskId: string; date: string }>;
      }>(`${base}/api/users/${id}`),
  },
  tasks: {
    list: () =>
      request<
        { id: string; title: string; type: TaskType; reward: number; enabled: boolean }[]
      >(`${base}/api/tasks`),
    create: (data: {
      title: string;
      type: TaskType;
      reward: number;
      enabled: boolean;
    }) =>
      request<{
        id: string;
        title: string;
        type: TaskType;
        reward: number;
        enabled: boolean;
      }>(`${base}/api/tasks`, { method: "POST", body: data }),
    update: (id: string, data: { enabled: boolean }) =>
      request<{
        id: string;
        title: string;
        type: TaskType;
        reward: number;
        enabled: boolean;
      }>(`${base}/api/tasks/${id}`, { method: "PATCH", body: data }),
    complete: (
      userId: string,
      taskId: string,
      idempotencyKey?: string
    ) =>
      request<{
        user: { id: string; name: string; points: number };
        record: {
          id: string;
          userId: string;
          taskId: string;
          taskTitle: string;
          delta: number;
          createdAt: string;
          note?: string;
        };
      }>(`${base}/api/tasks/complete`, {
        method: "POST",
        body: { userId, taskId, idempotencyKey },
      }),
  },
};

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function completeTaskWithIdempotency(
  userId: string,
  taskId: string,
  key?: string
) {
  return apiClient.tasks.complete(userId, taskId, key ?? generateUUID());
}
