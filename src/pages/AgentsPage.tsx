import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { AgentCard, type AgentDefinition } from "../components/agents/AgentCard";
import { AgentGraph } from "../components/agents/AgentGraph";
import { Button, Chip } from "../components/primitives";
import { AgentsIcon, ZapIcon } from "../components/icons";

export function AgentsPage() {
  const { setRoute } = useAppStore();
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);

  const agents: AgentDefinition[] = [
    {
      id: "orch",
      name: "Orchestrator",
      role: "Supervisor & Task Coordinator",
      model: "Claude 3.5 Sonnet",
      description:
        "Deconstructs requests, determines execution order, assigns subtasks to specialist agents, and coordinates dependencies.",
      status: "active",
      capabilities: ["Task Routing", "Dependency Graph", "Step Validation", "Subagent Spawning"],
      temperature: 0.2,
    },
    {
      id: "researcher",
      name: "Researcher",
      role: "Context & Index Specialist",
      model: "Local Qwen 2.5 7B",
      description:
        "Queries the LeanAi context index, discovers relevant files, inspects symbol graphs, and eliminates redundant tokens.",
      status: "ready",
      capabilities: ["Context Bundling", "Symbol Search", "Secret Filter", "Git Tree Navigation"],
      temperature: 0.1,
    },
    {
      id: "planner",
      name: "Planner",
      role: "Architecture Strategist",
      model: "Claude 3.5 Sonnet",
      description:
        "Formulates step-by-step implementation plans, checks ADR constraints, and designs contracts before code is touched.",
      status: "ready",
      capabilities: [
        "ADR Compliance",
        "API Contract Design",
        "Risk Assessment",
        "Migration Strategy",
      ],
      temperature: 0.2,
    },
    {
      id: "coder",
      name: "Coder",
      role: "Implementation Specialist",
      model: "Claude 3.5 Sonnet",
      description:
        "Generates clean, idiomatic code modifications, minimal diffs, and preserves all existing docstrings and structure.",
      status: "ready",
      capabilities: ["TypeScript / React", "Rust / Tauri", "Diff Synthesis", "Refactoring"],
      temperature: 0.2,
    },
    {
      id: "validator",
      name: "Validator",
      role: "Safety & Test Inspector",
      model: "Local llama-server",
      description:
        "Executes test suites, typecheckers, security scanners, and prevents broken builds from entering the tree.",
      status: "ready",
      capabilities: ["Cargo Test Runner", "Vitest Runner", "Clippy Linter", "Safety Verification"],
      temperature: 0.0,
    },
    {
      id: "documenter",
      name: "Documenter",
      role: "Context Spec Maintainer",
      model: "Local Qwen 2.5 7B",
      description:
        "Synchronizes PROJECT_CONTEXT.md, updates API documentation, and drafts release summaries.",
      status: "idle",
      capabilities: [
        "Context Index Sync",
        "Release Notes",
        "Markdown Generation",
        "Changelog Audit",
      ],
      temperature: 0.3,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-ink-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded border border-ink-750 bg-ink-850 text-ink-300">
              <AgentsIcon size={14} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">
                Multi-Agent Orchestration Center
              </h1>
              <p className="text-xs text-ink-400">
                Specialized agent fleet collaborating through structured context passing and local
                verification.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Chip tone="ok" dot>
            6 Agents Online
          </Chip>
          <Button variant="primary" onClick={() => setRoute("tasks")}>
            <ZapIcon size={12} />
            <span>Launch Task Workspace →</span>
          </Button>
        </div>
      </div>

      {/* Interactive Workflow Graph */}
      <AgentGraph />

      {/* Agent Fleet Roster Grid */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Agent Fleet Roster
          </h2>
          <span className="text-[11px] text-ink-500">
            Click an agent to inspect details and system prompt
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onSelect={setSelectedAgent} />
          ))}
        </div>
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs select-none"
          onClick={() => setSelectedAgent(null)}
        >
          <div
            className="w-full max-w-xl rounded-lg border border-ink-750 bg-ink-900 p-5 shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded border border-ink-750 bg-ink-850 text-ink-300">
                  <AgentsIcon size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{selectedAgent.name}</h3>
                  <p className="text-xs text-ink-400">{selectedAgent.role}</p>
                </div>
              </div>
              <Button variant="ghost" size="xs" onClick={() => setSelectedAgent(null)}>
                Close
              </Button>
            </div>

            <p className="text-xs leading-relaxed text-ink-200">{selectedAgent.description}</p>

            <div className="rounded border border-ink-800 bg-ink-950 p-3 space-y-2">
              <span className="text-[11px] font-semibold text-ink-300">Model Configuration:</span>
              <div className="flex items-center justify-between text-xs text-ink-400">
                <span>Model Target:</span>
                <span className="font-medium text-white">{selectedAgent.model}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-ink-400">
                <span>Temperature:</span>
                <span className="mono">{selectedAgent.temperature}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-ink-400">
                <span>Execution Mode:</span>
                <span className="mono text-ok">Zero Egress Verified</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-ink-300">
                Granted Tool Capabilities:
              </span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedAgent.capabilities.map((cap) => (
                  <Chip key={cap} tone="neutral">
                    {cap}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-ink-800">
              <Button variant="ghost" onClick={() => setSelectedAgent(null)}>
                Dismiss
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setSelectedAgent(null);
                  setRoute("tasks");
                }}
              >
                Dispatch with {selectedAgent.name}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
