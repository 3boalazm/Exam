/**
 * قوالب أسئلة بأرقام متغيّرة وإجابات محسوبة تلقائيًا.
 *
 * كل قالب يستقبل مولّد أرقام عشوائيًا حتميًا (Rng) ويبني نص السؤال وإجابته
 * من نفس الأرقام، لذلك الإجابة صحيحة دائمًا ومطابقة للسؤال، ومع نفس البذرة
 * (seed) تبقى الأرقام ثابتة عند إعادة الطباعة.
 */
import type { EssayDifficulty } from "./types";
import type { Rng } from "./generate";

export interface QuestionTemplate {
  id: string;
  topic: string;
  skill: string;
  difficulty: EssayDifficulty;
  points: number;
  build: (rng: Rng) => { text: string; answer: string };
}

/* ---------------- أدوات ---------------- */

const rnd = (rng: Rng, min: number, max: number): number =>
  min + Math.floor(rng() * (max - min + 1));

const pick = <T,>(rng: Rng, items: readonly T[]): T =>
  items[Math.floor(rng() * items.length)];

/** تنسيق رقم بفاصلة عشرية عربية (مثل المذكرة) */
export function ar(value: number, digits = 0): string {
  const fixed = Number(value).toFixed(digits);
  const trimmed = digits > 0 ? fixed : String(Math.round(value));
  return trimmed.replace(".", ",").replace("-", "−");
}

/** كسر مبسّط للعرض */
function fraction(num: number, den: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
  const g = gcd(num, den) || 1;
  const n = num / g;
  const d = den / g;
  return d === 1 ? `${n}` : `${n}/${d}`;
}

/** رقم عشري بعدد منازل محدد مع ضمان أن آخر رقم ليس صفرًا */
function decimalWith(
  rng: Rng,
  wholeMin: number,
  wholeMax: number,
  decimals: number
): { value: number; text: string } {
  const whole = rnd(rng, wholeMin, wholeMax);
  const digits = Array.from({ length: decimals }, (_, i) =>
    i === decimals - 1 ? rnd(rng, 1, 9) : rnd(rng, 0, 9)
  );
  const text = `${whole}${decimals ? "." + digits.join("") : ""}`;
  return { value: Number(text), text: text.replace(".", ",") };
}

/** يطبع العدد صحيحًا إن كان صحيحًا، وإلا بمنزلتين عشريتين */
function num(value: number): string {
  return Number.isInteger(value) ? String(value) : ar(value, 2);
}

function roundTo(value: number, unit: number): number {
  return Math.round(value / unit) * unit;
}

function factorial(n: number): number {
  let out = 1;
  for (let i = 2; i <= n; i++) out *= i;
  return out;
}

function nPr(n: number, r: number): number {
  let out = 1;
  for (let i = 0; i < r; i++) out *= n - i;
  return out;
}

function nCr(n: number, r: number): number {
  return nPr(n, r) / factorial(r);
}

/** عدد الأصفار في آخر العدد (لتحديد نهايتي الخطأ للأعداد الصحيحة) */
function trailingZeros(n: number): number {
  let count = 0;
  let value = Math.abs(Math.round(n));
  while (value > 0 && value % 10 === 0) {
    value /= 10;
    count++;
  }
  return count;
}

function decimalPlaces(n: number): number {
  const s = String(n);
  const dot = s.indexOf(".");
  return dot < 0 ? 0 : s.length - dot - 1;
}

/** نهايتا الخطأ المطلق للعدد مقرّبًا لآخر رقم فيه */
function absoluteErrorLimit(value: number): number {
  if (Number.isInteger(value)) return 0.5 * Math.pow(10, trailingZeros(value));
  return 0.5 * Math.pow(10, -decimalPlaces(value));
}

function limitText(value: number): string {
  const limit = absoluteErrorLimit(value);
  return `± ${ar(limit, decimalPlaces(limit))}`;
}

const T1 = "التقريب";
const T2 = "الخطأ المطلق والنسبي والمئوي";
const T3 = "نهايتا الخطأ المطلق";
const T4 = "تراكم الخطأ";
const T5 = "المتباينات والبرمجة الخطية";
const T6 = "المتتابعة الحسابية — الحد النوني";
const T7 = "الوسط والأوساط الحسابية";
const T8 = "مجموع المتتابعة الحسابية";
const T9 = "المتتابعة الهندسية";
const T10 = "مجموع المتتابعة الهندسية والمجموع اللانهائي";
const T11 = "المضروب والتباديل";
const T12 = "التوافيق";

/* ---------------- التقريب ---------------- */

const roundingTemplates: QuestionTemplate[] = [
  {
    id: "round-unit",
    topic: T1,
    skill: "قاعدة التقريب",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const whole = rnd(rng, 12, 98);
      const frac = rnd(rng, 1, 9);
      const value = whole + frac / 10;
      const rounded = Math.round(value);
      return {
        text: `قرّب العدد ${ar(value, 1)} لأقرب وحدة، ثم اذكر الخطأ المطلق في التقريب.`,
        answer: `${rounded}، والخطأ المطلق = ${ar(Math.abs(rounded - value), 1)}`,
      };
    },
  },
  {
    id: "round-tenth",
    topic: T1,
    skill: "قاعدة التقريب",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const whole = rnd(rng, 2, 60);
      const value =
        whole + rnd(rng, 1, 9) / 10 + rnd(rng, 0, 9) / 100 + rnd(rng, 0, 9) / 1000;
      const rounded = roundTo(value, 0.1);
      return {
        text: `قرّب العدد ${ar(value, 3)} لأقرب جزء من عشرة.`,
        answer: ar(rounded, 1),
      };
    },
  },
  {
    id: "round-hundredth",
    topic: T1,
    skill: "قاعدة التقريب",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const whole = rnd(rng, 2, 60);
      const value = whole + rnd(rng, 1, 9) / 10 + rnd(rng, 0, 9) / 100 + rnd(rng, 0, 9) / 1000;
      return {
        text: `قرّب العدد ${ar(value, 3)} لأقرب جزء من مائة.`,
        answer: ar(roundTo(value, 0.01), 2),
      };
    },
  },
  {
    id: "round-hundred",
    topic: T1,
    skill: "قاعدة التقريب",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const value = rnd(rng, 12, 98) * 100 + rnd(rng, 1, 98);
      return {
        text: `قرّب العدد ${value} لأقرب مائة، ثم اذكر الخطأ المطلق.`,
        answer: `${roundTo(value, 100)}، والخطأ المطلق = ${ar(Math.abs(roundTo(value, 100) - value), 0)}`,
      };
    },
  },
  {
    id: "round-thousand",
    topic: T1,
    skill: "قاعدة التقريب",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const value = rnd(rng, 12, 90) * 1000 + rnd(rng, 1, 999);
      return {
        text: `قرّب العدد ${value} لأقرب ألف.`,
        answer: ar(roundTo(value, 1000), 0),
      };
    },
  },
];

/* ---------------- الخطأ ---------------- */

const errorTemplates: QuestionTemplate[] = [
  {
    id: "abs-relative",
    topic: T2,
    skill: "الخطأ المطلق",
    difficulty: "easy",
    points: 2,
    build: (rng) => {
      const whole = rnd(rng, 12, 90);
      const value = whole + rnd(rng, 1, 9) / 10;
      const rounded = Math.round(value);
      const abs = Math.abs(rounded - value);
      return {
        text: `قرّب العدد ${ar(value, 1)} لأقرب وحدة، ثم أوجد الخطأ المطلق والخطأ النسبي.`,
        answer: `${rounded}، الخطأ المطلق = ${ar(abs, 1)}، والخطأ النسبي = ${ar(abs / value, 4)}`,
      };
    },
  },
  {
    id: "grams-percent",
    topic: T2,
    skill: "الخطأ المئوي",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const grams = rnd(rng, 620, 980);
      const kg = grams / 1000;
      const rounded = Math.round(kg);
      const abs = Math.abs(rounded - kg);
      return {
        text: `جسم وزنه ${grams} جرامًا قُرّب لأقرب كيلوجرام. أوجد الخطأ المطلق والخطأ المئوي.`,
        answer: `${rounded} كجم، الخطأ المطلق = ${ar(abs, 3)} كجم، والخطأ المئوي ≈ ${ar((abs / kg) * 100, 2)}%`,
      };
    },
  },
  {
    id: "percent-to-absolute",
    topic: T2,
    skill: "الخطأ المئوي",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const value = rnd(rng, 4, 60) * 20;
      const percent = pick(rng, [2, 2.5, 4, 5] as const);
      const abs = (value * percent) / 100;
      return {
        text: `قياس مقداره ${value} بخطأ مئوي ${ar(percent, percent % 1 ? 1 : 0)}%. احسب الخطأ المطلق.`,
        answer: `الخطأ المطلق = ${value} × ${ar(percent, percent % 1 ? 1 : 0)} ÷ 100 = ${ar(abs, 2)}`,
      };
    },
  },
  {
    id: "absolute-to-value",
    topic: T2,
    skill: "الخطأ النسبي",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const value = rnd(rng, 3, 40) * 20;
      const percent = 5;
      const abs = (value * percent) / 100;
      return {
        text: `خطأ مئوي ${percent}% وخطأ مطلق ${ar(abs, 2)}. أوجد القيمة المقاسة.`,
        answer: `القيمة = ${ar(abs, 2)} ÷ ${ar(percent / 100, 2)} = ${value}`,
      };
    },
  },
  {
    id: "perimeter-percent",
    topic: T2,
    skill: "الخطأ المئوي",
    difficulty: "hard",
    points: 3,
    build: (rng) => {
      const a = rnd(rng, 10, 20) + rnd(rng, 1, 9) / 10;
      const b = rnd(rng, 5, 12) + rnd(rng, 1, 9) / 10;
      const c = rnd(rng, 7, 15) + rnd(rng, 1, 9) / 10;
      const perimeter = a + b + c;
      const rounded = Math.round(perimeter);
      const abs = Math.abs(rounded - perimeter);
      return {
        text: `مثلث أضلاعه ${ar(a, 1)} و${ar(b, 1)} و${ar(c, 1)} سم. احسب محيطه مقرّبًا لأقرب سنتيمتر، ثم أوجد الخطأ المئوي.`,
        answer: `المحيط = ${ar(perimeter, 1)} ≈ ${rounded} سم، الخطأ المطلق = ${ar(abs, 1)}، والخطأ المئوي ≈ ${ar((abs / perimeter) * 100, 2)}%`,
      };
    },
  },
];

/* ---------------- نهايتا الخطأ ---------------- */

const limitTemplates: QuestionTemplate[] = [
  {
    id: "limit-decimals",
    topic: T3,
    skill: "نهايتا الخطأ",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const decimals = rnd(rng, 1, 3);
      const number = decimalWith(rng, 2, 90, decimals);
      return {
        text: `أوجد نهايتي الخطأ المطلق للعدد ${number.text} (مقرّب لآخر رقم فيه).`,
        answer: limitText(number.value),
      };
    },
  },
  {
    id: "limit-bounds",
    topic: T3,
    skill: "الحدان الأعلى والأدنى",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const decimals = rnd(rng, 1, 2);
      const number = decimalWith(rng, 2, 60, decimals);
      const limit = absoluteErrorLimit(number.value);
      return {
        text: `العدد ${number.text} مقرّب لآخر رقم فيه. أوجد الحد الأعلى والحد الأدنى.`,
        answer: `نهايتا الخطأ المطلق = ${limitText(number.value)}، والحد الأعلى = ${ar(number.value + limit, decimals + 1)}، والحد الأدنى = ${ar(number.value - limit, decimals + 1)}`,
      };
    },
  },
  {
    id: "limit-integer",
    topic: T3,
    skill: "نهايتا الخطأ",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const zeros = rnd(rng, 0, 2);
      const value = rnd(rng, 2, 9) * Math.pow(10, zeros + 1);
      return {
        text: `أوجد نهايتي الخطأ المطلق للعدد ${value} (مقرّب لآخر رقم فيه).`,
        answer: limitText(value),
      };
    },
  },
  {
    id: "limit-sum",
    topic: T3,
    skill: "نهايتا الخطأ",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const a = decimalWith(rng, 2, 40, 1);
      const b = decimalWith(rng, 2, 40, 2);
      const total = absoluteErrorLimit(a.value) + absoluteErrorLimit(b.value);
      return {
        text: `أوجد نهايتي الخطأ المطلق للمقدار ${a.text} + ${b.text}، علمًا بأن كل عدد مقرّب لآخر رقم فيه.`,
        answer: `± (${ar(absoluteErrorLimit(a.value), 3)} + ${ar(absoluteErrorLimit(b.value), 3)}) = ± ${ar(total, 3)}`,
      };
    },
  },
];

/* ---------------- تراكم الخطأ ---------------- */

const accumulationTemplates: QuestionTemplate[] = [
  {
    id: "acc-sum",
    topic: T4,
    skill: "تراكم الخطأ في الجمع",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const a = decimalWith(rng, 2, 40, 2);
      const b = decimalWith(rng, 2, 40, 2);
      const total = absoluteErrorLimit(a.value) + absoluteErrorLimit(b.value);
      return {
        text: `أوجد نهايتي الخطأ المطلق للمقدار ${a.text} + ${b.text}، علمًا بأن كل عدد مقرّب لآخر رقم فيه.`,
        answer: `± (${ar(absoluteErrorLimit(a.value), 3)} + ${ar(absoluteErrorLimit(b.value), 3)}) = ± ${ar(total, 3)}`,
      };
    },
  },
  {
    id: "acc-diff",
    topic: T4,
    skill: "تراكم الخطأ في الطرح",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const a = decimalWith(rng, 20, 60, 2);
      const b = decimalWith(rng, 2, 15, 2);
      const total = absoluteErrorLimit(a.value) + absoluteErrorLimit(b.value);
      return {
        text: `أوجد نهايتي الخطأ المطلق للمقدار ${a.text} − ${b.text}، علمًا بأن كل عدد مقرّب لآخر رقم فيه.`,
        answer: `± (${ar(absoluteErrorLimit(a.value), 3)} + ${ar(absoluteErrorLimit(b.value), 3)}) = ± ${ar(total, 3)}`,
      };
    },
  },
  {
    id: "acc-perimeter",
    topic: T4,
    skill: "تراكم الخطأ في الجمع",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const a = decimalWith(rng, 3, 12, 2);
      const b = decimalWith(rng, 3, 12, 2);
      const c = decimalWith(rng, 3, 12, 2);
      const limit =
        absoluteErrorLimit(a.value) +
        absoluteErrorLimit(b.value) +
        absoluteErrorLimit(c.value);
      return {
        text: `مثلث أضلاعه ${a.text} و${b.text} و${c.text} سم مقرّبة لآخر رقم فيها. أوجد نهايتي الخطأ المطلق لمحيطه.`,
        answer: `المحيط = ${ar(a.value + b.value + c.value, 2)} سم، ونهايتا الخطأ المطلق = ± (${ar(absoluteErrorLimit(a.value), 3)} + ${ar(absoluteErrorLimit(b.value), 3)} + ${ar(absoluteErrorLimit(c.value), 3)}) = ± ${ar(limit, 3)}`,
      };
    },
  },
  {
    id: "acc-product-relative",
    topic: T4,
    skill: "تراكم الخطأ في الضرب",
    difficulty: "hard",
    points: 3,
    build: (rng) => {
      const a = decimalWith(rng, 5, 30, 1);
      const b = decimalWith(rng, 3, 15, 1);
      const ra = absoluteErrorLimit(a.value) / a.value;
      const rb = absoluteErrorLimit(b.value) / b.value;
      return {
        text: `إذا كانت س = ${a.text} و ص = ${b.text}، أوجد نهايتي الخطأ النسبي للمقدار س × ص.`,
        answer: `± (${ar(ra, 4)} + ${ar(rb, 4)}) ≈ ± ${ar(ra + rb, 4)}`,
      };
    },
  },
];

/* ---------------- المتباينات ---------------- */

const inequalityTemplates: QuestionTemplate[] = [
  {
    id: "ineq-less",
    topic: T5,
    skill: "متباينة في متغير واحد",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const a = rnd(rng, 2, 7);
      const x = rnd(rng, 1, 9);
      const b = rnd(rng, 1, 15);
      const c = a * x + b;
      return {
        text: `حل المتباينة: ${a}س + ${b} < ${c}.`,
        answer: `${a}س < ${c - b} ⇒ س < ${x}`,
      };
    },
  },
  {
    id: "ineq-greater",
    topic: T5,
    skill: "متباينة في متغير واحد",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const a = rnd(rng, 2, 7);
      const x = rnd(rng, 1, 9);
      const b = rnd(rng, 1, 12);
      const c = a * x - b;
      return {
        text: `حل المتباينة: ${a}س − ${b} ≥ ${ar(c)}.`,
        answer: `${a}س ≥ ${ar(c + b)} ⇒ س ≥ ${x}`,
      };
    },
  },
  {
    id: "ineq-negative",
    topic: T5,
    skill: "متباينة في متغير واحد",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const a = rnd(rng, 2, 8);
      const x = rnd(rng, 1, 9);
      return {
        text: `حل المتباينة: −${a}س < ${a * x}.`,
        answer: `بقسمة الطرفين على −${a} مع عكس الاتجاه: س > −${x}`,
      };
    },
  },
  {
    id: "ineq-compound",
    topic: T5,
    skill: "متباينتان معًا",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const a = rnd(rng, 2, 5);
      const b = rnd(rng, 0, 6);
      const x = rnd(rng, 1, 7);
      const span = rnd(rng, 1, 3);
      const low = a * x + b;
      const high = a * (x + span) + b;
      return {
        text: `حل المتباينة: ${low} ≤ ${a}س + ${b} < ${high}.`,
        answer: `${low - b} ≤ ${a}س < ${high - b} ⇒ ${x} ≤ س < ${x + span}`,
      };
    },
  },
  {
    id: "ineq-point",
    topic: T5,
    skill: "الحل البياني",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const a = rnd(rng, 1, 4);
      const b = rnd(rng, 1, 4);
      const x = rnd(rng, 1, 5);
      const y = rnd(rng, 1, 5);
      const c = a * x + b * y + rnd(rng, 1, 3);
      const bTerm = b === 1 ? "ص" : `${b}ص`;
      return {
        text: `هل النقطة (${x}، ${y}) تحقق المتباينة ${a}س + ${bTerm} < ${c}؟`,
        answer: `${a}(${x}) + ${b}(${y}) = ${a * x + b * y} < ${c} ⇒ نعم، تحققها`,
      };
    },
  },
];

/* ---------------- المتتابعة الحسابية ---------------- */

const arithmeticTemplates: QuestionTemplate[] = [
  {
    id: "ap-nth",
    topic: T6,
    skill: "الحد النوني",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const a = rnd(rng, 1, 12);
      const d = rnd(rng, 2, 9);
      const n = rnd(rng, 6, 20);
      return {
        text: `متتابعة حسابية حدها الأول ${a} وأساسها ${d}. أوجد الحد ${n}.`,
        answer: `ح${n} = ${a} + (${n} − 1) × ${d} = ${a + (n - 1) * d}`,
      };
    },
  },
  {
    id: "ap-from-two",
    topic: T6,
    skill: "الحد النوني",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const a = rnd(rng, 1, 10);
      const d = rnd(rng, 2, 7);
      const m = rnd(rng, 2, 5);
      const n = m + rnd(rng, 3, 6);
      const hm = a + (m - 1) * d;
      const hn = a + (n - 1) * d;
      return {
        text: `في متتابعة حسابية: الحد ${m} يساوي ${hm} والحد ${n} يساوي ${hn}. أوجد الحد الأول والأساس.`,
        answer: `ح${n} − ح${m} = ${n - m}د = ${hn - hm} ⇒ د = ${d}، ومن ح${m} = أ + ${m - 1}×${d} = ${hm} ⇒ أ = ${a}`,
      };
    },
  },
  {
    id: "ap-contains",
    topic: T6,
    skill: "الحد النوني",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const a = rnd(rng, 1, 9);
      const d = rnd(rng, 2, 7);
      const n = rnd(rng, 5, 18);
      const target = a + (n - 1) * d;
      return {
        text: `هل العدد ${target} حد من حدود المتتابعة (${a}، ${a + d}، ${a + 2 * d}، ...)؟`,
        answer: `ح ن = ${d}ن + ${a - d}، وبحل ${d}ن + ${a - d} = ${target} ⇒ ن = ${n} (عدد طبيعي) ⇒ نعم، هو الحد ${n}`,
      };
    },
  },
  {
    id: "ap-rule",
    topic: T6,
    skill: "الحد النوني",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const a = rnd(rng, 1, 12);
      const d = rnd(rng, 2, 9);
      const rule =
        a - d >= 0
          ? `${d}ن + ${a - d}`
          : `${d}ن − ${Math.abs(a - d)}`;
      return {
        text: `أوجد الحد النوني للمتتابعة (${a}، ${a + d}، ${a + 2 * d}، ...).`,
        answer: `ح ن = ${a} + (ن − 1) × ${d} = ${rule}`,
      };
    },
  },
  {
    id: "ap-first-negative",
    topic: T6,
    skill: "الحد النوني",
    difficulty: "hard",
    points: 3,
    build: (rng) => {
      const a = rnd(rng, 4, 9) * 10;
      const d = rnd(rng, 2, 6);
      // ح ن = أ − (ن − 1)د < 0 ⇒ ن > أ/د + 1
      const n = Math.floor(a / d) + 2;
      const value = a - (n - 1) * d;
      return {
        text: `متتابعة حسابية حدها الأول ${a} وأساسها −${d}. ما أول حد سالب فيها؟`,
        answer: `ح ن = ${a} − ${d}(ن − 1) < 0 ⇒ ${d}(ن − 1) > ${a} ⇒ ن − 1 > ${num(a / d)} ⇒ ن ≥ ${n}، فأول حد سالب هو الحد ${n} وقيمته ${ar(value)}`,
      };
    },
  },
];

/* ---------------- الأوساط الحسابية ---------------- */

const arithmeticMeansTemplates: QuestionTemplate[] = [
  {
    id: "means-insert",
    topic: T7,
    skill: "الأوساط الحسابية",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const k = rnd(rng, 2, 5);
      const d = rnd(rng, 2, 9);
      const a = rnd(rng, 1, 12);
      const b = a + (k + 1) * d;
      const values = Array.from({ length: k }, (_, i) => a + (i + 1) * d);
      return {
        text: `أدخل ${k} أوساط حسابية بين ${a} و${b}.`,
        answer: `الأساس = (${b} − ${a}) ÷ ${k + 1} = ${d} ⇒ ${values.join("، ")}`,
      };
    },
  },
  {
    id: "mean-two",
    topic: T7,
    skill: "الوسط الحسابي",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const x = rnd(rng, 1, 20);
      const y = x + 2 * rnd(rng, 3, 20);
      return {
        text: `أوجد الوسط الحسابي بين العددين ${x} و${y}.`,
        answer: `الوسط = (${x} + ${y}) ÷ 2 = ${(x + y) / 2}`,
      };
    },
  },
  {
    id: "mean-missing",
    topic: T7,
    skill: "الوسط الحسابي",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const x = rnd(rng, 1, 20);
      const y = x + 2 * rnd(rng, 2, 20);
      return {
        text: `إذا كانت ${x}، س، ${y} في متتابعة حسابية، أوجد س.`,
        answer: `2س = ${x} + ${y} = ${x + y} ⇒ س = ${(x + y) / 2}`,
      };
    },
  },
  {
    id: "means-three",
    topic: T7,
    skill: "الأوساط الحسابية",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const mid = rnd(rng, 5, 25);
      const d = rnd(rng, 1, 9);
      return {
        text: `ثلاثة أعداد في متتابعة حسابية مجموعها ${mid * 3}. اكتب صورة هذه الأعداد.`,
        answer: `الحد الأوسط = ${mid * 3} ÷ 3 = ${mid}، والأعداد هي ${mid} − د، ${mid}، ${mid} + د (مثلًا ${mid - d}، ${mid}، ${mid + d})`,
      };
    },
  },
];

/* ---------------- مجموع المتتابعة الحسابية ---------------- */

const arithmeticSumTemplates: QuestionTemplate[] = [
  {
    id: "ap-sum",
    topic: T8,
    skill: "مجموع المتتابعة",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const a = rnd(rng, 1, 12);
      const d = rnd(rng, 2, 8);
      const n = rnd(rng, 8, 25);
      const sum = (n / 2) * (2 * a + (n - 1) * d);
      return {
        text: `متتابعة حسابية حدها الأول ${a} وأساسها ${d}. احسب مجموع أول ${n} حدًا.`,
        answer: `ج${n} = (${n} ÷ 2)[2×${a} + ${n - 1}×${d}] = ${ar(sum, 0)}`,
      };
    },
  },
  {
    id: "ap-sum-last",
    topic: T8,
    skill: "مجموع المتتابعة",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const a = rnd(rng, 1, 10);
      const n = rnd(rng, 8, 30);
      const l = a + (n - 1) * rnd(rng, 2, 6);
      return {
        text: `متتابعة حسابية حدها الأول ${a} وحدها الأخير ${l} وعدد حدودها ${n}. احسب مجموعها.`,
        answer: `ج = (${n} ÷ 2)(${a} + ${l}) = ${(n / 2) * (a + l)}`,
      };
    },
  },
  {
    id: "sum-odd",
    topic: T8,
    skill: "مجموع المتتابعة",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const n = rnd(rng, 10, 60);
      return {
        text: `احسب مجموع الأعداد الفردية من 1 إلى ${2 * n - 1}.`,
        answer: `عدد الحدود ${n} والأساس 2 ⇒ ج = (${n} ÷ 2)(1 + ${2 * n - 1}) = ${n * n}`,
      };
    },
  },
  {
    id: "sum-multiples",
    topic: T8,
    skill: "مجموع المتتابعة",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const m = rnd(rng, 2, 9);
      const k = rnd(rng, 5, 20);
      const sum = (m * k * (k + 1)) / 2;
      return {
        text: `احسب مجموع مضاعفات العدد ${m} من ${m} إلى ${m * k}.`,
        answer: `${m}(1 + 2 + ... + ${k}) = ${m} × ${(k * (k + 1)) / 2} = ${sum}`,
      };
    },
  },
  {
    id: "sum-simple-serie",
    topic: T8,
    skill: "مجموع المتتابعة",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const n = rnd(rng, 20, 120);
      return {
        text: `احسب مجموع الأعداد الصحيحة من 1 إلى ${n}.`,
        answer: `ج = (${n} ÷ 2)(1 + ${n}) = ${(n * (n + 1)) / 2}`,
      };
    },
  },
];

/* ---------------- المتتابعة الهندسية ---------------- */

const geometricTemplates: QuestionTemplate[] = [
  {
    id: "gp-nth",
    topic: T9,
    skill: "الحد النوني",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const a = rnd(rng, 1, 8);
      const r = rnd(rng, 2, 3);
      const n = rnd(rng, 4, 7);
      return {
        text: `متتابعة هندسية حدها الأول ${a} وأساسها ${r}. أوجد الحد ${n}.`,
        answer: `ح${n} = ${a} × ${r}^${n - 1} = ${a * Math.pow(r, n - 1)}`,
      };
    },
  },
  {
    id: "gp-mean",
    topic: T9,
    skill: "الوسط الهندسي",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const m = rnd(rng, 2, 9);
      const n = rnd(rng, 2, 9);
      const x = m * m;
      const y = n * n;
      return {
        text: `أوجد الوسط الهندسي الموجب بين العددين ${x} و${y}.`,
        answer: `الوسط = √(${x} × ${y}) = √${x * y} = ${m * n}`,
      };
    },
  },
  {
    id: "gp-insert",
    topic: T9,
    skill: "الأوساط الهندسية",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const a = rnd(rng, 1, 6);
      const r = rnd(rng, 2, 3);
      const k = rnd(rng, 2, 4);
      const b = a * Math.pow(r, k + 1);
      const values = Array.from({ length: k }, (_, i) => a * Math.pow(r, i + 1));
      return {
        text: `أدخل ${k} أوساط هندسية بين ${a} و${b}.`,
        answer: `ر^${k + 1} = ${b} ÷ ${a} = ${Math.pow(r, k + 1)} ⇒ ر = ${r} ⇒ ${values.join("، ")}`,
      };
    },
  },
  {
    id: "gp-from-two",
    topic: T9,
    skill: "الحد النوني",
    difficulty: "hard",
    points: 3,
    build: (rng) => {
      const a = rnd(rng, 1, 6);
      const r = rnd(rng, 2, 3);
      const m = rnd(rng, 2, 4);
      const n = m + 3;
      const hm = a * Math.pow(r, m - 1);
      const hn = a * Math.pow(r, n - 1);
      return {
        text: `في متتابعة هندسية: الحد ${m} يساوي ${hm} والحد ${n} يساوي ${hn}. أوجد الأساس والحد الأول.`,
        answer: `${hn} ÷ ${hm} = ر^${n - m} = ${Math.pow(r, n - m)} ⇒ ر = ${r}، ومن ح${m} = أ × ${r}^${m - 1} = ${hm} ⇒ أ = ${a}`,
      };
    },
  },
  {
    id: "gp-missing",
    topic: T9,
    skill: "الوسط الهندسي",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const r = rnd(rng, 2, 6);
      const a = rnd(rng, 1, 9);
      const b = r * r * a;
      return {
        text: `إذا كانت ${a}، س، ${b} في متتابعة هندسية موجبة، أوجد س.`,
        answer: `س² = ${a} × ${b} = ${a * b} ⇒ س = ${r * a}`,
      };
    },
  },
];

/* ---------------- مجموع المتتابعة الهندسية ---------------- */

const geometricSumTemplates: QuestionTemplate[] = [
  {
    id: "gp-sum",
    topic: T10,
    skill: "مجموع المتتابعة",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const a = rnd(rng, 1, 6);
      const r = rnd(rng, 2, 3);
      const n = rnd(rng, 4, 7);
      const sum = (a * (Math.pow(r, n) - 1)) / (r - 1);
      return {
        text: `احسب مجموع أول ${n} حدود من المتتابعة (${a}، ${a * r}، ${a * r * r}، ...).`,
        answer: `ج${n} = ${a}(${r}^${n} − 1) ÷ (${r} − 1) = ${ar(sum, 0)}`,
      };
    },
  },
  {
    id: "gp-infinite",
    topic: T10,
    skill: "المجموع اللانهائي",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const fractions = [
        { num: 1, den: 2 },
        { num: 1, den: 3 },
        { num: 2, den: 3 },
        { num: 1, den: 4 },
        { num: 3, den: 4 },
      ] as const;
      const f = pick(rng, fractions);
      const a = f.den * rnd(rng, 1, 6);
      const sum = a / (1 - f.num / f.den);
      return {
        text: `متتابعة هندسية حدها الأول ${a} وأساسها ${f.num}/${f.den}. أوجد مجموعها اللانهائي.`,
        answer: `ج = ${a} ÷ (1 − ${f.num}/${f.den}) = ${ar(sum, 2)}`,
      };
    },
  },
  {
    id: "gp-recurring",
    topic: T10,
    skill: "المجموع اللانهائي",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const d = rnd(rng, 1, 8);
      return {
        text: `عبّر عن العدد الدوري 0,${d}${d}${d}... في صورة كسر اعتيادي.`,
        answer: `= (${d}/10) ÷ (1 − 1/10) = ${fraction(d, 9)}`,
      };
    },
  },
  {
    id: "gp-find-r",
    topic: T10,
    skill: "المجموع اللانهائي",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      // نختار نسبًا تجعل المجموع عددًا صحيحًا والإجابة كسرًا واضحًا
      const choice = pick(rng, [
        { num: 1, den: 2, aStep: 2 },
        { num: 1, den: 3, aStep: 6 },
        { num: 1, den: 4, aStep: 12 },
      ] as const);
      const a = choice.aStep * rnd(rng, 1, 4);
      // نحسب المجموع بأعداد صحيحة: ج = أ × مقام ÷ (مقام − بسط)
      const sum = (a * choice.den) / (choice.den - choice.num);
      return {
        text: `متتابعة هندسية حدها الأول ${a} ومجموعها اللانهائي ${sum}. أوجد أساسها.`,
        answer: `${a} ÷ (1 − ر) = ${sum} ⇒ 1 − ر = ${fraction(a, sum)} ⇒ ر = ${fraction(sum - a, sum)}`,
      };
    },
  },
  {
    id: "gp-diverge",
    topic: T10,
    skill: "المجموع اللانهائي",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const a = rnd(rng, 1, 6);
      const r = rnd(rng, 2, 4);
      const n = rnd(rng, 5, 12);
      const term = a * Math.pow(r, n - 1);
      return {
        text: `هل يوجد مجموع لانهائي للمتتابعة (${a}، ${a * r}، ${a * r * r}، ...)؟ علّل.`,
        answer: `لا؛ لأن الأساس ر = ${r} وهو أكبر من 1، وشرط وجود المجموع اللانهائي |ر| < 1 (الحد ${n} مثلًا يساوي ${term})`,
      };
    },
  },
];

/* ---------------- المضروب والتباديل ---------------- */

const permutationTemplates: QuestionTemplate[] = [
  {
    id: "perm-npr",
    topic: T11,
    skill: "التباديل",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const n = rnd(rng, 5, 9);
      const r = rnd(rng, 2, 3);
      return {
        text: `احسب ${n} ل ${r}.`,
        answer: `${Array.from({ length: r }, (_, i) => n - i).join(" × ")} = ${nPr(n, r)}`,
      };
    },
  },
  {
    id: "perm-factorial",
    topic: T11,
    skill: "المضروب",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const n = rnd(rng, 4, 7);
      return {
        text: `بكم طريقة يمكن ترتيب ${n} كتب مختلفة على رف؟`,
        answer: `${n}! = ${factorial(n)} طريقة`,
      };
    },
  },
  {
    id: "perm-digits",
    topic: T11,
    skill: "التباديل",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const n = rnd(rng, 4, 7);
      const r = 3;
      return {
        text: `كم عددًا مكوّنًا من ثلاثة أرقام مختلفة يمكن تكوينه من الأرقام ${Array.from({ length: n }, (_, i) => i + 1).join("، ")}؟`,
        answer: `${n} ل 3 = ${Array.from({ length: r }, (_, i) => n - i).join(" × ")} = ${nPr(n, r)} عددًا`,
      };
    },
  },
  {
    id: "perm-circular",
    topic: T11,
    skill: "التباديل الدائرية",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const n = rnd(rng, 5, 8);
      return {
        text: `بكم طريقة يمكن جلوس ${n} أشخاص حول طاولة مستديرة؟`,
        answer: `(${n} − 1)! = ${factorial(n - 1)} طريقة`,
      };
    },
  },
  {
    id: "perm-repeated",
    topic: T11,
    skill: "التباديل",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const n = rnd(rng, 4, 6);
      const k = rnd(rng, 2, 3);
      return {
        text: `بكم طريقة يمكن ترتيب ${n} كتب على رف، منها ${k} كتب متماثلة؟`,
        answer: `${n}! ÷ ${k}! = ${factorial(n)} ÷ ${factorial(k)} = ${factorial(n) / factorial(k)} طريقة`,
      };
    },
  },
];

/* ---------------- التوافيق ---------------- */

const combinationTemplates: QuestionTemplate[] = [
  {
    id: "comb-ncr",
    topic: T12,
    skill: "التوافيق",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const n = rnd(rng, 5, 12);
      const r = rnd(rng, 2, Math.min(4, n - 1));
      return {
        text: `احسب ${n} ق ${r}.`,
        answer: `${n}! ÷ (${r}! × ${n - r}!) = ${nCr(n, r)}`,
      };
    },
  },
  {
    id: "comb-committee",
    topic: T12,
    skill: "التوافيق",
    difficulty: "easy",
    points: 1,
    build: (rng) => {
      const n = rnd(rng, 8, 15);
      return {
        text: `بكم طريقة يمكن اختيار 3 طلاب من ${n} طالبًا لتكوين لجنة؟`,
        answer: `${n} ق 3 = ${nCr(n, 3)} طريقة`,
      };
    },
  },
  {
    id: "comb-solve",
    topic: T12,
    skill: "معادلات التوافيق",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const n = rnd(rng, 5, 12);
      const value = nCr(n, 2);
      return {
        text: `أوجد قيمة ن إذا كان ن ق 2 = ${value}.`,
        answer: `ن(ن − 1) ÷ 2 = ${value} ⇒ ن(ن − 1) = ${value * 2} ⇒ ن = ${n}`,
      };
    },
  },
  {
    id: "comb-diagonals",
    topic: T12,
    skill: "التوافيق",
    difficulty: "medium",
    points: 2,
    build: (rng) => {
      const n = rnd(rng, 5, 10);
      return {
        text: `ما عدد أقطار مضلع منتظم له ${n} أضلاع؟`,
        answer: `${n} ق 2 − ${n} = ${nCr(n, 2)} − ${n} = ${nCr(n, 2) - n} قطرًا`,
      };
    },
  },
  {
    id: "comb-mixed",
    topic: T12,
    skill: "التوافيق",
    difficulty: "hard",
    points: 3,
    build: (rng) => {
      const men = rnd(rng, 4, 7);
      const women = rnd(rng, 4, 7);
      return {
        text: `لجنة مكوّنة من 4 أعضاء تُختار من ${men} رجال و${women} نساء. بكم طريقة يمكن أن تضم رجلين وامرأتين؟`,
        answer: `${men} ق 2 × ${women} ق 2 = ${nCr(men, 2)} × ${nCr(women, 2)} = ${nCr(men, 2) * nCr(women, 2)} طريقة`,
      };
    },
  },
];

const TEMPLATES: QuestionTemplate[] = [
  ...roundingTemplates,
  ...errorTemplates,
  ...limitTemplates,
  ...accumulationTemplates,
  ...inequalityTemplates,
  ...arithmeticTemplates,
  ...arithmeticMeansTemplates,
  ...arithmeticSumTemplates,
  ...geometricTemplates,
  ...geometricSumTemplates,
  ...permutationTemplates,
  ...combinationTemplates,
];

export function templatesForTopic(topic: string): QuestionTemplate[] {
  return TEMPLATES.filter((t) => t.topic === topic);
}

export const templateCount = TEMPLATES.length;
