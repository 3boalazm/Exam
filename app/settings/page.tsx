"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TeacherShell } from "@/components/teacher-shell";
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageLoader,
} from "@/components/ui";
import { apiFetch, useTeacher } from "@/lib/client";

/** اقتراحات أولية فقط — القائمة الحقيقية تُجلب من Groq بزر «تحميل النماذج» */
const GROQ_MODELS = [
  "qwen/qwen3-32b",
  "llama-3.1-8b-instant",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "moonshotai/kimi-k2-instruct-0905",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "groq/compound-mini",
];

const DEFAULT_MODEL = "qwen/qwen3-32b";

interface GroqStatus {
  hasManualKey: boolean;
  keyLast4: string | null;
  model: string;
  source: "manual" | "env" | "none";
  envKeyAvailable: boolean;
}

const SOURCE_BADGE: Record<
  GroqStatus["source"],
  { label: string; tone: "emerald" | "sky" | "amber" }
> = {
  manual: { label: "مفتاح يدوي مفعّل", tone: "emerald" },
  env: { label: "متغيرات البيئة (إعداد المنصة)", tone: "sky" },
  none: { label: "غير مفعّل", tone: "amber" },
};

export default function SettingsPage() {
  const { isDemo } = useTeacher();
  const [status, setStatus] = useState<GroqStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    model?: string;
    latencyMs?: number;
    autoSelected?: boolean;
    previousModel?: string;
    error?: string;
  } | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<GroqStatus>("/api/settings/groq");
      setStatus(data);
      setModel(data.model || DEFAULT_MODEL);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    const trimmedKey = apiKey.trim();
    const trimmedModel = model.trim() || DEFAULT_MODEL;

    if (!trimmedKey && !status?.hasManualKey) {
      setError("أدخل مفتاح Groq الخاص بك أولًا");
      return;
    }

    setBusy(true);
    try {
      const res = await apiFetch<{
        keyLast4: string;
        model: string;
      }>("/api/settings/groq", {
        method: "PUT",
        body: {
          apiKey: trimmedKey || undefined,
          model: trimmedModel,
        },
      });
      setNotice(
        `تم حفظ الإعدادات ✅ — سيُستخدم المفتاح ${res.keyLast4} لتوليد الأسئلة بالذكاء الاصطناعي`
      );
      setApiKey("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  async function handleTest() {
    setError("");
    setTestResult(null);
    setTesting(true);
    try {
      const res = await apiFetch<{
        ok: boolean;
        model: string;
        latencyMs: number;
        autoSelected?: boolean;
        previousModel?: string;
      }>("/api/settings/groq/test", {
        method: "POST",
        body: {
          apiKey: apiKey.trim() || undefined,
          model: model.trim() || undefined,
        },
      });
      setTestResult({
        ok: true,
        model: res.model,
        latencyMs: res.latencyMs,
        autoSelected: res.autoSelected,
        previousModel: res.previousModel,
      });
      // إن اختير النموذج تلقائيًا (القديم محذوف) نعبّئ الحقل بالنموذج الصالح
      if (res.autoSelected && res.model) {
        setModel(res.model);
      }
    } catch (err) {
      setTestResult({ ok: false, error: (err as Error).message });
    }
    setTesting(false);
  }

  async function handleLoadModels() {
    setError("");
    setNotice("");
    setLoadingModels(true);
    try {
      const res = await apiFetch<{ models: string[] }>(
        "/api/settings/groq/models"
      );
      setAvailableModels(res.models ?? []);
      if (!(res.models ?? []).length) {
        setError("لم يُرجع Groq أي نماذج متاحة");
      }
    } catch (err) {
      setError((err as Error).message);
    }
    setLoadingModels(false);
  }

  async function handleRemove() {
    if (!confirm("إزالة مفتاح Groq اليدوي؟ سيستخدم النظام متغيرات البيئة إن وُجدت، وإلا سيعود لبنك الأسئلة.")) {
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiFetch("/api/settings/groq", { method: "DELETE" });
      setNotice("تمت إزالة المفتاح اليدوي");
      setApiKey("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <TeacherShell title="إعدادات Groq">
      <div className="max-w-2xl space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        {!status ? (
          <PageLoader message="جارٍ تحميل الإعدادات..." />
        ) : (
          <>
            {/* الحالة الحالية */}
            <Card title="الحالة الحالية">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={SOURCE_BADGE[status.source].tone}>
                  {SOURCE_BADGE[status.source].label}
                </Badge>
                {status.hasManualKey && status.keyLast4 && (
                  <Badge tone="slate">
                    <span dir="ltr">{status.keyLast4}</span>
                  </Badge>
                )}
                <Badge tone="indigo">{status.model}</Badge>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                {status.source === "manual"
                  ? "مفتاحك اليدوي مفعّل وسيُستخدم في كل توليد بالذكاء الاصطناعي (إنشاء الاختبارات وإعادة توليد الأسئلة)."
                  : status.source === "env"
                    ? "لا يوجد مفتاح يدوي — يعتمد النظام على مفتاح Groq المضبوط في متغيرات بيئة المنصة. يمكنك إضافة مفتاحك الخاص أدناه ليأخذ الأولوية."
                    : "الذكاء الاصطناعي غير مفعّل حاليًا. أضف مفتاح Groq الخاص بك أدناه لتفعيله على الموقع كله."}
              </p>
            </Card>

            {/* النموذج */}
            <form onSubmit={handleSave}>
              <Card title="مفتاح Groq الخاص بك">
                <div className="space-y-4">
                  <Field
                    label="API Key"
                    hint="احصل عليه من console.groq.com/keys — يبدأ بـ gsk_"
                  >
                    <div className="relative">
                      <Input
                        dir="ltr"
                        type={showKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={
                          status.hasManualKey
                            ? `المفتاح محفوظ (${status.keyLast4}) — اتركه فارغًا للإبقاء عليه`
                            : "gsk_..."
                        }
                        className="pe-20"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((v) => !v)}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        {showKey ? "إخفاء" : "إظهار"}
                      </button>
                    </div>
                  </Field>

                  <Field
                    label="النموذج (Model)"
                    hint="اكتب اسم النموذج، أو حمّل القائمة الحيّة من Groq واختر منها"
                  >
                    <div className="flex gap-2">
                      <Input
                        dir="ltr"
                        list="groq-models"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder={DEFAULT_MODEL}
                        spellCheck={false}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        loading={loadingModels}
                        onClick={handleLoadModels}
                        className="shrink-0"
                      >
                        🔄 تحميل النماذج
                      </Button>
                    </div>
                    <datalist id="groq-models">
                      {(availableModels.length
                        ? availableModels
                        : GROQ_MODELS
                      ).map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                    {availableModels.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {availableModels.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setModel(m)}
                            className={`rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${
                              model === m
                                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                            }`}
                            dir="ltr"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                    {loadingModels && (
                      <span className="mt-1 block text-xs text-slate-400">
                        جارٍ جلب النماذج المتاحة من Groq...
                      </span>
                    )}
                  </Field>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    loading={testing}
                    onClick={handleTest}
                  >
                    🔌 اختبار الاتصال
                  </Button>
                  <Button type="submit" loading={busy}>
                    💾 حفظ الإعدادات
                  </Button>
                  {status.hasManualKey && (
                    <Button
                      type="button"
                      variant="danger"
                      loading={busy}
                      onClick={handleRemove}
                    >
                      🗑 إزالة المفتاح
                    </Button>
                  )}
                </div>
              </Card>
            </form>

            {/* نتيجة الاختبار */}
            {testResult && (
              <Alert tone={testResult.ok ? "success" : "error"}>
                {testResult.ok
                  ? testResult.autoSelected
                    ? `✅ تم الاتصال بنجاح — النموذج السابق (${testResult.previousModel}) غير متوفر، فتم اختيار ${testResult.model} تلقائيًا — احفظ الإعدادات لاعتماده (خلال ${testResult.latencyMs}ms)`
                    : `✅ تم الاتصال بـ Groq بنجاح — النموذج: ${testResult.model} — خلال ${testResult.latencyMs}ms`
                  : testResult.error}
              </Alert>
            )}

            {/* ملاحظات الأمان */}
            <Card>
              <div className="space-y-2 text-sm leading-relaxed text-slate-500">
                <p>
                  🔒 <span className="font-bold text-slate-700">أمان المفتاح:</span>{" "}
                  يُحفظ المفتاح على الخادم فقط ولا يظهر في المتصفح — نعرض آخر 4
                  خانات فقط.
                </p>
                <p>
                  ⚡ <span className="font-bold text-slate-700">الأولوية:</span>{" "}
                  مفتاحك اليدوي يسبق مفتاح متغيرات البيئة، ويعمل في الوضع
                  التجريبي أيضًا.
                </p>
                <p>
                  🔗 <span className="font-bold text-slate-700">مصدر المفتاح:</span>{" "}
                  <Link
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    console.groq.com/keys
                  </Link>
                </p>
                {isDemo && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">
                    أنت في الوضع التجريبي — سيُحفظ مفتاحك محليًا مع بيانات
                    المعلم التجريبي.
                  </p>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </TeacherShell>
  );
}
