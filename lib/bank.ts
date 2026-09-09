/**
 * بنك الأسئلة المرجعي (Seed) — يُحمَّل من JSON محلي في المرحلة الأولى،
 * ويُستخدم كـ Reference في برومبت Groq + كمصدر توليد في الوضع التجريبي.
 * لاحقًا ينتقل إلى Firestore ليديره المعلم من الـDashboard.
 */
import bankData from "@/data/mathematics.json";
import { normalizeText, seededShuffle } from "@/lib/utils";
import type { Difficulty, QuestionData, QuestionType } from "@/lib/questions/types";

export interface BankTopic {
  name: string;
  subtopics: string[];
}

export interface BankQuestion {
  id: string;
  subject: string;
  topic: string;
  subtopic?: string;
  type: QuestionType;
  difficulty: Difficulty;
  question: string;
  data: QuestionData;
  correctAnswer: string | boolean | number[] | string[];
  solution?: string;
  points: number;
}

interface BankFile {
  subject: string;
  topics: BankTopic[];
  questions: Array<Omit<BankQuestion, "subject"> & { subject?: string }>;
}

const raw = bankData as BankFile;

export const bankQuestions: BankQuestion[] = raw.questions.map((q) => ({
  ...q,
  subject: q.subject ?? raw.subject,
}));

export function getBankTopics(): BankTopic[] {
  return raw.topics;
}

export function getBankSubject(): string {
  return raw.subject;
}

export interface BankQuery {
  subject?: string;
  topic?: string;
  subtopic?: string;
  type?: QuestionType;
  limit?: number;
  /** نصوص الأسئلة المستبعدة (للتفادي) */
  excludeTexts?: string[];
  /** استبعاد معرفات بنكية محددة */
  excludeIds?: string[];
}

/** بحث في بنك الأسئلة مع خلط حتمي */
export function findBankQuestions(opts: BankQuery): BankQuestion[] {
  const exclude = new Set((opts.excludeTexts ?? []).map(normalizeText));
  const excludeIds = new Set(opts.excludeIds ?? []);

  let qs = bankQuestions.filter(
    (q) => !opts.subject || q.subject === opts.subject
  );
  if (opts.topic) qs = qs.filter((q) => q.topic === opts.topic);
  if (opts.type) qs = qs.filter((q) => q.type === opts.type);
  if (opts.subtopic) {
    const withSub = qs.filter((q) => q.subtopic === opts.subtopic);
    if (withSub.length) qs = withSub;
  }
  qs = qs.filter(
    (q) => !exclude.has(normalizeText(q.question)) && !excludeIds.has(q.id)
  );

  const shuffled = seededShuffle(qs, `${opts.topic}-${opts.type}-${Date.now() % 1000}`);
  return opts.limit ? shuffled.slice(0, opts.limit) : shuffled;
}
