/**
 * بنك الأسئلة المقالية — 5 دروس × 45 سؤالًا = 225 سؤالًا.
 * كل نموذج يأخذ سؤالًا واحدًا من كل درس، فيكون كل نموذج مختلفًا عن الآخر
 * ولا يتكرر السؤال داخل النموذج الواحد.
 */
import raw from "@/data/essay-questions.json";
import type { EssayQuestion } from "./types";

interface EssayBankFile {
  subject: string;
  grade: string;
  formCount: number;
  questionsPerForm: number;
  topics: string[];
  questions: EssayQuestion[];
}

const bank = raw as unknown as EssayBankFile;

export const essaySubject: string = bank.subject;
export const essayGrade: string = bank.grade;
export const essayTopics: string[] = bank.topics;
export const essayQuestions: EssayQuestion[] = bank.questions;
export const defaultFormCount: number = bank.formCount;
export const defaultQuestionsPerForm: number = bank.questionsPerForm;

export function essayTopicStats(): { topic: string; count: number }[] {
  return essayTopics.map((topic) => ({
    topic,
    count: essayQuestions.filter((q) => q.topic === topic).length,
  }));
}
