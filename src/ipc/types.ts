/**
 * TypeScript mirror of the Rust IPC contract.
 *
 * These types are hand-maintained against `crates/leanai-core` and
 * `src-tauri/src/commands`. `src/ipc/contract.test.ts` asserts that every
 * command named here exists in the Rust handler list, so a rename on either
 * side fails the test suite rather than the app at runtime.
 */

export type FileClass =
  | "source_text"
  | "binary"
  | "generated"
  | "lockfile"
  | "credential_sensitive"
  | "hidden_metadata"
  | "too_large"
  | "symlink"
  | "unsupported_encoding"
  | "unreadable";

export type IgnoreSource =
  "LeanAiPolicy" | "GitGlobal" | "GitInfoExclude" | "GitIgnore" | "AiIgnore" | "UserOverride";

export interface Exclusion {
  source: IgnoreSource;
  reason: string;
  rule: string | null;
}

export interface FileEntry {
  path: string;
  sizeBytes: number;
  class: FileClass;
  selectable: boolean;
  exclusion: Exclusion | null;
  contentHash: string | null;
  modifiedMs: number | null;
}

export interface ScanIssue {
  path: string;
  message: string;
}

export interface ScanStats {
  filesSeen: number;
  directoriesSeen: number;
  bytesSeen: number;
  elapsedMs: number;
  truncated: boolean;
}

export interface Inventory {
  root: string;
  projectFingerprint: string;
  sourceRevision: string;
  policyVersion: number;
  scannedAtMs: number;
  files: FileEntry[];
  issues: ScanIssue[];
  stats: ScanStats;
}

export interface Limits {
  maxFileBytes: number;
  maxFilesScanned: number;
  maxSelectedFiles: number;
  maxBundleBytes: number;
  binaryProbeBytes: number;
  maxDepth: number;
}

export interface Policy {
  version: number;
  limits: Limits;
  respectGitIgnore: boolean;
  respectAiIgnore: boolean;
  includeHidden: boolean;
  followSymlinks: boolean;
  excludeLockfiles: boolean;
  excludeGenerated: boolean;
}

export interface BundleOptions {
  headers: boolean;
  lineNumbers: boolean;
  codeFences: boolean;
  fileSizeAnnotations: boolean;
  includeTree: boolean;
  includeFrontMatter: boolean;
  normalizeLineEndings: boolean;
  maxFileBytes: number | null;
}

export interface SelectionSpec {
  files: string[];
  directories: string[];
  excluded: string[];
  overrides: string[];
}

export interface RejectedPath {
  path: string;
  reason: string;
  overridable: boolean;
}

export interface ResolvedSelection {
  files: string[];
  rejected: RejectedPath[];
  missing: string[];
  totalBytes: number;
}

export type TriState = "unchecked" | "partial" | "checked";

export type EstimateKind =
  | { kind: "openai_family_estimate"; tokenizer: string }
  | { kind: "provider_exact"; provider: string; model: string }
  | { kind: "unavailable"; reason: string };

export type TokenEstimate = { value: number } & EstimateKind;

export interface FileContribution {
  path: string;
  bytes: number;
  tokens: number;
  share: number;
}

export interface TruncationWarning {
  path: string;
  originalBytes: number;
  includedBytes: number;
}

export interface BundleManifest {
  format: string;
  projectFingerprint: string;
  sourceRevision: string;
  policyVersion: number;
  createdAtMs: number;
  selection: {
    includedFiles: string[];
    excludedFiles: string[];
    exclusionReasons: Record<string, string>;
  };
  options: BundleOptions;
  tokenEstimate: { value: number; kind: string; tokenizerOrProvider: string };
  warnings: string[];
}

export interface BuildBundleResponse {
  resolved: ResolvedSelection;
  preview: string;
  previewTruncated: boolean;
  outputHash: string;
  estimate: TokenEstimate;
  estimateLabel: string;
  contributions: FileContribution[];
  truncations: TruncationWarning[];
  skipped: string[];
  byteLen: number;
  fileCount: number;
  manifest: BundleManifest;
}

export type Confidence = "high" | "medium" | "low";

export interface SecretFinding {
  path: string;
  line: number;
  rule: string;
  confidence: Confidence;
  redactedExcerpt: string;
  dismissed: boolean;
}

export interface SecretReport {
  findings: SecretFinding[];
  high: number;
  medium: number;
  low: number;
  skipped: string[];
}

export type ExportDestination = "clipboard" | "file";

export interface ExportPreflight {
  fileCount: number;
  byteLen: number;
  estimate: TokenEstimate;
  estimateLabel: string;
  includedFiles: string[];
  secretReport: SecretReport;
  requiresConfirmation: boolean;
  disclaimer: string;
  destinationNote: string;
}

export interface ExportResponse {
  text: string | null;
  writtenPath: string | null;
  outputHash: string;
  bundleId: string | null;
  manifestPath: string | null;
}

export interface ProjectRecord {
  id: string;
  fingerprint: string;
  canonicalPath: string;
  displayName: string;
  lastScanRevision: string | null;
  lastOpenedAtMs: number | null;
  policyVersion: number;
}

export interface GitState {
  isRepository: boolean;
  headRef: string | null;
  headCommit: string | null;
  isDirty: boolean;
}

export type DiffScope = "staged" | "unstaged" | "untracked" | "against_ref";

export interface ChangedFile {
  path: string;
  status: string;
  scope: DiffScope;
}

export interface OpenProjectResponse {
  project: ProjectRecord;
  git: GitState;
  hasAiIgnore: boolean;
}

export interface ScanResponse {
  inventory: Inventory;
  classCounts: Record<string, number>;
  selectableBytes: number;
}

export interface AiIgnorePreview {
  newlyExcluded: string[];
  unmatchedRules: string[];
  invalidRules: string[];
  selectableBefore: number;
  selectableAfter: number;
}

export interface AiIgnoreFile {
  exists: boolean;
  contents: string;
  template: string;
}

export interface PresetRecord {
  id: string;
  projectId: string;
  name: string;
  selection: SelectionSpec;
  options: BundleOptions;
  updatedAtMs: number;
  validation: ResolvedSelection | null;
}

export interface BundleRecord {
  id: string;
  projectId: string;
  sourceRevision: string;
  outputHash: string;
  estimateValue: number;
  estimateKind: string;
  fileCount: number;
  byteLen: number;
  hasText: boolean;
  createdAtMs: number;
}

export type Freshness = "fresh" | "stale" | "unknown";

export interface SourceRef {
  path: string;
  contentHash: string | null;
  lines: [number, number] | null;
}

export type Generator =
  | { generator: "deterministic" }
  | { generator: "model"; provider: string; model: string; promptVersion: string };

export interface ContextSection {
  key: string;
  title: string;
  body: string;
  sourceRefs: SourceRef[];
  freshness: Freshness;
  generator: Generator;
  limitations: string[];
  generatedRevision: string;
  generatedAtMs: number;
}

export interface ContextDocument {
  schemaVersion: number;
  projectFingerprint: string;
  sourceRevision: string;
  generatedAtMs: number;
  contentHash: string;
  sections: ContextSection[];
}

export interface ContextResponse {
  document: ContextDocument;
  markdown: string;
  freshness: Freshness;
  staleSectionKeys: string[];
}

export interface ChangeImpact {
  changedFiles: string[];
  deletedFiles: string[];
  addedFiles: string[];
  staleSections: string[];
  unverifiableSections: string[];
}

export interface SourceOnDemandResponse {
  path: string;
  content: string;
  contentHash: string;
  changedSinceScan: boolean;
  fromLine: number;
  toLine: number;
  totalLines: number;
}

export type BundleRetention = "metadata_only" | "full_text" | "none";

export interface Settings {
  schema: number;
  policy: Policy;
  defaultBundleOptions: BundleOptions;
  bundleRetention: BundleRetention;
  maxHistoryEntries: number;
  telemetryOptIn: boolean;
  requireExportConfirmation: boolean;
}

export interface PolicyDescription {
  policy_version: number;
  limits: Limits;
  limit_reasons: { key: string; reason: string }[];
  ignore_precedence: { source: IgnoreSource; label: string; rank: number }[];
  secret_scan_disclaimer: string;
  always_skipped_directories: string[];
}

export interface Diagnostics {
  appVersion: string;
  schemaVersion: number;
  latestSchemaVersion: number;
  policyVersion: number;
  platform: string;
  arch: string;
  projectOpen: boolean;
  telemetryOptIn: boolean;
  capabilities: string[];
  notice: string;
}

export interface AuditEntry {
  id: string;
  task: string;
  mode: string;
  manifest: unknown;
  status: string;
  startedAtMs: number;
}

/** The structured error every command returns on failure. */
export interface AppError {
  code: string;
  message: string;
  recovery: string | null;
  retryable: boolean;
}

export interface ScanProgress {
  phase: string;
  filesSeen: number;
  directoriesSeen: number;
  bytesSeen: number;
}

export const SCAN_PROGRESS_EVENT = "leanai://scan-progress";

export type CachedTokenPolicy = "none" | "prompt_prefix" | "automatic";

export interface CapabilityProfile {
  contextCap: number;
  streaming: boolean;
  toolCalling: boolean;
  structuredOutput: boolean;
  vision: boolean;
  exactTokenCounting: boolean;
  cachedTokenPolicy: CachedTokenPolicy;
}

export interface ModelRecord {
  id: string;
  kind: string;
  displayName: string;
  source: string;
  version: string;
  filePath: string | null;
  capabilityProfile: CapabilityProfile;
  checksum: string | null;
  status: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface ProviderConfig {
  providerId: string;
  displayName: string;
  accountLabel: string;
  isConfigured: boolean;
  priceCatalogVer: string;
  enabled: boolean;
  updatedAtMs: number;
}

export type SidecarStatus =
  | { state: "stopped" }
  | { state: "starting"; port: number; modelId: string }
  | { state: "ready"; port: number; pid: number; modelId: string; displayName: string }
  | { state: "stopping" }
  | { state: "error"; message: string };

export interface ModelPrice {
  inputUsdPer1M: number;
  outputUsdPer1M: number;
  cachedInputUsdPer1M?: number;
}

export interface CatalogEntry {
  modelId: string;
  displayName: string;
  provider: string;
  contextCap: number;
  pricing: ModelPrice;
  capabilities: CapabilityProfile;
}

export interface PriceCatalog {
  version: string;
  updatedAtMs: number;
  updateSource: string;
  entries: CatalogEntry[];
}

export type TaskClass =
  | "file_inventory"
  | "context_documentation"
  | "multi_file_planning"
  | "code_change_proposal"
  | "mechanical_validation";

export type RoutingReason =
  | "task_default_low_cost"
  | "task_requires_strong_reasoning"
  | "escalated_context_exceeded_low_cost_cap"
  | "local_only_enforced";

export interface RoutingDecision {
  taskClass: TaskClass;
  selectedModelId: string;
  selectedProvider: string;
  reason: RoutingReason;
  explanation: string;
  estimatedCostUsd: number | null;
}

export interface TokenCountResult {
  count: number;
  estimateKind: { [key: string]: unknown } | string;
}

export interface ProviderStatusResponse {
  providerId: string;
  isConfigured: boolean;
  isStaleCatalog: boolean;
}
