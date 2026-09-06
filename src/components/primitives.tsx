import type { ReactNode } from "react";

export function Button({
  children,
  onClick,
  variant = "default",
  size = "sm",
  disabled,
  title,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger" | "ghost" | "secondary";
  size?: "xs" | "sm" | "md";
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
  className?: string;
}) {
  const sizeStyles: Record<string, string> = {
    xs: "px-2 py-1 text-[11px] gap-1",
    sm: "px-2.5 py-1.5 text-xs gap-1.5",
    md: "px-3.5 py-2 text-xs font-medium gap-2",
  };

  const variantStyles: Record<string, string> = {
    default:
      "bg-ink-850 hover:bg-ink-800 text-ink-200 hover:text-ink-100 border border-ink-750 hover:border-ink-700 shadow-xs",
    primary:
      "bg-accent hover:bg-accent-hover text-white border border-accent-light/30 shadow-xs glow-accent font-medium",
    secondary:
      "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-xs",
    danger:
      "bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 hover:border-danger/50 shadow-xs",
    ghost:
      "bg-transparent hover:bg-ink-850 text-ink-400 hover:text-ink-200 border border-transparent",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center rounded-md transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-inherit disabled:hover:bg-inherit ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Panel({
  title,
  description,
  badge,
  actions,
  children,
  className = "",
}: {
  title: string;
  description?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-ink-800 bg-ink-900/90 shadow-sm backdrop-blur-sm ${className}`}
    >
      <header className="flex items-start justify-between gap-4 border-b border-ink-800/80 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold tracking-tight text-ink-100">{title}</h2>
            {badge ? <div>{badge}</div> : null}
          </div>
          {description ? (
            <div className="mt-0.5 text-[11px] leading-relaxed text-ink-400">{description}</div>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
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
  dot = false,
  className = "",
}: {
  tone?: "neutral" | "ok" | "warn" | "danger" | "info" | "purple";
  children: ReactNode;
  title?: string;
  dot?: boolean;
  className?: string;
}) {
  const tones = {
    neutral: {
      badge: "border-ink-750 bg-ink-850/80 text-ink-300",
      dot: "bg-ink-400",
    },
    ok: {
      badge: "border-ok/30 bg-ok/10 text-ok",
      dot: "bg-ok",
    },
    warn: {
      badge: "border-warn/30 bg-warn/10 text-warn",
      dot: "bg-warn",
    },
    danger: {
      badge: "border-danger/30 bg-danger/10 text-danger",
      dot: "bg-danger",
    },
    info: {
      badge: "border-cyan/30 bg-cyan/10 text-cyan-400",
      dot: "bg-cyan-400",
    },
    purple: {
      badge: "border-accent/30 bg-accent/10 text-accent-light",
      dot: "bg-accent",
    },
  };

  const activeTone = tones[tone] || tones.neutral;

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap shadow-2xs ${activeTone.badge} ${className}`}
    >
      {dot ? <span className={`size-1.5 rounded-full ${activeTone.dot}`} /> : null}
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-ink-800 bg-ink-900/40 px-6 py-12 text-center">
      {icon ? (
        <div className="flex size-10 items-center justify-center rounded-lg border border-ink-800 bg-ink-850 text-ink-300 shadow-inner">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold tracking-tight text-ink-100">{title}</h3>
      <p className="max-w-md text-xs leading-relaxed text-ink-400">{body}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  subtext,
  badge,
  icon,
}: {
  label: string;
  value: ReactNode;
  subtext?: ReactNode;
  badge?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-ink-800 bg-ink-900/80 p-3.5 shadow-xs transition-colors hover:border-ink-750">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-ink-400">{label}</p>
        {icon ? <div className="text-ink-500">{icon}</div> : badge}
      </div>
      <div className="mt-1.5 text-base font-semibold tracking-tight text-ink-100">{value}</div>
      {subtext ? <p className="mt-0.5 text-[11px] text-ink-500">{subtext}</p> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  color = "accent",
  label,
}: {
  value: number;
  max: number;
  color?: "accent" | "ok" | "warn" | "danger" | "cyan";
  label?: string;
}) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colors: Record<string, string> = {
    accent: "bg-accent",
    ok: "bg-ok",
    warn: "bg-warn",
    danger: "bg-danger",
    cyan: "bg-cyan-500",
  };

  return (
    <div className="w-full">
      {label ? (
        <div className="mb-1 flex justify-between text-[11px] text-ink-400">
          <span>{label}</span>
          <span className="mono font-medium text-ink-300">{percentage.toFixed(0)}%</span>
        </div>
      ) : null}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colors[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
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
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink-300">{label}</span>
      {children}
      {hint ? <span className="text-[11px] leading-normal text-ink-500">{hint}</span> : null}
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
    <label className="flex cursor-pointer items-start gap-2.5 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 rounded accent-accent"
      />
      <span>
        <span className="text-xs font-medium text-ink-200">{label}</span>
        {hint ? (
          <span className="block text-[11px] leading-relaxed text-ink-500">{hint}</span>
        ) : null}
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
