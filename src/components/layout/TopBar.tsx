import { open } from "@tauri-apps/plugin-dialog";

import { useAppStore } from "../../store/useAppStore";
import { Button, Chip, formatNumber } from "../primitives";
import {
  GitBranchIcon,
  LogoIcon,
  RefreshCwIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
} from "../icons";

export function TopBar({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const { project, git, scanning, scan, openProject, bundle, setRoute } = useAppStore();

  const handleOpenFolder = async () => {
    const selected = await open({ directory: true, multiple: false, title: "Choose a project" });
    if (typeof selected === "string") {
      await openProject(selected);
    }
  };

  const tokenEstimate = bundle?.estimate.value ?? 0;
  const tokenMax = 128000;
  const tokenPct = Math.min((tokenEstimate / tokenMax) * 100, 100);

  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-ink-800/80 bg-ink-950 px-3 select-none">
      {/* Brand & Active Workspace */}
      <div className="flex items-center gap-3">
        <div
          className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
          onClick={() => setRoute("overview")}
          title="Go to Mission Control"
        >
          <div className="flex size-6 items-center justify-center rounded border border-ink-750 bg-ink-900 text-ink-200">
            <LogoIcon size={14} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-semibold text-ink-100">LeanAi</span>
            <span className="text-[10px] text-ink-500 font-mono">Desktop</span>
          </div>
        </div>

        <div className="h-3.5 w-px bg-ink-800" />

        {/* Project Breadcrumb */}
        {project ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenFolder}
              title={`Switch project (${project.canonicalPath})`}
              className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs text-ink-200 hover:bg-ink-850 hover:text-white transition-colors"
            >
              <span className="max-w-[180px] truncate">{project.displayName}</span>
            </button>

            {git?.isRepository ? (
              <Chip
                tone={git.isDirty ? "warn" : "ok"}
                dot
                title={
                  git.isDirty
                    ? "Working directory has uncommitted changes"
                    : "Clean git working directory"
                }
              >
                <GitBranchIcon size={10} className="shrink-0" />
                <span className="max-w-[120px] truncate">{git.headRef ?? "detached"}</span>
              </Chip>
            ) : null}
          </div>
        ) : (
          <Button variant="ghost" size="xs" onClick={handleOpenFolder}>
            + Open Project
          </Button>
        )}
      </div>

      {/* Center: Token Counter & Budget Meter */}
      <div className="hidden md:flex items-center gap-3">
        <div
          className="flex cursor-pointer items-center gap-2 rounded border border-ink-800 bg-ink-900/60 px-2.5 py-0.5 text-xs hover:border-ink-700 transition-colors"
          onClick={() => setRoute("context")}
          title="Context Token Budget Status"
        >
          <span className="text-[11px] text-ink-400">Context:</span>
          <span className="mono text-xs font-medium text-ink-200">
            {tokenEstimate > 0 ? `~${formatNumber(tokenEstimate)}` : "0"}
          </span>
          <span className="text-[10px] text-ink-500 font-mono">/ 128k</span>

          <div className="h-1 w-12 overflow-hidden rounded-full bg-ink-800">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                tokenEstimate < 32000 ? "bg-ok" : tokenEstimate < 128000 ? "bg-warn" : "bg-danger"
              }`}
              style={{ width: `${Math.max(tokenPct, tokenEstimate > 0 ? 4 : 0)}%` }}
            />
          </div>
        </div>

        {/* Model Indicator */}
        <div
          className="flex cursor-pointer items-center gap-1.5 rounded border border-ink-800/80 bg-ink-900/40 px-2 py-0.5 text-[11px] text-ink-400 hover:border-ink-700 hover:text-ink-200 transition-colors"
          onClick={() => setRoute("models")}
          title="Routing target model"
        >
          <SparklesIcon size={11} className="text-ink-400" />
          <span className="font-medium text-ink-300">Claude 3.5 Sonnet</span>
        </div>
      </div>

      {/* Right: Quick Actions */}
      <div className="flex items-center gap-1">
        {project && (
          <Button
            variant="ghost"
            size="xs"
            disabled={scanning}
            onClick={scan}
            title="Rescan Project (⌘R)"
          >
            <RefreshCwIcon size={12} className={scanning ? "animate-spin text-ink-200" : ""} />
            <span className="hidden sm:inline">{scanning ? "Scanning…" : "Rescan"}</span>
          </Button>
        )}

        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 rounded border border-ink-800 bg-ink-900/60 px-2 py-1 text-xs text-ink-400 hover:border-ink-700 hover:text-ink-200 transition-colors"
          title="Command Palette (⌘K)"
        >
          <SearchIcon size={12} />
          <span className="hidden lg:inline text-[11px]">Commands</span>
          <kbd className="mono rounded border border-ink-750 bg-ink-850 px-1 py-0.2 text-[9px] text-ink-400">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          onClick={() => setRoute("settings")}
          className="flex size-7 items-center justify-center rounded text-ink-400 hover:bg-ink-850 hover:text-ink-200 transition-colors"
          title="Preferences (⌘,)"
        >
          <SettingsIcon size={13} />
        </button>
      </div>
    </header>
  );
}
