import { apiHandler } from "@/lib/api";
import { regenerateQuestion } from "@/lib/services/question-service";

export const runtime = "nodejs";

/** إعادة توليد سؤال بديل بنفس المفهوم */
export const POST = apiHandler(async (_req, { params, teacher }) => {
  const question = await regenerateQuestion(teacher.id, params.id);
  return { question };
});
