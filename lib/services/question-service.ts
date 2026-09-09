/**
 * QuestionService — CRUD للأسئلة + إعادة التوليد + إعادة الترتيب
 */
import { getStore } from "@/lib/store";
import {
  ApiError,
  normalizeText,
  randomId,
} from "@/lib/utils";
import { validateQuestion } from "@/lib/questions/validator";
import { settingsFromExam } from "./exam-service";
import { generateReplacement } from "@/lib/questions/generator";
import type { Exam, Question } from "@/lib/questions/types";

async function getOwnedExamOfQuestion(
  questionId: string,
  teacherId: string
): Promise<{ exam: Exam; question: Question }> {
  const store = getStore();
  const question = await store.getQuestion(questionId);
  if (!question || !question.examId) {
    throw new ApiError(404, "السؤال غير موجود");
  }
  const exam = await store.getExam(question.examId);
  if (!exam) throw new ApiError(404, "الاختبار غير موجود");
  if (exam.teacherId !== teacherId) {
    throw new ApiError(403, "ليس لديك صلاحية على هذا الاختبار");
  }
  return { exam, question };
}

/** إضافة سؤال يدوي */
export async function addQuestion(
  teacherId: string,
  payload: {
    examId: string;
    type: Question["type"];
    question: string;
    /** يُتحقق من شكله في validateQuestion */
    data: Record<string, unknown>;
    correctAnswer: unknown;
    solution?: string;
    points: number;
  }
): Promise<Question> {
  const store = getStore();
  const exam = await store.getExam(payload.examId);
  if (!exam) throw new ApiError(404, "الاختبار غير موجود");
  if (exam.teacherId !== teacherId) {
    throw new ApiError(403, "ليس لديك صلاحية على هذا الاختبار");
  }
  if (exam.status === "published") {
    throw new ApiError(400, "لا يمكن تعديل أسئلة امتحان منشور — أغلقه أولًا");
  }

  const v = validateQuestion(
    {
      type: payload.type,
      question: payload.question,
      data: payload.data,
      correctAnswer: payload.correctAnswer,
      solution: payload.solution,
      points: payload.points,
    },
    { strict: false }
  );
  if (!v.ok) throw new ApiError(400, v.reason);

  // فحص التكرار داخل نفس الاختبار
  const existing = await store.listQuestions(payload.examId);
  const norm = new Set(existing.map((q) => normalizeText(q.question)));
  if (norm.has(normalizeText(v.question.question))) {
    throw new ApiError(400, "هذا السؤال موجود بالفعل في الاختبار");
  }

  const question: Question = {
    ...v.question,
    id: randomId("q_"),
    examId: payload.examId,
    order: existing.length + 1,
    subject: exam.subject,
    topic: exam.topic,
    subtopic: exam.subtopic,
  };
  return store.createQuestion(question);
}

/** تعديل سؤال (نص/اختيارات/إجابة/درجة/حل) */
export async function updateQuestion(
  teacherId: string,
  questionId: string,
  payload: {
    question: string;
    /** يُتحقق من شكله في validateQuestion */
    data: Record<string, unknown>;
    correctAnswer: unknown;
    solution?: string;
    points: number;
  }
): Promise<Question> {
  const store = getStore();
  const { exam, question } = await getOwnedExamOfQuestion(questionId, teacherId);
  if (exam.status === "published") {
    throw new ApiError(400, "لا يمكن تعديل أسئلة امتحان منشور — أغلقه أولًا");
  }

  const v = validateQuestion(
    {
      type: question.type,
      question: payload.question,
      data: payload.data,
      correctAnswer: payload.correctAnswer,
      solution: payload.solution,
      points: payload.points,
    },
    { strict: false }
  );
  if (!v.ok) throw new ApiError(400, v.reason);

  const others = (await store.listQuestions(exam.id)).filter(
    (q) => q.id !== questionId
  );
  const norm = new Set(others.map((q) => normalizeText(q.question)));
  if (norm.has(normalizeText(v.question.question))) {
    throw new ApiError(400, "هذا السؤال موجود بالفعل في الاختبار");
  }

  return store.updateQuestion(questionId, {
    question: v.question.question,
    data: v.question.data,
    correctAnswer: v.question.correctAnswer,
    solution: v.question.solution,
    points: v.question.points,
  });
}

/** حذف سؤال */
export async function deleteQuestion(
  teacherId: string,
  questionId: string
): Promise<void> {
  const { exam } = await getOwnedExamOfQuestion(questionId, teacherId);
  if (exam.status === "published") {
    throw new ApiError(400, "لا يمكن حذف أسئلة امتحان منشور — أغلقه أولًا");
  }
  await getStore().deleteQuestion(questionId);
}

/** إعادة ترتيب الأسئلة (قائمة معرّفات بالترتيب الجديد) */
export async function reorderQuestions(
  teacherId: string,
  examId: string,
  orderedIds: string[]
): Promise<void> {
  const store = getStore();
  const exam = await store.getExam(examId);
  if (!exam) throw new ApiError(404, "الاختبار غير موجود");
  if (exam.teacherId !== teacherId) {
    throw new ApiError(403, "ليس لديك صلاحية على هذا الاختبار");
  }
  if (exam.status === "published") {
    throw new ApiError(400, "لا يمكن إعادة ترتيب أسئلة امتحان منشور");
  }
  const existing = await store.listQuestions(examId);
  const existingIds = new Set(existing.map((q) => q.id));
  if (existingIds.size !== orderedIds.length) {
    throw new ApiError(400, "قائمة الترتيب غير مكتملة");
  }
  for (const id of orderedIds) {
    if (!existingIds.has(id)) {
      throw new ApiError(400, "معرف سؤال غير معروف في قائمة الترتيب");
    }
  }
  for (let i = 0; i < orderedIds.length; i++) {
    await store.updateQuestion(orderedIds[i], { order: i + 1 });
  }
}

/** إعادة توليد سؤال واحد (بديل بنفس المفهوم) */
export async function regenerateQuestion(
  teacherId: string,
  questionId: string
): Promise<Question> {
  const store = getStore();
  const { exam, question } = await getOwnedExamOfQuestion(questionId, teacherId);
  if (exam.status === "published") {
    throw new ApiError(400, "لا يمكن إعادة توليد أسئلة امتحان منشور — أغلقه أولًا");
  }

  const settings = settingsFromExam(exam);
  settings.questionTypes = [question.type];
  settings.questionCount = 1;

  const replacement = await generateReplacement(
    settings,
    question.type,
    question
  );
  if (!replacement) {
    throw new ApiError(
      502,
      "تعذر توليد سؤال بديل — حاول مرة أخرى"
    );
  }

  return store.updateQuestion(questionId, {
    type: question.type,
    question: replacement.question,
    data: replacement.data,
    correctAnswer: replacement.correctAnswer,
    solution: replacement.solution,
    points: question.points,
    bankId: replacement.bankId,
    subject: replacement.subject ?? question.subject,
    topic: replacement.topic ?? question.topic,
    subtopic: replacement.subtopic ?? question.subtopic,
    difficulty: replacement.difficulty ?? question.difficulty,
  });
}
