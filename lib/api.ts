/**
 * أدوات الـ API المشتركة:
 * - التحقق من هوية المعلم (Firebase ID Token في الإنتاج / demo header في التجريبي)
 * - wrapper موحّد للـ route handlers يعالج الأخطاء
 */
import { getAdminAuth } from "@/lib/firebase/admin";
import { isDemoMode, getStore } from "@/lib/store";
import { ApiError } from "@/lib/utils";
import type { Teacher } from "@/lib/questions/types";

export interface Ctx {
  params: Record<string, string>;
  teacher: Teacher;
}

type Handler = (req: Request, ctx: Ctx) => Promise<unknown>;

/**
 * route handler محمي بهوية المعلم:
 * - الإنتاج: Bearer <Firebase ID Token> → verifyIdToken
 * - التجريبي: header x-demo-teacher
 */
async function resolveTeacher(req: Request): Promise<Teacher> {
  const store = getStore();

  if (isDemoMode()) {
    const id = req.headers.get("x-demo-teacher");
    if (!id) throw new ApiError(401, "يجب تسجيل الدخول أولًا");
    let t = await store.getTeacher(id);
    if (!t) {
      t = await store.createTeacher({
        id,
        name: "معلم تجريبي",
        email: "demo@exam.local",
        createdAt: Date.now(),
      });
    }
    return t;
  }

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new ApiError(401, "يجب تسجيل الدخول أولًا");

  let decoded: { uid: string; email?: string | null; name?: string | null };
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch {
    throw new ApiError(401, "جلسة غير صالحة — سجّل الدخول مجددًا");
  }

  let t = await store.getTeacher(decoded.uid);
  if (!t) {
    t = await store.createTeacher({
      id: decoded.uid,
      name: decoded.name || decoded.email || "معلم",
      email: decoded.email || "",
      createdAt: Date.now(),
    });
  }
  return t;
}

/**
 * يغلّف الـ handler: يستخرج المعلم، ينفذ، ويعيد JSON
 * مع تحويل الأخطاء لاستجابات مناسبة.
 */
export function apiHandler(fn: Handler) {
  return async (req: Request, ctx: { params: Record<string, string> }) => {
    try {
      const teacher = await resolveTeacher(req);
      const out = await fn(req, { params: ctx.params, teacher });
      return out instanceof Response ? out : Response.json(out);
    } catch (e) {
      if (e instanceof ApiError) {
        return Response.json({ error: e.message }, { status: e.status });
      }
      console.error("[api]", e);
      return Response.json(
        { error: "خطأ غير متوقع في الخادم" },
        { status: 500 }
      );
    }
  };
}

/** route handler عام بدون مصادقة (للمسارات العامة مثل صفحة الطالب) */
export function publicHandler(
  fn: (req: Request, ctx: Ctx) => Promise<unknown>
) {
  return async (req: Request, ctx: { params: Record<string, string> }) => {
    try {
      const out = await fn(req, {
        params: ctx.params,
        teacher: { id: "public", name: "", email: "", createdAt: 0 },
      });
      return out instanceof Response ? out : Response.json(out);
    } catch (e) {
      if (e instanceof ApiError) {
        return Response.json({ error: e.message }, { status: e.status });
      }
      console.error("[api:public]", e);
      return Response.json(
        { error: "خطأ غير متوقع في الخادم" },
        { status: 500 }
      );
    }
  };
}
