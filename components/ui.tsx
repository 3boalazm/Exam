"use client";

import { useState, type ReactNode } from "react";

/* ---------------- Button ---------------- */

type Variant = "primary" | "secondary" | "danger" | "success" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 shadow-sm",
  secondary:
    "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:text-slate-300",
  danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300 shadow-sm",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300 shadow-sm",
  ghost: "text-slate-600 hover:bg-slate-100 disabled:text-slate-300",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}: {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  className?: string;
  children: ReactNode;
  disabled?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner size="sm" light={variant === "primary" || variant === "danger" || variant === "success"} />}
      {children}
    </button>
  );
}

/* ---------------- Spinner ---------------- */

export function Spinner({ size = "md", light = false }: { size?: "sm" | "md" | "lg"; light?: boolean }) {
  const s = { sm: "h-4 w-4 border-2", md: "h-6 w-6 border-2", lg: "h-10 w-10 border-4" };
  const c = light ? "border-white/40 border-t-white" : "border-indigo-200 border-t-indigo-600";
  return (
    <span className={`inline-block animate-spin rounded-full ${s[size]} ${c}`} />
  );
}

/* ---------------- Card ---------------- */

export function Card({
  children,
  className = "",
  title,
  actions,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h3 className="font-bold text-slate-800">{title}</h3>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ---------------- Badge ---------------- */

type Tone = "indigo" | "emerald" | "amber" | "rose" | "slate" | "sky";

const tones: Record<Tone, string> = {
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
};

export function Badge({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

/* ---------------- Form fields ---------------- */

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

/* ---------------- StatCard ---------------- */

export function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-xl">
            {icon}
          </div>
        )}
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="text-2xl font-extrabold text-slate-900">{value}</div>
          {sub && <div className="text-xs text-slate-400">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- EmptyState ---------------- */

export function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
      <div className="text-5xl">{icon}</div>
      <div className="mt-3 font-bold text-slate-700">{title}</div>
      {sub && <div className="mt-1 max-w-sm text-sm text-slate-400">{sub}</div>}
    </div>
  );
}

/* ---------------- CopyButton ---------------- */

export function CopyButton({ text, label = "نسخ" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // fallback
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "✓ تم النسخ" : `📋 ${label}`}
    </Button>
  );
}

/* ---------------- Center spinner page ---------------- */

export function PageLoader({ message = "جارٍ التحميل..." }: { message?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      <div className="text-sm font-medium text-slate-500">{message}</div>
    </div>
  );
}

/* ---------------- Alert ---------------- */

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "error" | "success";
  children: ReactNode;
}) {
  const cls = {
    info: "border-sky-200 bg-sky-50 text-sky-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-rose-200 bg-rose-50 text-rose-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  }[tone];
  return <div className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}
