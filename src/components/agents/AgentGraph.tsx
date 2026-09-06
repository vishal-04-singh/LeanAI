import { useState } from "react";
import { Chip } from "../primitives";

interface GraphNode {
  id: string;
  label: string;
  role: string;
  status: "idle" | "ready" | "active" | "completed";
  x: number;
  y: number;
  description: string;
}

export function AgentGraph() {
  const [selectedNode, setSelectedNode] = useState<string | null>("orchestrator");

  const nodes: GraphNode[] = [
    {
      id: "prompt",
      label: "Task Input",
      role: "Developer Goal / PR",
      status: "completed",
      x: 60,
      y: 140,
      description: "User goal, problem statement, or target feature specification.",
    },
    {
      id: "orchestrator",
      label: "Orchestrator",
      role: "Supervisor & Task Router",
      status: "active",
      x: 230,
      y: 140,
      description:
        "Deconstructs requests, assigns subtasks to specialist agents, and coordinates dependencies.",
    },
    {
      id: "researcher",
      label: "Researcher",
      role: "Context & Index Specialist",
      status: "ready",
      x: 420,
      y: 60,
      description:
        "Queries the LeanAi context index, discovers relevant files, and eliminates redundant tokens.",
    },
    {
      id: "planner",
      label: "Planner",
      role: "Architecture Strategist",
      status: "ready",
      x: 420,
      y: 220,
      description:
        "Formulates step-by-step implementation plans, checks ADR constraints, and designs contracts.",
    },
    {
      id: "coder",
      label: "Coder",
      role: "Implementation Specialist",
      status: "idle",
      x: 610,
      y: 140,
      description:
        "Produces clean, idiomatic code modifications, minimal diffs, and precise syntax implementations.",
    },
    {
      id: "validator",
      label: "Validator",
      role: "Test & Linter Runner",
      status: "idle",
      x: 780,
      y: 140,
      description:
        "Executes test suites, typecheckers, security scanners, and prevents broken builds.",
    },
    {
      id: "documenter",
      label: "Documenter",
      role: "Context Spec Maintainer",
      status: "idle",
      x: 940,
      y: 140,
      description:
        "Synchronizes PROJECT_CONTEXT.md, updates API documentation, and drafts release summaries.",
    },
  ];

  const activeNode = nodes.find((n) => n.id === selectedNode) ?? nodes[1];

  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900/90 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-ink-800/80 pb-3">
        <div>
          <h3 className="text-xs font-semibold text-ink-100">Multi-Agent Workflow Graph</h3>
          <p className="text-[11px] text-ink-400">
            Interactive pipeline showing multi-agent task orchestration, context routing, and
            verification.
          </p>
        </div>
        <Chip tone="ok" dot>
          Graph Ready · 6 Agents Linked
        </Chip>
      </div>

      {/* SVG Canvas */}
      <div className="relative mt-3 overflow-x-auto rounded-lg border border-ink-800/70 bg-ink-950/80 p-2">
        <svg
          viewBox="0 0 1060 280"
          className="h-64 w-full min-w-[800px] select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="dimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2B3548" />
              <stop offset="100%" stopColor="#2B3548" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Connection Edges */}
          {/* Prompt -> Orchestrator */}
          <path
            d="M 120 140 L 180 140"
            stroke="url(#edgeGrad)"
            strokeWidth="2"
            strokeDasharray="4 2"
          />

          {/* Orchestrator -> Researcher */}
          <path
            d="M 280 140 C 330 140, 340 60, 370 60"
            stroke="url(#edgeGrad)"
            strokeWidth="2"
            fill="none"
          />

          {/* Orchestrator -> Planner */}
          <path
            d="M 280 140 C 330 140, 340 220, 370 220"
            stroke="url(#edgeGrad)"
            strokeWidth="2"
            fill="none"
          />

          {/* Researcher -> Coder */}
          <path
            d="M 470 60 C 520 60, 530 140, 560 140"
            stroke="#2B3548"
            strokeWidth="2"
            fill="none"
          />

          {/* Planner -> Coder */}
          <path
            d="M 470 220 C 520 220, 530 140, 560 140"
            stroke="#2B3548"
            strokeWidth="2"
            fill="none"
          />

          {/* Coder -> Validator */}
          <path d="M 660 140 L 730 140" stroke="#2B3548" strokeWidth="2" />

          {/* Validator -> Documenter */}
          <path d="M 830 140 L 890 140" stroke="#2B3548" strokeWidth="2" />

          {/* Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNode === node.id;
            const isPrompt = node.id === "prompt";

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => setSelectedNode(node.id)}
                className="cursor-pointer transition-transform duration-150 hover:scale-105"
              >
                {/* Node Box */}
                <rect
                  x="-50"
                  y="-30"
                  width="100"
                  height="60"
                  rx="10"
                  className={`${
                    isSelected
                      ? "fill-ink-850 stroke-accent stroke-2"
                      : isPrompt
                        ? "fill-ink-850 stroke-cyan-500/50 stroke-1"
                        : "fill-ink-900 stroke-ink-700 stroke-1 hover:stroke-ink-500"
                  }`}
                  filter={isSelected ? "url(#glow)" : undefined}
                />

                {/* Node Label */}
                <text
                  textAnchor="middle"
                  y="-6"
                  className={`text-[11px] font-semibold ${
                    isSelected ? "fill-white" : "fill-ink-200"
                  }`}
                >
                  {node.label}
                </text>

                {/* Role / Subtext */}
                <text textAnchor="middle" y="12" className="fill-ink-400 text-[8.5px] font-medium">
                  {node.role.slice(0, 16)}
                </text>

                {/* Status Dot */}
                <circle
                  cx="38"
                  cy="-18"
                  r="3.5"
                  className={
                    node.status === "active"
                      ? "fill-ok animate-pulse"
                      : node.status === "completed"
                        ? "fill-cyan-400"
                        : node.status === "ready"
                          ? "fill-accent"
                          : "fill-ink-600"
                  }
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Details Footer */}
      {activeNode ? (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-ink-800 bg-ink-950/70 px-3.5 py-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-100">{activeNode.label}</span>
              <span className="text-[11px] text-ink-400">({activeNode.role})</span>
              <Chip
                tone={
                  activeNode.status === "active"
                    ? "ok"
                    : activeNode.status === "ready"
                      ? "info"
                      : "neutral"
                }
                dot
              >
                {activeNode.status}
              </Chip>
            </div>
            <p className="mt-0.5 text-[11px] text-ink-400">{activeNode.description}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
