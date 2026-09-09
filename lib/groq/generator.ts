/**
 * طبقة Groq — Groq لا يملك القرار:
 * مسؤول فقط عن الصياغة وتغيير الأرقام وإنشاء Variations،
 * ونوع السؤال يحدده المعلم والتصحيح يعمله النظام.
 */
import type { Difficulty, ExamSettings, QuestionType } from "@/lib/questions/types";
import { TYPE_LABELS } from "@/lib/questions/validator";
import type { BankQuestion } from "@/lib/bank";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_REQUEST_TIMEOUT_MS = 45_000;

export interface PromptParts {
  system: string;
  user: string;
}

const DIFFICULTY_AR: Record<Difficulty, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
  mixed: "متنوعة (مزيج من السهل والمتوسط والصعب)",
};

/**
 * البرومبت الأساسي — يحدد عقد JSON بدقة:
 * - MCQ: correctAnswer = نص الاختيار الصحيح كما هو في options
 * - TRUE_FALSE: correctAnswer = true/false
 * - MATCHING: correctAnswer = فهرس (index) العنصر الصحيح في rightItems لكل عنصر في leftItems
 * - ORDERING: correctAnswer = عناصر data.items نفسها بالترتيب الصحيح
 */
const SYSTEM_PROMPT = `أنت خبير في صياغة أسئلة الامتحانات باللغة العربية. مهمتك توليد أسئلة دقيقة رياضيًا وعلميًا بصياغة واضحة.
أعد JSON فقط بدون أي نص آخر.

الصيغة المطلوبة:
{ "questions": [ ... ] }

تفاصيل كل نوع:

1) MCQ — اختيار من متعدد:
{ "type": "MCQ", "question": "نص السؤال", "data": { "options": ["اختيار1","اختيار2","اختيار3","اختيار4"] }, "correctAnswer": "نص الاختيار الصحيح مطابقًا حرفيًا لأحد العناصر في options", "solution": "شرح مختصر للحل" }

2) TRUE_FALSE — صح / غلط:
{ "type": "TRUE_FALSE", "question": "نص العبارة", "data": { "statement": "نص العبارة نفسها" }, "correctAnswer": true, "solution": "توضيح لماذا" }
(قيمة correctAnswer: true إذا كانت العبارة صحيحة و false إذا كانت خاطئة)

3) MATCHING — توصيل:
{ "type": "MATCHING", "question": "وصّل كل عنصر في العمود الأول بنظيره في العمود الثاني", "data": { "leftItems": ["...","...","..."], "rightItems": ["...","...","..."] }, "correctAnswer": [2, 0, 1], "solution": "شرح التوصيلات" }
(3 إلى 6 أزواج. correctAnswer مصفوفة أرقام طولها نفسه طول leftItems: العنصر i في leftItems يوصَّل بالعنصر correctAnswer[i] في rightItems. الأرقام من 0 إلى n-1 بدون أي تكرار. عَرِّض rightItems بتعشيش لا يجعل الإجابة بديهية)

4) ORDERING — ترتيب:
{ "type": "ORDERING", "question": "رتب العناصر التالية ترتيبًا تصاعديًا", "data": { "items": ["عنصر","عنصر","عنصر"] }, "correctAnswer": ["عنصر","عنصر","عنصر"], "solution": "شرح الترتيب" }
(3 إلى 8 عناصر. data.items: العناصر بأي ترتيب. correctAnswer: العناصر نفسها بالترتيب الصحيح فقط — لا تغيّر النص ولا تضيف شيءًا)

قواعد صارمة:
1. الإجابة يجب أن تكون صحيحة رياضيًا دائمًا. تحقق من كل حساب خطوة بخطوة قبل كتابة الإجابة.
2. MCQ: 4 اختيارات بالضبط بدون تكرار، والإجابة الصحيحة يجب أن توجد بينها مطابقة حرفيًا.
3. لا تجعل الإجابة الصحيحة في MCQ هي دائمًا نفس الخانة (أ، ب، ج، د).
4. solution يجب أن يذكر الإجابة الصحيحة أو يستنتجها بوضوح مع خطوات الحل.
5. اكتب الأرقام بأرقام إنجليزية (0-9) والأحرف اللاتينية كما هي في الرمز الرياضي.
6. لا تضف أسئلة أكثر أو أقل من المطلوب بالضبط.
7. اكتب بالعربية الفصحى المبسطة مناسبة لمستوى المرحلة الثانوية.
8. ارجع JSON صالحًا 100% بدون تعليقات ولا Markdown.`;

function topicPromptLines(settings: ExamSettings): string {
  // fallback يحافظ على عمل أي استدعاء داخلي قديم لا يمرر topics بعد.
  const topics = settings.topics?.length ? settings.topics : [settings.topic];
  return [
    `الموضوع: ${topics.join("، ")}`,
    topics.length > 1 ? "وزّع الأسئلة على هذه الوحدات بالتساوي" : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * برومبت توليد دفعة كاملة (المطلوب N سؤال موزعين على أنواع محددة)
 */
export function buildBatchPrompt(
  settings: ExamSettings,
  refs: BankQuestion[],
  perType: Partial<Record<QuestionType, number>>
): PromptParts {
  const typeLine = (Object.entries(perType) as [QuestionType, number][])
    .map(([t, n]) => `${n} ${TYPE_LABELS[t]} (${t})`)
    .join("، ");

  const user = `أنشئ أسئلة امتحان بالمواصفات التالية:
المادة: ${settings.subject}
${topicPromptLines(settings)}
${settings.subtopic ? `الموضوع الفرعي: ${settings.subtopic}` : ""}
الصعوبة: ${DIFFICULTY_AR[settings.difficulty]}
المطلوب بالضبط: ${settings.questionCount} سؤالًا موزعة كالتالي: ${typeLine}.

أسئلة مرجعية بنفس النمط (تعلّم النمط والصياغة من هذه الأمثلة، ولا تنسخها حرفيًا — بدّل الأرقام والقيم):
${refs.length ? JSON.stringify(refs.map((r) => ({ topic: r.topic, type: r.type, question: r.question, data: r.data, correctAnswer: r.correctAnswer, solution: r.solution })), null, 2) : "لا توجد أمثلة مرجعية، اعتمد على فهمك للموضوع"}

أعد JSON فقط بالصيغة المتفق عليها.`;

  return { system: SYSTEM_PROMPT, user };
}

/**
 * برومبت إعادة توليد سؤال واحد (Regeneration) بنفس المفهوم
 */
export function buildSinglePrompt(
  settings: ExamSettings,
  type: QuestionType,
  reference?: { question: string }
): PromptParts {
  const user = `أنشئ سؤالًا واحدًا فقط:
المادة: ${settings.subject}
${topicPromptLines(settings)}
${settings.subtopic ? `الموضوع الفرعي: ${settings.subtopic}` : ""}
الصعوبة: ${DIFFICULTY_AR[settings.difficulty]}
النوع المطلوب: ${TYPE_LABELS[type]} (${type})
${reference ? `سؤال مرجعي — أنشئ سؤالًا مشابهًا بنفس المهارة لكن بقيم/أرقام مختلفة: ${reference.question}` : ""}

أعد JSON فقط بالصيغة المتفق عليها (مصفوفة questions فيها عنصر واحد).`;

  return { system: SYSTEM_PROMPT, user };
}

/**
 * استدعاء Groq (OpenAI-compatible) مع response_format json_object
 */
export async function callGroqJSON(
  system: string,
  user: string,
  temperature = 0.9,
  timeoutMs = GROQ_REQUEST_TIMEOUT_MS
): Promise<unknown> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY غير محدد");
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  // لا نسمح لأي نداء بتجاوز 45 ثانية. يمكن للمحرك تمرير مهلة أقصر
  // عندما لا يتبقى من ميزانية Vercel الإجمالية سوى بضع ثوانٍ.
  const requestTimeout = Math.max(
    1,
    Math.min(timeoutMs, GROQ_REQUEST_TIMEOUT_MS)
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeout);

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Groq API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Groq أعاد إجابة فارغة");
    }

    // تنظيف أي Markdown fences محتملة
    const cleaned = content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      throw new Error("تعذر تحليل JSON من Groq");
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("انتهت مهلة الاتصال بـ Groq");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/** استخراج مصفوفة الأسئلة من إجابة Groq بأي شكل شائع */
export function extractQuestionsArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.questions)) return obj.questions as unknown[];
    if (Array.isArray(obj.data)) return obj.data as unknown[];
  }
  return [];
}
