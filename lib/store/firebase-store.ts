/**
 * FirebaseStore — Cloud Firestore عبر Admin SDK.
 *
 * البنية (Collections مستقلة):
 *   teachers/{teacherId}
 *   exams/{examId}
 *   questions/{questionId}
 *   attempts/{attemptId}
 *   answers/{answerId}
 */
import { getAdminDb } from "@/lib/firebase/admin";
import { randomId } from "@/lib/utils";
import type { AppStore } from "./types";
import type {
  Answer,
  Attempt,
  Exam,
  Question,
  Teacher,
} from "@/lib/questions/types";

/** Firestore يرفض أي حقل top-level قيمته undefined. */
function omitUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  ) as T;
}

export class FirebaseStore implements AppStore {
  private db() {
    return getAdminDb();
  }

  /* ---------------- teachers ---------------- */

  async getTeacher(id: string): Promise<Teacher | null> {
    const snap = await this.db().doc(`teachers/${id}`).get();
    return snap.exists ? (snap.data() as Teacher) : null;
  }

  async createTeacher(t: Teacher): Promise<Teacher> {
    const ref = this.db().doc(`teachers/${t.id}`);
    const snap = await ref.get();
    if (!snap.exists) await ref.set(t);
    return t;
  }

  async updateTeacher(id: string, patch: Partial<Teacher>): Promise<Teacher> {
    await this.db().doc(`teachers/${id}`).update({ ...patch });
    return (await this.getTeacher(id)) as Teacher;
  }

  /* ---------------- exams ---------------- */

  async listExams(teacherId: string): Promise<Exam[]> {
    const snap = await this.db()
      .collection("exams")
      .where("teacherId", "==", teacherId)
      .get();
    return snap.docs.map((d) => d.data() as Exam);
  }

  async getExam(id: string): Promise<Exam | null> {
    const snap = await this.db().doc(`exams/${id}`).get();
    return snap.exists ? (snap.data() as Exam) : null;
  }

  async getExamByCode(code: string): Promise<Exam | null> {
    const snap = await this.db()
      .collection("exams")
      .where("code", "==", code.toUpperCase())
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() as Exam);
  }

  async createExam(e: Exam): Promise<Exam> {
    await this.db().doc(`exams/${e.id}`).set(omitUndefined(e));
    return e;
  }

  async updateExam(id: string, patch: Partial<Exam>): Promise<Exam> {
    await this.db().doc(`exams/${id}`).update(omitUndefined(patch));
    return (await this.getExam(id)) as Exam;
  }

  async deleteExam(id: string): Promise<void> {
    const db = this.db();
    const qs = await db.collection("questions").where("examId", "==", id).get();
    const atts = await db.collection("attempts").where("examId", "==", id).get();
    const batch = db.batch();
    for (const qdoc of qs.docs) batch.delete(qdoc.ref);
    for (const a of atts.docs) {
      const asnap = await db
        .collection("answers")
        .where("attemptId", "==", a.id)
        .get();
      for (const ad of asnap.docs) batch.delete(ad.ref);
      batch.delete(a.ref);
    }
    batch.delete(db.doc(`exams/${id}`));
    // batch له حد 500 عملية — أكثر من كافٍ للنظام المصغّر
    await batch.commit();
  }

  /* ---------------- questions ---------------- */

  async listQuestions(examId: string): Promise<Question[]> {
    const snap = await this.db()
      .collection("questions")
      .where("examId", "==", examId)
      .get();
    return snap.docs
      .map((d) => d.data() as Question)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  async getQuestion(id: string): Promise<Question | null> {
    const snap = await this.db().doc(`questions/${id}`).get();
    return snap.exists ? (snap.data() as Question) : null;
  }

  async createQuestion(q: Question): Promise<Question> {
    await this.db().doc(`questions/${q.id}`).set(omitUndefined(q));
    return q;
  }

  async updateQuestion(id: string, patch: Partial<Question>): Promise<Question> {
    await this.db().doc(`questions/${id}`).update(omitUndefined(patch));
    return (await this.getQuestion(id)) as Question;
  }

  async deleteQuestion(id: string): Promise<void> {
    await this.db().doc(`questions/${id}`).delete();
  }

  /* ---------------- attempts & answers ---------------- */

  async createAttempt(
    a: Attempt,
    answers: Omit<Answer, "id" | "attemptId">[]
  ): Promise<Attempt> {
    const db = this.db();
    const batch = db.batch();
    batch.set(db.doc(`attempts/${a.id}`), a);
    for (const ans of answers) {
      const answerId = randomId("ans_");
      batch.set(db.doc(`answers/${answerId}`), {
        ...ans,
        id: answerId,
        attemptId: a.id,
      });
    }
    await batch.commit();
    return a;
  }

  async listAttempts(examId: string): Promise<Attempt[]> {
    const snap = await this.db()
      .collection("attempts")
      .where("examId", "==", examId)
      .get();
    return snap.docs
      .map((d) => d.data() as Attempt)
      .sort((a, b) => b.submittedAt - a.submittedAt);
  }

  async getAttempt(id: string): Promise<Attempt | null> {
    const snap = await this.db().doc(`attempts/${id}`).get();
    return snap.exists ? (snap.data() as Attempt) : null;
  }

  async listAnswers(attemptId: string): Promise<Answer[]> {
    const snap = await this.db()
      .collection("answers")
      .where("attemptId", "==", attemptId)
      .get();
    return snap.docs.map((d) => d.data() as Answer);
  }

  async findAttemptByExamAndPhone(
    examId: string,
    studentPhone: string
  ): Promise<Attempt | null> {
    const snap = await this.db()
      .collection("attempts")
      .where("examId", "==", examId)
      .where("studentPhone", "==", studentPhone)
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() as Attempt);
  }
}
