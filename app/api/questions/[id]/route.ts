import { apiHandler } from "@/lib/api";
import { questionEditSchema } from "@/lib/api-schemas";
import {
  deleteQuestion,
  updateQuestion,
} from "@/lib/services/question-service";

export const runtime = "nodejs";

/** تعديل سؤال (نص/اختيارات/إجابة/درجة/حل) */
export const PATCH = apiHandler(async (req, { params, teacher }) => {
  const body = await req.json().catch(() => null);
  const parsed = questionEditSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }
  const question = await updateQuestion(teacher.id, params.id, {
    question: parsed.data.question,
    data: parsed.data.data,
    correctAnswer: parsed.data.correctAnswer,
    solution: parsed.data.solution ?? undefined,
    points: parsed.data.points,
  });
  return { question };
});

/** حذف سؤال */
export const DELETE = apiHandler(async (_req, { params, teacher }) => {
  await deleteQuestion(teacher.id, params.id);
  return { ok: true };
});
