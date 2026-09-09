import { apiHandler } from "@/lib/api";
import { questionPayloadSchema } from "@/lib/api-schemas";
import { addQuestion } from "@/lib/services/question-service";

export const runtime = "nodejs";

/** إضافة سؤال يدويًا لاختبار مسودة */
export const POST = apiHandler(async (req, { teacher }) => {
  const body = await req.json().catch(() => null);
  const parsed = questionPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }
  const question = await addQuestion(teacher.id, {
    examId: parsed.data.examId,
    type: parsed.data.type,
    question: parsed.data.question,
    data: parsed.data.data,
    correctAnswer: parsed.data.correctAnswer,
    solution: parsed.data.solution ?? undefined,
    points: parsed.data.points,
  });
  return { question };
});
