"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TeacherShell } from "@/components/teacher-shell";
import {
  AnswerDisplay,
  ReviewQuestionBody,
} from "@/components/question-view";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  PageLoader,
  StatCard,
} from "@/components/ui";
import { apiFetch } from "@/lib/client";
import { formatDateTime } from "@/lib/utils";
import {
  buildResultMessage,
  whatsappLink,
} from "@/lib/whatsapp/message";
import type {
  AttemptWithAnswers,
  Exam,
  Question,
} from "@/lib/questions/types";

interface ResultsData {
  exam: Exam;
  attempts: AttemptWithAnswers[];
  questions: Question[];
  stats: { count: number; average: number; highest: number; lowest: number };
}

export default function ExamResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ResultsData | null>(null);
  const [error, setError] = useState("");
  const [openAttempt, setOpenAttempt] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<ResultsData>(`/api/exams/${id}/results`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data && !error) {
    return (
      <TeacherShell title="النتائج">
        <PageLoader />
      </TeacherShell>
    );
  }

  if (!data) {
    return (
      <TeacherShell title="النتائج">
        <Alert tone="error">{error}</Alert>
      </TeacherShell>
    );
  }

  const { exam, attempts, questions, stats } = data;
  const qById = new Map(questions.map((q) => [q.id, q]));

  function waHref(a: AttemptWithAnswers): string {
    const msg = buildResultMessage({
      studentName: a.studentName,
      examTitle: exam.title,
      score: a.score,
      total: a.totalScore,
      percentage: a.percentage,
      customMessage: exam.whatsappMessage,
    });
    return whatsappLink(a.studentPhone, msg);
  }

  function pctTone(p: number) {
    if (p >= 85) return "text-emerald-600";
    if (p >= 65) return "text-sky-600";
    if (p >= 50) return "text-amber-600";
    return "text-rose-600";
  }

  return (
    <TeacherShell title={`نتائج: ${exam.title}`}>
      <div className="space-y-6">
        {exam.code && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Badge tone="indigo">{exam.code}</Badge>
            <span>
              {exam.subject} · {(exam.topics ?? [exam.topic]).join("، ")}
              {exam.subtopic ? ` · ${exam.subtopic}` : ""}
            </span>
            <span className="text-slate-300">|</span>
            <span>{formatDateTime(exam.createdAt)}</span>
          </div>
        )}

        {/* الإحصائيات */}
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard icon="🎓" label="عدد الطلاب" value={stats.count} />
          <StatCard
            icon="📊"
            label="متوسط الدرجات"
            value={stats.count ? `${stats.average}%` : "—"}
          />
          <StatCard
            icon="🏆"
            label="أعلى درجة"
            value={stats.count ? `${stats.highest}%` : "—"}
          />
          <StatCard
            icon="📉"
            label="أقل درجة"
            value={stats.count ? `${stats.lowest}%` : "—"}
          />
        </div>

        {/* جدول الطلاب */}
        {attempts.length === 0 ? (
          <EmptyState
            icon="⏳"
            title="لا توجد محاولات بعد"
            sub="بمجرد أن يسلم الطلاب الاختبار ستظهر نتائجهم هنا مع زر WhatsApp لكل طالب"
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-right text-xs font-bold text-slate-400">
                    <th className="px-3 py-2.5">الطالب</th>
                    <th className="px-3 py-2.5">الدرجة</th>
                    <th className="px-3 py-2.5">النسبة</th>
                    <th className="px-3 py-2.5">التاريخ</th>
                    <th className="px-3 py-2.5">WhatsApp</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => {
                    const isOpen = openAttempt === a.id;
                    return (
                      <FragmentRow
                        key={a.id}
                        attempt={a}
                        isOpen={isOpen}
                        qById={qById}
                        onToggle={() =>
                          setOpenAttempt(isOpen ? null : a.id)
                        }
                        waHref={waHref(a)}
                        pctTone={pctTone(a.percentage)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </TeacherShell>
  );
}

function FragmentRow({
  attempt: a,
  isOpen,
  qById,
  onToggle,
  waHref,
  pctTone,
}: {
  attempt: AttemptWithAnswers;
  isOpen: boolean;
  qById: Map<string, Question>;
  onToggle: () => void;
  waHref: string;
  pctTone: string;
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50"
        onClick={onToggle}
      >
        <td className="px-3 py-3 font-bold text-slate-800">{a.studentName}</td>
        <td className="px-3 py-3 font-semibold text-slate-600" dir="ltr">
          {a.score} / {a.totalScore}
        </td>
        <td className={`px-3 py-3 font-extrabold ${pctTone}`}>{a.percentage}%</td>
        <td className="px-3 py-3 text-xs text-slate-400">
          {formatDateTime(a.submittedAt)}
        </td>
        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
          >
            💬 إرسال
          </a>
        </td>
        <td className="px-3 py-3 text-slate-400">{isOpen ? "▲" : "▼"}</td>
      </tr>
      {isOpen && (
        <tr className="border-b border-slate-100 bg-slate-50/60">
          <td colSpan={6} className="px-5 py-4">
            <div className="space-y-3">
              <div className="text-sm font-bold text-slate-600">
                تفصيل الإجابات — {a.studentName}
              </div>
              {a.answers.map((ans, i) => {
                const q = qById.get(ans.questionId);
                if (!q) return null;
                return (
                  <div
                    key={ans.questionId}
                    className={`rounded-xl border bg-white p-4 ${
                      ans.isCorrect
                        ? "border-emerald-200"
                        : "border-rose-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">
                        {ans.isCorrect ? "✓" : "✗"} السؤال {i + 1}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          ans.isCorrect ? "text-emerald-600" : "text-rose-500"
                        }`}
                      >
                        {ans.isCorrect ? `+${ans.points} درجة` : "0 درجة"}
                      </span>
                      <span className="ms-auto text-xs text-slate-400">
                        إجابة الطالب:
                      </span>
                      <span className="min-w-32 text-left">
                        <AnswerDisplay question={q} answer={ans.answer} />
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{q.question}</p>
                    {!ans.isCorrect && (
                      <div className="mt-2">
                        <div className="mb-1 text-xs font-bold text-slate-500">
                          الإجابة الصحيحة والحل:
                        </div>
                        <ReviewQuestionBody question={q} />
                        {q.solution && (
                          <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                            <b>الحل: </b>
                            {q.solution}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
