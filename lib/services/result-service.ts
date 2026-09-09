/**
 * ResultService — النتائج والإحصائيات
 */
import { getStore } from "@/lib/store";
import { ApiError, avg } from "@/lib/utils";
import type {
  AttemptWithAnswers,
  Exam,
  Question,
} from "@/lib/questions/types";

export interface ExamStats {
  count: number;
  average: number;
  highest: number;
  lowest: number;
}

export interface ExamRow {
  exam: Exam;
  attemptsCount: number;
  average: number;
  highest: number;
  lowest: number;
}

export interface DashboardData {
  teacher: { id: string; name: string; email: string };
  totalExams: number;
  totalAttempts: number;
  exams: ExamRow[];
  lastExam: ExamRow | null;
}

/** نتائج امتحان كامل مع إجابات كل طالب (للمعلم فقط) */
export async function getExamResults(
  teacherId: string,
  examId: string
): Promise<{
  exam: Exam;
  attempts: AttemptWithAnswers[];
  questions: Question[];
  stats: ExamStats;
}> {
  const store = getStore();
  const exam = await store.getExam(examId);
  if (!exam) throw new ApiError(404, "الاختبار غير موجود");
  if (exam.teacherId !== teacherId) {
    throw new ApiError(403, "ليس لديك صلاحية على هذا الاختبار");
  }

  const questions = await store.listQuestions(examId);
  const attempts = await store.listAttempts(examId);
  const attemptsWithAnswers = await Promise.all(
    attempts.map(async (a) => ({
      ...a,
      answers: await store.listAnswers(a.id),
    }))
  );

  const percents = attempts.map((a) => a.percentage);
  const stats: ExamStats = {
    count: attempts.length,
    average: avg(percents),
    highest: percents.length ? Math.max(...percents) : 0,
    lowest: percents.length ? Math.min(...percents) : 100,
  };

  return { exam, attempts: attemptsWithAnswers, questions, stats };
}

/** بيانات لوحة تحكم المعلم */
export async function getDashboard(teacherId: string): Promise<DashboardData> {
  const store = getStore();
  const teacher = await store.getTeacher(teacherId);
  const exams = (await store.listExams(teacherId)).sort(
    (a, b) => b.createdAt - a.createdAt
  );

  const rows: ExamRow[] = await Promise.all(
    exams.map(async (e) => {
      const atts = await store.listAttempts(e.id);
      const percents = atts.map((a) => a.percentage);
      return {
        exam: e,
        attemptsCount: atts.length,
        average: avg(percents),
        highest: percents.length ? Math.max(...percents) : 0,
        lowest: percents.length ? Math.min(...percents) : 100,
      };
    })
  );

  return {
    teacher: teacher
      ? { id: teacher.id, name: teacher.name, email: teacher.email }
      : { id: teacherId, name: "معلم", email: "" },
    totalExams: exams.length,
    totalAttempts: rows.reduce((s, r) => s + r.attemptsCount, 0),
    exams: rows,
    lastExam: rows[0] ?? null,
  };
}
