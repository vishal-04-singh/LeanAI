import { useCallback, useEffect, useMemo, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

import { FileTree } from "../components/FileTree";
import {
  Button,
  Chip,
  EmptyState,
  Panel,
  Toggle,
  formatBytes,
  formatNumber,
} from "../components/primitives";
import { TokenGauge } from "../components/context/TokenGauge";
import { api, toAppError } from "../ipc/client";
import type {
  ContextSection,
  DiffScope,
  ExportDestination,
  ExportPreflight,
  FileEntry,
  PresetRecord,
  SourceOnDemandResponse,
} from "../ipc/types";
import { toSpec, useAppStore } from "../store/useAppStore";
import {
  CopyIcon,
  FileCodeIcon,
  FolderIcon,
  GitBranchIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "../components/icons";

export function ContextBundlerPage() {
  const store = useAppStore();
  const { inventory, selection, git, options, bundle, building, context } = store;

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [centerTab, setCenterTab] = useState<"bundle" | "context">("bundle");

  // Presets & Git diff
  const [presets, setPresets] = useState<PresetRecord[]>([]);
  const [presetName, setPresetName] = useState("");
  const [diffScopes, setDiffScopes] = useState<DiffScope[]>(["unstaged", "untracked"]);
  const [baseRef, setBaseRef] = useState("");
  const [showDiffFilter, setShowDiffFilter] = useState(false);

  // Dialog states
  const [pendingOverride, setPendingOverride] = useState<FileEntry | null>(null);
  const [preflight, setPreflight] = useState<{
    data: ExportPreflight;
    destination: ExportDestination;
    targetPath: string | null;
  } | null>(null);
  const [inspectedSource, setInspectedSource] = useState<SourceOnDemandResponse | null>(null);

  // Debounced bundle build
  useEffect(() => {
    const timer = setTimeout(() => {
      void store.buildBundle();
    }, 250);
    return () => clearTimeout(timer);
  }, [selection, options, store]);

  const refreshPresets = useCallback(() => {
    api
      .listPresets()
      .then(setPresets)
      .catch((error) => store.setError(toAppError(error)));
  }, [store]);

  useEffect(() => {
    if (inventory) refreshPresets();
  }, [inventory?.sourceRevision, refreshPresets, inventory]);

  const selectableCount = useMemo(
    () => inventory?.files.filter((file) => file.selectable).length ?? 0,
    [inventory],
  );

  const selectedBytes = useMemo(() => {
    if (!inventory) return 0;
    let total = 0;
    for (const file of inventory.files) {
      if (selection.files.has(file.path)) total += file.sizeBytes;
    }
    return total;
  }, [inventory, selection.files]);

  if (!inventory) {
    return (
      <EmptyState
        icon={<FolderIcon size={22} />}
        title="No files indexed yet"
        body="Open a repository to index files and craft your curated AI context bundle."
        action={
          <Button variant="primary" onClick={() => store.setRoute("overview")}>
            Go to Mission Control
          </Button>
        }
      />
    );
  }

  const handleApplyDiff = async () => {
    try {
      const files = await api.changedFiles(diffScopes, baseRef.trim() || null);
      const selectable = new Set(
        inventory.files.filter((file) => file.selectable).map((file) => file.path),
      );
      const usable = files.map((file) => file.path).filter((path) => selectable.has(path));
      store.selectPaths(usable, true);
      store.setNotice(
        `Selected ${usable.length} of ${files.length} changed files. ${
          files.length - usable.length
        } excluded by policy.`,
      );
      setShowDiffFilter(false);
    } catch (error) {
      store.setError(toAppError(error));
    }
  };

  const handleStartExport = async (destination: ExportDestination) => {
    try {
      let targetPath: string | null = null;
      if (destination === "file") {
        targetPath = await save({
          title: "Save context bundle",
          defaultPath: "leanai-bundle.md",
          filters: [{ name: "Markdown", extensions: ["md", "txt"] }],
        });
        if (!targetPath) return;
      }
      const data = await api.exportPreflight(toSpec(selection), options, destination, targetPath);
      setPreflight({ data, destination, targetPath });
    } catch (error) {
      store.setError(toAppError(error));
    }
  };

  const handleConfirmExport = async () => {
    if (!preflight) return;
    try {
      const response = await api.exportBundle(
        toSpec(selection),
        options,
        preflight.destination,
        preflight.targetPath,
      );
      if (response.text !== null) {
        await writeText(response.text);
      }
      store.setNotice(
        response.writtenPath
          ? `Saved bundle to ${response.writtenPath} (manifest: ${response.manifestPath}).`
          : "Context bundle copied to system clipboard.",
      );
      setPreflight(null);
    } catch (error) {
      store.setError(toAppError(error));
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 3-Pane Studio Layout */}
      <div className="grid h-full min-h-0 gap-2.5 lg:grid-cols-[300px_minmax(0,1fr)_320px] xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        {/* PANE 1: File Explorer & Presets */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-ink-800/80 bg-ink-900/60 shadow-2xs">
          {/* Pane Header */}
          <div className="border-b border-ink-800/80 p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FolderIcon size={13} className="text-ink-400" />
                <h2 className="text-xs font-semibold text-ink-100">Repository Files</h2>
              </div>
              <span className="mono text-[10px] text-ink-500">
                {formatNumber(selectableCount)} / {formatNumber(inventory.files.length)}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <SearchIcon
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter files by path..."
                className="w-full rounded border border-ink-750 bg-ink-950 py-1 pl-7 pr-2.5 text-xs text-ink-100 placeholder:text-ink-500 focus:border-ink-600 focus:outline-hidden"
              />
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex items-center justify-between pt-0.5 text-xs">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() =>
                    store.selectPaths(
                      inventory.files.filter((f) => f.selectable).map((f) => f.path),
                      true,
                    )
                  }
                  className="rounded px-2 py-1 text-[11px] text-ink-300 hover:bg-ink-800 hover:text-ink-100"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={store.clearSelection}
                  className="rounded px-2 py-1 text-[11px] text-ink-400 hover:bg-ink-800 hover:text-danger"
                >
                  Clear
                </button>
              </div>

              {git?.isRepository ? (
                <button
                  type="button"
                  onClick={() => setShowDiffFilter(!showDiffFilter)}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    showDiffFilter
                      ? "bg-white text-ink-950"
                      : "text-ink-400 hover:bg-ink-800 hover:text-ink-200"
                  }`}
                >
                  <GitBranchIcon size={11} />
                  <span>Git Changes</span>
                </button>
              ) : null}
            </div>

            {/* Expandable Git Diff Selection Panel */}
            {showDiffFilter && git?.isRepository ? (
              <div className="rounded-lg border border-ink-750 bg-ink-950/90 p-2.5 space-y-2 text-xs">
                <span className="font-medium text-ink-300">Select changed scopes:</span>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  {(["staged", "unstaged", "untracked", "against_ref"] as DiffScope[]).map(
                    (scope) => (
                      <label key={scope} className="flex items-center gap-1.5 text-ink-300">
                        <input
                          type="checkbox"
                          checked={diffScopes.includes(scope)}
                          onChange={(e) =>
                            setDiffScopes((prev) =>
                              e.target.checked ? [...prev, scope] : prev.filter((s) => s !== scope),
                            )
                          }
                          className="rounded size-3 accent-ink-100"
                        />
                        <span className="capitalize">{scope.replace("_", " ")}</span>
                      </label>
                    ),
                  )}
                </div>
                {diffScopes.includes("against_ref") && (
                  <input
                    type="text"
                    placeholder="base ref (e.g. main)"
                    value={baseRef}
                    onChange={(e) => setBaseRef(e.target.value)}
                    className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1 text-[11px] text-ink-100"
                  />
                )}
                <Button variant="secondary" size="xs" className="w-full" onClick={handleApplyDiff}>
                  Apply Git Diff Selection
                </Button>
              </div>
            ) : null}
          </div>

          {/* Virtualized File Tree (Fully Tested & Accessible) */}
          <div className="flex-1 overflow-hidden p-2">
            <FileTree
              inventory={inventory}
              selected={selection.files}
              overrides={selection.overrides}
              search={search}
              onToggleFile={store.toggleFile}
              onToggleDirectory={store.toggleDirectory}
              onRequestOverride={setPendingOverride}
            />
          </div>

          {/* Pane Footer: Selection Count & Presets */}
          <div className="border-t border-ink-800/80 bg-ink-950/60 p-2.5">
            <div className="flex items-center justify-between text-[11px] text-ink-400">
              <span className="font-semibold text-white">
                {formatNumber(selection.files.size)} files selected
              </span>
              <span className="mono">{formatBytes(selectedBytes)}</span>
            </div>

            {/* Presets row */}
            <div className="mt-2 flex items-center gap-1.5">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Save current selection as preset..."
                className="w-full rounded border border-ink-800 bg-ink-900 px-2 py-1 text-[11px] text-ink-100 placeholder:text-ink-600"
              />
              <Button
                size="xs"
                disabled={!presetName.trim() || selection.files.size === 0}
                onClick={async () => {
                  try {
                    await api.savePreset(presetName.trim(), toSpec(selection), store.options);
                    setPresetName("");
                    refreshPresets();
                    store.setNotice(`Saved preset "${presetName.trim()}".`);
                  } catch (err) {
                    store.setError(toAppError(err));
                  }
                }}
              >
                Save
              </Button>
            </div>

            {presets.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      store.selectPaths(p.validation?.files ?? [], true);
                      store.setOptions(p.options);
                      store.setNotice(`Applied preset "${p.name}".`);
                    }}
                    className="rounded border border-ink-800 bg-ink-900 px-1.5 py-0.5 text-[10px] text-ink-300 hover:border-ink-700 hover:text-white"
                  >
                    {p.name} ({p.validation?.files.length ?? 0})
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* PANE 2: Live Context Document & Markdown Viewer */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-ink-800/80 bg-ink-900/60 shadow-2xs">
          {/* Header with Tabs and Actions */}
          <div className="flex items-center justify-between border-b border-ink-800/80 px-3.5 py-2 bg-ink-950/40">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCenterTab("bundle")}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  centerTab === "bundle"
                    ? "bg-ink-800 text-white shadow-2xs"
                    : "text-ink-400 hover:text-ink-200"
                }`}
              >
                <FileCodeIcon size={12} className="text-ink-300" />
                <span>Bundle Preview</span>
              </button>

              <button
                type="button"
                onClick={() => setCenterTab("context")}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  centerTab === "context"
                    ? "bg-ink-800 text-white shadow-2xs"
                    : "text-ink-400 hover:text-ink-200"
                }`}
              >
                <SparklesIcon size={12} className="text-ink-300" />
                <span>PROJECT_CONTEXT.md</span>
                {context ? (
                  <span className="size-1.5 rounded-full bg-ok" />
                ) : (
                  <span className="size-1.5 rounded-full bg-warn" />
                )}
              </button>
            </div>

            {/* Export Toolbar */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="default"
                size="xs"
                disabled={!bundle || selection.files.size === 0}
                onClick={() => handleStartExport("clipboard")}
              >
                <CopyIcon size={12} />
                <span>Copy Context</span>
              </Button>
              <Button
                variant="primary"
                size="xs"
                disabled={!bundle || selection.files.size === 0}
                onClick={() => handleStartExport("file")}
              >
                <span>Export Bundle →</span>
              </Button>
            </div>
          </div>

          {/* Center Pane Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {centerTab === "bundle" ? (
              selection.files.size === 0 ? (
                <EmptyState
                  icon={<FileCodeIcon size={20} />}
                  title="No files selected for context"
                  body="Select source files from the left explorer. LeanAi will generate a curated markdown document optimized for your AI agent."
                />
              ) : building && !bundle ? (
                <div className="flex h-full items-center justify-center py-20 text-xs text-ink-400">
                  <RefreshCwIcon size={16} className="animate-spin text-ink-300 mr-2" />
                  <span>Synthesizing bundle preview…</span>
                </div>
              ) : bundle ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-ink-400">
                    <span className="font-semibold text-ink-200">
                      Generated Bundle ({formatNumber(bundle.fileCount)} files ·{" "}
                      {formatBytes(bundle.byteLen)})
                    </span>
                    <span className="mono text-[11px] text-ink-500">
                      sha256 {bundle.outputHash.slice(0, 16)}…
                    </span>
                  </div>

                  {/* Formatted Code Box */}
                  <pre className="mono max-h-[70vh] overflow-auto rounded-lg border border-ink-800 bg-ink-950 p-4 text-[11px] leading-relaxed whitespace-pre-wrap text-ink-300 select-text">
                    {bundle.preview}
                  </pre>

                  {bundle.previewTruncated ? (
                    <p className="rounded-md border border-warn/30 bg-warn/10 p-2.5 text-[11px] text-warn">
                      Preview truncated for screen performance. The full export includes all{" "}
                      {formatNumber(bundle.fileCount)} files in complete fidelity.
                    </p>
                  ) : null}
                </div>
              ) : null
            ) : (
              /* PROJECT_CONTEXT.md View */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-ink-100">
                      Project Architecture Spec
                    </h3>
                    <p className="text-[11px] text-ink-400">
                      Deterministic context index extracting structure, routes, dependencies, and
                      modules.
                    </p>
                  </div>
                  <Button variant="primary" size="xs" onClick={store.generateContext}>
                    {context ? "Regenerate Spec" : "Generate Spec"}
                  </Button>
                </div>

                {context ? (
                  <div className="space-y-2.5">
                    {context.document.sections.map((section: ContextSection) => (
                      <div
                        key={section.key}
                        className="rounded-lg border border-ink-800 bg-ink-950/70 p-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-ink-200">{section.title}</h4>
                          <Chip tone={section.freshness === "fresh" ? "ok" : "warn"} dot>
                            {section.freshness}
                          </Chip>
                        </div>
                        <pre className="mono mt-2 max-h-48 overflow-auto rounded border border-ink-800/80 bg-ink-950 p-2.5 text-[11px] text-ink-400 whitespace-pre-wrap">
                          {section.body}
                        </pre>
                        {section.sourceRefs.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {section.sourceRefs.map((ref) => (
                              <button
                                key={ref.path}
                                type="button"
                                onClick={async () => {
                                  try {
                                    setInspectedSource(await api.fetchSource(ref.path));
                                  } catch (err) {
                                    store.setError(toAppError(err));
                                  }
                                }}
                                className="mono rounded border border-ink-800 bg-ink-900 px-1.5 py-0.5 text-[10px] text-ink-300 hover:border-ink-600 hover:text-white transition-colors"
                              >
                                {ref.path}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Spec not generated yet"
                    body="Generate PROJECT_CONTEXT.md to equip your agents with a deterministic architecture map."
                    action={
                      <Button variant="primary" onClick={store.generateContext}>
                        Generate Spec Now
                      </Button>
                    }
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* PANE 3: Token Inspector & Output Settings */}
        <div className="flex flex-col overflow-y-auto space-y-2.5 rounded-lg border border-ink-800/80 bg-ink-900/60 p-2.5 shadow-2xs">
          {/* Token Gauge with Color Zones */}
          <TokenGauge
            tokens={bundle?.estimate.value ?? 0}
            label={bundle?.estimateLabel ?? "Indicative cl100k estimate"}
            targetModel="Claude 3.5 Sonnet"
          />

          {/* Bundle Formatting Toggles */}
          <Panel
            title="Formatting Engine"
            description="Controls the structure and annotations included in the bundle."
          >
            <div className="space-y-1">
              <Toggle
                checked={options.headers}
                onChange={(headers) => store.setOptions({ headers })}
                label="File path headers"
                hint="Guides model on source file origins."
              />
              <Toggle
                checked={options.includeTree}
                onChange={(includeTree) => store.setOptions({ includeTree })}
                label="Directory tree preamble"
              />
              <Toggle
                checked={options.codeFences}
                onChange={(codeFences) => store.setOptions({ codeFences })}
                label="Code fences with language hints"
              />
              <Toggle
                checked={options.lineNumbers}
                onChange={(lineNumbers) => store.setOptions({ lineNumbers })}
                label="Include line numbers"
                hint="Assists in citing exact lines (costs +10% tokens)."
              />
              <Toggle
                checked={options.fileSizeAnnotations}
                onChange={(fileSizeAnnotations) => store.setOptions({ fileSizeAnnotations })}
                label="Size & token annotations"
              />
              <Toggle
                checked={options.includeFrontMatter}
                onChange={(includeFrontMatter) => store.setOptions({ includeFrontMatter })}
                label="Embed provenance front matter"
              />
              <Toggle
                checked={options.normalizeLineEndings}
                onChange={(normalizeLineEndings) => store.setOptions({ normalizeLineEndings })}
                label="Normalize LF line endings"
              />
            </div>
          </Panel>

          {/* Top Token Contributors */}
          {bundle && bundle.contributions.length > 0 ? (
            <Panel
              title="Token Share by File"
              description="Identifies heaviest contributors to prompt budget."
            >
              <ul className="max-h-56 space-y-2 overflow-y-auto text-[11px]">
                {[...bundle.contributions]
                  .sort((a, b) => b.tokens - a.tokens)
                  .slice(0, 10)
                  .map((c) => (
                    <li key={c.path}>
                      <div className="flex justify-between gap-2">
                        <span className="mono truncate text-ink-300">{c.path}</span>
                        <span className="mono text-ink-400 shrink-0">
                          {formatNumber(c.tokens)} ({((c.share ?? 0) * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="mt-1 h-1 w-full rounded-full bg-ink-800">
                        <div
                          className="h-full rounded-full bg-ink-300"
                          style={{ width: `${Math.max((c.share ?? 0) * 100, 2)}%` }}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            </Panel>
          ) : null}

          {/* Policy & Secret Warning Summary */}
          {bundle && (bundle.skipped.length > 0 || bundle.truncations.length > 0) ? (
            <Panel title="Exclusion Warnings">
              <ul className="space-y-1 text-[11px] text-warn">
                {bundle.truncations.map((t) => (
                  <li key={t.path}>
                    {t.path} capped to {formatBytes(t.includedBytes)}
                  </li>
                ))}
                {bundle.skipped.map((s) => (
                  <li key={s}>{s} could not be read and was excluded</li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>

      {/* Override Confirmation Dialog (FR-08 High Friction) */}
      {pendingOverride ? (
        <OverrideDialog
          entry={pendingOverride}
          onCancel={() => setPendingOverride(null)}
          onConfirm={() => {
            store.addOverride(pendingOverride.path);
            setPendingOverride(null);
          }}
        />
      ) : null}

      {/* Preflight Export Safety Modal (ADR 0005) */}
      {preflight ? (
        <ExportPreflightDialog
          preflight={preflight.data}
          onCancel={() => setPreflight(null)}
          onConfirm={handleConfirmExport}
        />
      ) : null}

      {/* Source-on-demand inspection modal */}
      {inspectedSource ? (
        <SourceModal source={inspectedSource} onClose={() => setInspectedSource(null)} />
      ) : null}
    </div>
  );
}

function OverrideDialog({
  entry,
  onCancel,
  onConfirm,
}: {
  entry: FileEntry;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  const sensitive = entry.class === "credential_sensitive";
  const phrase = sensitive ? "include secret" : "include";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="override-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs select-none"
    >
      <div className="w-full max-w-md rounded-xl border border-danger/40 bg-ink-900 p-5 shadow-2xl">
        <div className="flex items-center gap-2 text-danger">
          <ShieldCheckIcon size={18} />
          <h2 id="override-title" className="text-sm font-semibold">
            High Friction Safety Override
          </h2>
        </div>
        <p className="mono mt-2 text-xs text-ink-300">{entry.path}</p>
        <p className="mt-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
          {entry.exclusion?.reason ?? `This file is classified as ${entry.class}.`}
        </p>
        {sensitive ? (
          <p className="mt-2 text-xs text-ink-300">
            Exporting secrets violates standard security policy. Included credentials will be
            readable by AI models.
          </p>
        ) : null}
        <label className="mt-3.5 block text-xs text-ink-300">
          Type <span className="mono font-bold text-white">{phrase}</span> to unlock:
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-xs text-white focus:border-danger focus:outline-hidden"
            autoFocus
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" disabled={typed.trim() !== phrase} onClick={onConfirm}>
            Include File
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExportPreflightDialog({
  preflight,
  onCancel,
  onConfirm,
}: {
  preflight: ExportPreflight;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const blocked = preflight.requiresConfirmation && !acknowledged;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preflight-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs select-none"
    >
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-ink-700 bg-ink-900 p-5 shadow-2xl">
        <h2 id="preflight-title" className="text-sm font-semibold text-ink-100">
          Export Safety Preflight
        </h2>
        <p className="mt-1 text-xs text-ink-400">{preflight.destinationNote}</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-ink-800 bg-ink-950 p-2.5">
            <span className="text-[10px] text-ink-500">Files</span>
            <p className="mt-0.5 text-sm font-semibold text-ink-100">
              {formatNumber(preflight.fileCount)}
            </p>
          </div>
          <div className="rounded-lg border border-ink-800 bg-ink-950 p-2.5">
            <span className="text-[10px] text-ink-500">Size</span>
            <p className="mt-0.5 text-sm font-semibold text-ink-100">
              {formatBytes(preflight.byteLen)}
            </p>
          </div>
          <div className="rounded-lg border border-ink-800 bg-ink-950 p-2.5">
            <span className="text-[10px] text-ink-500">Estimated Tokens</span>
            <p className="mt-0.5 text-sm font-semibold text-ok">
              ~{formatNumber(preflight.estimate.value)}
            </p>
          </div>
        </div>

        {/* Secret scan findings */}
        <h3 className="mt-4 text-xs font-semibold text-ink-300">Secret & Credential Scan</h3>
        <div className="mt-1 flex gap-2">
          <Chip tone={preflight.secretReport.high > 0 ? "danger" : "ok"} dot>
            {preflight.secretReport.high} high risk
          </Chip>
          <Chip tone={preflight.secretReport.medium > 0 ? "warn" : "neutral"}>
            {preflight.secretReport.medium} medium
          </Chip>
          <Chip tone="neutral">{preflight.secretReport.low} low</Chip>
        </div>

        {preflight.requiresConfirmation ? (
          <label className="mt-4 flex items-start gap-2 text-xs text-ink-200">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 size-4 rounded accent-ink-100"
            />
            <span>
              I understand that the selected files contain potential sensitive credentials. Export
              anyway.
            </span>
          </label>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" disabled={blocked} onClick={onConfirm}>
            Export Context
          </Button>
        </div>
      </div>
    </div>
  );
}

function SourceModal({ source, onClose }: { source: SourceOnDemandResponse; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs select-none"
    >
      <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-ink-700 bg-ink-900 p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="mono text-xs font-semibold text-ink-100">{source.path}</h3>
            <p className="mt-0.5 text-[11px] text-ink-500">
              lines {source.fromLine}–{source.toLine} of {source.totalLines}
            </p>
          </div>
          <Button variant="ghost" size="xs" onClick={onClose}>
            Close
          </Button>
        </div>

        <pre className="mono mt-3 max-h-[60vh] overflow-auto rounded-lg border border-ink-800 bg-ink-950 p-3 text-[11px] text-ink-300 whitespace-pre-wrap select-text">
          {source.content}
        </pre>
      </div>
    </div>
  );
}
