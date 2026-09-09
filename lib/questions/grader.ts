/**
 * التصحيح التلقائي — يعمل Server-side فقط وبدون AI.
 * الطالب يرسل إجاباته فقط، والدرجة تُحسب هنا من الإجابات الصحيحة
 * المخزنة في Firebase.
 */
import type { Question } from "./types";

/** هل إجابة الطالب صحيحة لهذا السؤال؟ */
export function gradeAnswer(q: Question, answer: unknown): boolean {
  switch (q.type) {
    case "MCQ":
      // مقارنة مباشرة بنص الاختيار الصحيح
      return typeof answer === "string" && answer === q.correctAnswer;

    case "TRUE_FALSE":
      return answer === q.correctAnswer;

    case "MATCHING": {
      const correct = q.correctAnswer as number[];
      if (!Array.isArray(answer)) return false;
      if (answer.length !== correct.length) return false;
      return correct.every((c, i) => answer[i] === c);
    }

    case "ORDERING": {
      const correct = q.correctAnswer as string[];
      if (!Array.isArray(answer)) return false;
      if (answer.length !== correct.length) return false;
      return correct.every((c, i) => String(answer[i]).trim() === c);
    }

    default:
      return false;
  }
}

export interface GradedAnswer {
  questionId: string;
  answer: unknown;
  isCorrect: boolean;
  points: number;
}

export interface GradingResult {
  score: number;
  totalScore: number;
  percentage: number;
  answers: GradedAnswer[];
}

/** تصحيح محاولة كاملة: score = مجموع نقاط الصحيحة، percentage = score/total × 100 */
export function gradeAttempt(
  questions: Question[],
  answers: Record<string, unknown> | undefined
): GradingResult {
  const totalScore = questions.reduce((s, q) => s + q.points, 0);
  let score = 0;

  const graded: GradedAnswer[] = questions.map((q) => {
    const a = answers ? answers[q.id] : undefined;
    const answer = a === undefined ? null : a;
    const isCorrect = gradeAnswer(q, answer);
    if (isCorrect) score += q.points;
    return {
      questionId: q.id,
      answer,
      isCorrect,
      points: isCorrect ? q.points : 0,
    };
  });

  const percentage = totalScore > 0 ? Math.round((score / totalScore) * 100) : 0;
  return { score, totalScore, percentage, answers: graded };
}
