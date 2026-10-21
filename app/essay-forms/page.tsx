"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { TeacherShell } from "@/components/teacher-shell";
import { EssaySheet } from "@/components/essay-sheet";
import { Alert, Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { essayGrade, essaySubject, essayTopicStats } from "@/lib/essay/bank";
import {
  availableQuestionCount,
  buildEssayForms,
  chunkForms,
} from "@/lib/essay/generate";
import {
  clearSettings,
  defaultSettings,
  loadSettings,
  saveSettings,
  type EssaySettings,
} from "@/lib/essay/settings";
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

const FORM_COUNTS = [4, 8, 12, 16, 20, 24, 30, 36, 45, 50, 60];
const PER_FORM = [3, 4, 5, 6, 8, 10];

export default function EssayFormsPage() {
  const stats = useMemo(() => essayTopicStats(), []);
  const knownTopics = useMemo(() => stats.map((item) => item.topic), [stats]);

  const [settings, setSettings] = useState<EssaySettings>(() =>
    defaultSettings(knownTopics)
  );
  const restored = useRef(false);

  // استرجاع مرة واحدة فقط. الاعتماد على مصفوفة ثابتة ([] ) يمنع أي إعادة
  // استرجاع بعد كل رسمة، وهي السبب في رجوع الخيارات لحالتها السابقة.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = loadSettings(knownTopics);
    if (saved) {
      setSettings((prev) => {
        const merged = { ...prev, ...saved };
        // إن لم توجد دروس صالحة محفوظة نرجع للكل
        if (!merged.topics.length) merged.topics = knownTopics;
        return merged;
      });
    }
  }, [knownTopics]);

  /**
   * مصدر واحد للحقيقة: كل تغيير يمر من هنا.
   * نحتفظ بالقيمة في ref أيضًا حتى تُطبَّق التعديلات المتتالية على أحدث حالة
   * (لا على حالة قديمة) وتُحفظ في localStorage في نفس اللحظة — بدون أي effect
   * لاحق يمكنه أن يكتب فوق اختيار المستخدم.
   */
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const commit = useCallback((next: EssaySettings) => {
    settingsRef.current = next;
    setSettings(next);
    saveSettings(next);
  }, []);

  const update = useCallback(
    (patch: Partial<EssaySettings>) => {
      commit({ ...settingsRef.current, ...patch });
    },
    [commit]
  );

  const resetAll = useCallback(() => {
    clearSettings();
    commit(defaultSettings(knownTopics));
  }, [commit, knownTopics]);

  useEffect(() => {
    document.body.dataset.essayPrint = "1";
    return () => {
      delete document.body.dataset.essayPrint;
    };
  }, []);

  const { topics, difficulty, formCount, perForm, layout } = settings;

  /**
   * لقطة مؤجّلة (120ms) تُستخدم لرسم الأوراق فقط.
   * الفائدة: الضغطة تُحدّث الإعدادات فورًا فتظهر النتيجة على الزر/القائمة
   * في نفس اللحظة، بينما تُرسم الـ24 ورقة A4 بعدها في مهمة منفصلة —
   * فلا يتجمّد التفاعل ولا يبدو أن الخيار «رجع» لحالته السابقة.
   * اللقطة تُقرأ فقط ولا تكتب أبدًا في الإعدادات (اتجاه واحد).
   */
  const [preview, setPreview] = useState<EssaySettings>(settings);
  const settingsSignature = useMemo(() => JSON.stringify(settings), [settings]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      startTransition(() => setPreview(settingsRef.current));
    }, 120);
    return () => window.clearTimeout(id);
  }, [settingsSignature]);

  const meta = useMemo<EssayMeta>(
    () => ({
      title: preview.title.trim() || "اختبار الأسئلة المقالية",
      school: preview.school.trim(),
      duration: preview.duration.trim() || "60 دقيقة",
      instructions: "",
    }),
    [preview]
  );

  const { forms, notice } = useMemo(
    () =>
      buildEssayForms({
        count: preview.formCount,
        perForm: preview.perForm,
        topics: preview.topics,
        difficulty: preview.difficulty,
        seed: preview.seed,
        shuffleQuestions: preview.shuffleQuestions,
      }),
    [preview]
  );

  const poolSize = useMemo(
    () =>
      availableQuestionCount({
        count: preview.formCount,
        perForm: preview.perForm,
        topics: preview.topics,
        difficulty: preview.difficulty,
        seed: preview.seed,
        shuffleQuestions: preview.shuffleQuestions,
      }),
    [preview]
  );

  const pages = useMemo(() => chunkForms(forms, preview.layout), [forms, preview.layout]);

  const pointRange = useMemo(() => {
    if (!forms.length) return { min: 0, max: 0 };
    const values = forms.map((f) => f.totalPoints);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [forms]);

  const [printTarget, setPrintTarget] = useState<"all" | "forms" | "key">("all");

  const toggleTopic = useCallback(
    (topic: string) => {
      const prev = settingsRef.current;
      const next = {
        ...prev,
        topics: prev.topics.includes(topic)
          ? prev.topics.filter((t) => t !== topic)
          : knownTopics.filter((t) => [...prev.topics, topic].includes(t)),
      };
      commit(next);
    },
    [commit, knownTopics]
  );

  const toggleAllTopics = useCallback(() => {
    const prev = settingsRef.current;
    commit({
      ...prev,
      topics: prev.topics.length === knownTopics.length ? [] : [...knownTopics],
    });
  }, [commit, knownTopics]);

  function handlePrint(target: "all" | "forms" | "key") {
    // لا نلمس إعدادات المستخدم عند الطباعة — العرض فقط يتغيّر، ثم يُرجَع بعدها
    setPrintTarget(target);
    window.setTimeout(() => window.print(), 250);
  }

  useEffect(() => {
    const reset = () => setPrintTarget("all");
    window.addEventListener("afterprint", reset);
    return () => window.removeEventListener("afterprint", reset);
  }, []);

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
                  ورق أسئلة للطلاب + ورق إجابات للمصحح — منفصلين
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  كل نموذج فيه {perForm} أسئلة مقالية من دروس مختلفة، وورقة A4
                  الواحدة مقسّمة على {layout} نموذج{layout > 1 ? "ات" : ""}.
                  تُطبع <b>أوراق الأسئلة</b> للطلاب، وتُطبع <b>أوراق الإجابة</b>{" "}
                  منفصلة بنفس أرقام الأسئلة. الأرقام تتغيّر من نموذج لآخر و
                  <b>تثبت</b> بعد التوليد، وإجابتها تُحسب من نفس الأرقام.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                {[
                  { label: "نموذج", value: forms.length },
                  { label: "ورق أسئلة", value: pages.length },
                  { label: "ورق إجابات", value: pages.length },
                  { label: "سؤال", value: forms.length * perForm },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="text-xl font-extrabold text-indigo-600">
                      {item.value}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">
                      {item.label}
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
                    value={settings.title}
                    onChange={(e) => update({ title: e.target.value })}
                    placeholder="اختبار الأسئلة المقالية"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="المدرسة / اسم المعلم (اختياري)">
                    <Input
                      value={settings.school}
                      onChange={(e) => update({ school: e.target.value })}
                      placeholder="مدرسة النور الصناعية"
                    />
                  </Field>
                  <Field label="زمن الاختبار">
                    <Input
                      value={settings.duration}
                      onChange={(e) => update({ duration: e.target.value })}
                      placeholder="60 دقيقة"
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="عدد النماذج"
                    hint={`${formCount * perForm} سؤالًا — حتى 60 نموذجًا (300 سؤال)`}
                  >
                    <Select
                      value={formCount}
                      onChange={(e) => update({ formCount: Number(e.target.value) })}
                    >
                      {(FORM_COUNTS.includes(formCount)
                        ? FORM_COUNTS
                        : [...FORM_COUNTS, formCount].sort((a, b) => a - b)
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n} نموذج
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="عدد الأسئلة في النموذج">
                    <Select
                      value={perForm}
                      onChange={(e) => update({ perForm: Number(e.target.value) })}
                    >
                      {(PER_FORM.includes(perForm)
                        ? PER_FORM
                        : [...PER_FORM, perForm].sort((a, b) => a - b)
                      ).map((n) => (
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
                      update({
                        difficulty: e.target.value as EssayDifficulty | "mixed",
                      })
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
                      onClick={toggleAllTopics}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      {topics.length === knownTopics.length
                        ? "إلغاء الكل"
                        : "تحديد الكل"}
                    </button>
                  </div>
                  <div className="grid max-h-64 gap-1.5 overflow-y-auto pe-1 sm:grid-cols-2">
                    {stats.map((item) => {
                      const active = topics.includes(item.topic);
                      return (
                        <button
                          key={item.topic}
                          type="button"
                          onClick={() => toggleTopic(item.topic)}
                          className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-right text-xs transition-colors ${
                            active
                              ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate font-semibold">
                              {item.topic}
                            </span>
                            <span className="shrink-0 text-[10px] font-medium text-slate-400">
                              {item.count}
                            </span>
                          </span>
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold ${
                              active
                                ? "border-indigo-500 bg-indigo-600 text-white"
                                : "border-slate-300 text-transparent"
                            }`}
                          >
                            ✓
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
                        onClick={() => update({ layout: opt.value })}
                        aria-pressed={layout === opt.value}
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
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-slate-800">
                    <input
                      type="checkbox"
                      checked={settings.withKey}
                      onChange={(e) => update({ withKey: e.target.checked })}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    <span>
                      <b>أوراق إجابة منفصلة</b> — لكل نموذج ورقة إجابة بنفس
                      الأرقام
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={settings.showAnswers}
                      onChange={(e) => update({ showAnswers: e.target.checked })}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    دمج الإجابة تحت السؤال في نفس ورقة الطالب (اختياري)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={settings.showLines}
                      onChange={(e) => update({ showLines: e.target.checked })}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    خطوط إجابة فارغة للطالب (تُلغى تلقائيًا عند إظهار الإجابة)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={settings.shuffleQuestions}
                      onChange={(e) =>
                        update({ shuffleQuestions: e.target.checked })
                      }
                      className="h-4 w-4 accent-indigo-600"
                    />
                    ترتيب عشوائي للأسئلة داخل كل نموذج
                  </label>
                </div>
              </div>
            </Card>
          </div>

          {/* أزرار التنفيذ */}
          <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => handlePrint("forms")}>
                🖨️ طباعة أوراق الأسئلة ({pages.length} ورقة)
              </Button>
              <Button variant="secondary" onClick={() => handlePrint("key")}>
                🔑 طباعة أوراق الإجابة ({pages.length} ورقة)
              </Button>
              <Button variant="secondary" onClick={() => handlePrint("all")}>
                📄 طباعة الكل
              </Button>
              <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
              <Button
                variant="ghost"
                onClick={() => update({ seed: settings.seed + 1 })}
                title="اختيار أسئلة مختلفة بنفس الإعدادات"
              >
                🔄 توليد نماذج أخرى
              </Button>
              <Button variant="ghost" onClick={resetAll} title="إرجاع كل الإعدادات">
                ↺ إعادة ضبط
              </Button>
              <div className="ms-auto flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Badge tone="indigo">
                  {forms.length} نموذج × {perForm} أسئلة = {forms.length * perForm}{" "}
                  سؤال
                </Badge>
                <Badge tone={preview.withKey ? "emerald" : "slate"}>
                  {preview.withKey ? "أوراق إجابة منفصلة" : "بدون أوراق إجابة"}
                </Badge>
                <Badge tone="emerald">
                  {pointRange.min === pointRange.max
                    ? `${pointRange.min} درجة/نموذج`
                    : `${pointRange.min}–${pointRange.max} درجة/نموذج`}
                </Badge>
                <Badge tone="slate">{poolSize} سؤال متاح</Badge>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              عند الطباعة اختر مقاس <b>A4</b> وهوامش افتراضية، أو «حفظ كـ PDF»
              من قائمة الطابعة. كل اختيار في الصفحة يُحفظ فورًا، و«إعادة ضبط»
              ترجّع الإعدادات الافتراضية (45 نموذجًا).
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <h2 className="text-lg font-extrabold text-slate-900">
              معاينة الأوراق
            </h2>
            <span className="text-xs text-slate-400">
              {pages.length} ورقة أسئلة × {layout} نموذج — إجمالي {forms.length}{" "}
              نموذج
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
                layout={preview.layout}
                meta={meta}
                subject={essaySubject}
                grade={essayGrade}
                showLines={preview.showLines}
                showAnswers={preview.showAnswers}
                pageNumber={idx + 1}
                pageCount={pages.length}
              />
            ))}
          </div>

          {(preview.withKey || printTarget === "key") && forms.length > 0 && (
            <div className="essay-key mt-10 space-y-6">
              <div className="no-print">
                <h2 className="text-lg font-extrabold text-slate-900">
                  أوراق الإجابة النموذجية (منفصلة)
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {pages.length} ورقة — كل نموذج بإجاباته وبنفس أرقام أسئلته،
                  تُطبع وحدها من زرار «طباعة أوراق الإجابة».
                </p>
              </div>
              {pages.map((pageForms: EssayForm[], idx) => (
                <EssaySheet
                  key={`key-${idx}`}
                  forms={pageForms}
                  layout={preview.layout}
                  meta={meta}
                  subject={essaySubject}
                  grade={essayGrade}
                  showLines={false}
                  showAnswers={false}
                  pageNumber={idx + 1}
                  pageCount={pages.length}
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
