"use client";

/**
 * صفحة الطالب — بدون Login.
 * Flow: الاسم + رقم واتساب → حل → تأكيد → تسليم → نتيجة
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { StudentQuestionBody } from "@/components/question-view";
import { Alert, Button, Card, Field, Input, Spinner } from "@/components/ui";
import { apiFetch } from "@/lib/client";
import { seededShuffle } from "@/lib/utils";
import type { PublicExam, PublicQuestion } from "@/lib/questions/types";

type Step = "intro" | "solve" | "confirm" | "done";

interface SubmitResult {
  score: number;
  total: number;
  percentage: number;
  duplicate: boolean;
}

function isAnswered(q: PublicQuestion, answer: unknown): boolean {
  switch (q.type) {
    case "MCQ":
      return typeof answer === "string" && answer.length > 0;
    case "TRUE_FALSE":
      return answer === true || answer === false;
    case "MATCHING":
      return (
        Array.isArray(answer) &&
        (q.data as { leftItems: string[] }).leftItems.length === answer.length &&
        answer.every((v: unknown) => v !== null && v !== undefined)
      );
    case "ORDERING":
      return Array.isArray(answer) && answer.length > 0;
  }
}

export default function StudentExamPage() {
  const { code } = useParams<{ code: string }>();
  const [exam, setExam] = useState<PublicExam | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("intro");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const loadExam = useCallback(async () => {
    try {
      const e = await apiFetch<PublicExam>(`/api/exams/code/${code}`, {
        auth: false,
      });
      setExam(e);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [code]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  const questions = exam?.questions ?? [];
  const current = questions[idx];

  // تهيئة إجابة ORDERING بالترتيب المبعثر (حتمي بنفس البذرة لكل الطلاب)
  useEffect(() => {
    if (!current) return;
    if (current.type === "ORDERING" && answers[current.id] === undefined) {
      const items = (current.data as { items: string[] }).items;
      setAnswers((p) => ({ ...p, [current.id]: seededShuffle(items, current.id) }));
    }
    if (current.type === "MATCHING" && answers[current.id] === undefined) {
      const n = (current.data as { leftItems: string[] }).leftItems.length;
      setAnswers((p) => ({ ...p, [current.id]: Array(n).fill(null) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const answeredCount = useMemo(
    () => questions.filter((q) => isAnswered(q, answers[q.id])).length,
    [questions, answers]
  );

  function setAnswer(q: PublicQuestion, a: unknown) {
    setAnswers((p) => ({ ...p, [q.id]: a }));
  }

  function start(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (name.trim().length < 2) {
      setError("اكتب اسمك الكامل (حرفان على الأقل)");
      return;
    }
    if (digits.length < 8 || digits.length > 15) {
      setError("أدخل رقم واتساب صحيحًا (مثال: 01012345678)");
      return;
    }
    setError("");
    setStep("solve");
    setIdx(0);
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch<SubmitResult>("/api/attempts", {
        auth: false,
        body: {
          examCode: code,
          studentName: name.trim(),
          studentPhone: phone.replace(/\D/g, ""),
          answers,
        },
      });
      setResult(res);
      setStep("done");
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  /* ---------- شاشة الخطأ / التحميل ---------- */
  if (error && !exam) {
    return (
      <StudentShell>
        <Card>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="text-5xl">😕</div>
            <div className="text-lg font-bold text-slate-800">تعذر فتح الامتحان</div>
            <div className="max-w-sm text-sm text-slate-500">{error}</div>
          </div>
        </Card>
      </StudentShell>
    );
  }
  if (!exam) {
    return (
      <StudentShell>
        <div className="flex flex-col items-center gap-3 py-20">
          <Spinner size="lg" />
          <div className="text-sm text-slate-500">جارٍ فتح الامتحان...</div>
        </div>
      </StudentShell>
    );
  }

  /* ---------- شاشة البداية ---------- */
  if (step === "intro") {
    return (
      <StudentShell>
        <form onSubmit={start} className="space-y-5">
          <Card>
            <div className="text-center">
              <div className="text-4xl">📝</div>
              <h1 className="mt-3 text-2xl font-black text-slate-900">{exam.title}</h1>
              <div className="mt-2 text-sm text-slate-500">
                {exam.subject} · {(exam.topics ?? [exam.topic]).join("، ")}
                {exam.subtopic ? ` · ${exam.subtopic}` : ""}
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
              <div className="font-bold">تفاصيل الامتحان</div>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-indigo-700">
                <li>{exam.questionCount} سؤال</li>
                <li>أجب على كل الأسئلة قدر استطاعتك</li>
                <li>لا يُسمح بإغلاق الصفحة بعد التسليم — النتيجة تُحفظ مباشرة</li>
              </ul>
            </div>
          </Card>

          <Card title="بياناتك">
            <div className="space-y-4">
              <Field label="الاسم الكامل">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="أحمد محمد"
                  autoFocus
                />
              </Field>
              <Field label="رقم واتساب" hint="سيُستخدم لإرسال نتيجتك (يبدأ بـ 01)">
                <Input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                />
              </Field>
              {error && <Alert tone="error">{error}</Alert>}
              <Button type="submit" size="lg" className="w-full">
                ابدأ الاختبار ←
              </Button>
            </div>
          </Card>
        </form>
      </StudentShell>
    );
  }

  /* ---------- شاشة الحل ---------- */
  if (step === "solve" && current) {
    const progress = Math.round(((idx + 1) / questions.length) * 100);
    return (
      <StudentShell>
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-500">
            <span>
              السؤال {idx + 1} / {questions.length}
            </span>
            <span>{answeredCount} / {questions.length} تمت الإجابة</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Card>
          <p className="text-lg font-bold leading-relaxed text-slate-900">
            {current.question}
          </p>
          <div className="mt-5">
            <StudentQuestionBody
              question={current}
              answer={answers[current.id]}
              onChange={(a) => setAnswer(current, a)}
            />
          </div>
        </Card>

        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
          >
            → السابق
          </Button>
          {idx < questions.length - 1 ? (
            <Button onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}>
              التالي ←
            </Button>
          ) : (
            <Button variant="success" onClick={() => setStep("confirm")}>
              مراجعة والتسليم
            </Button>
          )}
        </div>
      </StudentShell>
    );
  }

  /* ---------- شاشة التأكيد ---------- */
  if (step === "confirm") {
    const unanswered = questions.length - answeredCount;
    return (
      <StudentShell>
        <Card title="أنت على وشك تسليم الاختبار">
          <div className="space-y-3 text-center">
            <div className="text-5xl">{unanswered === 0 ? "✅" : "⚠️"}</div>
            <div className="text-lg font-bold text-slate-800">
              {questions.length} سؤال · تمت الإجابة على {answeredCount}
            </div>
            {unanswered > 0 ? (
              <Alert tone="warn">
                يوجد {unanswered} سؤال بدون إجابة — لن تحصل على درجاته. يمكنك
                المتابعة أو العودة للإجابة.
              </Alert>
            ) : (
              <div className="text-sm text-emerald-600">
                أجبت على كل الأسئلة — بالتوفيق!
              </div>
            )}
            {error && <Alert tone="error">{error}</Alert>}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Button variant="secondary" onClick={() => setStep("solve")}>
                رجوع
              </Button>
              <Button variant="success" size="lg" loading={busy} onClick={submit}>
                تسليم الاختبار
              </Button>
            </div>
          </div>
        </Card>
      </StudentShell>
    );
  }

  /* ---------- شاشة النتيجة ---------- */
  if (step === "done" && result) {
    const show = exam.showResult;
    return (
      <StudentShell>
        <Card>
          <div className="space-y-4 text-center">
            <div className="text-6xl">{show ? (result.percentage >= 50 ? "🎉" : "💪") : "📨"}</div>
            <h2 className="text-2xl font-black text-slate-900">
              {result.duplicate
                ? "لقد سلّمت هذا الاختبار من قبل"
                : "تم تسليم الاختبار بنجاح"}
            </h2>

            {show ? (
              <div>
                <div
                  className={`mx-auto flex h-36 w-36 flex-col items-center justify-center rounded-full border-8 ${
                    result.percentage >= 85
                      ? "border-emerald-400"
                      : result.percentage >= 65
                        ? "border-sky-400"
                        : result.percentage >= 50
                          ? "border-amber-400"
                          : "border-rose-400"
                  }`}
                >
                  <span className="text-4xl font-black text-slate-900">
                    {result.percentage}%
                  </span>
                  <span className="text-sm font-bold text-slate-500" dir="ltr">
                    {result.score} / {result.total}
                  </span>
                </div>
                <p className="mt-4 text-slate-600">
                  {result.percentage >= 85
                    ? "ممتاز! أداء رائع 🌟"
                    : result.percentage >= 65
                      ? "جيد جدًا! استمر على هذا المستوى 👏"
                      : result.percentage >= 50
                        ? "مقبول — راجع الدرس وحاول تحسينه 📖"
                        : "تحتاج مراجعة الدرس جيدًا — لا تستسلم 📚"}
                </p>
              </div>
            ) : (
              <p className="mx-auto max-w-sm text-slate-500">
                استلمنا إجاباتك، وسيصلك أداؤك من معلمك عبر واتساب قريبًا.
              </p>
            )}

            <p className="text-sm text-slate-400">شكرًا لك {name.split(" ")[0]} 🌷</p>
          </div>
        </Card>
      </StudentShell>
    );
  }

  return null;
}

function StudentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 via-white to-slate-50">
      <header className="border-b border-slate-100 bg-white/80 py-3 text-center backdrop-blur">
        <span className="text-sm font-extrabold text-indigo-700">📝 Mini Exam</span>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
