"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TeacherShell } from "@/components/teacher-shell";
import {
  ReviewQuestionBody,
  QuestionTypeBadge,
} from "@/components/question-view";
import {
  Alert,
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
  Field,
  Input,
  PageLoader,
  Select,
  Textarea,
} from "@/components/ui";
import { apiFetch, useTeacher } from "@/lib/client";
import {
  QUESTION_TYPES,
  TYPE_LABELS,
} from "@/lib/questions/validator";
import type {
  Exam,
  MCQData,
  MatchingData,
  OrderingData,
  Question,
  QuestionType,
  TrueFalseData,
} from "@/lib/questions/types";

interface ExamWithQuestions {
  exam: Exam;
  questions: Question[];
}

const STATUS_AR: Record<Exam["status"], { label: string; tone: "amber" | "emerald" | "slate" }> = {
  draft: { label: "مسودة — قابل للتعديل", tone: "amber" },
  published: { label: "منشور — الطلاب يمكنهم الدخول", tone: "emerald" },
  closed: { label: "مغلق — قابل للتعديل", tone: "slate" },
};

/* ================= Editor State ================= */

interface EditState {
  type: QuestionType;
  question: string;
  points: number;
  solution: string;
  options: string[];
  correctIndex: number;
  statement: string;
  correctBool: boolean;
  leftItems: string[];
  rightItems: string[];
  map: number[];
  orderedItems: string[];
}

function initEditState(q?: Question, type?: QuestionType): EditState {
  const base: EditState = {
    type: type ?? q?.type ?? "MCQ",
    question: q?.question ?? "",
    points: q?.points ?? 1,
    solution: q?.solution ?? "",
    options: ["", "", "", ""],
    correctIndex: 0,
    statement: "",
    correctBool: true,
    leftItems: ["", "", ""],
    rightItems: ["", "", ""],
    map: [0, 1, 2],
    orderedItems: ["", "", ""],
  };
  if (!q) return base;
  switch (q.type) {
    case "MCQ": {
      const d = q.data as MCQData;
      const idx = Math.max(
        0,
        d.options.indexOf(q.correctAnswer as string)
      );
      return { ...base, options: d.options, correctIndex: idx };
    }
    case "TRUE_FALSE":
      return {
        ...base,
        statement: (q.data as TrueFalseData).statement,
        correctBool: q.correctAnswer as boolean,
      };
    case "MATCHING": {
      const d = q.data as MatchingData;
      return {
        ...base,
        leftItems: [...d.leftItems],
        rightItems: [...d.rightItems],
        map: [...(q.correctAnswer as number[])],
      };
    }
    case "ORDERING":
      return {
        ...base,
        orderedItems: [...(q.correctAnswer as string[])],
      };
  }
}

function buildPayload(s: EditState) {
  switch (s.type) {
    case "MCQ":
      return {
        type: s.type,
        question: s.question.trim(),
        data: { options: s.options.map((o) => o.trim()) },
        correctAnswer: s.options[s.correctIndex]?.trim(),
        solution: s.solution.trim(),
        points: s.points,
      };
    case "TRUE_FALSE":
      return {
        type: s.type,
        question: s.statement.trim(),
        data: { statement: s.statement.trim() },
        correctAnswer: s.correctBool,
        solution: s.solution.trim(),
        points: s.points,
      };
    case "MATCHING":
      return {
        type: s.type,
        question: s.question.trim(),
        data: {
          leftItems: s.leftItems.map((x) => x.trim()),
          rightItems: s.rightItems.map((x) => x.trim()),
        },
        correctAnswer: s.map,
        solution: s.solution.trim(),
        points: s.points,
      };
    case "ORDERING":
      return {
        type: s.type,
        question: s.question.trim(),
        data: { items: s.orderedItems.map((x) => x.trim()) },
        correctAnswer: s.orderedItems.map((x) => x.trim()),
        solution: s.solution.trim(),
        points: s.points,
      };
  }
}

function isValidState(s: EditState): boolean {
  switch (s.type) {
    case "MCQ":
      return (
        s.question.trim().length >= 5 &&
        s.options.every((o) => o.trim().length > 0) &&
        new Set(s.options.map((o) => o.trim())).size === 4
      );
    case "TRUE_FALSE":
      return s.statement.trim().length >= 5;
    case "MATCHING":
      return (
        s.question.trim().length >= 5 &&
        s.leftItems.every((x) => x.trim()) &&
        s.rightItems.every((x) => x.trim())
      );
    case "ORDERING":
      return s.question.trim().length >= 5 && s.orderedItems.every((x) => x.trim());
  }
}

/* ================= Question Editor ================= */

function QuestionEditor({
  initial,
  isNew,
  onCancel,
  onSave,
}: {
  initial: EditState;
  isNew: boolean;
  onCancel: () => void;
  onSave: (s: EditState) => Promise<void>;
}) {
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (patch: Partial<EditState>) => setS((p) => ({ ...p, ...patch }));
  const valid = isValidState(s);

  async function submit() {
    if (!valid) {
      setErr("أكمل الحقول المطلوبة بشكل صحيح (4 اختيارات مختلفة، عناصر غير فارغة...)");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await onSave(s);
    } catch (e) {
      setErr((e as Error).message);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/40 p-4">
      {isNew && (
        <Field label="نوع السؤال">
          <Select
            value={s.type}
            onChange={(e) => {
              const t = e.target.value as QuestionType;
              setS(initEditState(undefined, t));
              set({ type: t, question: s.question });
            }}
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {s.type !== "TRUE_FALSE" && (
        <Field label="نص السؤال">
          <Textarea
            rows={2}
            value={s.question}
            onChange={(e) => set({ question: e.target.value })}
            placeholder="اكتب نص السؤال..."
          />
        </Field>
      )}

      {s.type === "MCQ" && (
        <div className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            الاختيارات (حدد الإجابة الصحيحة)
          </span>
          {s.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct-opt"
                checked={s.correctIndex === i}
                onChange={() => set({ correctIndex: i })}
                className="h-4 w-4 accent-emerald-600"
                title="الإجابة الصحيحة"
              />
              <Input
                value={opt}
                onChange={(e) => {
                  const options = [...s.options];
                  options[i] = e.target.value;
                  set({ options });
                }}
                placeholder={`اختيار ${["أ", "ب", "ج", "د"][i]}`}
              />
            </div>
          ))}
        </div>
      )}

      {s.type === "TRUE_FALSE" && (
        <div className="space-y-3">
          <Field label="العبارة">
            <Textarea
              rows={2}
              value={s.statement}
              onChange={(e) => set({ statement: e.target.value })}
              placeholder="اكتب العبارة (صح أم غلط)..."
            />
          </Field>
          <Field label="الإجابة الصحيحة">
            <Select
              value={s.correctBool ? "true" : "false"}
              onChange={(e) => set({ correctBool: e.target.value === "true" })}
            >
              <option value="true">صح</option>
              <option value="false">خطأ</option>
            </Select>
          </Field>
        </div>
      )}

      {s.type === "MATCHING" && (
        <div className="space-y-3">
          <span className="text-sm font-semibold text-slate-700">
            الأزواج — اختر ما يوصَّل بكل عنصر من اليسار
          </span>
          {s.leftItems.map((left, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={left}
                onChange={(e) => {
                  const leftItems = [...s.leftItems];
                  leftItems[i] = e.target.value;
                  set({ leftItems });
                }}
                placeholder={`عنصر ${i + 1} (يسار)`}
              />
              <span className="text-slate-400">←</span>
              <Select
                value={s.map[i] ?? 0}
                onChange={(e) => {
                  const map = [...s.map];
                  map[i] = Number(e.target.value);
                  set({ map });
                }}
                className="flex-1"
              >
                {s.rightItems.map((r, ri) => (
                  <option key={ri} value={ri}>
                    {r.trim() || `عنصر ${ri + 1}`}
                  </option>
                ))}
              </Select>
              {s.leftItems.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    set({
                      leftItems: s.leftItems.filter((_, x) => x !== i),
                      rightItems: s.rightItems.filter((_, x) => x !== i),
                      map: s.map.filter((_, x) => x !== i).map((v) =>
                        v > i ? v - 1 : v
                      ),
                    });
                  }}
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
          {s.leftItems.length < 6 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                set({
                  leftItems: [...s.leftItems, ""],
                  rightItems: [...s.rightItems, ""],
                  map: [...s.map, s.rightItems.length],
                })
              }
            >
              + إضافة زوج
            </Button>
          )}
          <div>
            <span className="text-sm font-semibold text-slate-700">
              عناصر العمود الأيمن
            </span>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {s.rightItems.map((r, i) => (
                <Input
                  key={i}
                  value={r}
                  onChange={(e) => {
                    const rightItems = [...s.rightItems];
                    rightItems[i] = e.target.value;
                    set({ rightItems });
                  }}
                  placeholder={`عنصر ${i + 1} (يمين)`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {s.type === "ORDERING" && (
        <div className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            العناصر بالترتيب الصحيح (1 أولًا، 2 ثانيًا...)
          </span>
          {s.orderedItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
                {i + 1}
              </span>
              <Input
                value={item}
                onChange={(e) => {
                  const orderedItems = [...s.orderedItems];
                  orderedItems[i] = e.target.value;
                  set({ orderedItems });
                }}
                placeholder={`المركز ${i + 1}`}
              />
              {s.orderedItems.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    set({
                      orderedItems: s.orderedItems.filter((_, x) => x !== i),
                    })
                  }
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
          {s.orderedItems.length < 8 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                set({ orderedItems: [...s.orderedItems, ""] })
              }
            >
              + إضافة عنصر
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الحل / الشرح">
          <Textarea
            rows={2}
            value={s.solution}
            onChange={(e) => set({ solution: e.target.value })}
            placeholder="شرح مختصر للحل..."
          />
        </Field>
        <Field label="الدرجة">
          <Input
            type="number"
            min={0.5}
            max={10}
            step={0.5}
            value={s.points}
            onChange={(e) =>
              set({ points: Math.max(0.5, Number(e.target.value) || 1) })
            }
          />
        </Field>
      </div>

      {err && <Alert tone="error">{err}</Alert>}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          إلغاء
        </Button>
        <Button onClick={submit} loading={saving} disabled={!valid}>
          {isNew ? "إضافة السؤال" : "حفظ التعديل"}
        </Button>
      </div>
    </div>
  );
}

/* ================= الصفحة ================= */

export default function ExamReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { config } = useTeacher();
  const [data, setData] = useState<ExamWithQuestions | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [busy, setBusy] = useState("");

  // إعدادات مشاركة الرسالة
  const [meta, setMeta] = useState({
    title: "",
    showResult: true,
    whatsappMessage: "",
  });
  const [metaSaved, setMetaSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<ExamWithQuestions>(`/api/exams/${id}`);
      setData(d);
      setMeta({
        title: d.exam.title,
        showResult: d.exam.showResult,
        whatsappMessage: d.exam.whatsappMessage ?? "",
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const exam = data?.exam ?? null;
  const questions = data?.questions ?? [];
  const isDraft = exam?.status === "draft";
  // تعديل الأسئلة مسموح في draft و closed — ممنوع فقط أثناء النشر
  const canEdit = exam?.status !== "published";

  const siteOrigin =
    config?.siteUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
  const examLink = exam?.code ? `${siteOrigin}/exam/${exam.code}` : "";

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 4000);
  }

  async function mutate(fn: () => Promise<unknown>, msg?: string) {
    setError("");
    try {
      await fn();
      await load();
      if (msg) flash(msg);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function publish() {
    setBusy("publish");
    await mutate(
      () =>
        apiFetch(`/api/exams/${id}`, {
          method: "PATCH",
          body: { status: "published" },
        }),
      "تم نشر الاختبار 🎉"
    );
    setBusy("");
  }

  async function closeExam() {
    setBusy("close");
    await mutate(
      () =>
        apiFetch(`/api/exams/${id}`, {
          method: "PATCH",
          body: { status: "closed" },
        }),
      "تم إغلاق الاختبار"
    );
    setBusy("");
  }

  async function deleteExam() {
    if (!confirm("حذف الاختبار نهائيًا مع كل الأسئلة والنتائج؟")) return;
    setBusy("delete");
    try {
      await apiFetch(`/api/exams/${id}`, { method: "DELETE" });
      window.location.href = "/dashboard";
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  }

  async function saveMeta() {
    setBusy("meta");
    await mutate(
      () =>
        apiFetch(`/api/exams/${id}`, {
          method: "PATCH",
          body: {
            title: meta.title,
            showResult: meta.showResult,
            whatsappMessage: meta.whatsappMessage,
          },
        }),
      "تم حفظ الإعدادات"
    );
    setMetaSaved(true);
    setTimeout(() => setMetaSaved(false), 2000);
    setBusy("");
  }

  function openEditor(q?: Question) {
    setEditState(initEditState(q));
    setEditing(q ? q.id : "new");
  }

  async function handleSaveQuestion(s: EditState) {
    const payload = buildPayload(s);
    if (editing === "new") {
      await apiFetch("/api/questions", {
        body: { ...payload, examId: id },
      });
    } else if (editing) {
      await apiFetch(`/api/questions/${editing}`, {
        method: "PATCH",
        body: payload,
      });
    }
    setEditing(null);
    setEditState(null);
    await load();
  }

  async function regenerate(q: Question) {
    if (!confirm("إعادة توليد هذا السؤال بديلًا مشابهًا؟")) return;
    setBusy(q.id);
    setError("");
    try {
      await apiFetch(`/api/questions/${q.id}/regenerate`, {});
      await load();
      flash("تم توليد سؤال بديل ✅");
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy("");
  }

  async function removeQuestion(q: Question) {
    if (!confirm("حذف هذا السؤال؟")) return;
    setBusy(q.id);
    await mutate(
      () => apiFetch(`/api/questions/${q.id}`, { method: "DELETE" }),
      "تم حذف السؤال"
    );
    setBusy("");
  }

  async function move(q: Question, dir: -1 | 1) {
    const ids = questions.map((x) => x.id);
    const i = ids.indexOf(q.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setBusy(q.id);
    await mutate(() =>
      apiFetch("/api/questions/reorder", {
        body: { examId: id, orderedIds: ids },
      })
    );
    setBusy("");
  }

  if (!data && !error) return <PageLoader message="جارٍ تحميل الاختبار..." />;

  if (!data) {
    return (
      <TeacherShell title="الاختبار">
        <Alert tone="error">{error}</Alert>
      </TeacherShell>
    );
  }

  const status = STATUS_AR[exam!.status];

  return (
    <TeacherShell
      title={exam!.title}
      actions={
        <>
          <Link href={`/exams/${id}/results`}>
            <Button variant="secondary">📊 النتائج</Button>
          </Link>
          {isDraft && (
            <Button variant="success" loading={busy === "publish"} onClick={publish}>
              🚀 نشر الاختبار
            </Button>
          )}
          {exam!.status === "published" && (
            <Button variant="secondary" loading={busy === "close"} onClick={closeExam}>
              إيقاف
            </Button>
          )}
          {exam!.status === "closed" && (
            <Button variant="success" loading={busy === "close"} onClick={publish}>
              إعادة نشر
            </Button>
          )}
          <Button variant="ghost" loading={busy === "delete"} onClick={deleteExam}>
            🗑
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        {/* الشريط العلوي */}
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={status.tone}>{status.label}</Badge>
            <Badge tone="slate">{exam!.subject}</Badge>
            <Badge tone="slate">{exam!.topic}</Badge>
            {exam!.subtopic && <Badge tone="slate">{exam!.subtopic}</Badge>}
            <Badge tone="sky">
              {questions.length} سؤال · {questions.reduce((s, q) => s + q.points, 0)} درجة
            </Badge>
            {exam!.code && <Badge tone="indigo">{exam!.code}</Badge>}
          </div>

          {exam!.code && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-sm font-bold text-emerald-800">
                رابط الامتحان — أرسله لطلابك:
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 text-sm text-slate-700" dir="ltr">
                  {examLink}
                </code>
                <CopyButton text={examLink} label="نسخ الرابط" />
              </div>
            </div>
          )}
        </Card>

        {/* إعدادات الاختبار */}
        {canEdit && (
          <Card title="إعدادات الامتحان">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="عنوان الاختبار">
                <Input
                  value={meta.title}
                  onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                />
              </Field>
              <Field
                label="رسالة إضافية في WhatsApp"
                hint="تظهر بعد الدرجة (مثل: «راجع الدرس الأول وحاول في الاختبار القادم»)"
              >
                <Input
                  value={meta.whatsappMessage}
                  onChange={(e) =>
                    setMeta({ ...meta, whatsappMessage: e.target.value })
                  }
                  placeholder="اختياري..."
                />
              </Field>
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={meta.showResult}
                onChange={(e) => setMeta({ ...meta, showResult: e.target.checked })}
                className="h-5 w-5 accent-indigo-600"
              />
              <span className="text-sm font-semibold text-slate-700">
                إظهار النتيجة للطالب فورًا بعد التسليم
              </span>
            </label>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" size="sm" loading={busy === "meta"} onClick={saveMeta}>
                {metaSaved ? "✓ تم الحفظ" : "حفظ الإعدادات"}
              </Button>
            </div>
          </Card>
        )}

        {/* الأسئلة */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-800">
            الأسئلة ({questions.length})
          </h2>
          {canEdit && (
            <Button variant="secondary" size="sm" onClick={() => openEditor()}>
              + إضافة سؤال يدويًا
            </Button>
          )}
        </div>

        {questions.length === 0 ? (
          <EmptyState
            icon="❓"
            title="لا توجد أسئلة"
            sub={canEdit ? "أضف سؤالًا يدويًا أو أعد التوليد من صفحة الإنشاء" : undefined}
          />
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {idx + 1}
                  </span>
                  <QuestionTypeBadge type={q.type} />
                  <Badge tone="slate">{q.points} {q.points === 1 ? "درجة" : "درجات"}</Badge>
                  {q.difficulty && <Badge tone="sky">{q.difficulty}</Badge>}
                  {canEdit && (
                    <div className="ms-auto flex flex-wrap items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={busy === q.id}
                        onClick={() => move(q, -1)}
                        disabled={idx === 0}
                        title="تحريك لأعلى"
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={busy === q.id}
                        onClick={() => move(q, 1)}
                        disabled={idx === questions.length - 1}
                        title="تحريك لأسفل"
                      >
                        ↓
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => openEditor(q)}>
                        ✏️ تعديل
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={busy === q.id}
                        onClick={() => regenerate(q)}
                      >
                        🔄 إعادة توليد
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={busy === q.id}
                        onClick={() => removeQuestion(q)}
                      >
                        🗑 حذف
                      </Button>
                    </div>
                  )}
                </div>

                <p className="mt-3 font-bold leading-relaxed text-slate-900">
                  {q.question}
                </p>

                {editing === q.id && editState ? (
                  <div className="mt-4">
                    <QuestionEditor
                      initial={editState}
                      isNew={false}
                      onCancel={() => {
                        setEditing(null);
                        setEditState(null);
                      }}
                      onSave={handleSaveQuestion}
                    />
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <ReviewQuestionBody question={q} />
                    {q.solution && (
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <span className="font-bold text-slate-700">الحل: </span>
                        {q.solution}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {editing === "new" && editState && (
              <div className="rounded-2xl border-2 border-dashed border-indigo-300 bg-white p-5 shadow-sm">
                <QuestionEditor
                  initial={editState}
                  isNew
                  onCancel={() => {
                    setEditing(null);
                    setEditState(null);
                  }}
                  onSave={handleSaveQuestion}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </TeacherShell>
  );
}
