"use client";

/**
 * مكونات عرض السؤال حسب النوع:
 * - ReviewQuestionBody: للمعلم (مع الإجابة الصحيحة والحل)
 * - StudentQuestionBody: للطالب (تفاعلي)
 * - AnswerDisplay: إجابة الطالب في شاشة النتائج
 */
import type {
  MatchingData,
  MCQData,
  OrderingData,
  Question,
  TrueFalseData,
} from "@/lib/questions/types";
import { seededShuffle } from "@/lib/utils";
import { Badge } from "./ui";

const LETTERS = ["أ", "ب", "ج", "د", "هـ", "و"];

export function QuestionTypeBadge({ type }: { type: Question["type"] }) {
  const map: Record<Question["type"], { label: string; tone: "indigo" | "sky" | "amber" | "emerald" }> = {
    MCQ: { label: "اختيار من متعدد", tone: "indigo" },
    TRUE_FALSE: { label: "صح / غلط", tone: "sky" },
    MATCHING: { label: "توصيل", tone: "amber" },
    ORDERING: { label: "ترتيب", tone: "emerald" },
  };
  const m = map[type];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/* ================= عرض للمعلم (Review) ================= */

export function ReviewQuestionBody({ question }: { question: Question }) {
  switch (question.type) {
    case "MCQ": {
      const d = question.data as MCQData;
      const correct = question.correctAnswer as string;
      return (
        <div className="space-y-2">
          {d.options.map((opt, i) => {
            const isCorrect = opt === correct;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm ${
                  isCorrect
                    ? "border-emerald-300 bg-emerald-50 font-semibold text-emerald-800"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isCorrect ? "bg-emerald-600 text-white" : "bg-white border border-slate-300 text-slate-500"
                  }`}
                >
                  {LETTERS[i]}
                </span>
                <span>{opt}</span>
                {isCorrect && <span className="ms-auto text-xs">✓ الإجابة الصحيحة</span>}
              </div>
            );
          })}
        </div>
      );
    }

    case "TRUE_FALSE": {
      const d = question.data as TrueFalseData;
      const correct = question.correctAnswer as boolean;
      return (
        <div className="space-y-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-800">
            {d.statement}
          </div>
          <div className="flex gap-2">
            <span
              className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                correct ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
              }`}
            >
              ✓ صح {correct ? "(الإجابة الصحيحة)" : ""}
            </span>
            <span
              className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                !correct ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-400"
              }`}
            >
              ✗ خطأ {!correct ? "(الإجابة الصحيحة)" : ""}
            </span>
          </div>
        </div>
      );
    }

    case "MATCHING": {
      const d = question.data as MatchingData;
      const map = question.correctAnswer as number[];
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-right font-semibold">العمود الأول</th>
                <th className="px-3 py-2 text-center font-semibold">↔</th>
                <th className="px-3 py-2 text-right font-semibold">التوصيل الصحيح</th>
              </tr>
            </thead>
            <tbody>
              {d.leftItems.map((left, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-800">{left}</td>
                  <td className="px-3 py-2 text-center text-slate-400">←</td>
                  <td className="px-3 py-2 font-semibold text-emerald-700">
                    {d.rightItems[map[i]]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "ORDERING": {
      const d = question.data as OrderingData;
      const correct = question.correctAnswer as string[];
      return (
        <ol className="space-y-1.5">
          {correct.map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3.5 py-2 text-sm text-slate-800"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      );
    }
  }
}

/* ================= عرض للطالب (تفاعلي) ================= */

/**
 * الشكل الأدنى الذي تحتاجه واجهة الطالب — لا يحتوي correctAnswer
 * إطلاقًا (نسخة الطالب معقّمة من الخادم).
 */
export interface StudentQuestionShape {
  id: string;
  type: Question["type"];
  question: string;
  data: Question["data"];
  points: number;
}

export interface StudentQuestionProps {
  question: StudentQuestionShape;
  answer: unknown;
  onChange: (answer: unknown) => void;
}

export function StudentQuestionBody({ question, answer, onChange }: StudentQuestionProps) {
  switch (question.type) {
    case "MCQ": {
      const d = question.data as MCQData;
      return (
        <div className="space-y-2">
          {d.options.map((opt, i) => {
            const selected = answer === opt;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onChange(opt)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-right text-sm transition-colors ${
                  selected
                    ? "border-indigo-500 bg-indigo-50 font-semibold text-indigo-800 ring-2 ring-indigo-100"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    selected ? "bg-indigo-600 text-white" : "border border-slate-300 bg-white text-slate-500"
                  }`}
                >
                  {LETTERS[i]}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    case "TRUE_FALSE": {
      const d = question.data as TrueFalseData;
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-base leading-relaxed text-slate-800">
            {d.statement}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChange(true)}
              className={`rounded-xl border px-4 py-3 text-base font-bold transition-colors ${
                answer === true
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100"
                  : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
              }`}
            >
              ✓ صح
            </button>
            <button
              type="button"
              onClick={() => onChange(false)}
              className={`rounded-xl border px-4 py-3 text-base font-bold transition-colors ${
                answer === false
                  ? "border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-100"
                  : "border-slate-200 bg-white text-slate-600 hover:border-rose-300"
              }`}
            >
              ✗ خطأ
            </button>
          </div>
        </div>
      );
    }

    case "MATCHING": {
      const d = question.data as MatchingData;
      const shuffled = seededShuffle(d.rightItems.map((_, i) => i), question.id);
      const map = (Array.isArray(answer) ? answer : []) as (number | null)[];
      return (
        <div className="space-y-2.5">
          {d.leftItems.map((left, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5">
              <span className="flex-1 text-sm font-medium text-slate-800">{left}</span>
              <span className="text-slate-300">←</span>
              <select
                className="w-44 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                value={map[i] ?? ""}
                onChange={(e) => {
                  const next = [...map];
                  while (next.length < d.leftItems.length) next.push(null);
                  next[i] = e.target.value === "" ? null : Number(e.target.value);
                  onChange(next);
                }}
              >
                <option value="">— اختر —</option>
                {shuffled.map((origIdx) => (
                  <option key={origIdx} value={origIdx}>
                    {d.rightItems[origIdx]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
    }

    case "ORDERING": {
      const d = question.data as OrderingData;
      const order = (Array.isArray(answer) ? answer : seededShuffle(d.items, question.id)) as string[];
      const move = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= order.length) return;
        const next = [...order];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
      };
      return (
        <div className="space-y-2">
          {order.map((item, i) => (
            <div key={item} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                {i + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-slate-800">{item}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }
  }
}

/* ================= إجابة الطالب في شاشة النتائج ================= */

export function AnswerDisplay({
  question,
  answer,
}: {
  question: Question;
  answer: unknown;
}) {
  const answered =
    answer !== null &&
    answer !== undefined &&
    !(Array.isArray(answer) && answer.every((v) => v === null || v === ""));

  if (!answered) {
    return <span className="text-sm text-slate-400">لم يُجب</span>;
  }

  switch (question.type) {
    case "MCQ":
      return <span className="text-sm font-semibold text-slate-700">{String(answer)}</span>;

    case "TRUE_FALSE":
      return (
        <span
          className={`text-sm font-semibold ${answer === true ? "text-emerald-600" : "text-rose-600"}`}
        >
          {answer === true ? "✓ صح" : "✗ خطأ"}
        </span>
      );

    case "MATCHING": {
      const d = question.data as MatchingData;
      const map = answer as (number | null)[];
      return (
        <div className="space-y-1">
          {d.leftItems.map((left, i) => (
            <div key={i} className="text-xs text-slate-600">
              {left} ←{" "}
              <span className="font-semibold">
                {map[i] != null && map[i] < d.rightItems.length
                  ? d.rightItems[map[i]]
                  : "—"}
              </span>
            </div>
          ))}
        </div>
      );
    }

    case "ORDERING": {
      const order = answer as string[];
      return (
        <ol className="space-y-0.5">
          {order.map((item, i) => (
            <li key={i} className="text-xs text-slate-600">
              <span className="font-bold">{i + 1}.</span> {item}
            </li>
          ))}
        </ol>
      );
    }
  }
}
