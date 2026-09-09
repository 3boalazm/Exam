import { apiHandler } from "@/lib/api";
import { getStore } from "@/lib/store";
import { groqSettingsSchema } from "@/lib/api-schemas";
import { ApiError } from "@/lib/utils";
import {
  DEFAULT_GROQ_MODEL,
  maskKey,
} from "@/lib/groq/settings";

export const runtime = "nodejs";

/**
 * إعدادات Groq اليدوية (BYOK) للمعلم:
 * - GET: حالة الإعداد (بدون إرجاع المفتاح — معرّف مقنّع فقط)
 * - PUT: حفظ مفتاح + نموذج
 * - DELETE: إزالة المفتاح اليدوي
 */
export const GET = apiHandler(async (_req, { teacher }) => {
  const manual = await getStore().getGroqSettings(teacher.id);
  const envKeyAvailable = Boolean(process.env.GROQ_API_KEY);
  const model =
    manual?.model || process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;

  return {
    hasManualKey: Boolean(manual?.apiKey),
    keyLast4: manual?.apiKey ? maskKey(manual.apiKey) : null,
    model,
    // مصدر المفتاح الفعلي الذي سيُستخدم عند التوليد
    source: manual?.apiKey ? "manual" : envKeyAvailable ? "env" : "none",
    envKeyAvailable,
  };
});

export const PUT = apiHandler(async (req, { teacher }) => {
  const body = await req.json().catch(() => null);
  const parsed = groqSettingsSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ApiError(
      400,
      first?.path[0] === "apiKey"
        ? first.message
        : "بيانات الإعدادات غير صالحة"
    );
  }

  const store = getStore();
  // إن لم يُرسل مفتاح جديد (تحديث النموذج فقط) نُبقي المفتاح اليدوي الحالي.
  const existing = await store.getGroqSettings(teacher.id);
  const apiKey = parsed.data.apiKey?.trim() || existing?.apiKey;
  if (!apiKey) {
    throw new ApiError(400, "أدخل مفتاح Groq الخاص بك");
  }

  const settings = {
    apiKey,
    model: parsed.data.model,
    updatedAt: Date.now(),
  };
  await store.saveGroqSettings(teacher.id, settings);

  return {
    ok: true,
    hasManualKey: true,
    keyLast4: maskKey(settings.apiKey),
    model: settings.model,
  };
});

export const DELETE = apiHandler(async (_req, { teacher }) => {
  await getStore().deleteGroqSettings(teacher.id);
  return { ok: true, hasManualKey: false };
});
