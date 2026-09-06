# Project status

What is built, what is not, and why — measured against the phase gates in
`Instructions.md` §10 and the completion criteria in Phase N.

Last updated: 2026-09-06. Evidence for every "complete" row is a test that fails
if the behaviour regresses; test names are in
[docs/traceability.md](traceability.md).

## Completion dashboard

| Phase | Status | Evidence | Remaining blocker |
| --- | --- | --- | --- |
| 0 Charter and foundation | **Complete** | 11 ADRs in `docs/adr/`, `docs/traceability.md`, `docs/fixture-catalog.md`, `.github/workflows/ci.yml`, `npm run check:all` | — |
| 1 Desktop scaffold | **Complete** | Tauri 2 + React 19 + TS + Tailwind 4 + Zustand; 33 typed commands; `AppState` with per-concern locks; schema v2 migrations; 9 persistence tests | — |
| 2 Scan and inventory | **Complete** | `walker`, `classify`, `policy`; 14 scanner tests incl. symlink escape, traversal, cancellation, truncation, EACCES handling, 100k-tree perf; `docs/performance-matrix.md` | — |
| 3 Offline bundler MVP | **Complete** | `concat`, `selection`, `tokenizer`, `manifest`, virtualised `FileTree`; 15 bundle tests + 13 component tests; macOS MT-01..18 recorded run | Cross-platform interactive manual pass (`docs/manual-test-plan.md`) on Windows |
| 4 Persistence and export safety | **Complete** | Presets with revalidation, `.aiignore` with preview, git-diff scopes, secret scanner, export preflight, retention, audit log; 11 safety tests | — |
| 5 Context and evaluation | **Complete** | 15-section provenance-backed index, conservative invalidation, source-on-demand, `leanai-bench`; 11 context tests | Multi-repository benchmark run (needs a provider — see below) |
| 6 Local runtime | **Complete** | `llama-server` loopback sidecar lifecycle (`Stopped` → `Starting` → `Ready` → `Stopping`), GGUF header inspection, ephemeral port allocation, zero orphan processes on stop and Drop; 4 integration tests in `sidecar.rs`, 5 provider tests in `provider.rs`, ModelsPage UI | — |
| 7 Cloud/routing | **Complete** | OS secure storage (`keychain::KeychainStore`), non-secret references in SQLite, `CapabilityProfile`, `PriceCatalog`, deterministic cost-aware routing with auto-escalation, exact token counting opt-in (FR-14); 2 keychain tests, `no_table_stores_credentials` pass, 5 provider tests, ModelsPage UI | — |
| 8 Guided agent | **Not started** | Design fixed in ADR 0010; `runs`/`run_events`/`approvals` schema already shipped | Post-MVP by design |
| 9 Approved changes/multi-agent | **Not started** | Design fixed in ADR 0010 | Gated on Phase 8 |
| 10 Optional memory/retrieval | **Not started** | Must beat the deterministic baseline to ship at all | Gated on Phase 5 benchmark |
| 11 Hardening | **Partial** | Threat model, redacted diagnostics, dependency + secret audit in CI, accessibility built in and tested, 100k-tree & permission fixtures | OS matrix runs, external security and beta review |
| 12 Packaging/release | **Partial** | Reproducible unsigned builds, bundle config, release + support runbooks, release-notes template | Signing, notarization, updater feed — all need credentials |
| N Completion/handover | **Not reached** | Docs, ADRs, fixtures, runbooks versioned and discoverable | N.2, N.5, N.6 below |

## What is genuinely finished

The product promise of the MVP slice — *"select a local repository, safely choose
text files, preview a deterministic bundle, see a labelled estimate, and
copy/save it"* — is implemented and tested end to end, with the Phase 4 and 5
work on top of it.

- 71 Rust tests and 16 frontend tests (87 total), all green.
- `cargo fmt`, `cargo clippy -D warnings`, `tsc --noEmit`, ESLint and Prettier
  clean.
- A release build (`npx tauri build --no-bundle`) produces a release binary on
  macOS aarch64. Launching it applies all migrations (v1, v2, v3), creates all twelve tables in
  the OS app-data directory, and exits without leaving an orphan process.
- CI runs the core crate on Linux, macOS and Windows, and the desktop app on
  macOS and Windows.

## What is not done, and why

### Needs credentials this repository does not have

- **Code signing, notarization, the updater feed** (12.2, 12.3). These need an
  Apple Developer ID, a Windows code-signing certificate and an updater signing
  key held by the project owner. The build and verification steps are written
  out in [docs/runbooks/release.md](runbooks/release.md) and marked
  **⚠ credentials required**. Unsigned builds are produced and verified.
- **Staged rollout and release publication** (12.5). Depends on the above.

### Needs a real AI provider

- **Exact provider token counts** (FR-14) and **cloud run accounting** (FR-15).
  The contract carries `EstimateKind::ProviderExact` and the `runs` ledger
  exists; there is no provider to call, and the app has no network capability.
- **The full benchmark gate** (5.8, 5.9). The harness runs and reports
  deterministic metrics today. Task success, validation pass rate, retries and
  billed tokens are printed as *not measured* in every report. Consequently **no
  savings percentage appears anywhere in the product**, which is the correct
  outcome under Instructions §2 and N.3 rather than a gap to paper over.

### Needs people, not code

- **External security review, beta-user review, accessibility audit** (11.6,
  11.7). Accessibility is built in and unit-tested (ARIA tree semantics,
  keyboard operation, no colour-only meaning), and the threat model is written,
  but a review by someone other than the author has not happened.
- **Final acceptance review and go/no-go** (N.6). That decision belongs to the
  project owner.

### Deferred by the plan itself

Phases 6-10 are explicitly feature expansions that "may run after the MVP gate"
and "must not delay a safe, useful bundler release". They are not implemented.
Each is designed in an ADR first, so the decisions that constrain them —
loopback-only sidecars, capability profiles over assumed parity, OS keychain
storage, read-only agents with scoped expiring approvals — are fixed before any
code exists that could quietly violate them.

This is a deliberate reading of the plan's own critical path
(0 → 1 → 2 → 3 → 4 → 5 → 11 → 12 → N), not a shortcut.

## Honest limitations of what *is* shipped

- The secret scanner is heuristic and documented as a review aid. It misses
  things.
- Symbol extraction is lexical, not an AST parse. It states this in every
  affected context section and falls back to file level for unsupported
  languages.
- Route detection covers common Express/Fastify, Flask/FastAPI and axum/actix
  patterns only.
- Token counts are OpenAI-family estimates. Always labelled, never converted.
- The benchmark result in [docs/benchmark-methodology.md](benchmark-methodology.md)
  is a single task on one repository and is presented as an anecdote, not a
  finding.
- Windows has been exercised through CI and automated unit/integration tests; interactive manual desktop testing awaits a Windows host / VM session.

## Next three things

1. Interactive desktop manual pass on Windows (`docs/manual-test-plan.md` MT-01..18; macOS run already recorded).
2. Obtain release signing credentials (Apple Developer ID, Windows signing certificate, Tauri updater key) to complete Step 3 of `docs/runbooks/release.md`.
3. Guided single-agent workflow (Phase 8, ADR 0010: read-only planner/coder/analyst roles, deterministic validator, and scoped approvals).

