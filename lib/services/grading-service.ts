/**
 * GradingService — التصحيح التلقائي (بدون AI).
 *
 * الطالب يرسل إجاباته فقط:
 *   { answers: { q1: "B", q2: true, q3: [0,2,1] } }
 * والسيرفر يقرأ الإجابات الصحيحة من Firebase ويحسب الدرجة.
 * مستحيل على الطالب تزوير النتيجة لأنه لا يرسل score أبدًا.
 */
import { getStore } from "@/lib/store";
import { toWaPhone } from "@/lib/whatsapp/message";
import { ApiError, randomId } from "@/lib/utils";
import { gradeAttempt } from "@/lib/questions/grader";
import type { Attempt } from "@/lib/questions/types";

export interface SubmitInput {
  examCode: string;
  studentName: string;
  studentPhone: string;
  answers?: Record<string, unknown>;
}

export interface SubmitResult {
  attempt: Attempt;
  score: number;
  total: number;
  percentage: number;
  /** true إذا كانت نفس المحاولات السابقة لنفس الرقم */
  duplicate: boolean;
}

export async function submitAttempt(input: SubmitInput): Promise<SubmitResult> {
  const store = getStore();
  const exam = await store.getExamByCode(input.examCode.trim());
  if (!exam || exam.status !== "published") {
    throw new ApiError(404, "الامتحان غير متاح — تأكد من الرابط أو تواصل مع معلمك");
  }

  const phone = toWaPhone(input.studentPhone);
  const name = input.studentName.trim();

  // منع تكرار المحاولة لنفس الرقم على نفس الامتحان
  const existing = await store.findAttemptByExamAndPhone(exam.id, phone);
  if (existing) {
    return {
      attempt: existing,
      score: existing.score,
      total: existing.totalScore,
      percentage: existing.percentage,
      duplicate: true,
    };
  }

  const questions = await store.listQuestions(exam.id);
  if (questions.length === 0) {
    throw new ApiError(400, "لا توجد أسئلة في هذا الامتحان");
  }

  // التصحيح — Server-side فقط
  const { score, totalScore, percentage, answers } = gradeAttempt(
    questions,
    input.answers
  );

  const attempt: Attempt = {
    id: randomId("att_"),
    examId: exam.id,
    studentName: name,
    studentPhone: phone,
    score,
    totalScore,
    percentage,
    submittedAt: Date.now(),
  };

  await store.createAttempt(
    attempt,
    answers.map((a) => ({
      questionId: a.questionId,
      answer: a.answer,
      isCorrect: a.isCorrect,
      points: a.points,
    }))
  );

  return { attempt, score, total: totalScore, percentage, duplicate: false };
}
