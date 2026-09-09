import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/utils";
import {
  GroqError,
  isChatModelId,
  listGroqModels,
} from "@/lib/groq/generator";
import { resolveGroqCredentials } from "@/lib/groq/settings";

export const runtime = "nodejs";

/**
 * قائمة النماذج المتاحة فعليًا على Groq لمفتاح المعلم.
 * يعالج المصادقة ويمرر النماذج النصية في المقدمة.
 */
export const GET = apiHandler(async (_req, { teacher }) => {
  const creds = await resolveGroqCredentials(teacher.id);
  if (!creds) {
    throw new ApiError(
      400,
      "لا يوجد مفتاح Groq — أدخل مفتاحك واحفظه أولًا لتحميل النماذج"
    );
  }

  try {
    const models = await listGroqModels(creds);
    const chatIds = models
      .filter((m) => isChatModelId(m.id))
      .sort((a, b) => Number(b.active) - Number(a.active))
      .map((m) => m.id);
    return { models: chatIds, total: models.length };
  } catch (e) {
    const g = e instanceof GroqError ? e : null;
    switch (g?.kind) {
      case "auth":
        throw new ApiError(
          401,
          "المفتاح غير صالح أو غير مصرّح له — تحقق من مفتاح Groq"
        );
      case "timeout":
        throw new ApiError(504, "انتهت مهلة جلب النماذج — حاول مرة أخرى");
      case "network":
        throw new ApiError(
          502,
          "تعذر الوصول إلى خوادم Groq — تأكد من اتصال الخادم بالإنترنت"
        );
      default:
        throw new ApiError(502, `فشل جلب النماذج: ${(e as Error).message}`);
    }
  }
});
