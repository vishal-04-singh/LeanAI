use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::error::{CoreError, Result};
use crate::inventory::Inventory;
use crate::project;
use crate::selection::ResolvedSelection;
use crate::tokenizer::{self, FileContribution, TokenEstimate};

/// Every knob that changes bundle bytes. Two bundles with the same project
/// revision, selection and options are byte-identical (FR-09).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleOptions {
    /// Emit a `--- path/to/file.rs ---` style header before each file.
    pub headers: bool,
    /// Prefix each line with its 1-based line number.
    pub line_numbers: bool,
    /// Wrap each file in a fenced code block with a language hint.
    pub code_fences: bool,
    /// Annotate each header with the file's size and token estimate.
    pub file_size_annotations: bool,
    /// Emit a directory tree of the selected files before the file contents.
    pub include_tree: bool,
    /// Emit the YAML manifest as front matter at the top of the bundle.
    pub include_front_matter: bool,
    /// Normalise CRLF and lone CR to LF so Windows and macOS agree.
    pub normalize_line_endings: bool,
    /// Truncate any single file to this many bytes. `None` means no truncation.
    pub max_file_bytes: Option<u64>,
}

impl Default for BundleOptions {
    fn default() -> Self {
        Self {
            headers: true,
            line_numbers: false,
            code_fences: false,
            file_size_annotations: false,
            include_tree: true,
            include_front_matter: false,
            normalize_line_endings: true,
            max_file_bytes: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TruncationWarning {
    pub path: String,
    pub original_bytes: u64,
    pub included_bytes: u64,
}

/// The built bundle plus everything needed to explain it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bundle {
    pub text: String,
    /// SHA-256 of `text`. Determinism tests and history compare this.
    pub output_hash: String,
    pub estimate: TokenEstimate,
    pub contributions: Vec<FileContribution>,
    pub truncations: Vec<TruncationWarning>,
    /// Files that vanished or became unreadable between scan and build.
    pub skipped: Vec<String>,
    pub byte_len: u64,
    pub file_count: usize,
}

/// Builds the bundle text from a resolved selection.
///
/// Reads files at build time rather than trusting scan-time content, and
/// re-checks every path against the project root before opening it.
pub fn build(
    root: &Path,
    inventory: &Inventory,
    selection: &ResolvedSelection,
    options: &BundleOptions,
) -> Result<Bundle> {
    let root = project::canonical_root(root)?;
    let mut text = String::new();
    let mut parts: Vec<(String, u64, usize)> = Vec::new();
    let mut truncations = Vec::new();
    let mut skipped = Vec::new();

    if options.include_tree && !selection.files.is_empty() {
        text.push_str("# Project files\n\n```\n");
        text.push_str(&render_tree(&selection.files));
        text.push_str("```\n\n");
    }

    for path in &selection.files {
        let absolute = match project::resolve_within_root(&root, path) {
            Ok(absolute) => absolute,
            Err(_) => {
                skipped.push(path.clone());
                continue;
            }
        };
        let raw = match std::fs::read(&absolute) {
            Ok(raw) => raw,
            Err(_) => {
                skipped.push(path.clone());
                continue;
            }
        };
        let original_bytes = raw.len() as u64;
        let Ok(mut contents) = String::from_utf8(raw) else {
            skipped.push(path.clone());
            continue;
        };

        if options.normalize_line_endings {
            contents = normalize_newlines(&contents);
        }
        if let Some(limit) = options.max_file_bytes {
            if original_bytes > limit {
                contents = truncate_at_char_boundary(&contents, limit as usize);
                contents.push_str("\n… [truncated by LeanAI]\n");
                truncations.push(TruncationWarning {
                    path: path.clone(),
                    original_bytes,
                    included_bytes: contents.len() as u64,
                });
            }
        }
        if options.line_numbers {
            contents = with_line_numbers(&contents);
        }

        let section_start = text.len();
        if options.headers {
            text.push_str(&header(path, original_bytes, &contents, options));
        }
        if options.code_fences {
            text.push_str("```");
            text.push_str(language_hint(path));
            text.push('\n');
        }
        text.push_str(&contents);
        if !contents.ends_with('\n') {
            text.push('\n');
        }
        if options.code_fences {
            text.push_str("```\n");
        }
        text.push('\n');

        let section = &text[section_start..];
        parts.push((
            path.clone(),
            original_bytes,
            tokenizer::estimate(section).value,
        ));
    }

    if options.include_front_matter {
        // Front matter is prepended last so its hash covers the final body.
        let manifest = crate::manifest::BundleManifest::new(
            inventory,
            selection,
            options,
            &tokenizer::estimate(&text),
            &truncations,
            &skipped,
        );
        text = format!("{}\n{}", manifest.to_front_matter(), text);
    }

    let estimate = tokenizer::estimate(&text);
    let contributions = tokenizer::contributions(&parts, estimate.value);
    let byte_len = text.len() as u64;

    if byte_len > inventory_limit(inventory) {
        return Err(CoreError::LimitExceeded(format!(
            "bundle is {} bytes",
            byte_len
        )));
    }

    Ok(Bundle {
        output_hash: project::sha256_hex(text.as_bytes()),
        file_count: parts.len(),
        text,
        estimate,
        contributions,
        truncations,
        skipped,
        byte_len,
    })
}

fn inventory_limit(_inventory: &Inventory) -> u64 {
    crate::policy::Limits::default().max_bundle_bytes
}

fn header(path: &str, bytes: u64, contents: &str, options: &BundleOptions) -> String {
    if options.file_size_annotations {
        format!(
            "===== {} ({}, ~{} tokens) =====\n",
            path,
            crate::walker::human_bytes(bytes),
            tokenizer::estimate(contents).value
        )
    } else {
        format!("===== {} =====\n", path)
    }
}

fn normalize_newlines(text: &str) -> String {
    text.replace("\r\n", "\n").replace('\r', "\n")
}

fn with_line_numbers(text: &str) -> String {
    let total = text.lines().count();
    let width = total.to_string().len();
    let mut out = String::with_capacity(text.len() + total * (width + 2));
    for (index, line) in text.lines().enumerate() {
        out.push_str(&format!(
            "{:>width$} | {}\n",
            index + 1,
            line,
            width = width
        ));
    }
    out
}

fn truncate_at_char_boundary(text: &str, limit: usize) -> String {
    if text.len() <= limit {
        return text.to_string();
    }
    let mut end = limit;
    while end > 0 && !text.is_char_boundary(end) {
        end -= 1;
    }
    text[..end].to_string()
}

/// Renders an indented tree of the selected paths.
pub fn render_tree(paths: &[String]) -> String {
    let mut out = String::new();
    let mut previous: Vec<&str> = Vec::new();
    for path in paths {
        let segments: Vec<&str> = path.split('/').collect();
        let shared = segments
            .iter()
            .zip(previous.iter())
            .take_while(|(a, b)| a == b)
            .count()
            .min(segments.len().saturating_sub(1));
        for (depth, segment) in segments.iter().enumerate().skip(shared) {
            let is_file = depth == segments.len() - 1;
            out.push_str(&"  ".repeat(depth));
            out.push_str(segment);
            if !is_file {
                out.push('/');
            }
            out.push('\n');
        }
        previous = segments;
    }
    out
}

/// Fence language hint by extension. Unknown extensions get an empty hint
/// rather than a guess.
pub fn language_hint(path: &str) -> &'static str {
    let extension = path.rsplit_once('.').map(|(_, ext)| ext).unwrap_or("");
    match extension.to_ascii_lowercase().as_str() {
        "rs" => "rust",
        "ts" => "typescript",
        "tsx" => "tsx",
        "js" | "mjs" | "cjs" => "javascript",
        "jsx" => "jsx",
        "py" => "python",
        "go" => "go",
        "java" => "java",
        "kt" | "kts" => "kotlin",
        "swift" => "swift",
        "c" | "h" => "c",
        "cc" | "cpp" | "cxx" | "hpp" => "cpp",
        "cs" => "csharp",
        "rb" => "ruby",
        "php" => "php",
        "sh" | "bash" | "zsh" => "bash",
        "ps1" => "powershell",
        "sql" => "sql",
        "html" => "html",
        "css" => "css",
        "scss" => "scss",
        "json" => "json",
        "yaml" | "yml" => "yaml",
        "toml" => "toml",
        "xml" => "xml",
        "md" | "markdown" => "markdown",
        "dockerfile" => "dockerfile",
        _ => "",
    }
}
