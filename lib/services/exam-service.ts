/**
 * ExamService — إنشاء/نشر/إغلاق/حذف/تحديث الاختبارات
 */
import { getStore } from "@/lib/store";
import { ApiError, generateExamCode, randomId } from "@/lib/utils";
import type {
  Exam,
  ExamSettings,
  Question,
  Teacher,
} from "@/lib/questions/types";

/** إنشاء امتحان مسودة (بدون أسئلة بعد) */
export async function createDraftExam(
  teacherId: string,
  settings: ExamSettings
): Promise<Exam> {
  const exam: Exam = {
    id: randomId("exam_"),
    teacherId,
    title: settings.title,
    subject: settings.subject,
    // topic يظل أول وحدة للتوافق مع الامتحانات والعملاء القدامى.
    topic: settings.topics[0] ?? settings.topic,
    topics: settings.topics,
    ...(settings.subtopic ? { subtopic: settings.subtopic } : {}),
    difficulty: settings.difficulty,
    questionTypes: settings.questionTypes,
    questionCount: settings.questionCount,
    status: "draft",
    code: null,
    showResult: true,
    whatsappMessage: "",
    createdAt: Date.now(),
    publishedAt: null,
  };
  return getStore().createExam(exam);
}

async function getOwnedExam(examId: string, teacherId: string): Promise<Exam> {
  const exam = await getStore().getExam(examId);
  if (!exam) throw new ApiError(404, "الاختبار غير موجود");
  if (exam.teacherId !== teacherId) {
    throw new ApiError(403, "ليس لديك صلاحية على هذا الاختبار");
  }
  return exam;
}

/** نشر الاختبار: توليد رمز فريد + status=published */
export async function publishExam(
  examId: string,
  teacherId: string
): Promise<Exam> {
  const exam = await getOwnedExam(examId, teacherId);
  const store = getStore();
  const questions = await store.listQuestions(examId);
  if (questions.length === 0) {
    throw new ApiError(400, "لا يمكن نشر امتحان بدون أسئلة");
  }
  // إعادة نشر يحافظ على الكود الحالي (لأن روابط الطلاب القديمة تعمل).
  // الكود يُنشأ فقط أول مرة، وهو فريد من البداية فلا حاجة لفحص التصادم.
  let code = exam.code;
  if (!code) {
    code = generateExamCode(exam.subject);
    for (let i = 0; i < 5 && (await store.getExamByCode(code)); i++) {
      code = generateExamCode(exam.subject);
    }
  }
  return store.updateExam(examId, {
    status: "published",
    code,
    publishedAt: Date.now(),
  });
}

/** إغلاق الاختبار */
export async function closeExam(
  examId: string,
  teacherId: string
): Promise<Exam> {
  await getOwnedExam(examId, teacherId);
  return getStore().updateExam(examId, { status: "closed" });
}

/** تحديث بيانات وصفية (العنوان، إظهار النتيجة، رسالة واتساب) */
export async function updateExamMeta(
  examId: string,
  teacherId: string,
  patch: Partial<Pick<Exam, "title" | "showResult" | "whatsappMessage">>
): Promise<Exam> {
  await getOwnedExam(examId, teacherId);
  const store = getStore();
  const clean: Partial<Exam> = {};
  if (patch.title !== undefined) clean.title = patch.title;
  if (patch.showResult !== undefined) clean.showResult = patch.showResult;
  if (patch.whatsappMessage !== undefined)
    clean.whatsappMessage = patch.whatsappMessage;
  return store.updateExam(examId, clean);
}

/** حذف الاختبار وكل ما يتبعه */
export async function deleteExam(
  examId: string,
  teacherId: string
): Promise<void> {
  await getOwnedExam(examId, teacherId);
  await getStore().deleteExam(examId);
}

/** اختبار + أسئلته (لصفحة المعلم) */
export async function getExamWithQuestions(
  examId: string,
  teacherId: string
): Promise<{ exam: Exam; questions: Question[] }> {
  const exam = await getOwnedExam(examId, teacherId);
  const questions = await getStore().listQuestions(examId);
  return { exam, questions };
}

/** إعدادات الامتحان كـ ExamSettings (لإعادة التوليد) */
export function settingsFromExam(exam: Exam): ExamSettings {
  const topics = exam.topics ?? [exam.topic];
  return {
    title: exam.title,
    subject: exam.subject,
    topic: topics[0] ?? exam.topic,
    topics,
    subtopic: exam.subtopic,
    questionTypes: exam.questionTypes,
    difficulty: exam.difficulty,
    questionCount: exam.questionCount,
  };
}

export type { Teacher };
