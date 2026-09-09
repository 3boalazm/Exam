"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  demoTeacherIdFor,
  fetchConfig,
  getDemoTeacher,
  apiFetch,
  saveDemoTeacher,
  useTeacher,
} from "@/lib/client";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { config, teacher, ready } = useTeacher();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // لو مسجّل بالفعل → dashboard
  useEffect(() => {
    if (ready && teacher) router.replace("/dashboard");
  }, [ready, teacher, router]);

  useEffect(() => {
    if (!ready && !config) return;
  }, [ready, config]);

  const isDemo = config?.demo ?? false;

  async function afterAuth() {
    try {
      await apiFetch("/api/auth/me", {
        body: {
          name: name.trim() || undefined,
          email: email.trim() || undefined,
        },
      });
    } catch {
      // غير حرج — المستند يُنشأ عند أول API مصادق
    }
    router.push("/dashboard");
  }

  async function handleDemoLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("اكتب بريدًا (أي بريد يعمل في الوضع التجريبي)");
      return;
    }
    setBusy(true);
    setError("");
    const id = demoTeacherIdFor(email);
    saveDemoTeacher({
      id,
      name: name.trim() || "معلم تجريبي",
      email: email.trim(),
    });
    await afterAuth();
    setBusy(false);
  }

  async function handleFirebaseAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      setError("أدخل البريد وكلمة مرور (6 أحرف على الأقل)");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { signInClient, signUpClient } = await import("@/lib/firebase/client");
      if (mode === "login") {
        await signInClient(email.trim(), password);
      } else {
        await signUpClient(email.trim(), password, name.trim() || undefined);
      }
      await afterAuth();
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      const map: Record<string, string> = {
        "auth/invalid-credential": "بيانات الدخول غير صحيحة",
        "auth/user-not-found": "لا يوجد حساب بهذا البريد",
        "auth/wrong-password": "كلمة المرور غير صحيحة",
        "auth/email-already-in-use": "هذا البريد مسجّل بالفعل",
        "auth/invalid-email": "بريد إلكتروني غير صالح",
        "auth/weak-password": "كلمة المرور ضعيفة جدًا",
      };
      setError(map[code] ?? "حدث خطأ — حاول مرة أخرى");
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 via-white to-slate-50 px-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 text-lg font-extrabold text-slate-900"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl text-white">
            📝
          </span>
          Mini Exam
        </Link>

        <Card title={isDemo ? "تسجيل الدخول (وضع تجريبي)" : mode === "login" ? "دخول المعلم" : "حساب جديد"}>
          {isDemo ? (
            <form onSubmit={handleDemoLogin} className="space-y-4">
              <Alert tone="info">
                هذه نسخة تجريبية تعمل بدون Firebase — أي بيانات ستدخلها ستعمل.
                البيانات محفوظة مؤقتًا في متصفحك.
              </Alert>
              <Field label="اسمك">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="أ. أحمد محمد"
                />
              </Field>
              <Field label="البريد الإلكتروني">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@example.com"
                  autoFocus
                />
              </Field>
              {error && <Alert tone="error">{error}</Alert>}
              <Button type="submit" loading={busy} className="w-full" size="lg">
                دخول
              </Button>
            </form>
          ) : (
            <form onSubmit={handleFirebaseAuth} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                {(["login", "register"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-lg py-2 text-sm font-bold transition-colors ${
                      mode === m
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    {m === "login" ? "دخول" : "حساب جديد"}
                  </button>
                ))}
              </div>
              {mode === "register" && (
                <Field label="اسمك">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="أ. أحمد محمد"
                  />
                </Field>
              )}
              <Field label="البريد الإلكتروني">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@example.com"
                />
              </Field>
              <Field label="كلمة المرور">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              {error && <Alert tone="error">{error}</Alert>}
              <Button type="submit" loading={busy} className="w-full" size="lg">
                {mode === "login" ? "دخول" : "إنشاء الحساب"}
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-4 text-center text-sm text-slate-400">
          {isDemo ? (
            "لديك رابط امتحان؟ افتحه مباشرة من المتصفح"
          ) : (
            "Firebase Auth — للمعلمين فقط"
          )}
        </p>
      </div>
    </div>
  );
}
