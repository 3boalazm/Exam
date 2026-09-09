import { apiHandler } from "@/lib/api";
import { getDashboard } from "@/lib/services/result-service";

export const runtime = "nodejs";

/** بيانات لوحة تحكم المعلم */
export const GET = apiHandler(async (_req, { teacher }) => {
  return getDashboard(teacher.id);
});
