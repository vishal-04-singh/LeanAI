import type { ReactNode } from "react";

export function Button({
  children,
  onClick,
  variant = "default",
  disabled,
  title,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger" | "ghost";
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
}) {
  const styles: Record<string, string> = {
    default: "bg-ink-800 hover:bg-ink-700 text-ink-100 border border-ink-700",
    primary: "bg-accent/20 hover:bg-accent/30 text-accent border border-accent/60",
    danger: "bg-danger/15 hover:bg-danger/25 text-danger border border-danger/50",
    ghost: "bg-transparent hover:bg-ink-800 text-ink-300 border border-transparent",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-ink-800 bg-ink-900">
      <header className="flex items-start justify-between gap-4 border-b border-ink-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-100">{title}</h2>
          {description ? <p className="mt-1 text-xs text-ink-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/**
 * A labelled state chip. The label text carries the meaning; the colour only
 * reinforces it (NFR 7.3).
 */
export function Chip({
  tone = "neutral",
  children,
  title,
}: {
  tone?: "neutral" | "ok" | "warn" | "danger" | "info";
  children: ReactNode;
  title?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-ink-700 text-ink-300",
    ok: "border-ok/50 text-ok",
    warn: "border-warn/50 text-warn",
    danger: "border-danger/50 text-danger",
    info: "border-accent/50 text-accent",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-ink-800 px-6 py-12 text-center">
      <h3 className="text-sm font-semibold text-ink-100">{title}</h3>
      <p className="max-w-lg text-xs leading-relaxed text-ink-500">{body}</p>
      {action}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-ink-300">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-ink-500">{hint}</span> : null}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 accent-sky-400"
      />
      <span>
        <span className="text-xs text-ink-100">{label}</span>
        {hint ? <span className="block text-[11px] text-ink-500">{hint}</span> : null}
      </span>
    </label>
  );
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return unit === 0 ? `${bytes} B` : `${value.toFixed(1)} ${units[unit]}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString();
}
