"use client";

import type {
  EssayForm,
  EssayLayout,
  EssayMeta,
  EssayQuestion,
} from "@/lib/essay/types";

const BASE_FONT: Record<EssayLayout, string> = {
  4: "9px",
  2: "10.5px",
  1: "13.5px",
};

/**
 * عدد خطوط الإجابة يقل تلقائيًا كلما زاد عدد الأسئلة في النموذج
 * حتى لا يفيض المحتوى خارج مساحة النموذج في ورقة A4.
 */
const LINE_BUDGET: Record<EssayLayout, number> = { 4: 15, 2: 16, 1: 35 };
const MAX_LINES: Record<EssayLayout, number> = { 4: 3, 2: 4, 1: 10 };

function answerLineCount(layout: EssayLayout, questionCount: number): number {
  const fit = Math.floor(LINE_BUDGET[layout] / Math.max(1, questionCount));
  return Math.max(1, Math.min(MAX_LINES[layout], fit));
}

const GRID_CLASS: Record<EssayLayout, string> = {
  4: "grid-cols-2 grid-rows-2",
  2: "grid-cols-1 grid-rows-2",
  1: "grid-cols-1 grid-rows-1",
};

function AnswerLines({ count }: { count: number }) {
  return (
    <div className="mt-[0.3em] space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-b border-dotted border-slate-400"
          style={{ height: "1.55em" }}
        />
      ))}
    </div>
  );
}

function FormPaper({
  form,
  layout,
  meta,
  subject,
  grade,
  showLines,
}: {
  form: EssayForm;
  layout: EssayLayout;
  meta: EssayMeta;
  subject: string;
  grade: string;
  showLines: boolean;
}) {
  return (
    <article
      className="essay-form flex min-h-0 flex-col overflow-hidden border border-slate-300 bg-white p-[0.55em] text-slate-900"
      style={{ fontSize: BASE_FONT[layout] }}
    >
      <header className="flex items-start justify-between gap-[0.5em] border-b border-slate-300 pb-[0.3em]">
        <div className="min-w-0 flex-1">
          <div className="truncate font-extrabold leading-snug">
            {meta.title}
          </div>
          <div className="truncate text-slate-500">
            {meta.school ? `${meta.school} — ` : ""}
            {subject} — {grade}
          </div>
        </div>
        <div className="shrink-0 text-center leading-tight">
          <div className="border border-slate-400 px-[0.4em] py-[0.1em] font-extrabold">
            نموذج {form.number}
          </div>
          <div className="mt-[0.15em] tracking-wider text-slate-500">
            {form.code}
          </div>
        </div>
      </header>

      <div className="flex items-center gap-[0.4em] border-b border-dashed border-slate-300 py-[0.3em] text-slate-600">
        <span className="shrink-0">اسم الطالب:</span>
        <span className="flex-1 border-b border-dotted border-slate-400">
          &nbsp;
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-[0.6em] border-b border-slate-300 py-[0.25em] text-slate-600">
        <span>الصف: ..........</span>
        <span>التاريخ: ..........</span>
        <span className="font-bold">
          الدرجة: ...... / {form.totalPoints}
        </span>
      </div>

      <ol className="mt-[0.45em] flex-1 space-y-[0.45em]">
        {form.questions.map((q: EssayQuestion, idx) => (
          <li key={q.id} className="break-inside-avoid">
            <div className="flex items-start gap-[0.35em]">
              <span className="shrink-0 font-extrabold">{idx + 1}.</span>
              <p className="flex-1 leading-snug">
                {q.text}{" "}
                <span className="whitespace-nowrap text-slate-500">
                  ({q.points})
                </span>
              </p>
            </div>
            {showLines && (
              <AnswerLines
                count={answerLineCount(layout, form.questions.length)}
              />
            )}
          </li>
        ))}
      </ol>

      <div className="mt-[0.25em] flex items-center justify-between border-t border-slate-200 pt-[0.2em] text-slate-400">
        <span>الزمن: {meta.duration}</span>
        <span>توقيع المصحح: ..............</span>
      </div>
    </article>
  );
}

export function EssaySheet({
  forms,
  layout,
  meta,
  subject,
  grade,
  showLines,
  pageNumber,
  pageCount,
  kind = "forms",
}: {
  forms: EssayForm[];
  layout: EssayLayout;
  meta: EssayMeta;
  subject: string;
  grade: string;
  showLines: boolean;
  pageNumber: number;
  pageCount: number;
  kind?: "forms" | "key";
}) {
  return (
    <section className="essay-sheet flex flex-col bg-white p-[8mm] shadow-xl">
      <div className={`grid h-full flex-1 gap-[3mm] ${GRID_CLASS[layout]}`}>
        {forms.map((form) =>
          kind === "forms" ? (
            <FormPaper
              key={form.number}
              form={form}
              layout={layout}
              meta={meta}
              subject={subject}
              grade={grade}
              showLines={showLines}
            />
          ) : (
            <KeyPaper
              key={form.number}
              form={form}
              layout={layout}
              subject={subject}
            />
          )
        )}
      </div>
      <footer className="mt-[2mm] flex items-center justify-between text-[7px] text-slate-400">
        <span>
          {kind === "key" ? "مفتاح الإجابة" : "ورقة نماذج"} — صفحة {pageNumber}{" "}
          من {pageCount}
        </span>
        <span>Mini Exam — نماذج الأسئلة المقالية</span>
      </footer>
    </section>
  );
}

function KeyPaper({
  form,
  layout,
  subject,
}: {
  form: EssayForm;
  layout: EssayLayout;
  subject: string;
}) {
  return (
    <article
      className="essay-form flex min-h-0 flex-col overflow-hidden border border-slate-300 bg-white p-[0.55em] text-slate-900"
      style={{ fontSize: BASE_FONT[layout] }}
    >
      <header className="flex items-center justify-between border-b border-slate-300 pb-[0.25em]">
        <span className="font-extrabold">مفتاح نموذج {form.number}</span>
        <span className="text-slate-500">
          {subject} — {form.code}
        </span>
      </header>
      <ol className="mt-[0.35em] flex-1 space-y-[0.4em]">
        {form.questions.map((q, idx) => (
          <li key={q.id} className="break-inside-avoid leading-snug">
            <div className="font-bold text-slate-700">
              {idx + 1}) {q.topic}
            </div>
            <div className="text-slate-600">{q.answer}</div>
          </li>
        ))}
      </ol>
      <div className="mt-[0.2em] border-t border-slate-200 pt-[0.2em] text-slate-400">
        الدرجة الكلية: {form.totalPoints}
      </div>
    </article>
  );
}
