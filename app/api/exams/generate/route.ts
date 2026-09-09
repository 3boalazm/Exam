import { apiHandler } from "@/lib/api";
import { generateExamSchema } from "@/lib/api-schemas";
import { generateExam } from "@/lib/services/generation-service";
import { ApiError } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * توليد امتحان كامل:
 * Teacher Settings → Groq → Parse → Zod → Validators → Math → Duplicates → Firestore
 */
export const POST = apiHandler(async (req, { teacher }) => {
  const body = await req.json().catch(() => null);
  const parsed = generateExamSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const messages: Record<string, string> = {
      title: "العنوان يجب أن يكون 3 أحرف على الأقل",
      subject: "المادة مطلوبة",
      topics: "اختر وحدة واحدة على الأقل",
      questionTypes: "اختر نوع سؤال واحدًا على الأقل",
      questionCount: "عدد الأسئلة بين 3 و 40",
    };
    throw new ApiError(400, messages[first.path[0] as string] ?? "بيانات غير صالحة");
  }

  const result = await generateExam(teacher, {
    ...parsed.data,
    // نحفظ الحقل القديم دائمًا كأول وحدة لضمان التوافق مع البيانات السابقة.
    topic: parsed.data.topics[0],
    subtopic:
      parsed.data.topics.length === 1
        ? parsed.data.subtopic || undefined
        : undefined,
  });
  return result;
});
