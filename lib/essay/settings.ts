/**
 * إعدادات صفحة النماذج المقالية: قيم افتراضية + قراءة/كتابة آمنة في المتصفح.
 *
 * ملاحظة مهمة: الكتابة تتم لحظة تغيير الإعداد (write-through) وليس في effect
 * لاحق، حتى لا يحدث أي تعارض بين الاسترجاع والحفظ يعيد الخيارات لحالتها.
 */
import type { EssayDifficulty, EssayLayout } from "./types";

export interface EssaySettings {
  title: string;
  school: string;
  duration: string;
  topics: string[];
  difficulty: EssayDifficulty | "mixed";
  formCount: number;
  perForm: number;
  layout: EssayLayout;
  showAnswers: boolean;
  showLines: boolean;
  withKey: boolean;
  shuffleQuestions: boolean;
  seed: number;
}

/** مفتاح جديد لإبطال أي إعدادات قديمة تالفة كانت مثبّتة على 4 نماذج */
export const SETTINGS_KEY = "mini_exam_essay_settings_v3";

export const FALLBACK_SETTINGS: Omit<EssaySettings, "topics"> = {
  title: "اختبار الأسئلة المقالية",
  school: "",
  duration: "60 دقيقة",
  difficulty: "mixed",
  formCount: 45,
  perForm: 5,
  layout: 4,
  showAnswers: false,
  showLines: false,
  withKey: true,
  shuffleQuestions: true,
  seed: 1001,
};

export function defaultSettings(knownTopics: string[]): EssaySettings {
  return { ...FALLBACK_SETTINGS, topics: [...knownTopics] };
}

const FORM_COUNTS = [4, 8, 12, 16, 20, 24, 30, 36, 45, 50, 60];
const PER_FORM = [3, 4, 5, 6, 8, 10];
const DIFFICULTIES: (EssayDifficulty | "mixed")[] = [
  "mixed",
  "easy",
  "medium",
  "hard",
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(value)));

/**
 * يتحقق من الإعدادات المحفوظة ويحوّلها لإعدادات صالحة فقط.
 * أي قيمة غير معروفة تُستبعد بدل أن تُطبّق وتفسد الواجهة.
 */
export function sanitizeSettings(
  raw: unknown,
  knownTopics: string[]
): Partial<EssaySettings> {
  if (!raw || typeof raw !== "object") return {};
  const source = raw as Record<string, unknown>;
  const out: Partial<EssaySettings> = {};

  if (typeof source.title === "string") out.title = source.title;
  if (typeof source.school === "string") out.school = source.school;
  if (typeof source.duration === "string") out.duration = source.duration;

  if (Array.isArray(source.topics)) {
    const valid = source.topics.filter(
      (t): t is string => typeof t === "string" && knownTopics.includes(t)
    );
    if (valid.length) out.topics = valid;
  }

  if (
    typeof source.difficulty === "string" &&
    DIFFICULTIES.includes(source.difficulty as EssayDifficulty | "mixed")
  ) {
    out.difficulty = source.difficulty as EssayDifficulty | "mixed";
  }

  if (typeof source.formCount === "number" && Number.isFinite(source.formCount)) {
    out.formCount = FORM_COUNTS.includes(source.formCount)
      ? source.formCount
      : clamp(source.formCount, 1, 60);
  }

  if (typeof source.perForm === "number" && Number.isFinite(source.perForm)) {
    out.perForm = PER_FORM.includes(source.perForm)
      ? source.perForm
      : clamp(source.perForm, 1, 10);
  }

  if (source.layout === 1 || source.layout === 2 || source.layout === 4) {
    out.layout = source.layout;
  }

  for (const flag of [
    "showAnswers",
    "showLines",
    "withKey",
    "shuffleQuestions",
  ] as const) {
    if (typeof source[flag] === "boolean") out[flag] = source[flag];
  }

  if (typeof source.seed === "number" && Number.isFinite(source.seed)) {
    out.seed = Math.round(source.seed);
  }

  return out;
}

export function loadSettings(knownTopics: string[]): Partial<EssaySettings> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return sanitizeSettings(JSON.parse(raw), knownTopics);
  } catch {
    return null;
  }
}

export function saveSettings(settings: EssaySettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // التخزين غير متاح (وضع خاص/ممتلئ) — نتجاهل بهدوء
  }
}

export function clearSettings(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SETTINGS_KEY);
  } catch {
    // تجاهل
  }
}
