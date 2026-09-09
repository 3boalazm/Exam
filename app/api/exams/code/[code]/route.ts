import { publicHandler } from "@/lib/api";
import { getStore } from "@/lib/store";
import { ApiError } from "@/lib/utils";
import type { PublicExam } from "@/lib/questions/types";

export const runtime = "nodejs";

/**
 * جلب امتحان منشور للطالب — نسخة معقّمة:
 * بدون correctAnswer وبدون solution (التصحيح يتم Server-side).
 */
export const GET = publicHandler(async (_req, { params }) => {
  const code = params.code?.trim().toUpperCase();
  if (!code) throw new ApiError(400, "رابط غير صالح");

  const exam = await getStore().getExamByCode(code);
  if (!exam || exam.status !== "published") {
    throw new ApiError(404, "الامتحان غير متاح — تأكد من الرابط أو تواصل مع معلمك");
  }

  const questions = await getStore().listQuestions(exam.id);
  if (questions.length === 0) {
    throw new ApiError(404, "لا توجد أسئلة في هذا الامتحان");
  }

  const publicExam: PublicExam = {
    id: exam.id,
    code: exam.code as string,
    title: exam.title,
    subject: exam.subject,
    topic: exam.topic,
    topics: exam.topics ?? [exam.topic],
    subtopic: exam.subtopic,
    questionCount: questions.length,
    showResult: exam.showResult,
    questions: questions.map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      data: q.data,
      points: q.points,
    })),
  };

  return publicExam;
});
