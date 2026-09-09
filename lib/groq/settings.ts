/**
 * إعدادات Groq اليدوية (BYOK) — طبقة الخادم فقط.
 *
 * ترتيب الأولوية:
 *  1) المفتاح اليدوي الذي أدخله المعلم من صفحة الإعدادات (يُفعّل الموقع كله لهذا المعلم)
 *  2) متغيرات البيئة GROQ_API_KEY / GROQ_MODEL (fallback)
 *
 * المفتاح يُحفظ في مكان منفصل عن مستند المعلم ولا يُرسل للمتصفح أبدًا.
 */
import { getStore } from "@/lib/store";

export interface GroqCredentials {
  apiKey: string;
  model: string;
  source: "manual" | "env";
}

/**
 * النموذج الافتراضي — نفضّل نموذجًا قويًا في العربية ومتوفرًا حاليًا على Groq.
 * يُستبدل تلقائيًا عند اختيار المعلم نموذجًا من قائمة النماذج الحيّة.
 */
export const DEFAULT_GROQ_MODEL = "qwen/qwen3-32b";

/** اعتمادات من متغيرات البيئة (fallback) */
export function envGroqCredentials(): GroqCredentials | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
    source: "env",
  };
}

/**
 * يُرجع اعتمادات Groq لمعلم معيّن:
 * المفتاح اليدوي المحفوظ أولًا، ثم متغيرات البيئة، وإلا null.
 */
export async function resolveGroqCredentials(
  teacherId: string
): Promise<GroqCredentials | null> {
  const manual = await getStore().getGroqSettings(teacherId);
  if (manual?.apiKey) {
    return {
      apiKey: manual.apiKey,
      model: manual.model || DEFAULT_GROQ_MODEL,
      source: "manual",
    };
  }
  return envGroqCredentials();
}

/** إخفاء المفتاح للعرض في الواجهة: gsk_…abcd */
export function maskKey(apiKey: string): string {
  const last4 = apiKey.slice(-4);
  return `gsk_…${last4}`;
}
