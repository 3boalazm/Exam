import { apiHandler } from "@/lib/api";
import { getStore } from "@/lib/store";
import { authMeSchema } from "@/lib/api-schemas";

export const runtime = "nodejs";

/**
 * بعد تسجيل دخول المعلم (Firebase Auth / تجريبي):
 * يضمن وجود مستند المعلم في Firestore + يحفظ الاسم/البريد.
 */
export const POST = apiHandler(async (req, { teacher }) => {
  const body = await req
    .json()
    .catch(() => ({}));
  const parsed = authMeSchema.safeParse(body);
  const store = getStore();
  if (parsed.success) {
    const patch: Record<string, string> = {};
    if (parsed.data.name) patch.name = parsed.data.name;
    if (parsed.data.email) patch.email = parsed.data.email;
    if (Object.keys(patch).length) {
      return { teacher: await store.updateTeacher(teacher.id, patch) };
    }
  }
  return { teacher };
});
