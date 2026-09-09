/**
 * DemoStore — تخزين مؤقت محلي للوضع التجريبي (بدون Firebase/Groq).
 * البيانات في الذاكرة + نسخة محفوظة في demo-data/store.json
 * حتى لا تضيع عند إعادة تحميل الصفحة.
 */
import { promises as fs } from "fs";
import path from "path";
import { randomId } from "@/lib/utils";
import type { AppStore, GroqSettings } from "./types";
import type {
  Answer,
  Attempt,
  Exam,
  Question,
  Teacher,
} from "@/lib/questions/types";

interface DemoData {
  teachers: Teacher[];
  exams: Exam[];
  questions: Question[];
  attempts: Attempt[];
  answers: Answer[];
  /** مفاتيح Groq اليدوية لكل معلم (معرّف المعلم → الإعدادات) */
  groqSettings: Record<string, GroqSettings>;
}

const EMPTY: DemoData = {
  teachers: [],
  exams: [],
  questions: [],
  attempts: [],
  answers: [],
  groqSettings: {},
};

export class DemoStore implements AppStore {
  private data: DemoData | null = null;
  private file = path.join(process.cwd(), "demo-data", "store.json");
  private saving = false;

  private async ready(): Promise<DemoData> {
    if (this.data) return this.data;
    try {
      const raw = await fs.readFile(this.file, "utf-8");
      this.data = { ...EMPTY, ...(JSON.parse(raw) as DemoData) };
    } catch {
      this.data = JSON.parse(JSON.stringify(EMPTY)) as DemoData;
    }
    return this.data;
  }

  private save(): void {
    if (!this.data || this.saving) return;
    this.saving = true;
    const snapshot = this.data;
    (async () => {
      try {
        await fs.mkdir(path.dirname(this.file), { recursive: true });
        await fs.writeFile(this.file, JSON.stringify(snapshot), "utf-8");
      } catch (e) {
        console.warn("[demo-store] save failed", e);
      } finally {
        this.saving = false;
      }
    })();
  }

  /* ---------------- teachers ---------------- */

  async getTeacher(id: string): Promise<Teacher | null> {
    const d = await this.ready();
    return d.teachers.find((t) => t.id === id) ?? null;
  }

  async createTeacher(t: Teacher): Promise<Teacher> {
    const d = await this.ready();
    if (!d.teachers.some((x) => x.id === t.id)) d.teachers.push(t);
    this.save();
    return t;
  }

  async updateTeacher(id: string, patch: Partial<Teacher>): Promise<Teacher> {
    const d = await this.ready();
    const t = d.teachers.find((x) => x.id === id);
    if (!t) throw new Error("Teacher not found");
    Object.assign(t, patch);
    this.save();
    return t;
  }

  /* ---------------- exams ---------------- */

  async listExams(teacherId: string): Promise<Exam[]> {
    const d = await this.ready();
    return d.exams.filter((e) => e.teacherId === teacherId);
  }

  async getExam(id: string): Promise<Exam | null> {
    const d = await this.ready();
    return d.exams.find((e) => e.id === id) ?? null;
  }

  async getExamByCode(code: string): Promise<Exam | null> {
    const d = await this.ready();
    return d.exams.find((e) => e.code?.toUpperCase() === code.toUpperCase()) ?? null;
  }

  async createExam(e: Exam): Promise<Exam> {
    const d = await this.ready();
    d.exams.push(e);
    this.save();
    return e;
  }

  async updateExam(id: string, patch: Partial<Exam>): Promise<Exam> {
    const d = await this.ready();
    const e = d.exams.find((x) => x.id === id);
    if (!e) throw new Error("Exam not found");
    Object.assign(e, patch);
    this.save();
    return e;
  }

  async deleteExam(id: string): Promise<void> {
    const d = await this.ready();
    d.exams = d.exams.filter((e) => e.id !== id);
    d.questions = d.questions.filter((q) => q.examId !== id);
    const attemptIds = new Set(
      d.attempts.filter((a) => a.examId === id).map((a) => a.id)
    );
    d.attempts = d.attempts.filter((a) => a.examId !== id);
    d.answers = d.answers.filter((a) => !attemptIds.has(a.attemptId));
    this.save();
  }

  /* ---------------- questions ---------------- */

  async listQuestions(examId: string): Promise<Question[]> {
    const d = await this.ready();
    return d.questions
      .filter((q) => q.examId === examId)
      .sort((a, b) => a.order - b.order);
  }

  async getQuestion(id: string): Promise<Question | null> {
    const d = await this.ready();
    return d.questions.find((q) => q.id === id) ?? null;
  }

  async createQuestion(q: Question): Promise<Question> {
    const d = await this.ready();
    d.questions.push(q);
    this.save();
    return q;
  }

  async updateQuestion(id: string, patch: Partial<Question>): Promise<Question> {
    const d = await this.ready();
    const q = d.questions.find((x) => x.id === id);
    if (!q) throw new Error("Question not found");
    Object.assign(q, patch);
    this.save();
    return q;
  }

  async deleteQuestion(id: string): Promise<void> {
    const d = await this.ready();
    d.questions = d.questions.filter((q) => q.id !== id);
    this.save();
  }

  /* ---------------- attempts & answers ---------------- */

  async createAttempt(
    a: Attempt,
    answers: Omit<Answer, "id" | "attemptId">[]
  ): Promise<Attempt> {
    const d = await this.ready();
    d.attempts.push(a);
    for (const ans of answers) {
      d.answers.push({ ...ans, id: randomId("ans_"), attemptId: a.id });
    }
    this.save();
    return a;
  }

  async listAttempts(examId: string): Promise<Attempt[]> {
    const d = await this.ready();
    return d.attempts
      .filter((a) => a.examId === examId)
      .sort((a, b) => b.submittedAt - a.submittedAt);
  }

  async getAttempt(id: string): Promise<Attempt | null> {
    const d = await this.ready();
    return d.attempts.find((a) => a.id === id) ?? null;
  }

  async listAnswers(attemptId: string): Promise<Answer[]> {
    const d = await this.ready();
    return d.answers.filter((a) => a.attemptId === attemptId);
  }

  async findAttemptByExamAndPhone(
    examId: string,
    studentPhone: string
  ): Promise<Attempt | null> {
    const d = await this.ready();
    const norm = (p: string) => p.replace(/\D/g, "");
    return (
      d.attempts.find(
        (a) => a.examId === examId && norm(a.studentPhone) === norm(studentPhone)
      ) ?? null
    );
  }

  /* ---------------- إعدادات Groq اليدوية (BYOK) ---------------- */

  async getGroqSettings(teacherId: string): Promise<GroqSettings | null> {
    const d = await this.ready();
    return d.groqSettings[teacherId] ?? null;
  }

  async saveGroqSettings(
    teacherId: string,
    s: GroqSettings
  ): Promise<GroqSettings> {
    const d = await this.ready();
    d.groqSettings[teacherId] = s;
    this.save();
    return s;
  }

  async deleteGroqSettings(teacherId: string): Promise<void> {
    const d = await this.ready();
    delete d.groqSettings[teacherId];
    this.save();
  }
}
