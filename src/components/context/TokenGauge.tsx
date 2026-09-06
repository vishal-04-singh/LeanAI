import { Chip, formatNumber } from "../primitives";
import { SparklesIcon, ZapIcon } from "../icons";

interface TokenGaugeProps {
  tokens: number;
  label?: string;
  targetModel?: string;
  contextCap?: number;
  inputPricePer1M?: number;
}

export function TokenGauge({
  tokens,
  label = "Indicative cl100k estimate",
  targetModel = "Claude 3.5 Sonnet",
  contextCap = 200000,
  inputPricePer1M = 3.0,
}: TokenGaugeProps) {
  const percentage = Math.min((tokens / contextCap) * 100, 100);

  // Status zones: <32k green, 32k-128k amber, >128k red
  const zone =
    tokens === 0 ? "empty" : tokens < 32000 ? "lean" : tokens < 128000 ? "balanced" : "heavy";

  const zoneColors = {
    empty: {
      text: "text-ink-400",
      bg: "bg-ink-800",
      border: "border-ink-700",
      tone: "neutral" as const,
      badge: "Empty",
    },
    lean: {
      text: "text-ok",
      bg: "bg-ok",
      border: "border-ok/40",
      tone: "ok" as const,
      badge: "Lean & Fast (<32k)",
    },
    balanced: {
      text: "text-warn",
      bg: "bg-warn",
      border: "border-warn/40",
      tone: "warn" as const,
      badge: "Standard Context (32k–128k)",
    },
    heavy: {
      text: "text-danger",
      bg: "bg-danger",
      border: "border-danger/40",
      tone: "danger" as const,
      badge: "Heavy Context (>128k)",
    },
  };

  const currentZone = zoneColors[zone];
  const estimatedCost = (tokens / 1000000) * inputPricePer1M;

  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900/90 p-4 shadow-sm backdrop-blur-sm">
      {/* Header with Title and Zone Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon size={14} className="text-accent" />
          <h3 className="text-xs font-semibold tracking-tight text-ink-100">
            Token & Cost Intelligence
          </h3>
        </div>
        <Chip tone={currentZone.tone} dot>
          {currentZone.badge}
        </Chip>
      </div>

      {/* Main Token Metric */}
      <div className="mt-3 flex items-baseline justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className={`mono text-2xl font-bold tracking-tight ${currentZone.text}`}>
              {tokens > 0 ? `~${formatNumber(tokens)}` : "0"}
            </span>
            <span className="text-xs font-medium text-ink-400">tokens</span>
          </div>
          <p className="mt-0.5 text-[11px] text-ink-500">{label}</p>
        </div>

        {/* Estimated Cost per Query */}
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-ink-200">
            <ZapIcon size={12} className="text-accent" />
            <span className="mono text-xs font-semibold">
              {tokens > 0 ? `$${estimatedCost.toFixed(4)}` : "$0.0000"}
            </span>
          </div>
          <p className="text-[10px] text-ink-500">per inference prompt</p>
        </div>
      </div>

      {/* Context Window Capacity Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-ink-400 mb-1.5">
          <span>Target: {targetModel}</span>
          <span className="mono">
            {tokens > 0 ? `${percentage.toFixed(1)}%` : "0%"} of {formatNumber(contextCap / 1000)}k
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-800/80 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${currentZone.bg}`}
            style={{ width: `${Math.max(percentage, tokens > 0 ? 3 : 0)}%` }}
          />
        </div>
        {/* Tier markers */}
        <div className="mt-1 flex justify-between text-[9px] text-ink-500 mono">
          <span>0</span>
          <span>32k (Lean)</span>
          <span>128k (Max Standard)</span>
          <span>{formatNumber(contextCap / 1000)}k</span>
        </div>
      </div>

      {/* Compliance & Accuracy Disclaimer (FR-16) */}
      <div className="mt-3.5 rounded-lg border border-ink-800 bg-ink-950/70 p-2 text-[10px] leading-normal text-ink-500">
        <span className="font-semibold text-ink-400">Notice: </span>
        Estimates use the standard cl100k BPE tokenizer. Non-OpenAI models (Anthropic, Gemini, GGUF)
        may vary by 5–15%. Billed amounts depend strictly on provider token counters.
      </div>
    </div>
  );
}
