/**
 * رسائل WhatsApp — بدون API، نستخدم wa.me (يفتح واتساب برسالة جاهزة،
 * والمعلم هو اللي يضغط إرسال).
 */

export interface ResultMessageParams {
  studentName: string;
  examTitle: string;
  score: number;
  total: number;
  percentage: number;
  /** سطر إضافي اختياري يكتبه المعلم */
  customMessage?: string;
}

/** قالب رسالة النتيجة الديناميكي */
export function buildResultMessage(p: ResultMessageParams): string {
  const lines: string[] = [
    `السلام عليكم يا ${p.studentName}،`,
    "",
    `نتيجة اختبار ${p.examTitle}:`,
    "",
    `الدرجة: ${p.score} / ${p.total}`,
    `النسبة: ${p.percentage}%`,
  ];
  const custom = (p.customMessage ?? "").trim();
  if (custom) {
    lines.push("", custom);
  }
  lines.push("", "بالتوفيق 🌷");
  return lines.join("\n");
}

/**
 * تحويل رقم الطالب إلى صيغة دولية لموقع wa.me
 * (01012345678 → 201012345678)
 */
export function toWaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // رقم مصري محلي يبدأ بـ 01 → صيغة دولية 201...
  // (01012345678 → 201012345678). الأرقام الدولية (201...) تمر دون تغيير.
  if (digits.startsWith("0")) return "20" + digits.slice(1);
  return digits;
}

/** رابط wa.me برسالة مشفرة */
export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${toWaPhone(phone)}?text=${encodeURIComponent(message)}`;
}
