export enum TaskType {
  ONE_TIME = "ONE_TIME",
  DAILY = "DAILY",
}

export type Role = "admin" | "user";

export interface User {
  id: string;
  name: string;
  points: number;
  username?: string;
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  reward: number;
  enabled: boolean;
}

export interface PointRecord {
  id: string;
  userId: string;
  delta: number;
  taskId: string;
  taskTitle: string;
  createdAt: string;
  note?: string;
}

export interface Completion {
  userId: string;
  taskId: string;
  date: string;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}
