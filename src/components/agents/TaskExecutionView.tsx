import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Button, Chip, formatNumber } from "../primitives";
import { CheckCircleIcon, FileCodeIcon, SparklesIcon, ZapIcon } from "../icons";

interface ExecutionStep {
  id: string;
  agent: string;
  role: string;
  action: string;
  timestamp: string;
  status: "completed" | "running" | "waiting";
  tokensUsed: number;
  details?: string;
  diff?: string;
}

export function TaskExecutionView() {
  const { bundle } = useAppStore();
  const [promptInput, setPromptInput] = useState("");
  const [activeTab, setActiveTab] = useState<"trace" | "artifacts">("trace");

  const tokenTotal = bundle?.estimate.value ?? 18400;

  const [steps] = useState<ExecutionStep[]>([
    {
      id: "step-1",
      agent: "Orchestrator",
      role: "Workflow Supervisor",
      action:
        "Deconstructed developer prompt into 3 execution phases with zero egress constraints.",
      timestamp: "10:14:02",
      status: "completed",
      tokensUsed: 1250,
      details:
        "Subtasks delegated: (1) Researcher to extract context index, (2) Coder to craft patch set, (3) Validator to run test suite.",
    },
    {
      id: "step-2",
      agent: "Researcher",
      role: "Context Specialist",
      action: "Loaded curated context bundle (14 files, 18,400 tokens) via LeanAi Context Engine.",
      timestamp: "10:14:08",
      status: "completed",
      tokensUsed: 4200,
      details:
        "Read PROJECT_CONTEXT.md section 2 (Architecture) and section 3 (Dependency Graph). Filtered out credential files.",
    },
    {
      id: "step-3",
      agent: "Planner",
      role: "Architecture Strategist",
      action:
        "Verified ADR compliance and proposed patch plan without touching backend capabilities.",
      timestamp: "10:14:15",
      status: "completed",
      tokensUsed: 2800,
      details:
        "Compliant with ADR 0005 (Audit & Persistence) and ADR 0007 (OS Keychain credentials). 0 breaking changes identified.",
    },
    {
      id: "step-4",
      agent: "Coder",
      role: "Implementation Specialist",
      action: "Generated high-precision UI component suite with modern IDE layout.",
      timestamp: "10:14:24",
      status: "completed",
      tokensUsed: 6800,
      details:
        "Implemented TopBar, Sidebar, StatusBar, TokenGauge, CompressionHero, and AgentFleet views.",
    },
    {
      id: "step-5",
      agent: "Validator",
      role: "Test & Quality Inspector",
      action: "Ran automated verification: 71 Rust tests and 16 Vitest tests passed cleanly.",
      timestamp: "10:14:35",
      status: "completed",
      tokensUsed: 1450,
      details:
        "cargo test --workspace [OK: 71 passed]. vitest run [OK: 16 passed]. ESLint 0 warnings.",
    },
  ]);

  const totalTokensSpent = steps.reduce((acc, s) => acc + s.tokensUsed, 0);

  const handleRunTask = () => {
    if (!promptInput.trim()) return;
    setPromptInput("");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-ink-800 bg-ink-900/90 shadow-sm backdrop-blur-sm">
      {/* Task Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-800/80 px-4 py-3 bg-ink-950/50">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/15 text-accent shadow-xs">
            <ZapIcon size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-ink-100">Active Multi-Agent Task #104</h2>
              <Chip tone="ok" dot>
                All Steps Verified
              </Chip>
            </div>
            <p className="mt-0.5 text-[11px] text-ink-400">
              Goal: Production UI Redesign & Agent Fleet Integration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-ink-300">
            <SparklesIcon size={12} className="text-accent" />
            <span className="text-ink-500">Tokens Spent:</span>
            <span className="mono font-semibold text-ink-200">
              {formatNumber(totalTokensSpent)}
            </span>
          </div>

          <div className="h-3 w-px bg-ink-800" />

          <div className="flex items-center gap-1.5 text-ink-300">
            <span className="text-ink-500">Duration:</span>
            <span className="mono font-medium text-ink-200">33s</span>
          </div>

          <div className="flex gap-1 border-l border-ink-800 pl-3">
            <button
              type="button"
              onClick={() => setActiveTab("trace")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                activeTab === "trace"
                  ? "bg-ink-800 text-ink-100"
                  : "text-ink-400 hover:text-ink-200"
              }`}
            >
              Execution Trace
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("artifacts")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                activeTab === "artifacts"
                  ? "bg-ink-800 text-ink-100"
                  : "text-ink-400 hover:text-ink-200"
              }`}
            >
              Artifacts (5)
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Execution Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === "trace" ? (
          <div className="relative pl-6 space-y-4 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-ink-800">
            {steps.map((step) => (
              <div key={step.id} className="relative group">
                {/* Step indicator dot */}
                <div className="absolute -left-6 top-1.5 flex size-4 items-center justify-center rounded-full border border-ok/50 bg-ok/20 text-ok">
                  <CheckCircleIcon size={10} />
                </div>

                <div className="rounded-lg border border-ink-800/90 bg-ink-950/70 p-3 shadow-xs transition-colors hover:border-ink-750">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-accent-light">{step.agent}</span>
                      <span className="text-[10px] text-ink-500">({step.role})</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-ink-500">
                      <span className="mono">{formatNumber(step.tokensUsed)} tok</span>
                      <span>·</span>
                      <span className="mono">{step.timestamp}</span>
                    </div>
                  </div>

                  <p className="mt-1 text-xs font-medium text-ink-200">{step.action}</p>

                  {step.details ? (
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-400 font-mono bg-ink-900/80 p-2 rounded border border-ink-800/60">
                      {step.details}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-ink-800 bg-ink-950 p-3">
              <div className="flex items-center gap-2">
                <FileCodeIcon size={14} className="text-accent" />
                <span className="text-xs font-semibold text-ink-200">
                  src/components/layout/TopBar.tsx
                </span>
              </div>
              <p className="mt-1 text-[11px] text-ink-400">
                Top bar component with brand badge, project switcher, and token gauge.
              </p>
            </div>
            <div className="rounded-lg border border-ink-800 bg-ink-950 p-3">
              <div className="flex items-center gap-2">
                <FileCodeIcon size={14} className="text-accent" />
                <span className="text-xs font-semibold text-ink-200">
                  src/components/context/TokenGauge.tsx
                </span>
              </div>
              <p className="mt-1 text-[11px] text-ink-400">
                Token meter with &lt;32k green, 32k-128k amber, &gt;128k red zones and cost
                calculator.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Task Prompt & Command Center */}
      <div className="border-t border-ink-800/80 bg-ink-950/90 p-3">
        {/* Quick Tag Pills */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-ink-500">Quick Tags:</span>
          <button
            type="button"
            onClick={() => setPromptInput((p) => p + "@orchestrator ")}
            className="rounded border border-ink-800 bg-ink-900 px-1.5 py-0.5 text-ink-300 hover:border-accent hover:text-accent"
          >
            @orchestrator
          </button>
          <button
            type="button"
            onClick={() => setPromptInput((p) => p + "@coder ")}
            className="rounded border border-ink-800 bg-ink-900 px-1.5 py-0.5 text-ink-300 hover:border-accent hover:text-accent"
          >
            @coder
          </button>
          <button
            type="button"
            onClick={() => setPromptInput((p) => p + "@validator ")}
            className="rounded border border-ink-800 bg-ink-900 px-1.5 py-0.5 text-ink-300 hover:border-accent hover:text-accent"
          >
            @validator
          </button>
          <button
            type="button"
            onClick={() =>
              setPromptInput((p) => p + `[Context Bundle: ${formatNumber(tokenTotal)} tokens] `)
            }
            className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-accent-light hover:bg-accent/20"
          >
            /files (Attach Bundle)
          </button>
        </div>

        {/* Input Area */}
        <div className="flex items-end gap-2">
          <textarea
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleRunTask();
              }
            }}
            placeholder="Instruct the agent fleet (e.g. '@coder refactor FileTree.tsx using virtual window' or press ⌘+Enter to dispatch)..."
            rows={2}
            className="w-full resize-none rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 text-xs text-ink-100 placeholder:text-ink-500 focus:border-accent focus:outline-hidden"
          />
          <Button
            variant="primary"
            size="md"
            onClick={handleRunTask}
            disabled={!promptInput.trim()}
            title="Dispatch Task (⌘+Enter)"
            className="shrink-0"
          >
            <ZapIcon size={14} />
            <span>Dispatch</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
