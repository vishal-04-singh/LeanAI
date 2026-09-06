use serde::{Deserialize, Serialize};

use crate::classify::FileClass;
use crate::error::{CoreError, Result};
use crate::inventory::Inventory;
use crate::policy::Policy;

/// A stored, replayable description of what the user chose.
///
/// Presets persist this rather than a resolved file list, so a preset stays
/// meaningful after files are added or removed — and every resolution is
/// re-checked against the current safety policy (backlog 4.1).
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectionSpec {
    /// Explicitly selected files, relative to the project root.
    pub files: Vec<String>,
    /// Selected directories. Expands to every selectable file beneath them.
    pub directories: Vec<String>,
    /// Files the user removed after a directory selection added them.
    pub excluded: Vec<String>,
    /// Per-file confirmations that unlock a class which is blocked by default
    /// (a `.env`, a binary). Never applied by directory selection (FR-08).
    pub overrides: Vec<String>,
}

impl SelectionSpec {
    pub fn from_files(files: impl IntoIterator<Item = impl Into<String>>) -> Self {
        Self {
            files: files.into_iter().map(Into::into).collect(),
            ..Default::default()
        }
    }

    pub fn is_empty(&self) -> bool {
        self.files.is_empty() && self.directories.is_empty()
    }
}

/// A path that was requested but not included, and why.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RejectedPath {
    pub path: String,
    pub reason: String,
    /// True when a per-file override would allow this file in.
    pub overridable: bool,
}

/// The resolved, ordered result of applying a `SelectionSpec` to an inventory.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedSelection {
    /// Included files in deterministic (lexicographic) order.
    pub files: Vec<String>,
    pub rejected: Vec<RejectedPath>,
    /// Paths in the spec that no longer exist in the project.
    pub missing: Vec<String>,
    pub total_bytes: u64,
}

impl ResolvedSelection {
    pub fn is_empty(&self) -> bool {
        self.files.is_empty()
    }
}

/// Resolves a selection against the current inventory.
///
/// This is the single gate between "what the user clicked" and "what leaves the
/// device". Directory selection can only add files that are selectable under
/// the active policy; unlocking anything else requires the path to appear in
/// `overrides`.
pub fn resolve(
    inventory: &Inventory,
    spec: &SelectionSpec,
    policy: &Policy,
) -> Result<ResolvedSelection> {
    let mut result = ResolvedSelection::default();
    let mut chosen: Vec<&str> = Vec::new();

    let excluded: std::collections::HashSet<&str> =
        spec.excluded.iter().map(String::as_str).collect();
    let overrides: std::collections::HashSet<&str> =
        spec.overrides.iter().map(String::as_str).collect();

    // Directory selection: only files that are selectable by default.
    for directory in &spec.directories {
        let prefix = normalize_dir(directory);
        let mut matched = false;
        for entry in &inventory.files {
            if !entry.path.starts_with(&prefix) {
                continue;
            }
            matched = true;
            if excluded.contains(entry.path.as_str()) {
                continue;
            }
            if entry.selectable {
                chosen.push(&entry.path);
            }
            // Files blocked by policy are silently left out of a folder
            // selection; they are already listed in the exclusions panel with
            // their reason, and surfacing every one here would bury the signal.
        }
        if !matched {
            result.missing.push(directory.clone());
        }
    }

    // Explicit file selection: may use an override.
    for path in &spec.files {
        if excluded.contains(path.as_str()) {
            continue;
        }
        let Some(entry) = inventory.get(path) else {
            result.missing.push(path.clone());
            continue;
        };
        if entry.selectable {
            chosen.push(&entry.path);
            continue;
        }
        let overridable = !matches!(
            entry.class,
            FileClass::Unreadable | FileClass::UnsupportedEncoding
        );
        if overrides.contains(path.as_str()) && overridable {
            chosen.push(&entry.path);
            continue;
        }
        result.rejected.push(RejectedPath {
            path: path.clone(),
            reason: entry
                .exclusion
                .as_ref()
                .map(|exclusion| exclusion.reason.clone())
                .unwrap_or_else(|| format!("Excluded: {}.", entry.class.label())),
            overridable,
        });
    }

    chosen.sort_unstable();
    chosen.dedup();

    if chosen.len() > policy.limits.max_selected_files {
        return Err(CoreError::LimitExceeded(format!(
            "{} files selected; the limit is {}. Narrow the selection or raise the limit in Settings.",
            chosen.len(),
            policy.limits.max_selected_files
        )));
    }

    result.total_bytes = chosen
        .iter()
        .filter_map(|path| inventory.get(path))
        .map(|entry| entry.size_bytes)
        .sum();

    if result.total_bytes > policy.limits.max_bundle_bytes {
        return Err(CoreError::LimitExceeded(format!(
            "Selection is {} which exceeds the {} bundle limit.",
            crate::walker::human_bytes(result.total_bytes),
            crate::walker::human_bytes(policy.limits.max_bundle_bytes)
        )));
    }

    result.files = chosen.into_iter().map(str::to_string).collect();
    result.missing.sort();
    result.missing.dedup();
    result.rejected.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(result)
}

/// Selection state of a directory node in the tree UI.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TriState {
    Unchecked,
    Partial,
    Checked,
}

/// Computes the tri-state for a directory given the selected set.
pub fn directory_state(
    inventory: &Inventory,
    directory: &str,
    selected: &std::collections::HashSet<String>,
) -> TriState {
    let prefix = normalize_dir(directory);
    let mut total = 0usize;
    let mut hits = 0usize;
    for entry in inventory.files.iter().filter(|entry| entry.selectable) {
        if !entry.path.starts_with(&prefix) {
            continue;
        }
        total += 1;
        if selected.contains(&entry.path) {
            hits += 1;
        }
    }
    match (total, hits) {
        (0, _) | (_, 0) => TriState::Unchecked,
        (total, hits) if total == hits => TriState::Checked,
        _ => TriState::Partial,
    }
}

fn normalize_dir(directory: &str) -> String {
    let trimmed = directory.trim_end_matches('/');
    if trimmed.is_empty() {
        String::new()
    } else {
        format!("{trimmed}/")
    }
}
