import { useAppStore } from "../../store/useAppStore";
import { GitBranchIcon, ShieldCheckIcon, TerminalIcon } from "../icons";
import { formatNumber } from "../primitives";

export function StatusBar() {
  const { project, git, inventory, selection, bundle, setRoute } = useAppStore();

  const totalFiles = inventory?.stats.filesSeen ?? 0;
  const selectedCount = selection.files.size;
  const tokenEstimate = bundle?.estimate.value ?? 0;

  return (
    <footer className="flex h-6 shrink-0 items-center justify-between border-t border-ink-800/80 bg-ink-950 px-3 text-[11px] text-ink-400 select-none">
      {/* Left: Project & Git State */}
      <div className="flex items-center gap-3">
        {project ? (
          <>
            {git?.isRepository ? (
              <div
                className="flex items-center gap-1.5 cursor-pointer hover:text-ink-200 transition-colors"
                onClick={() => setRoute("context")}
                title="Active Git Branch"
              >
                <GitBranchIcon size={11} className="text-ink-400" />
                <span className="mono">{git.headRef ?? "detached"}</span>
                <span
                  className={`size-1.5 rounded-full ${git.isDirty ? "bg-warn" : "bg-ok"}`}
                  title={git.isDirty ? "Uncommitted changes" : "Clean tree"}
                />
              </div>
            ) : (
              <span className="text-ink-500">Local Folder</span>
            )}

            <div className="h-3 w-px bg-ink-800" />

            {/* Inventory count */}
            <div
              className="cursor-pointer hover:text-ink-200 transition-colors"
              onClick={() => setRoute("context")}
              title="Scanned project files"
            >
              <span>{formatNumber(totalFiles)} files</span>
            </div>

            {selectedCount > 0 ? (
              <>
                <div className="h-3 w-px bg-ink-800" />
                <div
                  className="flex items-center gap-1.5 cursor-pointer text-accent hover:text-accent-light transition-colors"
                  onClick={() => setRoute("context")}
                  title="Files selected for context bundle"
                >
                  <span className="font-medium">{selectedCount} selected</span>
                  {tokenEstimate > 0 ? (
                    <span className="mono text-[10px] text-ink-400">
                      (~{formatNumber(tokenEstimate)} tok)
                    </span>
                  ) : null}
                </div>
              </>
            ) : null}
          </>
        ) : (
          <span className="text-ink-500">No project open</span>
        )}
      </div>

      {/* Right: Runtime & Safety guarantees */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1.5 cursor-pointer hover:text-ink-200 transition-colors"
          onClick={() => setRoute("settings")}
          title="Privacy: All scanning, bundling and indexing runs on this device"
        >
          <ShieldCheckIcon size={12} className="text-ok" />
          <span className="text-ink-300">Offline First · Zero Egress</span>
        </div>

        <div className="h-3 w-px bg-ink-800" />

        <div
          className="flex items-center gap-1.5 cursor-pointer hover:text-ink-200 transition-colors"
          onClick={() => setRoute("models")}
          title="Sidecar loopback endpoint"
        >
          <TerminalIcon size={11} className="text-ink-500" />
          <span className="mono text-[10px] text-ink-400">127.0.0.1 (Loopback)</span>
        </div>

        <div className="h-3 w-px bg-ink-800" />

        <span className="mono text-[10px] text-ink-500">UTF-8 · LF</span>
      </div>
    </footer>
  );
}
