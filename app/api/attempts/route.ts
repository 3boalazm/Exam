import { publicHandler } from "@/lib/api";
import { submitAttemptSchema } from "@/lib/api-schemas";
import { submitAttempt } from "@/lib/services/grading-service";

export const runtime = "nodejs";

/**
 * تسليم امتحان الطالب (عامة بدون Login).
 * الطالب يرسل إجاباته فقط — الدرجة يُحسبها النظام Server-side.
 */
export const POST = publicHandler(async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = submitAttemptSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json(
      { error: issue?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  const result = await submitAttempt({
    examCode: parsed.data.examCode,
    studentName: parsed.data.studentName,
    studentPhone: parsed.data.studentPhone,
    answers: parsed.data.answers,
  });

  return result;
});
