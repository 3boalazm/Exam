/**
 * GenerationService — يتعامل مع Groq والـ Pipeline الكامل:
 * Teacher Settings → Build Prompt → Groq → Parse JSON → Zod/Validators
 * → Math Check → Duplicate Check → Firestore
 */
import { getStore } from "@/lib/store";
import { randomId } from "@/lib/utils";
import { generateQuestions } from "@/lib/questions/generator";
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
    const result = await generateQuestions(settings);
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
