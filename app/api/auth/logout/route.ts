import { clearSession } from "@/lib/auth";
import { apiSuccess } from "@/lib/api/response";

export async function POST() {
  await clearSession();
  return apiSuccess({ ok: true });
}
