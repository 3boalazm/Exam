/**
 * توليد نماذج الأسئلة المقالية بشكل حتمي (deterministic) اعتمادًا على بذرة (seed).
 * نفس البذرة + نفس الإعدادات = نفس النماذج بالضبط، ما يجعل الطباعة قابلة للتكرار.
 */
import { essayQuestions, essayTopics } from "./bank";
import type {
  EssayBuildOptions,
  EssayForm,
  EssayQuestion,
} from "./types";

/* ---------------- عشوائية حتمية ---------------- */

function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function random(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

export function createRng(seed: number, salt = ""): Rng {
  return mulberry32(hashSeed(`${seed}::${salt}`));
}

export function shuffleWithRng<T>(items: T[], rng: Rng): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---------------- التوليد ---------------- */

const DIFFICULTY_ORDER = { easy: 1, medium: 2, hard: 3 } as const;

export interface EssayBuildResult {
  forms: EssayForm[];
  notice: string | null;
}

export function buildEssayForms(opts: EssayBuildOptions): EssayBuildResult {
  const topics = essayTopics.filter((t) => opts.topics.includes(t));
  const rng = createRng(opts.seed, topics.join("|"));

  if (!topics.length) return { forms: [], notice: "اختر درسًا واحدًا على الأقل." };

  const pools = new Map<string, EssayQuestion[]>();
  for (const topic of topics) {
    const list = essayQuestions.filter(
      (q) =>
        q.topic === topic &&
        (opts.difficulty === "mixed" || q.difficulty === opts.difficulty)
    );
    // الأسهل أولًا داخل كل درس، مع خلط حتمي
    const sorted = [...list].sort(
      (a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
    );
    pools.set(topic, shuffleWithRng(sorted, rng));
  }

  const usableTopics = topics.filter((t) => (pools.get(t)?.length ?? 0) > 0);
  if (!usableTopics.length) {
    return {
      forms: [],
      notice: "لا توجد أسئلة مطابقة للصعوبة المختارة داخل الدروس المحددة.",
    };
  }

  const perForm = Math.max(1, Math.min(opts.perForm, 10));
  const count = Math.max(1, Math.min(opts.count, 45));
  const pointers = new Map<string, number>(usableTopics.map((t) => [t, 0]));
  const usage = new Map<string, number>(usableTopics.map((t) => [t, 0]));
  const forms: EssayForm[] = [];

  // ترتيب دروس ثابت + إزاحة لكل نموذج، مع موازنة عدد المرات التي يظهر فيها كل درس
  // حتى لا يتكرر أي سؤال داخل الخمسة والأربعين نموذجًا.
  const baseOrder = shuffleWithRng(usableTopics, rng);

  for (let i = 0; i < count; i++) {
    const slotCount = Math.min(perForm, usableTopics.length);

    const chosenTopics = baseOrder
      .map((topic, pos) => ({
        topic,
        uses: usage.get(topic) ?? 0,
        offset: (pos - i + baseOrder.length) % baseOrder.length,
      }))
      .sort((a, b) => a.uses - b.uses || a.offset - b.offset)
      .slice(0, slotCount)
      .map((item) => item.topic);

    const row = chosenTopics.map((topic) => {
      const pool = pools.get(topic) as EssayQuestion[];
      const idx = pointers.get(topic) ?? 0;
      pointers.set(topic, idx + 1);
      usage.set(topic, (usage.get(topic) ?? 0) + 1);
      return pool[idx % pool.length];
    });

    const ordered = opts.shuffleQuestions
      ? shuffleWithRng(row, createRng(opts.seed + i * 977, "order"))
      : row;

    forms.push({
      number: i + 1,
      code: `F-${String(i + 1).padStart(2, "0")}`,
      questions: ordered,
      totalPoints: ordered.reduce((sum, q) => sum + q.points, 0),
    });
  }

  // سعة البنك: إجمالي الأسئلة ÷ أسئلة النموذج، مع مراعاة الدرس الأقل عددًا
  const totalPool = usableTopics.reduce((sum, t) => sum + (pools.get(t)?.length ?? 0), 0);
  const minPool = Math.min(...usableTopics.map((t) => pools.get(t)?.length ?? 0));
  const capacity = Math.min(
    Math.floor(totalPool / perForm),
    Math.floor((minPool * usableTopics.length) / perForm)
  );
  const notice =
    count > capacity
      ? `البنك يكفي ${capacity} نموذجًا مختلفًا بالصعوبة والتصنيف المختار، لذلك ستتكرر بعض الأسئلة بعد النموذج ${capacity}.`
      : null;

  return { forms, notice };
}

/** تقسيم النماذج إلى صفحات حسب عدد النماذج في ورقة A4 */
export function chunkForms(forms: EssayForm[], perSheet: number): EssayForm[][] {
  const pages: EssayForm[][] = [];
  for (let i = 0; i < forms.length; i += perSheet) {
    pages.push(forms.slice(i, i + perSheet));
  }
  return pages;
}
