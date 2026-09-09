import { apiHandler } from "@/lib/api";
import { getStore } from "@/lib/store";
import { ApiError } from "@/lib/utils";

export const runtime = "nodejs";

/** تفاصيل محاولة طالب مع إجاباته (للمعلم) */
export const GET = apiHandler(async (_req, { params, teacher }) => {
  const store = getStore();
  const attempt = await store.getAttempt(params.id);
  if (!attempt) throw new ApiError(404, "المحاولة غير موجودة");
  const exam = await store.getExam(attempt.examId);
  if (!exam || exam.teacherId !== teacher.id) {
    throw new ApiError(403, "ليس لديك صلاحية");
  }
  const answers = await store.listAnswers(attempt.id);
  return { attempt: { ...attempt, answers } };
});
