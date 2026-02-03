import { getSession } from "@/lib/auth";
import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return apiSuccess(null);
  }
  return apiSuccess({
    userId: session.userId,
    username: session.username,
    role: session.role,
  });
}
