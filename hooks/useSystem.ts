"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api/client";
import type { User, Task, PointRecord, Completion } from "@/lib/types";

const usersFetcher = async () => {
  const res = await apiClient.users.list();
  if (!res.success) throw res.error;
  return res.data ?? [];
};

const tasksFetcher = async () => {
  const res = await apiClient.tasks.list();
  if (!res.success) throw res.error;
  return res.data ?? [];
};

export const useUsers = (enable = true) => {
  const { data, error, isLoading, mutate } = useSWR<User[]>(
    enable ? "users" : null,
    usersFetcher
  );
  return { users: data ?? [], isLoading, isError: error, mutate };
};

export const useTasks = () => {
  const { data, error, isLoading, mutate } = useSWR<Task[]>("tasks", tasksFetcher);
  return { tasks: data ?? [], isLoading, isError: error, mutate };
};

export const useUserDetails = (userId: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `user-details-${userId}` : null,
    async () => {
      if (!userId) return null;
      const res = await apiClient.users.getDetails(userId);
      if (!res.success) throw res.error;
      return res.data;
    }
  );

  return {
    user: data?.user,
    history: (data?.records ?? []) as PointRecord[],
    completions: (data?.completions ?? []) as Completion[],
    isLoading,
    isError: error,
    mutate,
  };
};
