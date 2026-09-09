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
  GROQ_REQUEST_TIMEOUT_MS,
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
const GENERATION_BUDGET_MS = 50_000;

function selectedTopics(settings: ExamSettings): string[] {
  // ExamSettings الجديد يضمن topics، والـ fallback يحمي الاستدعاءات القديمة.
  return settings.topics?.length ? settings.topics : [settings.topic];
}

/** أمثلة من كل وحدة: حتى 3 للوحدة وبحد أقصى 8 إجمالًا. */
function findReferenceQuestions(settings: ExamSettings): BankQuestion[] {
  const topics = selectedTopics(settings);
  const groups = topics.map((topic) =>
    findBankQuestions({
      subject: settings.subject,
      topics: [topic],
      subtopic: topics.length === 1 ? settings.subtopic : undefined,
      limit: 3,
    })
  );

  // التناوب هنا يعطي أكبر عدد ممكن من الوحدات فرصة الظهور قبل بلوغ حد 8.
  const refs: BankQuestion[] = [];
  for (let round = 0; round < 3 && refs.length < 8; round++) {
    for (const group of groups) {
      if (group[round]) refs.push(group[round]);
      if (refs.length === 8) break;
    }
  }
  return refs;
}

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
  const requestedSource = settings.generationSource ?? "bank";
  const useAI = requestedSource === "ai" && Boolean(process.env.GROQ_API_KEY);
  const topics = selectedTopics(settings);
  const slots = allocateTypes(settings.questionTypes, settings.questionCount);
  const perType: Partial<Record<QuestionType, number>> = {};
  for (const t of slots) perType[t] = (perType[t] ?? 0) + 1;

  const usedTexts = new Set(
    existing.map((q) => normalizeText(q.question))
  );
  const warnings: string[] = [];

  /* ---------- الاختيار المباشر من البنك (الافتراضي أو fallback) ---------- */
  if (!useAI) {
    const questions: GeneratedQuestion[] = [];
    let usedAvailableTypeFallback = false;
    const pickedPerTopic = new Map(topics.map((topic) => [topic, 0]));
    const targetPerTopic = new Map(
      topics.map((topic, index) => [
        topic,
        Math.floor(slots.length / topics.length) +
          (index < slots.length % topics.length ? 1 : 0),
      ])
    );

    for (let i = 0; i < slots.length; i++) {
      const type = slots[i];
      let candidates = findBankQuestions({
        subject: settings.subject,
        topics,
        subtopic: topics.length === 1 ? settings.subtopic : undefined,
        type,
        excludeTexts: [...usedTexts],
      });

      // بعض بنوك البيانات (ومنها البنك الحقيقي الحالي) تحتوي MCQ فقط.
      // بدل إرجاع امتحان ناقص، نكمل بأي نوع متاح من نفس الوحدات المختارة.
      if (!candidates.length) {
        candidates = findBankQuestions({
          subject: settings.subject,
          topics,
          subtopic: topics.length === 1 ? settings.subtopic : undefined,
          excludeTexts: [...usedTexts],
        });
        if (candidates.length) usedAvailableTypeFallback = true;
      }
      if (!candidates.length) continue;

      // كل خانة تبدأ بوحدة مختلفة، ثم تنتقل للوحدة التالية فقط إذا نفدت
      // أسئلة النوع المطلوب؛ وبذلك يظل الاختيار داخل اتحاد الوحدات المحددة.
      const rotatedTopics = topics.map(
        (_, offset) => topics[(i + offset) % topics.length]
      );
      let pick: BankQuestion | undefined;
      for (const targetTopic of rotatedTopics) {
        const picked = pickedPerTopic.get(targetTopic) ?? 0;
        const target = targetPerTopic.get(targetTopic) ?? 0;
        if (picked >= target) continue;
        pick = candidates.find((candidate) => candidate.topic === targetTopic);
        if (pick) break;
      }
      // إذا تعذّر الحفاظ على الحصة المثالية بسبب نقص نوع معيّن، نأخذ من
      // أقرب وحدة في دورة التناوب بدل الخروج من الوحدات المختارة.
      if (!pick) {
        for (const targetTopic of rotatedTopics) {
          pick = candidates.find((candidate) => candidate.topic === targetTopic);
          if (pick) break;
        }
      }
      if (!pick) continue;

      const q = bankToQuestion(pick);
      pickedPerTopic.set(pick.topic, (pickedPerTopic.get(pick.topic) ?? 0) + 1);
      usedTexts.add(normalizeText(q.question));
      questions.push(q);
    }
    if (usedAvailableTypeFallback) {
      warnings.push(
        "بعض أنواع الأسئلة المطلوبة غير موجودة في البنك؛ تم الاستكمال بأنواع متاحة من الوحدات المختارة"
      );
    }
    if (questions.length < slots.length) {
      warnings.push(
        `تم التوليد ${questions.length} من ${slots.length} (المحتوى المرجعي غير كافٍ لهذا العدد)`
      );
    }
    if (requestedSource === "ai" && !process.env.GROQ_API_KEY) {
      warnings.push("مفتاح Groq غير متاح؛ تم استخدام بنك الأسئلة بدلًا منه");
    } else {
      warnings.push("تم اختيار الأسئلة عشوائيًا من بنك الأسئلة مباشرة");
    }
    return { questions, warnings, source: "bank" };
  }

  /* ---------- الوضع الحقيقي: Groq ---------- */
  const refs = findReferenceQuestions(settings);
  const deadline = Date.now() + GENERATION_BUDGET_MS;
  let budgetExceeded = false;

  const results: (GeneratedQuestion | null)[] = new Array(slots.length).fill(null);

  // 1) محاولة دفعة كاملة
  const batch = buildBatchPrompt(settings, refs, perType);
  try {
    const data = await callGroqJSON(
      batch.system,
      batch.user,
      0.9,
      Math.min(GROQ_REQUEST_TIMEOUT_MS, Math.max(1, deadline - Date.now()))
    );
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
  // الميزانية محسوبة من بداية استدعاءات Groq حتى لا نتجاوز حد Vercel (60 ثانية).
  retryLoop: for (let i = 0; i < slots.length; i++) {
    let attempts = results[i] ? 1 : 0;
    while (!results[i] && attempts < MAX_ATTEMPTS) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        budgetExceeded = true;
        break retryLoop;
      }

      attempts++;
      const single = buildSinglePrompt(settings, slots[i]);
      try {
        const data = await callGroqJSON(
          single.system,
          single.user,
          1.0,
          Math.min(GROQ_REQUEST_TIMEOUT_MS, remainingMs)
        );
        const arr = extractQuestionsArray(data);
        results[i] = arr.length
          ? tryAdopt(arr[0], usedTexts)
          : null;
      } catch (e) {
        console.error(`[generator] single retry failed (attempt ${attempts})`, e);
        if (Date.now() >= deadline) {
          budgetExceeded = true;
          break retryLoop;
        }
      }
    }
  }

  const questions = results.filter(Boolean) as GeneratedQuestion[];
  if (
    !budgetExceeded &&
    questions.length < slots.length &&
    Date.now() >= deadline
  ) {
    budgetExceeded = true;
  }
  if (budgetExceeded) {
    warnings.push(
      "توقفت محاولات الإعادة بعد بلوغ مهلة التوليد (50 ثانية)، وتم الاحتفاظ بالأسئلة التي تولدت بنجاح"
    );
  }
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
  const topics = selectedTopics(settings);
  const useAI =
    settings.generationSource === "ai" && Boolean(process.env.GROQ_API_KEY);
  if (!useAI) {
    // وضع البنك: البديل يظل داخل اتحاد الوحدات المختارة.
    const alt = findBankQuestions({
      subject: settings.subject,
      topics,
      subtopic: topics.length === 1 ? settings.subtopic : undefined,
      type,
      excludeTexts: [normalizeText(original.question)],
      excludeIds: original.bankId ? [original.bankId] : [],
    });
    if (!alt.length) return null;
    return bankToQuestion(alt[0]);
  }

  const used = new Set([normalizeText(original.question)]);
  const single = buildSinglePrompt(settings, type, {
    question: original.question,
  });
  const deadline = Date.now() + GENERATION_BUDGET_MS;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;
    try {
      const data = await callGroqJSON(
        single.system,
        single.user,
        1.0,
        Math.min(GROQ_REQUEST_TIMEOUT_MS, remainingMs)
      );
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
