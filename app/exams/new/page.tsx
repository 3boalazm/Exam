"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TeacherShell } from "@/components/teacher-shell";
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  PageLoader,
  Select,
  Spinner,
} from "@/components/ui";
import { apiFetch, useTeacher } from "@/lib/client";
import { TYPE_LABELS, QUESTION_TYPES } from "@/lib/questions/validator";
import type { Difficulty, QuestionType } from "@/lib/questions/types";

const GENERATING_STEPS = [
  "جارٍ تجهيز الإعدادات...",
  "بناء البرومبت مع بنك الأسئلة المرجعي...",
  "Groq يولّد الأسئلة...",
  "التحقق من صحة كل سؤال (Zod + Math)...",
  "فحص التكرار...",
  "الحفظ في Firestore...",
];

export default function NewExamPage() {
  const router = useRouter();
  const { config } = useTeacher();
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [title, setTitle] = useState("");
  const [types, setTypes] = useState<QuestionType[]>(["MCQ", "TRUE_FALSE"]);
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    if (config?.subject) setSubject(config.subject);
    if (config?.topics?.length) setTopic(config.topics[0].name);
  }, [config]);

  // رسائل توليد متحركة أثناء الانتظار
  useEffect(() => {
    if (!busy) return;
    setStepIdx(0);
    const t = setInterval(
      () => setStepIdx((i) => Math.min(i + 1, GENERATING_STEPS.length - 1)),
      3000
    );
    return () => clearInterval(t);
  }, [busy]);

  const currentTopic = config?.topics?.find((t) => t.name === topic);
  const hasSubtopics = (currentTopic?.subtopics?.length ?? 0) > 0;

  function toggleType(t: QuestionType) {
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (types.length === 0) {
      setError("اختر نوع سؤال واحدًا على الأقل");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch<{ exam: { id: string } }>("/api/exams/generate", {
        body: {
          title: title.trim() || `اختبار ${topic}`,
          subject,
          topic,
          subtopic: subtopic || undefined,
          questionTypes: types,
          difficulty,
          questionCount: count,
        },
      });
      router.push(`/exams/${res.exam.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <TeacherShell title="إنشاء اختبار">
      {busy ? (
        <Card className="max-w-lg">
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <Spinner size="lg" />
            <div className="text-lg font-bold text-slate-800">
              جارٍ توليد الامتحان...
            </div>
            <div className="text-sm text-slate-500">{GENERATING_STEPS[stepIdx]}</div>
            <div className="text-xs text-slate-400">
              قد يستغرق من 10 إلى 60 ثانية حسب عدد الأسئلة
            </div>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleGenerate} className="max-w-2xl space-y-5">
          <Card title="1) بيانات الاختبار">
            <div className="space-y-4">
              <Field label="عنوان الاختبار">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="اختبار المتتابعات الحسابية"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="المادة">
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="رياضيات"
                  />
                </Field>
                <Field label="الموضوع / الوحدة">
                  <Select
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value);
                      setSubtopic("");
                    }}
                  >
                    {(config?.topics ?? []).map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              {hasSubtopics && (
                <Field label="الدرس / الموضوع الفرعي">
                  <Select
                    value={subtopic}
                    onChange={(e) => setSubtopic(e.target.value)}
                  >
                    <option value="">— الكل —</option>
                    {currentTopic?.subtopics.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          </Card>

          <Card title="2) أنواع الأسئلة">
            <div className="grid gap-3 sm:grid-cols-2">
              {QUESTION_TYPES.map((t) => (
                <label
                  key={t}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                    types.includes(t)
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={types.includes(t)}
                    onChange={() => toggleType(t)}
                    className="h-5 w-5 accent-indigo-600"
                  />
                  <span className="font-semibold text-slate-800">{TYPE_LABELS[t]}</span>
                  <span className="ms-auto text-xs text-slate-400">{t}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card title="3) الإعدادات">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الصعوبة">
                <Select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                >
                  <option value="mixed">متنوعة</option>
                  <option value="easy">سهل</option>
                  <option value="medium">متوسط</option>
                  <option value="hard">صعب</option>
                </Select>
              </Field>
              <Field label="عدد الأسئلة" hint="بين 3 و 40">
                <Input
                  type="number"
                  min={3}
                  max={40}
                  value={count}
                  onChange={(e) =>
                    setCount(Math.max(3, Math.min(40, Number(e.target.value) || 3)))
                  }
                />
              </Field>
            </div>
          </Card>

          {error && <Alert tone="error">{error}</Alert>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.push("/dashboard")}>
              إلغاء
            </Button>
            <Button type="submit" size="lg">
              ⚡ Generate Exam
            </Button>
          </div>
        </form>
      )}
    </TeacherShell>
  );
}
