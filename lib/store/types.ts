import type {
  Answer,
  Attempt,
  Exam,
  Question,
  Teacher,
} from "@/lib/questions/types";

/**
 * واجهة التخزين الموحدة.
 * - FirebaseStore: Cloud Firestore عبر Admin SDK (الإنتاج)
 * - DemoStore:   تخزين مؤقت محلي (الوضع التجريبي بدون Firebase)
 */
export interface AppStore {
  /* teachers */
  getTeacher(id: string): Promise<Teacher | null>;
  createTeacher(t: Teacher): Promise<Teacher>;
  updateTeacher(id: string, patch: Partial<Teacher>): Promise<Teacher>;

  /* exams */
  listExams(teacherId: string): Promise<Exam[]>;
  getExam(id: string): Promise<Exam | null>;
  getExamByCode(code: string): Promise<Exam | null>;
  createExam(e: Exam): Promise<Exam>;
  updateExam(id: string, patch: Partial<Exam>): Promise<Exam>;
  deleteExam(id: string): Promise<void>;

  /* questions */
  listQuestions(examId: string): Promise<Question[]>;
  getQuestion(id: string): Promise<Question | null>;
  createQuestion(q: Question): Promise<Question>;
  updateQuestion(id: string, patch: Partial<Question>): Promise<Question>;
  deleteQuestion(id: string): Promise<void>;

  /* attempts & answers */
  createAttempt(
    a: Attempt,
    answers: Omit<Answer, "id" | "attemptId">[]
  ): Promise<Attempt>;
  listAttempts(examId: string): Promise<Attempt[]>;
  getAttempt(id: string): Promise<Attempt | null>;
  listAnswers(attemptId: string): Promise<Answer[]>;
  findAttemptByExamAndPhone(
    examId: string,
    studentPhone: string
  ): Promise<Attempt | null>;
}
