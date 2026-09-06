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
  const tokenTone =
    tokenEstimate < 32000 ? "text-ok" : tokenEstimate < 128000 ? "text-warn" : "text-danger";

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-ink-800/90 bg-ink-900/95 px-3.5 backdrop-blur-md">
      {/* Brand & Active Workspace */}
      <div className="flex items-center gap-3">
        <div
          className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-90"
          onClick={() => setRoute("overview")}
          title="Go to Mission Control"
        >
          <div className="flex size-7 items-center justify-center rounded-md border border-accent/40 bg-accent/15 text-accent shadow-xs glow-accent">
            <LogoIcon size={18} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-bold tracking-tight text-white">LeanAi</span>
            <span className="rounded border border-ink-750 bg-ink-850 px-1 py-0.2 text-[9px] font-semibold tracking-wider text-ink-400 uppercase">
              Desktop
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-ink-800" />

        {/* Project Breadcrumb */}
        {project ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenFolder}
              title={`Switch project (currently: ${project.canonicalPath})`}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-ink-200 transition-colors hover:bg-ink-800"
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
                <GitBranchIcon size={11} className="shrink-0" />
                <span className="max-w-[120px] truncate">{git.headRef ?? "detached"}</span>
              </Chip>
            ) : (
              <Chip tone="neutral" title="Not a git repository">
                local
              </Chip>
            )}
          </div>
        ) : (
          <Button variant="ghost" size="xs" onClick={handleOpenFolder}>
            + Open Project…
          </Button>
        )}
      </div>

      {/* Center: Token Counter & Budget Meter */}
      <div className="hidden md:flex items-center gap-4">
        <div
          className="flex cursor-pointer items-center gap-2.5 rounded-md border border-ink-800 bg-ink-950/70 px-2.5 py-1 text-xs transition-colors hover:border-ink-700"
          onClick={() => setRoute("context")}
          title="Context Token Budget Status (Click to inspect bundle)"
        >
          <div className="flex items-center gap-1.5">
            <SparklesIcon size={12} className="text-accent" />
            <span className="text-[11px] text-ink-400">Context:</span>
            <span className={`mono font-semibold text-xs ${tokenTone}`}>
              {tokenEstimate > 0 ? `~${formatNumber(tokenEstimate)}` : "0"}
            </span>
            <span className="text-[10px] text-ink-500">/ 128k</span>
          </div>

          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                tokenEstimate < 32000 ? "bg-ok" : tokenEstimate < 128000 ? "bg-warn" : "bg-danger"
              }`}
              style={{ width: `${Math.max(tokenPct, 2)}%` }}
            />
          </div>
        </div>

        {/* Model Indicator */}
        <div
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-ink-800/80 bg-ink-950/50 px-2.5 py-1 text-[11px] text-ink-300 transition-colors hover:border-ink-700"
          onClick={() => setRoute("models")}
          title="Routing target model (Click to manage models)"
        >
          <span className="size-1.5 rounded-full bg-accent animate-pulse" />
          <span className="font-medium text-ink-200">Claude 3.5 Sonnet</span>
          <span className="text-[10px] text-ink-500">· 200k</span>
        </div>
      </div>

      {/* Right: Quick Actions */}
      <div className="flex items-center gap-1.5">
        {project && (
          <Button
            variant="ghost"
            size="xs"
            disabled={scanning}
            onClick={scan}
            title="Rescan Project (⌘R)"
            className="text-ink-300 hover:text-ink-100"
          >
            <RefreshCwIcon size={13} className={scanning ? "animate-spin text-accent" : ""} />
            <span className="hidden sm:inline">{scanning ? "Scanning…" : "Rescan"}</span>
          </Button>
        )}

        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 rounded-md border border-ink-800 bg-ink-950/80 px-2.5 py-1 text-xs text-ink-400 transition-colors hover:border-ink-700 hover:text-ink-200"
          title="Open Command Palette (⌘K)"
        >
          <SearchIcon size={13} />
          <span className="hidden lg:inline text-[11px]">Command Palette</span>
          <kbd className="mono rounded border border-ink-750 bg-ink-850 px-1 py-0.2 text-[10px] text-ink-400">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          onClick={() => setRoute("settings")}
          className="flex size-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
          title="Settings (⌘,)"
        >
          <SettingsIcon size={14} />
        </button>
      </div>
    </header>
  );
}
