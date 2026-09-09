/**
 * محرك توليد الأسئلة — يجمع بين:
 *  - Groq (عند توفر GROQ_API_KEY) مع Reference من بنك الأسئلة
 *  - بنك الأسئلة المحلي (وضع تجريبي بدون مفتاح)
 *
 * Pipeline: Build Prompt → Groq → Parse JSON → Validators → Math Check
 *          → Duplicate Check → Retry (حتى 3 محاولات) → Save
 */
import {
  buildBatchPrompt,
  buildSinglePrompt,
  callGroqJSON,
  extractQuestionsArray,
} from "@/lib/groq/generator";
import { validateQuestion } from "./validator";
import { findBankQuestions, type BankQuestion } from "@/lib/bank";
import { normalizeText } from "@/lib/utils";
import type {
  ExamSettings,
  GeneratedQuestion,
  Question,
  QuestionType,
} from "./types";

export interface GenerationResult {
  questions: GeneratedQuestion[];
  warnings: string[];
  source: "ai" | "bank";
}

const MAX_ATTEMPTS = 3; // حد أقصى للمحاولات لكل سؤال

/** توزيع عدد الأسئلة على الأنواع المطلوبة بالتساوي */
export function allocateTypes(
  types: QuestionType[],
  count: number
): QuestionType[] {
  const slots: QuestionType[] = [];
  for (const t of types) {
    for (let i = 0; i < Math.floor(count / types.length); i++) slots.push(t);
  }
  let i = 0;
  while (slots.length < count) {
    slots.push(types[i % types.length]);
    i++;
  }
  // خلط خفيف ليظهر كل الأنواع متناوبة داخل الامتحان
  for (let a = slots.length - 1; a > 0; a--) {
    const b = Math.floor(Math.random() * (a + 1));
    [slots[a], slots[b]] = [slots[b], slots[a]];
  }
  return slots.slice(0, count);
}

/** محاولة التحقق من سؤال خام + فحص التكرار */
function tryAdopt(
  raw: unknown,
  usedTexts: Set<string>
): GeneratedQuestion | null {
  const v = validateQuestion(raw);
  if (!v.ok) return null;
  const norm = normalizeText(v.question.question);
  if (usedTexts.has(norm)) return null;
  usedTexts.add(norm);
  return v.question;
}

function bankToQuestion(b: BankQuestion): GeneratedQuestion {
  return {
    type: b.type,
    question: b.question,
    data: b.data,
    correctAnswer: b.correctAnswer,
    solution: b.solution,
    points: b.points,
    bankId: b.id,
    subject: b.subject,
    topic: b.topic,
    subtopic: b.subtopic,
    difficulty: b.difficulty,
  };
}

/**
 * توليد الأسئلة الرئيسية — تُستدعى من GenerationService
 */
export async function generateQuestions(
  settings: ExamSettings,
  existing: Question[] = []
): Promise<GenerationResult> {
  const useAI = Boolean(process.env.GROQ_API_KEY);
  const slots = allocateTypes(settings.questionTypes, settings.questionCount);
  const perType: Partial<Record<QuestionType, number>> = {};
  for (const t of slots) perType[t] = (perType[t] ?? 0) + 1;

  const usedTexts = new Set(
    existing.map((q) => normalizeText(q.question))
  );
  const warnings: string[] = [];

  /* ---------- الوضع التجريبي / بدون مفتاح Groq: من بنك الأسئلة ---------- */
  if (!useAI) {
    const questions: GeneratedQuestion[] = [];
    for (const type of slots) {
      // أولًا من نفس الموضوع، ولو قلّت يملأ من المادة كلها
      let candidates = findBankQuestions({
        subject: settings.subject,
        topic: settings.topic,
        subtopic: settings.subtopic,
        type,
        excludeTexts: [...usedTexts],
      });
      if (!candidates.length) {
        candidates = findBankQuestions({
          subject: settings.subject,
          type,
          excludeTexts: [...usedTexts],
        });
      }
      if (!candidates.length) continue;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      const q = bankToQuestion(pick);
      usedTexts.add(normalizeText(q.question));
      questions.push(q);
    }
    if (questions.length < slots.length) {
      warnings.push(
        `تم التوليد ${questions.length} من ${slots.length} (المحتوى المرجعي غير كافٍ لهذا العدد)`
      );
    }
    warnings.push("وضع تجريبي: تم التوليد من بنك الأسئلة المحلي بدون AI");
    return { questions, warnings, source: "bank" };
  }

  /* ---------- الوضع الحقيقي: Groq ---------- */
  const refs = findBankQuestions({
    subject: settings.subject,
    topic: settings.topic,
    subtopic: settings.subtopic,
    limit: 6,
  });

  const results: (GeneratedQuestion | null)[] = new Array(slots.length).fill(null);

  // 1) محاولة دفعة كاملة
  const batch = buildBatchPrompt(settings, refs, perType);
  try {
    const data = await callGroqJSON(batch.system, batch.user);
    const pool = extractQuestionsArray(data);
    const remaining = [...pool];
    slots.forEach((type, i) => {
      if (results[i]) return;
      const idx = remaining.findIndex((p) => {
        const t = (p as { type?: QuestionType } | null)?.type;
        return t === type;
      });
      if (idx !== -1) {
        results[i] = tryAdopt(remaining.splice(idx, 1)[0], usedTexts);
      }
    });
  } catch (e) {
    console.error("[generator] batch failed", e);
    warnings.push("تعذر الاتصال بـ Groq في محاولة الدفعة الكاملة");
  }

  // 2) إعادة توليد منفردة لكل سؤال فشل (حتى MAX_ATTEMPTS إجماليًا)
  for (let i = 0; i < slots.length; i++) {
    let attempts = results[i] ? 1 : 0;
    while (!results[i] && attempts < MAX_ATTEMPTS) {
      attempts++;
      const single = buildSinglePrompt(settings, slots[i]);
      try {
        const data = await callGroqJSON(single.system, single.user, 1.0);
        const arr = extractQuestionsArray(data);
        results[i] = arr.length
          ? tryAdopt(arr[0], usedTexts)
          : null;
      } catch (e) {
        console.error(`[generator] single retry failed (attempt ${attempts})`, e);
      }
    }
  }

  const questions = results.filter(Boolean) as GeneratedQuestion[];
  if (questions.length < slots.length) {
    warnings.push(`تم توليد ${questions.length} من ${slots.length} سؤالًا — أضف الباقي يدويًا أو أعد التوليد`);
  }
  return { questions, warnings, source: "ai" };
}

/**
 * إعادة توليد سؤال واحد (Regenerate) — سؤال بديل بنفس المفهوم
 */
export async function generateReplacement(
  settings: ExamSettings,
  type: QuestionType,
  original: Question
): Promise<GeneratedQuestion | null> {
  if (!process.env.GROQ_API_KEY) {
    // الوضع التجريبي: سؤال مختلف من البنك بنفس النوع
    // (نفس المنطق: الموضوع أولًا، ثم المادة كاملة)
    let alt = findBankQuestions({
      subject: settings.subject,
      topic: settings.topic,
      type,
      excludeTexts: [normalizeText(original.question)],
      excludeIds: original.bankId ? [original.bankId] : [],
    });
    if (!alt.length) {
      alt = findBankQuestions({
        subject: settings.subject,
        type,
        excludeTexts: [normalizeText(original.question)],
        excludeIds: original.bankId ? [original.bankId] : [],
      });
    }
    if (!alt.length) return null;
    return bankToQuestion(alt[0]);
  }

  const used = new Set([normalizeText(original.question)]);
  const single = buildSinglePrompt(settings, type, {
    question: original.question,
  });
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const data = await callGroqJSON(single.system, single.user, 1.0);
      const arr = extractQuestionsArray(data);
      if (arr.length) {
        const q = tryAdopt(arr[0], used);
        if (q) return q;
      }
    } catch (e) {
      console.error("[generator] regenerate failed", e);
    }
  }
  return null;
}
