import { apiHandler } from "@/lib/api";
import {
  closeExam,
  deleteExam,
  getExamWithQuestions,
  publishExam,
  updateExamMeta,
} from "@/lib/services/exam-service";
import { examMetaSchema, examStatusSchema } from "@/lib/api-schemas";

export const runtime = "nodejs";

/** اختبار + أسئلته (لصفحة المراجعة/التحرير) */
export const GET = apiHandler(async (_req, { params, teacher }) => {
  return getExamWithQuestions(params.id, teacher.id);
});

/**
 * PATCH:
 *  - { status: "published" } → نشر (توليد رمز)
 *  - { status: "closed" }    → إغلاق
 *  - { title, showResult, whatsappMessage } → تحديث وصفية
 */
export const PATCH = apiHandler(async (req, { params, teacher }) => {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  if (typeof body.status === "string") {
    const status = examStatusSchema.safeParse(body);
    if (!status.success) {
      return Response.json({ error: "حالة غير معروفة" }, { status: 400 });
    }
    if (status.data.status === "published") {
      return { exam: await publishExam(params.id, teacher.id) };
    }
    return { exam: await closeExam(params.id, teacher.id) };
  }

  const meta = examMetaSchema.safeParse(body);
  if (!meta.success || !Object.keys(meta.data).length) {
    return Response.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  return {
    exam: await updateExamMeta(params.id, teacher.id, {
      ...meta.data,
      whatsappMessage: meta.data.whatsappMessage ?? undefined,
    }),
  };
});

/** حذف الاختبار وكل ما يتبعه */
export const DELETE = apiHandler(async (_req, { params, teacher }) => {
  await deleteExam(params.id, teacher.id);
  return { ok: true };
});
