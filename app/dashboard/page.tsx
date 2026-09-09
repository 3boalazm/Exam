"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TeacherShell } from "@/components/teacher-shell";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  PageLoader,
  StatCard,
} from "@/components/ui";
import { apiFetch } from "@/lib/client";
import { formatDateTime } from "@/lib/utils";
import type { Exam } from "@/lib/questions/types";

interface ExamRow {
  exam: Exam;
  attemptsCount: number;
  average: number;
  highest: number;
  lowest: number;
}

interface DashboardData {
  teacher: { id: string; name: string; email: string };
  totalExams: number;
  totalAttempts: number;
  exams: ExamRow[];
  lastExam: ExamRow | null;
}

const STATUS_AR: Record<Exam["status"], { label: string; tone: "amber" | "emerald" | "slate" }> = {
  draft: { label: "مسودة", tone: "amber" },
  published: { label: "منشور", tone: "emerald" },
  closed: { label: "مغلق", tone: "slate" },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<DashboardData>("/api/dashboard"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(examId: string, status: "published" | "closed") {
    setBusyId(examId);
    try {
      await apiFetch(`/api/exams/${examId}`, { method: "PATCH", body: { status } });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusyId("");
  }

  async function removeExam(examId: string) {
    if (!confirm("سيتم حذف الاختبار وكل أسئلته ونتائجه نهائيًا. متابعة؟")) return;
    setBusyId(examId);
    try {
      await apiFetch(`/api/exams/${examId}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusyId("");
  }

  return (
    <TeacherShell
      title={`مرحبًا، ${data?.teacher.name ?? "أستاذ"} 👋`}
      actions={
        <Link href="/exams/new">
          <Button>
            + إنشاء اختبار جديد
          </Button>
        </Link>
      }
    >
      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {!data ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          {/* الإحصائيات */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon="📄"
              label="إجمالي الاختبارات"
              value={data.totalExams}
            />
            <StatCard
              icon="🎓"
              label="إجمالي الطلاب"
              value={data.totalAttempts}
              sub="محاولة مُسلّمة"
            />
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">آخر اختبار</div>
              {data.lastExam ? (
                <div className="mt-1">
                  <div className="truncate font-bold text-slate-900">
                    {data.lastExam.exam.title}
                  </div>
                  <div className="text-xs text-slate-400">
                    {data.lastExam.attemptsCount} طالب · متوسط{" "}
                    {data.lastExam.attemptsCount ? `${data.lastExam.average}%` : "—"}
                  </div>
                </div>
              ) : (
                <div className="mt-1 text-sm text-slate-400">لا يوجد بعد</div>
              )}
            </div>
          </div>

          {/* قائمة الاختبارات */}
          {data.exams.length === 0 ? (
            <EmptyState
              icon="📝"
              title="لا توجد اختبارات بعد"
              sub="أنشئ أول امتحان لك: اختر الدرس وأنواع الأسئلة واضغط Generate"
            />
          ) : (
            <div className="space-y-3">
              {data.exams.map((row) => {
                const s = STATUS_AR[row.exam.status];
                return (
                  <div
                    key={row.exam.id}
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {row.exam.title}
                        </span>
                        <Badge tone={s.tone}>{s.label}</Badge>
                        {row.exam.code && (
                          <Badge tone="sky">
                            {row.exam.code}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {row.exam.subject} · {row.exam.topic}
                        {row.exam.subtopic ? ` · ${row.exam.subtopic}` : ""} ·{" "}
                        {row.exam.questionCount} سؤال · {formatDateTime(row.exam.createdAt)}
                      </div>
                      {row.attemptsCount > 0 && (
                        <div className="mt-1 text-xs font-semibold text-indigo-600">
                          {row.attemptsCount} محاولة · متوسط {row.average}% · أعلى{" "}
                          {row.highest}% · أقل {row.lowest}%
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/exams/${row.exam.id}`}>
                        <Button variant="secondary" size="sm">
                          {row.exam.status === "draft" ? "مراجعة وتعديل" : "عرض"}
                        </Button>
                      </Link>
                      {row.attemptsCount > 0 && (
                        <Link href={`/exams/${row.exam.id}/results`}>
                          <Button variant="secondary" size="sm">
                            النتائج
                          </Button>
                        </Link>
                      )}
                      {row.exam.status === "draft" && (
                        <Button
                          variant="success"
                          size="sm"
                          loading={busyId === row.exam.id}
                          onClick={() => setStatus(row.exam.id, "published")}
                        >
                          نشر
                        </Button>
                      )}
                      {row.exam.status === "published" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={busyId === row.exam.id}
                          onClick={() => setStatus(row.exam.id, "closed")}
                        >
                          إغلاق
                        </Button>
                      )}
                      {row.exam.status === "closed" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={busyId === row.exam.id}
                          onClick={() => setStatus(row.exam.id, "published")}
                        >
                          إعادة نشر
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={busyId === row.exam.id}
                        onClick={() => removeExam(row.exam.id)}
                      >
                        🗑
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </TeacherShell>
  );
}
