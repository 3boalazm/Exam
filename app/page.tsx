import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-slate-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl text-white">
            📝
          </span>
          Mini Exam
        </div>
        <Link
          href="/login"
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          دخول المعلم
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-20 pt-14 text-center">
        <span className="inline-block rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-bold text-indigo-700">
          نظام الامتحانات المصغّر
        </span>
        <h1 className="mt-6 text-4xl font-black leading-tight text-slate-900 sm:text-5xl">
          من المحتوى إلى النتيجة
          <br />
          <span className="text-indigo-600">في دقائق</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-500">
          اختر الدرس وأنواع الأسئلة، ودع الذكاء الاصطناعي يولّد الامتحان —
          ثم صحّح النظام إجابات الطلاب تلقائيًا وأرسل النتيجة على WhatsApp.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-bold text-white shadow-md transition-colors hover:bg-indigo-700"
          >
            ابدأ كمعلم
          </Link>
          <span className="text-sm text-slate-400">
            الطالب؟ افتح رابط الامتحان مباشرة
          </span>
        </div>

        <div className="mt-16 grid gap-4 text-right sm:grid-cols-2">
          {[
            {
              icon: "🧠",
              title: "توليد AI موحّم",
              desc: "Groq يولّد الأسئلة بنمط بنكك المرجعي، ونظام الـValidators يرفض أي سؤال غير صحيح قبل أن يدخل الامتحان.",
            },
            {
              icon: "✍️",
              title: "4 أنواع أسئلة",
              desc: "اختيار من متعدد، صح/غلط، توصيل، وترتيب — مع تحكم كامل في عدد الأسئلة والصعوبة.",
            },
            {
              icon: "⚡",
              title: "تصحيح فوري",
              desc: "الطالب يسلم والنظام يصحح لحظيًا: الدرجة، النسبة، وتفاصيل كل إجابة — بدون AI وبدون تدخل.",
            },
            {
              icon: "💬",
              title: "نتيجة على WhatsApp",
              desc: "زر واحد يفتح واتساب برسالة جاهزة باسم الطالب ودرجته — اضغط إرسال وخلاص.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-2 font-bold text-slate-800">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-center font-bold text-slate-700">How it works</h3>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-slate-600">
            {[
              "تسجيل الدخول",
              "إنشاء الاختبار",
              "اختيار الدرس والأنواع",
              "Generate",
              "مراجعة وتعديل",
              "Publish",
              "الطلاب يحلّون",
              "تصحيح تلقائي",
              "نتائج + WhatsApp",
            ].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-indigo-700">
                  {step}
                </span>
                {i < arr.length - 1 && <span className="text-slate-300">←</span>}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
