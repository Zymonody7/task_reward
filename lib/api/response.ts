import { NextResponse } from "next/server";
import type { ApiResponse } from "@/lib/types";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } as ApiResponse<T>, {
    status,
  });
}

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    } as ApiResponse<never>,
    { status }
  );
}
