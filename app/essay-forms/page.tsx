"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TeacherShell } from "@/components/teacher-shell";
import { EssaySheet } from "@/components/essay-sheet";
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Select,
} from "@/components/ui";
import {
  defaultFormCount,
  essayGrade,
  essaySubject,
  essayTopicStats,
} from "@/lib/essay/bank";
import { buildEssayForms, chunkForms } from "@/lib/essay/generate";
import type {
  EssayDifficulty,
  EssayForm,
  EssayLayout,
  EssayMeta,
} from "@/lib/essay/types";

const LAYOUT_OPTIONS: { value: EssayLayout; label: string; hint: string }[] = [
  { value: 4, label: "٤ نماذج في الورقة", hint: "الوضع المطلوب — ٢×٢" },
  { value: 2, label: "نموذجان في الورقة", hint: "مساحة إجابة أوسع" },
  { value: 1, label: "نموذج واحد في الورقة", hint: "ورقة كاملة لكل طالب" },
];

const DIFFICULTY_LABELS: Record<EssayDifficulty | "mixed", string> = {
  mixed: "متنوعة (سهل + متوسط + صعب)",
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
};

export default function EssayFormsPage() {
  const stats = useMemo(() => essayTopicStats(), []);

  // علامة على body تسمح بإخفاء واجهة التطبيق عند الطباعة (لمتصفحات لا تدعم :has)
  useEffect(() => {
    document.body.dataset.essayPrint = "1";
    return () => {
      delete document.body.dataset.essayPrint;
    };
  }, []);
  const allTopics = stats.map((s) => s.topic);

  const [title, setTitle] = useState("اختبار الأسئلة المقالية");
  const [school, setSchool] = useState("");
  const [duration, setDuration] = useState("60 دقيقة");
  const [topics, setTopics] = useState<string[]>(allTopics);
  const [difficulty, setDifficulty] = useState<EssayDifficulty | "mixed">(
    "mixed"
  );
  const [formCount, setFormCount] = useState(defaultFormCount);
  const [perForm, setPerForm] = useState(5);
  const [layout, setLayout] = useState<EssayLayout>(4);
  const [showLines, setShowLines] = useState(true);
  const [withKey, setWithKey] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [seed, setSeed] = useState(1001);
  const [printTarget, setPrintTarget] = useState<"all" | "forms" | "key">("all");

  const meta: EssayMeta = {
    title: title.trim() || "اختبار الأسئلة المقالية",
    school: school.trim(),
    duration: duration.trim() || "60 دقيقة",
    instructions: "",
  };

  const { forms, notice } = useMemo(
    () =>
      buildEssayForms({
        count: formCount,
        perForm,
        topics,
        difficulty,
        seed,
        shuffleQuestions,
      }),
    [formCount, perForm, topics, difficulty, seed, shuffleQuestions]
  );

  const pages = useMemo(() => chunkForms(forms, layout), [forms, layout]);
  const keyPages = pages;
  const usedQuestions = useMemo(
    () => new Set(forms.flatMap((f) => f.questions.map((q) => q.id))).size,
    [forms]
  );

  const pointRange = useMemo(() => {
    if (!forms.length) return { min: 0, max: 0 };
    const values = forms.map((f) => f.totalPoints);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [forms]);

  function toggleTopic(topic: string) {
    setTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : allTopics.filter((t) => [...prev, topic].includes(t))
    );
  }

  function handlePrint(target: "all" | "forms" | "key") {
    if (target !== "forms") setWithKey(true);
    setPrintTarget(target);
    window.setTimeout(() => window.print(), 250);
  }

  return (
    <TeacherShell
      title="نماذج الأسئلة المقالية"
      actions={
        <Link href="/exams/new">
          <Button variant="secondary" size="sm">
            + اختبار إلكتروني
          </Button>
        </Link>
      }
    >
      <div className="essay-print-root" data-print={printTarget}>
        {/* ============ لوحة التحكم (لا تُطبع) ============ */}
        <div className="no-print space-y-5">
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-l from-indigo-50 to-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <h2 className="text-lg font-extrabold text-slate-900">
                  45 نموذجًا مختلفًا — 4 نماذج في ورقة A4 واحدة
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  كل نموذج يحتوي على {perForm} أسئلة مقالية من دروس مختلفة
                  (بدون تكرار داخل النموذج)، والنماذج تدور على كل دروس المنهج
                  الـ{" "}
                  {stats.length} حتى لا يتكرر أي سؤال. الورقة الواحدة مقسّمة
                  على {layout} نموذج{layout > 1 ? "ات" : ""} — جاهزة للطباعة
                  أو للحفظ كـ PDF.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "نموذج", value: forms.length },
                  { label: "ورقة A4", value: pages.length },
                  { label: "سؤال مستخدم", value: usedQuestions },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="text-xl font-extrabold text-indigo-600">
                      {s.value}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {notice && <Alert tone="warn">{notice}</Alert>}
          {!forms.length && (
            <Alert tone="error">
              لا توجد نماذج — تأكد من اختيار درس واحد على الأقل.
            </Alert>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="1) بيانات الورقة">
              <div className="space-y-4">
                <Field label="عنوان الاختبار">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="اختبار الأسئلة المقالية"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="المدرسة / اسم المعلم (اختياري)">
                    <Input
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="مدرسة النور الصناعية"
                    />
                  </Field>
                  <Field label="زمن الاختبار">
                    <Input
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="60 دقيقة"
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="عدد النماذج" hint="الحد الأقصى 45 نموذجًا">
                    <Select
                      value={formCount}
                      onChange={(e) => setFormCount(Number(e.target.value))}
                    >
                      {[4, 8, 12, 16, 20, 24, 30, 36, 45].map((n) => (
                        <option key={n} value={n}>
                          {n} نموذج
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="عدد الأسئلة في النموذج">
                    <Select
                      value={perForm}
                      onChange={(e) => setPerForm(Number(e.target.value))}
                    >
                      {[3, 4, 5, 6, 8, 10].map((n) => (
                        <option key={n} value={n}>
                          {n} أسئلة
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="مستوى الصعوبة">
                  <Select
                    value={difficulty}
                    onChange={(e) =>
                      setDifficulty(
                        e.target.value as EssayDifficulty | "mixed"
                      )
                    }
                  >
                    {(
                      Object.keys(DIFFICULTY_LABELS) as (
                        | EssayDifficulty
                        | "mixed"
                      )[]
                    ).map((d) => (
                      <option key={d} value={d}>
                        {DIFFICULTY_LABELS[d]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </Card>

            <Card title="2) الدروس وشكل الورقة">
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">
                      الدروس المشمولة
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setTopics(
                          topics.length === allTopics.length ? [] : allTopics
                        )
                      }
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      {topics.length === allTopics.length
                        ? "إلغاء الكل"
                        : "تحديد الكل"}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {stats.map((s) => {
                      const active = topics.includes(s.topic);
                      return (
                        <button
                          key={s.topic}
                          type="button"
                          onClick={() => toggleTopic(s.topic)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-right text-sm transition-colors ${
                            active
                              ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          <span className="font-semibold">{s.topic}</span>
                          <span className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400">
                              {s.count} سؤال
                            </span>
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${
                                active
                                  ? "border-indigo-500 bg-indigo-600 text-white"
                                  : "border-slate-300 text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    شكل ورقة A4
                  </span>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {LAYOUT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setLayout(opt.value)}
                        className={`rounded-xl border p-2 text-center transition-colors ${
                          layout === opt.value
                            ? "border-indigo-400 bg-indigo-50"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="mb-1 flex h-8 items-center justify-center gap-1">
                          {Array.from({ length: opt.value }).map((_, i) => (
                            <span
                              key={i}
                              className="h-4 w-4 rounded-[2px] border border-slate-400 bg-white"
                            />
                          ))}
                        </div>
                        <div className="text-xs font-bold text-slate-700">
                          {opt.label}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {opt.hint}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={showLines}
                      onChange={(e) => setShowLines(e.target.checked)}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    إظهار خطوط الإجابة
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    ترتيب عشوائي للأسئلة داخل كل نموذج
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={withKey}
                      onChange={(e) => setWithKey(e.target.checked)}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    تضمين مفتاح الإجابة في المعاينة
                  </label>
                </div>
              </div>
            </Card>
          </div>

          {/* أزرار التنفيذ */}
          <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => handlePrint("forms")}>
                🖨️ طباعة {forms.length} نموذج
              </Button>
              <Button variant="secondary" onClick={() => handlePrint("key")}>
                🔑 مفتاح الإجابة
              </Button>
              <Button variant="secondary" onClick={() => handlePrint("all")}>
                📄 طباعة الكل
              </Button>
              <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
              <Button
                variant="ghost"
                onClick={() => setSeed((s) => s + 1)}
                title="اختيار أسئلة مختلفة بنفس الإعدادات"
              >
                🔄 توليد نماذج أخرى
              </Button>
              <div className="ms-auto flex items-center gap-2 text-xs text-slate-500">
                <Badge tone="indigo">
                  {forms.length} نموذج × {perForm} أسئلة
                </Badge>
                <Badge tone="emerald">
                  {pointRange.min === pointRange.max
                    ? `${pointRange.min} درجة/نموذج`
                    : `${pointRange.min}–${pointRange.max} درجة/نموذج`}
                </Badge>
                <Badge tone="slate">
                  {pages.length} ورقة A4
                </Badge>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              عند الطباعة اختر مقاس <b>A4</b> وهوامش افتراضية، أو اختر «حفظ
              كـ PDF» من قائمة الطابعة للحصول على ملف جاهز للتوزيع. ولو ظهر
              أي سؤال مقطوعًا في المعاينة، جرّب «نموذجان في الورقة» أو قلّل
              عدد الأسئلة.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <h2 className="text-lg font-extrabold text-slate-900">
              معاينة الأوراق
            </h2>
            <span className="text-xs text-slate-400">
              {pages.length} ورقة × {layout} نموذج — إجمالي {forms.length} نموذج
            </span>
          </div>
        </div>

        {/* ============ الأوراق ============ */}
        <div className="essay-zoom">
          <div className="essay-sheets space-y-6">
            {pages.map((pageForms, idx) => (
              <EssaySheet
                key={`sheet-${idx}`}
                forms={pageForms}
                layout={layout}
                meta={meta}
                subject={essaySubject}
                grade={essayGrade}
                showLines={showLines}
                pageNumber={idx + 1}
                pageCount={pages.length}
              />
            ))}
          </div>

          {withKey && forms.length > 0 && (
            <div className="essay-key mt-10 space-y-6">
              <div className="no-print">
                <h2 className="text-lg font-extrabold text-slate-900">
                  مفتاح الإجابة النموذجية
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {keyPages.length} ورقة — تُطبع منفصلة عن أوراق الطلاب.
                </p>
              </div>
              {keyPages.map((pageForms: EssayForm[], idx) => (
                <EssaySheet
                  key={`key-${idx}`}
                  forms={pageForms}
                  layout={layout}
                  meta={meta}
                  subject={essaySubject}
                  grade={essayGrade}
                  showLines={false}
                  pageNumber={idx + 1}
                  pageCount={keyPages.length}
                  kind="key"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </TeacherShell>
  );
}
