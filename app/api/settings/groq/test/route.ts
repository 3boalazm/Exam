import { apiHandler } from "@/lib/api";
import { groqTestSchema } from "@/lib/api-schemas";
import { ApiError } from "@/lib/utils";
import { callGroqJSON } from "@/lib/groq/generator";
import {
  DEFAULT_GROQ_MODEL,
  resolveGroqCredentials,
} from "@/lib/groq/settings";

export const runtime = "nodejs";

/**
 * اختبار اتصال Groq (زر «اختبار الاتصال»):
 * - إن مرّر المعلم مفتاحًا/نموذجًا في الطلب تُستخدم (تجربة قبل الحفظ)
 * - وإلا يُستخدم الإعداد اليدوي المحفوظ ثم متغيرات البيئة
 */
export const POST = apiHandler(async (req, { teacher }) => {
  const body = await req.json().catch(() => ({}));
  const parsed = groqTestSchema.safeParse(body);

  let apiKey: string | null =
    parsed.success && parsed.data.apiKey ? parsed.data.apiKey : null;
  let model: string | null =
    parsed.success && parsed.data.model ? parsed.data.model : null;

  if (!apiKey || !model) {
    const creds = await resolveGroqCredentials(teacher.id);
    if (!creds) {
      throw new ApiError(
        400,
        "لا يوجد مفتاح Groq — أدخل مفتاحًا أو احفظه أولًا"
      );
    }
    apiKey = creds.apiKey;
    model = creds.model;
  }

  const finalModel = model || DEFAULT_GROQ_MODEL;
  const started = Date.now();

  try {
    await callGroqJSON(
      "أنت أداة فحص اتصال. أجب بـ JSON فقط دون أي نص إضافي.",
      'أعد الكائن التالي حرفيًا: {"ok": true}',
      0,
      15_000,
      { apiKey: apiKey as string, model: finalModel, source: "manual" }
    );
    return { ok: true, model: finalModel, latencyMs: Date.now() - started };
  } catch (e) {
    const message = (e as Error).message || "تعذر الاتصال بـ Groq";
    throw new ApiError(502, `فشل الاتصال بـ Groq: ${message}`);
  }
});
