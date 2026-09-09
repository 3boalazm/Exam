import { apiHandler } from "@/lib/api";
import { getExamResults } from "@/lib/services/result-service";

export const runtime = "nodejs";

/** نتائج امتحان مع إجابات الطلاب (للمعلم فقط) */
export const GET = apiHandler(async (_req, { params, teacher }) => {
  return getExamResults(teacher.id, params.id);
});
