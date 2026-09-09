import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/utils";
import { callGroqJSON, GroqError } from "@/lib/groq/generator";
import {
  DEFAULT_GROQ_MODEL,
  resolveGroqCredentials,
} from "@/lib/groq/settings";

export const runtime = "nodejs";

/**
 * اختبار اتصال Groq (زر «اختبار الاتصال»):
 * - إن كتب المعلم مفتاحًا/نموذجًا في الطلب تُستخدم (تجربة قبل الحفظ)
 * - وإلا يُستخدم الإعداد اليدوي المحفوظ ثم متغيرات البيئة
 *
 * نصيحة: لا نرفض المفتاح شكلًا — Groq هو من يقرر صحة المفتاح.
 */
export const POST = apiHandler(async (req, { teacher }) => {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const typedKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const typedModel = typeof body.model === "string" ? body.model.trim() : "";

  if (typedKey && typedKey.length < 8) {
    throw new ApiError(
      400,
      "المفتاح المدخل أقصر من اللازم — تأكد من نسخه كاملًا"
    );
  }

  let apiKey = typedKey;
  let model = typedModel;

  if (!apiKey) {
    const creds = await resolveGroqCredentials(teacher.id);
    if (!creds) {
      throw new ApiError(
        400,
        "لا يوجد مفتاح Groq — اكتب مفتاحك في الحقل أو احفظه أولًا ثم أعد الاختبار"
      );
    }
    apiKey = creds.apiKey;
    model = model || creds.model;
  }

  const finalModel = model || DEFAULT_GROQ_MODEL;
  const started = Date.now();

  try {
    await callGroqJSON(
      "أنت أداة فحص اتصال. أجب بـ JSON فقط دون أي نص إضافي.",
      'أعد الكائن التالي حرفيًا: {"ok": true}',
      0,
      15_000,
      { apiKey, model: finalModel, source: "manual" }
    );
    return { ok: true, model: finalModel, latencyMs: Date.now() - started };
  } catch (e) {
    console.error("[groq-test] failed", e);
    const g = e instanceof GroqError ? e : null;
    switch (g?.kind) {
      case "auth":
        throw new ApiError(
          401,
          "المفتاح غير صالح أو غير مصرّح له — تحقق من مفتاح Groq أو أعد إنشاءه من console.groq.com/keys"
        );
      case "rate_limit":
        throw new ApiError(
          429,
          "تم تجاوز حد الطلبات في Groq — انتظر قليلًا ثم أعد المحاولة"
        );
      case "not_found":
        throw new ApiError(
          400,
          `النموذج غير متوفر: "${finalModel}" — جرّب نموذجًا آخر مثل llama-3.3-70b-versatile`
        );
      case "timeout":
        throw new ApiError(504, "انتهت مهلة الاتصال بـ Groq — حاول مرة أخرى");
      case "network":
        throw new ApiError(
          502,
          "تعذر الوصول إلى خوادم Groq — تأكد من اتصال الخادم بالإنترنت"
        );
      case "empty":
      case "parse":
        throw new ApiError(
          502,
          "Groq أعاد استجابة غير متوقعة — حاول مرة أخرى"
        );
      default:
        throw new ApiError(
          502,
          `فشل الاتصال بـ Groq: ${(e as Error).message}`
        );
    }
  }
});
