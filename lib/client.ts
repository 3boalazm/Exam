"use client";

/**
 * أدوات العميل: مصادقة المعلم (Firebase Auth / تجريبي) + apiFetch موحّد.
 */
import { useEffect, useState } from "react";

export interface AppConfig {
  demo: boolean;
  siteUrl: string | null;
  subject: string;
  topics: { name: string; subtopics: string[] }[];
}

export interface TeacherInfo {
  id: string;
  name: string;
  email: string;
}

let cachedConfig: AppConfig | null = null;

export async function fetchConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;
  const res = await fetch("/api/config", { cache: "no-store" });
  cachedConfig = (await res.json()) as AppConfig;
  return cachedConfig;
}

/* ---------------- الوضع التجريبي: هوية المعلم ---------------- */

const LS_KEY = "mini_exam_teacher";

/** معرّف ثابت مشتق من البريد في الوضع التجريبي */
export function demoTeacherIdFor(email: string): string {
  const s = email.trim().toLowerCase() || "teacher";
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  return "demo-" + h.toString(36);
}

export function getDemoTeacher(): TeacherInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as TeacherInfo) : null;
  } catch {
    return null;
  }
}

export function saveDemoTeacher(t: TeacherInfo): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(t));
}

export function clearDemoTeacher(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_KEY);
}

/* ---------------- رؤوس المصادقة ---------------- */

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const demo = getDemoTeacher();
  if (demo) return { "x-demo-teacher": demo.id };
  const { getClientAuth } = await import("@/lib/firebase/client");
  const user = getClientAuth().currentUser;
  if (!user) throw new Error("غير مسجّل الدخول");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/* ---------------- apiFetch ---------------- */

export interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** false = طلب عام بدون مصادقة (صفحة الطالب) */
  auth?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: ApiOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts.auth !== false) {
    try {
      Object.assign(headers, await getAuthHeaders());
    } catch {
      throw new Error("يرجى تسجيل الدخول أولًا");
    }
  }
  const res = await fetch(path, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? `خطأ في الطلب (${res.status})`
    );
  }
  return data;
}

/* ---------------- Hook: هوية المعلم الحالية ---------------- */

export interface UseTeacherResult {
  config: AppConfig | null;
  teacher: TeacherInfo | null;
  ready: boolean;
  isDemo: boolean;
  logout: () => Promise<void>;
}

export function useTeacher(): UseTeacherResult {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsubAuth: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      try {
        const cfg = await fetchConfig();
        if (cancelled) return;
        setConfig(cfg);
        if (cfg.demo) {
          setTeacher(getDemoTeacher());
        } else {
          const { getClientAuth } = await import("@/lib/firebase/client");
          const auth = getClientAuth();
          setTeacher(
            auth.currentUser
              ? {
                  id: auth.currentUser.uid,
                  name:
                    auth.currentUser.displayName ??
                    auth.currentUser.email ??
                    "معلم",
                  email: auth.currentUser.email ?? "",
                }
              : null
          );
          unsubAuth = auth.onAuthStateChanged((u) => {
            setTeacher(
              u
                ? {
                    id: u.uid,
                    name: u.displayName ?? u.email ?? "معلم",
                    email: u.email ?? "",
                  }
                : null
            );
          });
        }
      } catch {
        // لا شيء — الواجهة ستعامله كغير مسجل
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      if (unsubAuth) unsubAuth();
    };
  }, []);

  const logout = async () => {
    if (config?.demo) {
      clearDemoTeacher();
    } else {
      try {
        const { signOutClient } = await import("@/lib/firebase/client");
        await signOutClient();
      } catch {
        // ignore
      }
    }
    setTeacher(null);
  };

  return {
    config,
    teacher,
    ready,
    isDemo: config?.demo ?? false,
    logout,
  };
}
