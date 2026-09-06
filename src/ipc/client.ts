import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type {
  AiIgnoreFile,
  AiIgnorePreview,
  AppError,
  AuditEntry,
  BundleOptions,
  BundleRecord,
  BuildBundleResponse,
  ChangedFile,
  ChangeImpact,
  ContextResponse,
  Diagnostics,
  DiffScope,
  ExportDestination,
  ExportPreflight,
  ExportResponse,
  GitState,
  OpenProjectResponse,
  PolicyDescription,
  PresetRecord,
  ProjectRecord,
  ScanProgress,
  ScanResponse,
  SelectionSpec,
  Settings,
  SourceOnDemandResponse,
  TriState,
  ModelRecord,
  ProviderConfig,
  SidecarStatus,
  PriceCatalog,
  TaskClass,
  RoutingDecision,
  TokenCountResult,
  ProviderStatusResponse,
  TaskRunResponse,
  StartTaskRequest,
  ResolveApprovalRequest,
  ResolveApprovalResponse,
  RunRecord,
  TaskDetailResponse,
  RetrievalResult,
  TesterArtifact,
  RunTesterRequest,
} from "./types";
import { SCAN_PROGRESS_EVENT } from "./types";

/** Every command the backend exposes. Kept in sync by `contract.test.ts`. */
export const COMMANDS = [
  "open_project",
  "close_project",
  "list_projects",
  "scan_project",
  "cancel_scan",
  "git_status",
  "changed_files",
  "preview_ai_ignore",
  "read_ai_ignore",
  "write_ai_ignore",
  "forget_project",
  "resolve_selection",
  "directory_states",
  "build_bundle",
  "export_preflight",
  "export_bundle",
  "save_preset",
  "list_presets",
  "rename_preset",
  "delete_preset",
  "bundle_history",
  "clear_bundle_history",
  "audit_log",
  "generate_context",
  "load_context",
  "context_change_impact",
  "fetch_source",
  "save_context_document",
  "get_settings",
  "update_settings",
  "describe_policy",
  "reset_settings",
  "diagnostics",
  "list_models",
  "register_local_model",
  "unregister_model",
  "start_local_model",
  "stop_local_model",
  "local_model_status",
  "list_providers",
  "configure_provider_credential",
  "disconnect_provider",
  "check_provider_status",
  "get_model_catalog",
  "route_task",
  "estimate_provider_tokens",
  "start_task_run",
  "resolve_approval",
  "cancel_task_run",
  "list_task_runs",
  "get_task_run",
  "query_task_context",
  "get_command_allowlist_command",
  "update_command_allowlist_command",
  "run_tester_step",
] as const;

export type CommandName = (typeof COMMANDS)[number];

/** True when a rejected promise carries the backend's structured error. */
export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    typeof (value as AppError).message === "string"
  );
}

/** Normalises anything thrown by `invoke` into an `AppError`. */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  return {
    code: "unexpected",
    message: error instanceof Error ? error.message : String(error),
    recovery: "Try again, or restart LeanAI if it keeps happening.",
    retryable: true,
  };
}

async function call<T>(command: CommandName, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw toAppError(error);
  }
}

export const api = {
  openProject: (path: string) => call<OpenProjectResponse>("open_project", { request: { path } }),
  closeProject: () => call<void>("close_project"),
  listProjects: () => call<ProjectRecord[]>("list_projects"),
  scanProject: () => call<ScanResponse>("scan_project"),
  cancelScan: () => call<boolean>("cancel_scan"),
  gitStatus: () => call<GitState>("git_status"),
  changedFiles: (scopes: DiffScope[], baseRef: string | null) =>
    call<ChangedFile[]>("changed_files", { request: { scopes, baseRef } }),
  previewAiIgnore: (contents: string) =>
    call<AiIgnorePreview>("preview_ai_ignore", { request: { contents } }),
  readAiIgnore: () => call<AiIgnoreFile>("read_ai_ignore"),
  writeAiIgnore: (contents: string) =>
    call<AiIgnoreFile>("write_ai_ignore", { request: { contents } }),
  forgetProject: (projectId: string) =>
    call<Record<string, unknown>>("forget_project", { request: { projectId } }),

  resolveSelection: (selection: SelectionSpec) =>
    call<ResolvedSelectionResponse>("resolve_selection", { request: { selection } }),
  directoryStates: (directories: string[], selected: string[]) =>
    call<Record<string, TriState>>("directory_states", { request: { directories, selected } }),
  buildBundle: (selection: SelectionSpec, options: BundleOptions, previewLimit?: number) =>
    call<BuildBundleResponse>("build_bundle", {
      request: { selection, options, previewLimit: previewLimit ?? null },
    }),
  exportPreflight: (
    selection: SelectionSpec,
    options: BundleOptions,
    destination: ExportDestination,
    targetPath: string | null,
  ) =>
    call<ExportPreflight>("export_preflight", {
      request: { selection, options, destination, targetPath, acknowledgedWarnings: false },
    }),
  exportBundle: (
    selection: SelectionSpec,
    options: BundleOptions,
    destination: ExportDestination,
    targetPath: string | null,
  ) =>
    call<ExportResponse>("export_bundle", {
      request: { selection, options, destination, targetPath, acknowledgedWarnings: true },
    }),

  savePreset: (name: string, selection: SelectionSpec, options: BundleOptions) =>
    call<PresetRecord>("save_preset", { request: { name, selection, options } }),
  listPresets: () =>
    call<{ presets: PresetRecord[] }>("list_presets").then((response) => response.presets),
  renamePreset: (presetId: string, name: string) =>
    call<void>("rename_preset", { request: { presetId, name } }),
  deletePreset: (presetId: string) =>
    call<void>("delete_preset", { request: { presetId, name: null } }),
  bundleHistory: () => call<BundleRecord[]>("bundle_history"),
  clearBundleHistory: () => call<number>("clear_bundle_history"),
  auditLog: () => call<AuditEntry[]>("audit_log"),

  generateContext: () => call<ContextResponse>("generate_context"),
  loadContext: () => call<ContextResponse | null>("load_context"),
  contextChangeImpact: () =>
    call<{ impact: ChangeImpact; freshness: string } | null>("context_change_impact"),
  fetchSource: (path: string, fromLine?: number, toLine?: number) =>
    call<SourceOnDemandResponse>("fetch_source", {
      request: { path, fromLine: fromLine ?? null, toLine: toLine ?? null },
    }),
  saveContextDocument: (targetPath: string) =>
    call<string>("save_context_document", { request: { targetPath } }),

  getSettings: () => call<Settings>("get_settings"),
  updateSettings: (settings: Settings) => call<Settings>("update_settings", { settings }),
  describePolicy: () => call<PolicyDescription>("describe_policy"),
  resetSettings: () => call<Settings>("reset_settings"),
  diagnostics: () => call<Diagnostics>("diagnostics"),

  listModels: () => call<ModelRecord[]>("list_models"),
  registerLocalModel: (displayName: string, filePath: string, contextCap?: number) =>
    call<ModelRecord>("register_local_model", {
      request: { displayName, filePath, contextCap: contextCap ?? null },
    }),
  unregisterModel: (id: string) => call<boolean>("unregister_model", { request: { id } }),
  startLocalModel: (id: string, contextSize?: number) =>
    call<SidecarStatus>("start_local_model", {
      request: { id, contextSize: contextSize ?? null },
    }),
  stopLocalModel: () => call<SidecarStatus>("stop_local_model"),
  localModelStatus: () => call<SidecarStatus>("local_model_status"),
  listProviders: () => call<ProviderConfig[]>("list_providers"),
  configureProviderCredential: (providerId: string, accountLabel: string, secret: string) =>
    call<ProviderConfig>("configure_provider_credential", {
      request: { providerId, accountLabel, secret },
    }),
  disconnectProvider: (providerId: string) =>
    call<ProviderConfig>("disconnect_provider", { request: { providerId } }),
  checkProviderStatus: (providerId: string) =>
    call<ProviderStatusResponse>("check_provider_status", { request: { providerId } }),
  getModelCatalog: () => call<PriceCatalog>("get_model_catalog"),
  routeTask: (
    taskClass: TaskClass,
    estimatedTokens: number,
    budgetUsd?: number,
    requireLocalOnly?: boolean,
  ) =>
    call<RoutingDecision>("route_task", {
      request: {
        taskClass,
        estimatedTokens,
        budgetUsd: budgetUsd ?? null,
        requireLocalOnly: requireLocalOnly ?? null,
      },
    }),
  estimateProviderTokens: (
    text: string,
    providerId: string,
    modelName: string,
    exactCountOptIn: boolean,
  ) =>
    call<TokenCountResult>("estimate_provider_tokens", {
      request: { text, providerId, modelName, exactCountOptIn },
    }),
  startTaskRun: (request: StartTaskRequest) => call<TaskRunResponse>("start_task_run", { request }),
  resolveApproval: (request: ResolveApprovalRequest) =>
    call<ResolveApprovalResponse>("resolve_approval", { request }),
  cancelTaskRun: (runId: string) => call<boolean>("cancel_task_run", { request: { runId } }),
  listTaskRuns: (limit?: number) =>
    call<RunRecord[]>("list_task_runs", { request: { limit: limit ?? null } }),
  getTaskRun: (runId: string) =>
    call<TaskDetailResponse | null>("get_task_run", { request: { runId } }),
  queryTaskContext: (query: string, pinnedPaths?: string[], enabled?: boolean) =>
    call<RetrievalResult>("query_task_context", {
      request: { query, pinnedPaths: pinnedPaths ?? null, enabled: enabled ?? null },
    }),
  getCommandAllowlist: () => call<string[]>("get_command_allowlist_command", { request: {} }),
  updateCommandAllowlist: (commands: string[]) =>
    call<void>("update_command_allowlist_command", { request: { commands } }),
  runTesterStep: (request: RunTesterRequest) =>
    call<TesterArtifact>("run_tester_step", { request }),
};

type ResolvedSelectionResponse = import("./types").ResolvedSelection;

/** Subscribes to scan progress. Returns an unsubscribe function. */
export function onScanProgress(handler: (progress: ScanProgress) => void): Promise<UnlistenFn> {
  return listen<ScanProgress>(SCAN_PROGRESS_EVENT, (event) => handler(event.payload));
}
