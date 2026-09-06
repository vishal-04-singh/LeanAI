# Requirements traceability matrix

Backlog item 0.3. Every in-scope requirement from `Instructions.md` maps to the
code that implements it and the test that proves it. `Deferred` rows name the
phase that owns them and the ADR that fixes the design in advance.

Test ids are `file::test_name`. Run everything with `npm run check:all`.

## Functional requirements

| ID | Requirement | Implementation | Evidence |
| --- | --- | --- | --- |
| FR-01 | Choose a project directory, grant only that scope | `project::canonical_root`, `commands/projects.rs::open_project`, `capabilities/default.json` | `scan.rs::path_resolution_rejects_traversal`, ADR 0002 |
| FR-02 | Deterministic walk respecting git ignore rules | `walker::scan` (`ignore` crate, `git_ignore`/`git_global`/`git_exclude`) | `scan.rs::scan_is_deterministic_and_ordered`, `scan.rs::nested_gitignore_rules_and_negations_are_respected` |
| FR-03 | `.aiignore` only with defined precedence and explanation | `aiignore`, `policy::IgnoreSource`, Settings → Ignore precedence | `safety.rs::aiignore_is_applied_by_the_scanner`, `safety.rs::aiignore_cannot_reexpose_a_blocked_path`, ADR 0003 |
| FR-04 | Unsafe/unhelpful files visibly excluded or warned | `classify`, `walker::classify_entry` | `scan.rs::binary_detection_uses_extension_and_content_probe`, `scan.rs::unsafe_and_unhelpful_files_are_classified_with_reasons`, `scan.rs::credential_paths_are_excluded_but_examples_are_not` |
| FR-05 | Inventory keeps path, size, class, hash, exclusion reason | `inventory::FileEntry` | `scan.rs::inventory_records_hash_and_freshness_metadata` |
| FR-06 | Cancellable scan, per-path errors, responsive UI | `walker::CancelToken`, `ScanIssue`, progress events, `spawn_blocking` in `scan_project` | `scan.rs::cancellation_returns_an_error_not_partial_data`, `scan.rs::scan_emits_progress`, `scan.rs::scan_handles_permission_restricted_directories_and_files`, `scan.rs::scan_large_tree_repository_performance` |
| FR-07 | Search, select/unselect, inspect ordered selection | `FileTree.tsx`, `SelectPage.tsx`, `selection::resolve` | `FileTree.test.tsx` (13 tests incl. 10k+ virtualisation) |
| FR-08 | Folder selection never re-enables blocked files | `selection::resolve` (directory pass ignores non-selectable), `FileClass::requires_explicit_override`, `OverrideDialog` | `bundle.rs::folder_selection_never_includes_blocked_files`, `bundle.rs::blocked_files_require_an_explicit_per_file_override`, `FileTree.test.tsx::routes a blocked file through the override flow` |
| FR-09 | Deterministic bundles for same revision/options/selection | `concat::build`, sorted selection, line-ending normalisation | `bundle.rs::bundles_are_byte_identical_across_runs`, `bundle.rs::selection_order_does_not_change_the_bundle`, `bundle.rs::line_endings_are_normalized` |
| FR-10 | Path headers; reversible fences/line numbers/annotations | `concat::BundleOptions` | `bundle.rs::output_modes_are_reversible_and_snapshot_stable`, `bundle.rs::tree_preamble_lists_the_selection` |
| FR-11 | Copy/save show destination policy, return success or error | `export_preflight`, `export_bundle`, `PreviewPage` preflight dialog | `bundle.rs::manifest_records_provenance_and_warnings`; manual: `docs/manual-test-plan.md` MT-01..18 macOS recorded run |
| FR-12 | Bundle records identity, revision, selection, options, estimate kind | `manifest::BundleManifest`, `bundles` table | `bundle.rs::manifest_records_provenance_and_warnings`, `persistence.rs::retention_controls_whether_bundle_text_is_stored` |
| FR-13 | Debounced local estimate discloses tokenizer scope | `tokenizer::EstimateKind::label`, `PreviewPage` 200 ms debounce | `bundle.rs::token_estimates_disclose_their_scope`, `bundle.rs::per_file_contributions_are_reported`, ADR 0004 |
| FR-14 | Exact counts only with consent and provider support | `EstimateKind::ProviderExact` in the contract; no network capability exists | ADR 0004, ADR 0008. **Deferred to Phase 7** |
| FR-15 | Cloud run accounting | `runs`/`run_events` schema (v2) exists and is used for exports today | `persistence.rs::exports_are_recorded_in_the_audit_log`. **Deferred to Phase 7** |
| FR-16 | Never present estimated cost or savings as a guarantee | `benchmark::NOT_MEASURED`, preview caption, manifest warning | `bundle.rs::manifest_records_provenance_and_warnings`; `docs/benchmark-methodology.md` |
| FR-17 | Markdown context index with section-to-source provenance | `context::generate`, `context::render` | `context.rs::document_contains_every_required_section_in_order`, `context.rs::sections_record_provenance_and_generator` |
| FR-18 | Summaries link to source and disclose uncertainty | `ContextSection::limitations`, `SourceRef`, `ContextPage` | `context.rs::sections_disclose_their_limitations` |
| FR-19 | Changed file marks dependent sections stale | `context::apply_change_impact` | `context.rs::changed_files_invalidate_dependent_sections`, `context.rs::added_files_conservatively_invalidate_structural_sections`, `context.rs::deleted_files_are_reported` |
| FR-20 | Context loading under budget, source-on-demand | `commands/context.rs::fetch_source`, `benchmark::Strategy::Hybrid` composition order | `context.rs::generation_is_deterministic`; harness output in `docs/benchmark-methodology.md` |
| FR-21 | Local model lifecycle without shell access | — | ADR 0009. **Deferred to Phase 6** |
| FR-22 | Verified model downloads with provenance | — | ADR 0009. **Deferred to Phase 6** |
| FR-23 | Provider capability profiles, no assumed parity | — | ADR 0008. **Deferred to Phase 7** |
| FR-24 | Credentials in OS secure storage, never in plaintext history | Schema has no credential column | `persistence.rs::no_table_stores_credentials`, ADR 0007 |
| FR-25 | Visible routing policy, fallback, budget, audit trail | `runs` ledger exists | ADR 0008. **Deferred to Phase 7** |
| FR-26 | Task objective, manifest, tools, budget, cancellation | `runs` schema (v2) | ADR 0010. **Deferred to Phase 8** |
| FR-27 | Agent runs read-only unless a capability is approved | `approvals` schema; no shell/network capability is granted at all | ADR 0002, ADR 0010. **Deferred to Phase 8** |
| FR-28 | Write-enabled runs produce a reviewable, validated diff | — | ADR 0010. **Deferred to Phase 9** |
| FR-29 | Structured, cited handoffs between roles | `context::validate_model_section` is the same pattern applied to context | `context.rs::model_sections_are_rejected_without_valid_citations`. **Deferred to Phase 8** |
| FR-30 | History keeps findings, not full transcripts | `run_events.redacted_payload`, retention default | ADR 0006. **Deferred to Phase 8** |

## Non-functional requirements

| Area | Requirement | Implementation | Evidence |
| --- | --- | --- | --- |
| 7.1 | Repository content is untrusted data | No shell/network capability; context body is rendered as text, never executed | ADR 0002, ADR 0010 |
| 7.1 | Default-deny export; review before anything leaves | `export_preflight` runs for clipboard *and* file | `PreviewPage` preflight dialog; `bundle.rs` manifest warnings |
| 7.1 | Secret paths excluded by default; override is high friction | `SENSITIVE_PATH_PATTERNS`, `OverrideDialog` typed phrase | `scan.rs::credential_paths_are_excluded_but_examples_are_not`, `bundle.rs::blocked_files_require_an_explicit_per_file_override` |
| 7.1 | Secret scanning is a warning, not a boundary | `SecretReport::DISCLAIMER` shown in every preflight | `safety.rs::secret_findings_are_graded_and_redacted` |
| 7.1 | Root boundary checks; symlinks not followed | `project::resolve_within_root`, `Policy::follow_symlinks = false` | `scan.rs::symlinks_never_escape_the_project_root` |
| 7.1 | Audit record for every consequential decision | `record_audit` on export and `.aiignore` write | `persistence.rs::exports_are_recorded_in_the_audit_log` |
| 7.2 | No partial data loss on cancellation | Cancellation returns `Cancelled` and discards the partial walk | `scan.rs::cancellation_returns_an_error_not_partial_data` |
| 7.2 | Versioned, transactional migrations | `db::migrations` (one transaction per migration) | `persistence.rs::migrations_apply_and_are_idempotent`, `persistence.rs::a_newer_database_is_refused_with_a_clear_message` |
| 7.3 | Keyboard navigable tree and dialogs | `FileTree` roving focus, arrow/space/enter/home/end | `FileTree.test.tsx::is keyboard navigable and toggles with the space key` |
| 7.3 | Screen-reader labels; colour never alone | ARIA tree with level/setsize, labelled checkboxes, text in every `Chip` | `FileTree.test.tsx::blocks a credential-sensitive file and explains why`, `::announces each row's depth` |
| 7.3 | Clear empty/loading/error/denied states | `EmptyState`, `ErrorBoundary`, `AppError.recovery` | `App.tsx`, `error.rs` |
| 7.4 | UI stays responsive on large repositories | Tree virtualisation; scan and build on `spawn_blocking` with progress events | `FileTree.tsx` windowing (`FileTree.test.tsx` 10k+ virtualisation); `scan.rs::scan_emits_progress`, `scan.rs::scan_large_tree_repository_performance`; `docs/performance-matrix.md` |
| 7.4 | Every limit has a visible reason and an override | `policy::LIMIT_REASONS` rendered in Settings | `bundle.rs::selection_limits_are_enforced` |
| 12.2 | Benchmarks report quality caveats, not token counts alone | `benchmark::NOT_MEASURED` in every report | `docs/benchmark-methodology.md`, `docs/performance-matrix.md` |
