import { useEffect, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

import {
  Button,
  Chip,
  EmptyState,
  Panel,
  Toggle,
  formatBytes,
  formatNumber,
} from "../components/primitives";
import { api, toAppError } from "../ipc/client";
import type { ExportDestination, ExportPreflight } from "../ipc/types";
import { toSpec, useAppStore } from "../store/useAppStore";

export function PreviewPage() {
  const store = useAppStore();
  const { bundle, building, selection, options } = store;
  const [preflight, setPreflight] = useState<{
    data: ExportPreflight;
    destination: ExportDestination;
    targetPath: string | null;
  } | null>(null);

  // Rebuild after a debounce so option changes feel immediate without
  // rebuilding on every keystroke (FR-13).
  useEffect(() => {
    const timer = setTimeout(() => {
      void store.buildBundle();
    }, 200);
    return () => clearTimeout(timer);
  }, [selection, options, store]);

  if (selection.files.size === 0) {
    return (
      <EmptyState
        title="Nothing selected"
        body="Choose files first; the preview shows exactly what a model would receive."
        action={<Button onClick={() => store.setRoute("select")}>Choose files</Button>}
      />
    );
  }

  const startExport = async (destination: ExportDestination) => {
    try {
      let targetPath: string | null = null;
      if (destination === "file") {
        targetPath = await save({
          title: "Save bundle",
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

  const confirmExport = async () => {
    if (!preflight) return;
    try {
      const response = await api.exportBundle(
        toSpec(selection),
        options,
        preflight.destination,
        preflight.targetPath,
      );
      if (response.text !== null) await writeText(response.text);
      store.setNotice(
        response.writtenPath
          ? `Saved to ${response.writtenPath} (manifest: ${response.manifestPath}).`
          : "Bundle copied to the clipboard.",
      );
      setPreflight(null);
    } catch (error) {
      store.setError(toAppError(error));
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <Panel
        title="Bundle preview"
        description="This is the exact text that gets copied or saved."
        actions={
          <>
            <Button onClick={() => startExport("clipboard")} disabled={!bundle}>
              Copy…
            </Button>
            <Button variant="primary" onClick={() => startExport("file")} disabled={!bundle}>
              Save as…
            </Button>
          </>
        }
      >
        {building && !bundle ? (
          <p className="py-8 text-center text-xs text-ink-500" role="status">
            Building…
          </p>
        ) : bundle ? (
          <>
            <pre className="mono max-h-[55vh] overflow-auto rounded border border-ink-800 bg-ink-950 p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-ink-300">
              {bundle.preview}
            </pre>
            {bundle.previewTruncated ? (
              <p className="mt-2 text-[11px] text-warn">
                Preview shortened for display. The saved bundle and every number above cover the
                full text.
              </p>
            ) : null}
          </>
        ) : (
          <p className="py-8 text-center text-xs text-ink-500">No bundle yet.</p>
        )}
      </Panel>

      <div className="space-y-4">
        <Panel title="Size and estimate">
          {bundle ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Files" value={formatNumber(bundle.fileCount)} />
                <Stat label="Bytes" value={formatBytes(bundle.byteLen)} />
              </div>
              <div className="mt-3 rounded border border-ink-800 px-3 py-2">
                <p className="text-lg text-ink-100">
                  ~{formatNumber(bundle.estimate.value)} tokens
                </p>
                {/* The label is required next to every number: a cl100k count is
                    not an Anthropic, Gemini or GGUF count (FR-13). */}
                <p className="mt-0.5 text-[11px] text-ink-500">{bundle.estimateLabel}</p>
                <p className="mt-1 text-[11px] text-ink-500">
                  Indicative only for non-OpenAI models. Your provider's own count is what gets
                  billed.
                </p>
              </div>
              <p className="mono mt-3 text-[11px] break-all text-ink-500">
                sha256 {bundle.outputHash.slice(0, 32)}…
              </p>
            </>
          ) : (
            <p className="text-xs text-ink-500">Build a bundle to see its size.</p>
          )}
        </Panel>

        <Panel title="Output options">
          <Toggle
            checked={options.headers}
            onChange={(headers) => store.setOptions({ headers })}
            label="File path headers"
            hint="Tells the model which file each block came from."
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
            label="Line numbers"
            hint="Helps a model cite locations; costs extra tokens."
          />
          <Toggle
            checked={options.fileSizeAnnotations}
            onChange={(fileSizeAnnotations) => store.setOptions({ fileSizeAnnotations })}
            label="Size and token annotations in headers"
          />
          <Toggle
            checked={options.includeFrontMatter}
            onChange={(includeFrontMatter) => store.setOptions({ includeFrontMatter })}
            label="Embed the provenance manifest as front matter"
          />
          <Toggle
            checked={options.normalizeLineEndings}
            onChange={(normalizeLineEndings) => store.setOptions({ normalizeLineEndings })}
            label="Normalise line endings"
            hint="Keeps output identical across Windows and macOS."
          />
        </Panel>

        {bundle && bundle.contributions.length > 0 ? (
          <Panel title="What is using the budget" description="Per-file share of the estimate.">
            <ul className="max-h-64 space-y-1.5 overflow-auto text-[11px]">
              {[...bundle.contributions]
                .sort((a, b) => b.tokens - a.tokens)
                .map((contribution) => (
                  <li key={contribution.path}>
                    <div className="flex justify-between gap-2">
                      <span className="mono truncate text-ink-300">{contribution.path}</span>
                      <span className="shrink-0 text-ink-500">
                        {formatNumber(contribution.tokens)} ·{" "}
                        {(contribution.share * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div
                      className="mt-0.5 h-1 rounded bg-ink-800"
                      role="img"
                      aria-label={`${(contribution.share * 100).toFixed(1)} percent of the bundle`}
                    >
                      <div
                        className="h-1 rounded bg-ink-200"
                        style={{ width: `${Math.max(contribution.share * 100, 1)}%` }}
                      />
                    </div>
                  </li>
                ))}
            </ul>
          </Panel>
        ) : null}

        {bundle && (bundle.skipped.length > 0 || bundle.truncations.length > 0) ? (
          <Panel title="Warnings">
            <ul className="space-y-1 text-[11px] text-warn">
              {bundle.truncations.map((truncation) => (
                <li key={truncation.path}>
                  {truncation.path} truncated to {formatBytes(truncation.includedBytes)} of{" "}
                  {formatBytes(truncation.originalBytes)}
                </li>
              ))}
              {bundle.skipped.map((path) => (
                <li key={path}>{path} could not be read at build time and was left out.</li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </div>

      {preflight ? (
        <ExportPreflightDialog
          preflight={preflight.data}
          onCancel={() => setPreflight(null)}
          onConfirm={confirmExport}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-ink-800 px-3 py-2">
      <p className="text-[11px] text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm text-ink-100">{value}</p>
    </div>
  );
}

/**
 * The consent screen every export passes through, local ones included, so a
 * future cloud provider inherits a flow that has already been tested
 * (backlog 4.6).
 */
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-lg border border-ink-700 bg-ink-900 p-5">
        <h2 id="preflight-title" className="text-sm font-semibold text-ink-100">
          Review before exporting
        </h2>
        <p className="mt-1 text-xs text-ink-500">{preflight.destinationNote}</p>

        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
          <Stat label="Files" value={formatNumber(preflight.fileCount)} />
          <Stat label="Size" value={formatBytes(preflight.byteLen)} />
          <Stat label="Tokens" value={`~${formatNumber(preflight.estimate.value)}`} />
        </div>
        <p className="mt-1 text-[11px] text-ink-500">{preflight.estimateLabel}</p>

        <h3 className="mt-4 text-xs font-semibold text-ink-300">
          Files included ({preflight.includedFiles.length})
        </h3>
        <ul className="mono mt-1 max-h-40 overflow-auto text-[11px] text-ink-500">
          {preflight.includedFiles.map((path) => (
            <li key={path}>{path}</li>
          ))}
        </ul>

        <h3 className="mt-4 text-xs font-semibold text-ink-300">Secret scan</h3>
        <div className="mt-1 flex flex-wrap gap-2">
          <Chip tone={preflight.secretReport.high > 0 ? "danger" : "neutral"}>
            {preflight.secretReport.high} high
          </Chip>
          <Chip tone={preflight.secretReport.medium > 0 ? "warn" : "neutral"}>
            {preflight.secretReport.medium} medium
          </Chip>
          <Chip>{preflight.secretReport.low} low</Chip>
        </div>
        <p className="mt-2 rounded border border-ink-700 bg-ink-950 px-3 py-2 text-[11px] text-ink-500">
          {preflight.disclaimer}
        </p>
        {preflight.secretReport.findings.length > 0 ? (
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-[11px]">
            {preflight.secretReport.findings.map((finding) => (
              <li
                key={`${finding.path}:${finding.line}:${finding.rule}`}
                className="rounded border border-ink-800 px-2 py-1"
              >
                <span className="mono text-ink-300">
                  {finding.path}:{finding.line}
                </span>{" "}
                <Chip tone={finding.confidence === "high" ? "danger" : "warn"}>
                  {finding.confidence} · {finding.rule}
                </Chip>
                <p className="mono mt-0.5 break-all text-ink-500">{finding.redactedExcerpt}</p>
              </li>
            ))}
          </ul>
        ) : null}

        {preflight.requiresConfirmation ? (
          <label className="mt-4 flex items-start gap-2 text-xs text-ink-100">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-0.5 size-4 rounded accent-ink-100"
            />
            I have reviewed the findings above and want to export these files anyway.
          </label>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" disabled={blocked} onClick={onConfirm}>
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}
