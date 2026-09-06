import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";

import { api, toAppError } from "../ipc/client";
import type { BundleRecord, ProjectRecord } from "../ipc/types";
import { useAppStore } from "../store/useAppStore";
import {
  Button,
  Chip,
  EmptyState,
  Panel,
  StatCard,
  formatBytes,
  formatNumber,
} from "../components/primitives";
import { CompressionHero } from "../components/context/CompressionHero";
import { AgentCard, type AgentDefinition } from "../components/agents/AgentCard";
import {
  AgentsIcon,
  ContextIcon,
  FolderIcon,
  GitBranchIcon,
  HistoryIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ZapIcon,
} from "../components/icons";

export function OverviewPage() {
  const {
    project,
    git,
    inventory,
    classCounts,
    scanning,
    scanProgress,
    openProject,
    scan,
    bundle,
    setRoute,
    setError,
  } = useAppStore();

  const [recent, setRecent] = useState<ProjectRecord[]>([]);
  const [history, setHistory] = useState<BundleRecord[]>([]);

  useEffect(() => {
    api
      .listProjects()
      .then(setRecent)
      .catch((error: unknown) => setError(toAppError(error)));

    if (project) {
      api
        .bundleHistory()
        .then(setHistory)
        .catch(() => undefined);
    }
  }, [project, setError]);

  const chooseProject = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Choose a project directory",
    });
    if (typeof selected === "string") {
      await openProject(selected);
    }
  };

  const agents: AgentDefinition[] = [
    {
      id: "orch",
      name: "Orchestrator",
      role: "Supervisor & Task Coordinator",
      model: "Claude 3.5 Sonnet",
      description:
        "Deconstructs requests, delegates to specialists, and resolves multi-file cross dependencies.",
      status: "active",
      capabilities: ["Task Routing", "Dependency Graph", "Step Validation"],
      temperature: 0.2,
    },
    {
      id: "researcher",
      name: "Researcher",
      role: "Context & Index Specialist",
      model: "Local Qwen 2.5 7B",
      description:
        "Indexes source code, extracts symbols from PROJECT_CONTEXT.md, and prunes unused tokens.",
      status: "ready",
      capabilities: ["Context Bundling", "Symbol Search", "Secret Filter"],
      temperature: 0.1,
    },
    {
      id: "coder",
      name: "Coder",
      role: "Implementation Specialist",
      model: "Claude 3.5 Sonnet",
      description:
        "Generates clean, targeted patch sets with minimal line changes and preserved comments.",
      status: "ready",
      capabilities: ["Patch Generation", "Refactoring", "Diff Synthesis"],
      temperature: 0.2,
    },
    {
      id: "validator",
      name: "Validator",
      role: "Safety & Test Inspector",
      model: "Local llama-server",
      description:
        "Executes cargo test, vitest, and policy checks to guarantee zero regressions before export.",
      status: "ready",
      capabilities: ["Test Runner", "Linter Check", "Safety Policy"],
      temperature: 0.0,
    },
  ];

  if (!project) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 py-4">
        {/* Hero Compression Banner */}
        <CompressionHero />

        {/* Empty Workspace CTA */}
        <EmptyState
          icon={<FolderIcon size={22} />}
          title="Open a repository to launch mission control"
          body={
            <>
              LeanAi inspects your codebase offline. Nothing is sent to external servers: context
              bundling, token counting, policy exclusions, and indexing all execute locally on this
              machine with zero network egress.
            </>
          }
          action={
            <Button variant="primary" size="md" onClick={chooseProject}>
              <FolderIcon size={14} />
              <span>Choose Project Directory…</span>
            </Button>
          }
        />

        {/* Recent Projects */}
        {recent.length > 0 ? (
          <Panel
            title="Recent Workspaces"
            description="Locally registered projects on this machine."
            badge={<Chip tone="neutral">{recent.length} projects</Chip>}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {recent.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between rounded border border-ink-800/80 bg-ink-950/70 p-2.5 transition-colors hover:border-ink-700"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FolderIcon size={13} className="text-ink-400 shrink-0" />
                      <p className="truncate text-xs font-semibold text-ink-100">
                        {rec.displayName}
                      </p>
                    </div>
                    <p className="mono truncate text-[10px] text-ink-500 mt-0.5">
                      {rec.canonicalPath}
                    </p>
                  </div>
                  <Button size="xs" onClick={() => openProject(rec.canonicalPath)}>
                    Open
                  </Button>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}
      </div>
    );
  }

  const filesSeen = inventory?.stats.filesSeen ?? 0;
  const dirsSeen = inventory?.stats.directoriesSeen ?? 0;
  const bytesSeen = inventory?.stats.bytesSeen ?? 0;
  const elapsedMs = inventory?.stats.elapsedMs ?? 0;
  const bundledTokens = bundle?.estimate.value ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-6">
      {/* Hero Compression Product Moment */}
      <CompressionHero />

      {/* Active Project Command Center */}
      <div className="rounded-lg border border-ink-800/80 bg-ink-900/60 p-4 shadow-2xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-ink-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-tight">{project.displayName}</h1>
              <Chip tone="info" title="Project fingerprint">
                {project.fingerprint}
              </Chip>
              {git?.isRepository ? (
                <Chip tone={git.isDirty ? "warn" : "ok"} dot>
                  <GitBranchIcon size={11} className="shrink-0" />
                  <span>{git.headRef ?? "detached"}</span>
                </Chip>
              ) : null}
            </div>
            <p className="mono mt-0.5 text-[11px] text-ink-400 truncate">{project.canonicalPath}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="default" disabled={scanning} onClick={scan} title="Rescan Project">
              <RefreshCwIcon size={12} className={scanning ? "animate-spin text-ink-300" : ""} />
              <span>{scanning ? "Scanning…" : "Rescan"}</span>
            </Button>

            <Button variant="primary" onClick={() => setRoute("context")}>
              <ContextIcon size={13} />
              <span>Context Studio →</span>
            </Button>
          </div>
        </div>

        {/* Real-time Project Stat Cards */}
        <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatCard
            label="Total Files Scanned"
            value={formatNumber(filesSeen)}
            subtext={`${formatNumber(dirsSeen)} directories`}
            icon={<FolderIcon size={15} />}
          />
          <StatCard
            label="Repository Weight"
            value={formatBytes(bytesSeen)}
            subtext={`Indexed in ${elapsedMs} ms`}
            icon={<SparklesIcon size={15} />}
          />
          <StatCard
            label="Active Bundle Size"
            value={bundledTokens > 0 ? `~${formatNumber(bundledTokens)}` : "None"}
            subtext={bundledTokens > 0 ? "Ready for agents" : "No files selected"}
            icon={<ZapIcon size={15} />}
          />
          <StatCard
            label="Policy Safety Filter"
            value="Offline"
            subtext="Zero secret leakage"
            icon={<ShieldCheckIcon size={15} />}
          />
        </div>

        {/* Scan Status progress indicator if scanning */}
        {scanning ? (
          <div className="mt-3 rounded border border-ink-750 bg-ink-950 p-2.5 text-xs text-ink-300">
            <div className="flex items-center gap-2">
              <RefreshCwIcon size={13} className="animate-spin" />
              <span className="font-medium">
                Scanning repository tree… {formatNumber(scanProgress?.filesSeen ?? 0)} files,{" "}
                {formatNumber(scanProgress?.directoriesSeen ?? 0)} directories seen.
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Grid: Agent Fleet Status & Classification Counts */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left 2 Cols: Agent Fleet Roster */}
        <div className="space-y-2.5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AgentsIcon size={14} className="text-ink-400" />
              <h2 className="text-xs font-semibold text-ink-200 uppercase tracking-wider">
                Agent Fleet Roster
              </h2>
            </div>
            <Button variant="ghost" size="xs" onClick={() => setRoute("agents")}>
              View Workflow Graph →
            </Button>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onSelect={() => setRoute("tasks")} />
            ))}
          </div>
        </div>

        {/* Right Col: Classification Breakdown */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <SparklesIcon size={14} className="text-ink-400" />
            <h2 className="text-xs font-semibold text-ink-200 uppercase tracking-wider">
              File Classification
            </h2>
          </div>

          <div className="rounded-lg border border-ink-800/80 bg-ink-900/60 p-3.5 shadow-2xs">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ink-800 text-left text-[11px] text-ink-400">
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 text-right font-medium">Files</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800/60">
                {Object.entries(classCounts).map(([label, count]) => (
                  <tr key={label}>
                    <td className="py-2 text-ink-300 font-mono text-[11px]">{label}</td>
                    <td className="py-2 text-right font-semibold text-ink-100">
                      {formatNumber(Number(count))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 pt-3 border-t border-ink-800/80">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setRoute("context")}
              >
                Configure Exclusions in Context Studio
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bundle History section */}
      {history.length > 0 ? (
        <Panel
          title="Recent Context Bundles"
          description="Locally audited bundle generation history for this project."
          badge={<Chip tone="neutral">{history.length} snapshots</Chip>}
          actions={
            <Button variant="ghost" size="xs" onClick={() => setRoute("history")}>
              <HistoryIcon size={12} />
              <span>Full Audit Log →</span>
            </Button>
          }
        >
          <div className="divide-y divide-ink-800/80">
            {history.slice(0, 4).map((rec) => (
              <div key={rec.id} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <span className="mono text-ink-200">{rec.outputHash.slice(0, 16)}…</span>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    {rec.fileCount} files · {formatBytes(rec.byteLen)} ·{" "}
                    {rec.hasText ? "text saved" : "metadata only"}
                  </p>
                </div>
                <Button size="xs" onClick={() => setRoute("context")}>
                  Inspect
                </Button>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
