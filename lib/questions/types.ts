/**
 * أنواع الأسئلة الموحدة للنظام كله.
 */
export type QuestionType = "MCQ" | "TRUE_FALSE" | "MATCHING" | "ORDERING";

export type Difficulty = "easy" | "medium" | "hard" | "mixed";

export type ExamStatus = "draft" | "published" | "closed";

/* ---------- بيانات السؤال حسب النوع ---------- */

export interface MCQData {
  /** 4 اختيارات بالضبط */
  options: string[];
}

export interface TrueFalseData {
  statement: string;
}

export interface MatchingData {
  leftItems: string[];
  rightItems: string[];
}

/**
 * عناصر الترتيب تُخزَّن بالترتيب الصحيح،
 * واجهة الطالب تعرضها مبعثرة (shuffle محلي) ويطلب منه ترتيبها.
 */
export interface OrderingData {
  items: string[];
}

export type QuestionData = MCQData | TrueFalseData | MatchingData | OrderingData;

/* ---------- السؤال ---------- */

export interface Question {
  id: string;
  examId?: string;
  type: QuestionType;
  question: string;
  data: QuestionData;
  /**
   * MCQ        → نص الاختيار الصحيح (string)
   * TRUE_FALSE → true | false
   * MATCHING   → number[] (فهرس العنصر الصحيح في rightItems لكل عنصر في leftItems)
   * ORDERING   → string[] (العناصر بالترتيب الصحيح)
   */
  correctAnswer: string | boolean | number[] | string[];
  solution?: string;
  points: number;
  order: number;
  /* حقول اختيارية من بنك الأسئلة المرجعي */
  bankId?: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
  difficulty?: Difficulty;
}

/** سؤال مولَّد قبل حفظه (بدون id / examId / order) */
export type GeneratedQuestion = Omit<Question, "id" | "examId" | "order">;

/* ---------- الاختبار ---------- */

export interface Exam {
  id: string;
  teacherId: string;
  title: string;
  subject: string;
  /** أول وحدة مختارة — محفوظ للتوافق مع البيانات القديمة */
  topic: string;
  /** الوحدات المختارة (اختياري لأن الامتحانات القديمة لا تحتوي عليه) */
  topics?: string[];
  subtopic?: string;
  difficulty: Difficulty;
  questionTypes: QuestionType[];
  questionCount: number;
  status: ExamStatus;
  /** رمز المشاركة مثل MATH-8F42 — يُنشأ عند النشر */
  code: string | null;
  /** هل يرى الطالب نتيجته فورًا بعد التسليم */
  showResult: boolean;
  /** سطر إضافي مخصص في رسالة WhatsApp */
  whatsappMessage?: string;
  createdAt: number;
  publishedAt?: number | null;
}

/** نسخة آمنة من الاختبار تُرسل لواجهة الطالب (بدون إجابات صحيحة أو حلول) */
export interface PublicExam {
  id: string;
  code: string;
  title: string;
  subject: string;
  /** أول وحدة مختارة — للتوافق مع العملاء والبيانات القديمة */
  topic: string;
  topics: string[];
  subtopic?: string;
  questionCount: number;
  showResult: boolean;
  questions: PublicQuestion[];
}

export interface PublicQuestion {
  id: string;
  type: QuestionType;
  question: string;
  data: QuestionData;
  points: number;
}

/* ---------- المعلم ---------- */

export interface Teacher {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

/* ---------- المحاولات والإجابات ---------- */

export interface Attempt {
  id: string;
  examId: string;
  studentName: string;
  studentPhone: string;
  score: number;
  totalScore: number;
  percentage: number;
  submittedAt: number;
}

export interface Answer {
  id: string;
  attemptId: string;
  questionId: string;
  answer: unknown;
  isCorrect: boolean;
  points: number;
}

export interface AttemptWithAnswers extends Attempt {
  answers: Answer[];
}

/* ---------- إعدادات التوليد من المعلم ---------- */

export interface ExamSettings {
  title: string;
  subject: string;
  /** أول وحدة مختارة — للتوافق مع مسار التوليد القديم */
  topic: string;
  topics: string[];
  subtopic?: string;
  questionTypes: QuestionType[];
  difficulty: Difficulty;
  questionCount: number;
}
