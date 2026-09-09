import { apiHandler } from "@/lib/api";
import { reorderSchema } from "@/lib/api-schemas";
import { reorderQuestions } from "@/lib/services/question-service";

export const runtime = "nodejs";

/** إعادة ترتيب الأسئلة */
export const POST = apiHandler(async (req, { teacher }) => {
  const body = await req.json().catch(() => null);
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "قائمة ترتيب غير صالحة" }, { status: 400 });
  }
  await reorderQuestions(teacher.id, parsed.data.examId, parsed.data.orderedIds);
  return { ok: true };
});
