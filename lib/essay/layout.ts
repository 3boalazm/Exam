/** حسابات ملاءمة النص داخل مساحة النموذج في ورقة A4 */
import type { EssayLayout } from "./types";

export const BASE_FONT: Record<EssayLayout, number> = {
  4: 8.4,
  2: 10.6,
  1: 13.2,
};

/**
 * سعة الأحرف التقريبية في مساحة النموذج عند الخط الأساسي.
 * عند طباعة الإجابات مع الأسئلة نقلّل الخط تلقائيًا حتى لا يفيض المحتوى.
 */
export const CHAR_BUDGET: Record<EssayLayout, number> = {
  4: 1050,
  2: 4200,
  1: 9000,
};

export function fittedFontSize(
  layout: EssayLayout,
  questions: { text: string; answer: string }[],
  showAnswers: boolean
): number {
  const density = questions.reduce(
    (sum, q) => sum + q.text.length + (showAnswers ? q.answer.length : 0),
    0
  );
  const budget = CHAR_BUDGET[layout] * (showAnswers ? 1 : 1.6);
  const scale = Math.min(1, budget / Math.max(1, density));
  return Math.max(6.2, BASE_FONT[layout] * Math.max(0.66, scale));
}
