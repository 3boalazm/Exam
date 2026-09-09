/**
 * Validators — أي سؤال خارج من Groq (أو إدخال يدوي) يمر هنا قبل الحفظ.
 *
 * Schema Validation → Content Validation → Answer Validation → Math/Solution Validation
 * وأي فشل = Reject ثم Regenerate.
 */
import { normalizeText } from "@/lib/utils";
import type { GeneratedQuestion, QuestionType } from "./types";

export const QUESTION_TYPES: QuestionType[] = [
  "MCQ",
  "TRUE_FALSE",
  "MATCHING",
  "ORDERING",
];

export const TYPE_LABELS: Record<QuestionType, string> = {
  MCQ: "اختيار من متعدد",
  TRUE_FALSE: "صح / غلط",
  MATCHING: "توصيل",
  ORDERING: "ترتيب",
};

export type ValidationResult =
  | { ok: true; question: GeneratedQuestion }
  | { ok: false; reason: string };

/** هل الحل المطروح يتطابق مع الإجابة الصحيحة؟ (فحص خفيف ومنطقي) */
export function solutionMatchesAnswer(correct: unknown, solution: string): boolean {
  if (typeof correct === "boolean") return true;
  if (typeof correct === "string") {
    const normCorrect = normalizeText(correct);
    const normSol = normalizeText(solution);
    if (normCorrect && normSol.includes(normCorrect)) return true;
    // مقارنة رقمية: هل الرقم الصحيح ظاهر في الحل؟
    const num = parseFloat(correct.replace(/[^\d.-]/g, ""));
    if (!isNaN(num)) {
      const nums = (solution.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
      if (nums.includes(num)) return true;
    }
    return false;
  }
  return true; // MATCHING / ORDERING: لا يوجد فحص نصي بسيط
}

/**
 * التحقق الكامل من سؤال (مولد أو يدوي).
 * - strict=true (مولد من AI): يفحص تطابق الحل مع الإجابة أيضًا
 * - strict=false (تعديل يدوي من المعلم): يفحص الشكل فقط، والمعلم حر في نص الحل
 */
export function validateQuestion(
  raw: unknown,
  opts: { strict?: boolean } = {}
): ValidationResult {
  const strict = opts.strict !== false;
  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "JSON غير صالح" };
  }
  const r = raw as Record<string, unknown>;
  const type = r.type as QuestionType;
  if (!QUESTION_TYPES.includes(type)) {
    return { ok: false, reason: "نوع سؤال غير معروف" };
  }

  const question = typeof r.question === "string" ? r.question.trim() : "";
  if (question.length < 5) {
    return { ok: false, reason: "نص السؤال قصير أو مفقود" };
  }

  const data = (r.data ?? {}) as Record<string, unknown>;
  const solution = typeof r.solution === "string" ? r.solution.trim() : "";
  const points =
    typeof r.points === "number" && r.points > 0 && r.points <= 20 ? r.points : 1;

  /* ---------------- MCQ ---------------- */
  if (type === "MCQ") {
    const rawOptions = data.options;
    if (!Array.isArray(rawOptions) || rawOptions.length !== 4) {
      return { ok: false, reason: "MCQ يجب أن يكون له 4 اختيارات بالضبط" };
    }
    const options = rawOptions.map((o) =>
      typeof o === "string" ? o.trim() : ""
    );
    if (options.some((o) => o.length === 0)) {
      return { ok: false, reason: "MCQ: توجد اختيارات فارغة" };
    }
    if (new Set(options.map(normalizeText)).size !== 4) {
      return { ok: false, reason: "MCQ: توجد اختيارات مكررة" };
    }
    if (typeof r.correctAnswer !== "string") {
      return { ok: false, reason: "MCQ: الإجابة الصحيحة يجب أن تكون نصًا" };
    }
    const correct = (r.correctAnswer as string).trim();
    if (!options.includes(correct)) {
      return { ok: false, reason: "MCQ: الإجابة الصحيحة غير موجودة بين الاختيارات" };
    }
    if (strict && solution && !solutionMatchesAnswer(correct, solution)) {
      return { ok: false, reason: "MCQ: الحل لا يتطابق مع الإجابة الصحيحة" };
    }
    return {
      ok: true,
      question: {
        type,
        question,
        data: { options },
        correctAnswer: correct,
        solution: solution || undefined,
        points,
      },
    };
  }

  /* ---------------- TRUE_FALSE ---------------- */
  if (type === "TRUE_FALSE") {
    const statement =
      typeof data.statement === "string" ? data.statement.trim() : "";
    if (statement.length < 5) {
      return { ok: false, reason: "TRUE_FALSE: العبارة مفقودة أو قصيرة" };
    }
    if (typeof r.correctAnswer !== "boolean") {
      return { ok: false, reason: "TRUE_FALSE: الإجابة يجب أن تكون true أو false" };
    }
    return {
      ok: true,
      question: {
        type,
        question,
        data: { statement },
        correctAnswer: r.correctAnswer,
        solution: solution || undefined,
        points,
      },
    };
  }

  /* ---------------- MATCHING ---------------- */
  if (type === "MATCHING") {
    const left = data.leftItems;
    const right = data.rightItems;
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return { ok: false, reason: "MATCHING: leftItems / rightItems مفقودة" };
    }
    const L = left.map((x) => String(x).trim());
    const R = right.map((x) => String(x).trim());
    if (L.length < 3 || L.length > 6) {
      return { ok: false, reason: "MATCHING: يجب أن يكون عدد الأزواج بين 3 و 6" };
    }
    if (L.length !== R.length) {
      return { ok: false, reason: "MATCHING: عدد العناصر في الطرفين غير متساوٍ" };
    }
    if (L.some((s) => !s) || R.some((s) => !s)) {
      return { ok: false, reason: "MATCHING: توجد عناصر فارغة" };
    }
    if (new Set(L.map(normalizeText)).size !== L.length) {
      return { ok: false, reason: "MATCHING: عناصر مكررة في العمود الأيسر" };
    }
    if (new Set(R.map(normalizeText)).size !== R.length) {
      return { ok: false, reason: "MATCHING: عناصر مكررة في العمود الأيمن" };
    }
    if (!Array.isArray(r.correctAnswer)) {
      return { ok: false, reason: "MATCHING:Mapping غير موجود" };
    }
    const map = r.correctAnswer as unknown[];
    if (map.length !== L.length) {
      return { ok: false, reason: "MATCHING:Mapping غير مكتمل" };
    }
    if (
      !map.every(
        (v) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < R.length
      )
    ) {
      return { ok: false, reason: "MATCHING: قيم Mapping خارج النطاق" };
    }
    if (new Set(map).size !== map.length) {
      return { ok: false, reason: "MATCHING:Mapping يجب أن يكون حيدًا (بدون تكرار)" };
    }
    return {
      ok: true,
      question: {
        type,
        question,
        data: { leftItems: L, rightItems: R },
        correctAnswer: map.map(Number),
        solution: solution || undefined,
        points,
      },
    };
  }

  /* ---------------- ORDERING ---------------- */
  {
    const items = data.items;
    if (!Array.isArray(items) || items.length < 3 || items.length > 8) {
      return { ok: false, reason: "ORDERING: يجب أن يكون عدد العناصر بين 3 و 8" };
    }
    const I = items.map((x) => String(x).trim());
    if (I.some((s) => !s)) {
      return { ok: false, reason: "ORDERING: توجد عناصر فارغة" };
    }
    if (new Set(I.map(normalizeText)).size !== I.length) {
      return { ok: false, reason: "ORDERING: توجد عناصر مكررة" };
    }
    if (!Array.isArray(r.correctAnswer)) {
      return { ok: false, reason: "ORDERING: الترتيب الصحيح غير موجود" };
    }
    const C = (r.correctAnswer as unknown[]).map((x) => String(x).trim());
    if (C.length !== I.length) {
      return { ok: false, reason: "ORDERING: الترتيب الصحيح غير مكتمل" };
    }
    const sortedI = [...I].sort();
    const sortedC = [...C].sort();
    const isPermutation =
      new Set(C).size === C.length &&
      sortedC.every((v, i) => v === sortedI[i]);
    if (!isPermutation) {
      return { ok: false, reason: "ORDERING: الترتيب الصحيح ليس رتبًا (permutation) للعناصر نفسها" };
    }
    return {
      ok: true,
      question: {
        type,
        question,
        data: { items: I },
        correctAnswer: C,
        solution: solution || undefined,
        points,
      },
    };
  }
}
