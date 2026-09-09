/**
 * GenerationService — يدير Pipeline التوليد من البنك أو Groq:
 * Teacher Settings → Bank/Groq → Zod/Validators → Duplicate Check → Firestore
 */
import { getStore } from "@/lib/store";
import { randomId } from "@/lib/utils";
import { generateQuestions } from "@/lib/questions/generator";
import { resolveGroqCredentials } from "@/lib/groq/settings";
import { createDraftExam } from "./exam-service";
import type {
  Exam,
  ExamSettings,
  Teacher,
} from "@/lib/questions/types";

export interface GeneratedExamResult {
  exam: Exam;
  warnings: string[];
  generatedCount: number;
}

/**
 * يجمع معرّفات أسئلة البنك المستخدمة في اختبارات المعلم السابقة
 * لنفس الوحدات — لتُستبعد من التوليد الجديد فيتغير محتوى كل اختبار.
 */
async function collectUsedBankIds(
  teacherId: string,
  settings: ExamSettings
): Promise<string[]> {
  const store = getStore();
  const topics = new Set(
    settings.topics?.length ? settings.topics : [settings.topic]
  );
  const exams = (await store.listExams(teacherId))
    .filter((e) => (e.topics ?? [e.topic]).some((t) => topics.has(t)))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20);

  const ids = new Set<string>();
  for (const exam of exams) {
    const questions = await store.listQuestions(exam.id);
    for (const q of questions) {
      if (q.bankId) ids.add(q.bankId);
    }
  }
  return [...ids];
}

/**
 * توليد امتحان كامل:
 * 1) إنشاء مسودة
 * 2) توليد الأسئلة عبر المحرك (Groq + Bank + Validators + Retry)
 * 3) حفظ الأسئلة مرتبطة بالامتحان
 */
export async function generateExam(
  teacher: Teacher,
  settings: ExamSettings
): Promise<GeneratedExamResult> {
  const store = getStore();
  const exam = await createDraftExam(teacher.id, settings);

  let warnings: string[] = [];
  let generated: Awaited<ReturnType<typeof generateQuestions>>["questions"] = [];
  try {
    const credentials = await resolveGroqCredentials(teacher.id);
    const excludeBankIds = await collectUsedBankIds(teacher.id, settings);
    const result = await generateQuestions(settings, [], credentials, {
      excludeBankIds,
    });
    generated = result.questions;
    warnings = result.warnings;
  } catch (e) {
    console.error("[generation] failed", e);
    // تنظيف المسودة الفاشلة
    await store.deleteExam(exam.id).catch(() => undefined);
    throw new Error(
      "تعذر توليد الأسئلة — تحقق من الإعدادات وحاول مرة أخرى"
    );
  }

  let order = 1;
  for (const q of generated) {
    await store.createQuestion({
      ...q,
      id: randomId("q_"),
      examId: exam.id,
      order: order++,
    });
  }

  return { exam, warnings, generatedCount: generated.length };
}
