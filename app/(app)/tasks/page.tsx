"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { TaskType, type Task } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
} from "@/components/ui";
import { RequireAdmin } from "@/components/RequireAdmin";

export default function TasksPage() {
  return (
    <RequireAdmin>
      <TasksPageContent />
    </RequireAdmin>
  );
}

function TasksPageContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [reward, setReward] = useState("10");
  const [type, setType] = useState<TaskType>(TaskType.ONE_TIME);
  const [enabled, setEnabled] = useState(true);

  const fetchTasks = async () => {
    const res = await apiClient.tasks.list();
    if (res.success && res.data) {
      setTasks(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await apiClient.tasks.create({
      title,
      type,
      reward: parseInt(reward, 10),
      enabled,
    });

    if (res.success) {
      setTitle("");
      setReward("10");
      fetchTasks();
    } else {
      alert(res.error?.message ?? "Failed");
    }
    setCreating(false);
  };

  const handleToggleEnabled = async (task: Task) => {
    setTogglingId(task.id);
    const res = await apiClient.tasks.update(task.id, {
      enabled: !task.enabled,
    });
    setTogglingId(null);
    if (res.success) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, enabled: res.data!.enabled } : t
        )
      );
    } else {
      alert(res.error?.message ?? "Failed to update task");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Tasks
      </h1>

      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Task</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Task Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Daily Check-in"
                    className="mt-1"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Reward (Pts)</label>
                    <Input
                      type="number"
                      min={1}
                      value={reward}
                      onChange={(e) => setReward(e.target.value)}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-primary focus:outline-none"
                      value={type}
                      onChange={(e) =>
                        setType(e.target.value as TaskType)
                      }
                    >
                      <option value="ONE_TIME">One Time</option>
                      <option value="DAILY">Daily</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="enabled" className="text-sm font-medium">
                    Enabled immediately (new task goes live right away; unchecked = disabled)
                  </label>
                </div>

                <Button type="submit" isLoading={creating} className="w-full">
                  Create Task
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>Task Library</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-slate-500">Loading tasks...</div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        task.enabled
                          ? "bg-white border-slate-200"
                          : "bg-slate-50 border-slate-100 opacity-70"
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-900">
                            {task.title}
                          </span>
                          {!task.enabled && (
                            <Badge variant="warning">Disabled</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge
                            variant={
                              task.type === "DAILY" ? "success" : "default"
                            }
                          >
                            {task.type === "DAILY"
                              ? "Daily"
                              : "One-Time"}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            ID: {task.id}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="block text-lg font-bold text-indigo-600">
                            +{task.reward}
                          </span>
                          <span className="text-xs text-slate-500">points</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={task.enabled}
                            disabled={togglingId === task.id}
                            onChange={() => handleToggleEnabled(task)}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-slate-600">
                            {task.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-slate-500">No tasks created yet.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

