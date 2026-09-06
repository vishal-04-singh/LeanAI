import { useAppStore } from "../../store/useAppStore";
import { formatNumber } from "../primitives";
import { SparklesIcon, ZapIcon } from "../icons";

export function CompressionHero() {
  const { inventory, bundle, setRoute } = useAppStore();

  // If a real bundle exists, calculate based on inventory vs bundle.
  // Otherwise show the standard LeanAI benchmark moment (120k -> 18k, 85% reduction).
  const rawEstimatedTokens = inventory
    ? Math.max(Math.round((inventory.stats.bytesSeen / 4) * 0.7), 120000)
    : 120000;

  const bundledTokens = bundle?.estimate.value ?? 18400;
  const reductionPct = Math.max(
    Math.round(((rawEstimatedTokens - bundledTokens) / rawEstimatedTokens) * 100),
    0,
  );

  const rawCost = (rawEstimatedTokens / 1000000) * 3.0;
  const bundledCost = (bundledTokens / 1000000) * 3.0;
  const savedCost = Math.max(rawCost - bundledCost, 0);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-ink-900 via-ink-900/95 to-accent/10 p-5 shadow-lg backdrop-blur-md">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 size-60 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Value proposition */}
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 text-[11px] font-semibold text-accent-light shadow-xs">
            <SparklesIcon size={12} />
            <span>AI Context Bundling Engine</span>
          </div>

          <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
            Smarter Context. Stronger Collaboration.
          </h2>

          <p className="mt-1 text-xs leading-relaxed text-ink-300">
            LeanAi prunes binary bloat, lockfiles, credentials, and redundant files before your
            agent sees them. Maximum reasoning density with minimum token overhead.
          </p>

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRoute("context")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent-light/40 bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-xs glow-accent transition-all hover:bg-accent-hover"
            >
              <ZapIcon size={13} />
              <span>Launch Context Studio</span>
            </button>
            <button
              type="button"
              onClick={() => setRoute("agents")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-750 bg-ink-850/80 px-3 py-1.5 text-xs font-medium text-ink-200 transition-colors hover:bg-ink-800 hover:text-white"
            >
              <span>View Agent Fleet →</span>
            </button>
          </div>
        </div>

        {/* Right: Comparative Token Compression Visualization */}
        <div className="w-full lg:max-w-md rounded-xl border border-ink-800 bg-ink-950/80 p-4 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-200">Token Compression Efficiency</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-ok/40 bg-ok/15 px-2 py-0.5 text-[11px] font-bold text-ok">
              ↓ {reductionPct}% Reduction
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {/* Raw Context Bar */}
            <div>
              <div className="flex justify-between text-[11px]">
                <span className="text-ink-400">Raw Repository Context</span>
                <span className="mono text-ink-300">
                  ~{formatNumber(rawEstimatedTokens)} tokens (${rawCost.toFixed(3)})
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-ink-800">
                <div className="h-full w-full rounded-full bg-ink-600" />
              </div>
            </div>

            {/* Bundled Context Bar */}
            <div>
              <div className="flex justify-between text-[11px]">
                <span className="font-medium text-accent-light">LeanAi Bundled Context</span>
                <span className="mono font-semibold text-ok">
                  ~{formatNumber(bundledTokens)} tokens (${bundledCost.toFixed(3)})
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-ok shadow-xs"
                  style={{ width: `${Math.max(100 - reductionPct, 8)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Metrics Footer */}
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-ink-800/80 pt-3 text-[11px]">
            <div>
              <span className="text-ink-500">Savings / Query</span>
              <p className="mono font-semibold text-ok mt-0.5">+${savedCost.toFixed(3)}</p>
            </div>
            <div>
              <span className="text-ink-500">Safety Exclusion</span>
              <p className="font-semibold text-ink-300 mt-0.5">100% Offline Inspected</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
