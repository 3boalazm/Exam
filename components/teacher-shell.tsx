"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTeacher } from "@/lib/client";
import { PageLoader } from "./ui";

/**
 * غلاف صفحات المعلم: يحمي الصفحة (إعادة توجيه للـ Login)
 * ويعرض شريط التنقل العلوي.
 */
export function TeacherShell({
  children,
  title,
  actions,
}: {
  children: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
}) {
  const { teacher, ready, logout, isDemo } = useTeacher();
  const router = useRouter();

  useEffect(() => {
    if (ready && !teacher) router.replace("/login");
  }, [ready, teacher, router]);

  if (!ready || !teacher) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageLoader message="جارٍ التحقق من الجلسة..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-extrabold text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg text-white">
              📝
            </span>
            <span className="hidden sm:inline">Mini Exam</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100"
            >
              الرئيسية
            </Link>
            <Link
              href="/exams/new"
              className="rounded-lg px-3 py-1.5 font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              + اختبار جديد
            </Link>
          </nav>
          <div className="ms-auto flex items-center gap-3">
            {isDemo && (
              <span className="hidden rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700 sm:inline">
                وضع تجريبي
              </span>
            )}
            <span className="hidden text-sm font-medium text-slate-500 md:inline">
              {teacher.name}
            </span>
            <button
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-rose-600"
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {(title || actions) && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
