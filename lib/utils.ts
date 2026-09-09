/** أدوات مشتركة (تعمل على السيرفر والعميل). */

/** خطأ API يحمل كود حالة HTTP */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function randomId(prefix = ""): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}${rand}${Date.now().toString(36).slice(-4)}`;
}

/** توليد رمز اختبار فريد مثل MATH-8F42 */
export function generateExamCode(subject: string): string {
  const prefixes: Record<string, string> = {
    "رياضيات": "MATH",
    "علوم": "SCI",
    "فيزياء": "PHY",
    "كيمياء": "CHEM",
    "أحياء": "BIO",
    "لغة عربية": "ARB",
    "اللغة العربية": "ARB",
    "لغة إنجليزية": "ENG",
    "اللغة الإنجليزية": "ENG",
    "دراسات": "SOC",
    "تاريخ": "HIS",
    "جغرافيا": "GEO",
  };
  const prefix = prefixes[subject.trim()] ?? "EXAM";
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${suffix}`;
}

/**
 * تطبيع نص للمقارنة (إزالة التشكيل واللامات وأل وعلامات الترقيم والمسافات)
 * — يستخدم في فحص التكرار.
 */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "") // تشكيل + tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\s.,،؛;:!?؟()'"/\\\-+]/g, "")
    .trim();
}

/** hash بسيط لبذرة shuffle */
function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * خلط حتمي (seeded shuffle) — نفس السؤال يُعرض بنفس الترتيب المتباعد
 * لكل الطلاب (مهم لـ MATCHING و ORDERING).
 */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  if (arr.length < 2) return arr;
  let a = hashSeed(seed);
  const rand = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // نتأكد إن الناتج مش زي الترتيب الأصلي
  if (arr.every((v, i) => v === items[i])) {
    arr.push(arr.shift() as T);
  }
  return arr;
}

/** تنسيق رقم الهاتف الدولي (الرقم المصري يبدأ بـ 01 → 201) */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "2" + digits.slice(1);
  return digits;
}

export function formatDateTime(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return new Date(ts).toLocaleString();
  }
}

/** جمع مصفوفة */
export function sum(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0);
}

/** متوسط مع تقريب */
export function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return Math.round((sum(arr) / arr.length) * 10) / 10;
}
