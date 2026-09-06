use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use leanai_core::concat::BundleOptions;
use leanai_core::context::ContextDocument;
use leanai_core::project::now_ms;
use leanai_core::selection::SelectionSpec;

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRecord {
    pub id: String,
    pub fingerprint: String,
    pub canonical_path: String,
    pub display_name: String,
    pub last_scan_revision: Option<String>,
    pub last_opened_at_ms: Option<i64>,
    pub policy_version: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetRecord {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub selection: SelectionSpec,
    pub options: BundleOptions,
    pub updated_at_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleRecord {
    pub id: String,
    pub project_id: String,
    pub source_revision: String,
    pub output_hash: String,
    pub estimate_value: i64,
    pub estimate_kind: String,
    pub file_count: i64,
    pub byte_len: i64,
    /// Present only when the retention setting allows storing bundle text.
    pub has_text: bool,
    pub created_at_ms: i64,
}

/// Retention choices. The default keeps metadata but not bundle text, so
/// history stays useful without accumulating copies of the user's source.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BundleRetention {
    /// Store the manifest and hash only.
    #[default]
    MetadataOnly,
    /// Also store the bundle text, so it can be re-copied later.
    FullText,
    /// Store nothing.
    None,
}

pub fn upsert_project(
    connection: &Connection,
    fingerprint: &str,
    canonical_path: &str,
    display_name: &str,
    policy_version: u32,
) -> AppResult<ProjectRecord> {
    let now = now_ms() as i64;
    let existing: Option<String> = connection
        .query_row(
            "SELECT id FROM projects WHERE fingerprint = ?1",
            params![fingerprint],
            |row| row.get(0),
        )
        .optional()?;

    let id = match existing {
        Some(id) => {
            connection.execute(
                "UPDATE projects SET canonical_path = ?2, display_name = ?3, last_opened_at_ms = ?4, policy_version = ?5, updated_at_ms = ?4 WHERE id = ?1",
                params![id, canonical_path, display_name, now, policy_version],
            )?;
            id
        }
        None => {
            let id = uuid::Uuid::new_v4().to_string();
            connection.execute(
                "INSERT INTO projects (id, fingerprint, canonical_path, display_name, last_opened_at_ms, policy_version, created_at_ms, updated_at_ms)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?5, ?5)",
                params![id, fingerprint, canonical_path, display_name, now, policy_version],
            )?;
            id
        }
    };
    get_project(connection, &id)?.ok_or_else(|| AppError::internal("project vanished after upsert"))
}

pub fn get_project(connection: &Connection, id: &str) -> AppResult<Option<ProjectRecord>> {
    Ok(connection
        .query_row(
            "SELECT id, fingerprint, canonical_path, display_name, last_scan_revision, last_opened_at_ms, policy_version
             FROM projects WHERE id = ?1",
            params![id],
            map_project,
        )
        .optional()?)
}

pub fn list_projects(connection: &Connection) -> AppResult<Vec<ProjectRecord>> {
    let mut statement = connection.prepare(
        "SELECT id, fingerprint, canonical_path, display_name, last_scan_revision, last_opened_at_ms, policy_version
         FROM projects ORDER BY last_opened_at_ms DESC NULLS LAST, display_name ASC",
    )?;
    let rows = statement.query_map([], map_project)?;
    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

fn map_project(row: &rusqlite::Row<'_>) -> rusqlite::Result<ProjectRecord> {
    Ok(ProjectRecord {
        id: row.get(0)?,
        fingerprint: row.get(1)?,
        canonical_path: row.get(2)?,
        display_name: row.get(3)?,
        last_scan_revision: row.get(4)?,
        last_opened_at_ms: row.get(5)?,
        policy_version: row.get(6)?,
    })
}

pub fn set_scan_revision(connection: &Connection, id: &str, revision: &str) -> AppResult<()> {
    connection.execute(
        "UPDATE projects SET last_scan_revision = ?2, updated_at_ms = ?3 WHERE id = ?1",
        params![id, revision, now_ms() as i64],
    )?;
    Ok(())
}

/// Removes a project and everything derived from it. Returns what was deleted
/// so the UI can say exactly what happened (backlog 4.7).
pub fn delete_project(connection: &Connection, id: &str) -> AppResult<serde_json::Value> {
    let presets: i64 = connection.query_row(
        "SELECT COUNT(*) FROM presets WHERE project_id = ?1",
        params![id],
        |row| row.get(0),
    )?;
    let bundles: i64 = connection.query_row(
        "SELECT COUNT(*) FROM bundles WHERE project_id = ?1",
        params![id],
        |row| row.get(0),
    )?;
    let contexts: i64 = connection.query_row(
        "SELECT COUNT(*) FROM context_documents WHERE project_id = ?1",
        params![id],
        |row| row.get(0),
    )?;
    connection.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
    Ok(serde_json::json!({
        "presetsDeleted": presets,
        "bundlesDeleted": bundles,
        "contextDocumentsDeleted": contexts,
        "filesOnDiskDeleted": 0,
        "note": "LeanAI removed its own records only. No file in your project was touched."
    }))
}

pub fn save_preset(
    connection: &Connection,
    project_id: &str,
    name: &str,
    selection: &SelectionSpec,
    options: &BundleOptions,
) -> AppResult<PresetRecord> {
    let now = now_ms() as i64;
    let selection_json =
        serde_json::to_string(selection).map_err(|e| AppError::internal(e.to_string()))?;
    let options_json =
        serde_json::to_string(options).map_err(|e| AppError::internal(e.to_string()))?;
    let id = uuid::Uuid::new_v4().to_string();
    connection.execute(
        "INSERT INTO presets (id, project_id, name, selection_spec, bundle_options, created_at_ms, updated_at_ms)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
         ON CONFLICT(project_id, name) DO UPDATE SET
            selection_spec = excluded.selection_spec,
            bundle_options = excluded.bundle_options,
            updated_at_ms  = excluded.updated_at_ms",
        params![id, project_id, name, selection_json, options_json, now],
    )?;
    list_presets(connection, project_id)?
        .into_iter()
        .find(|preset| preset.name == name)
        .ok_or_else(|| AppError::internal("preset vanished after save"))
}

pub fn list_presets(connection: &Connection, project_id: &str) -> AppResult<Vec<PresetRecord>> {
    let mut statement = connection.prepare(
        "SELECT id, project_id, name, selection_spec, bundle_options, updated_at_ms
         FROM presets WHERE project_id = ?1 ORDER BY name ASC",
    )?;
    let rows = statement.query_map(params![project_id], |row| {
        let selection: String = row.get(3)?;
        let options: String = row.get(4)?;
        Ok(PresetRecord {
            id: row.get(0)?,
            project_id: row.get(1)?,
            name: row.get(2)?,
            selection: serde_json::from_str(&selection).unwrap_or_default(),
            options: serde_json::from_str(&options).unwrap_or_default(),
            updated_at_ms: row.get(5)?,
        })
    })?;
    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

pub fn rename_preset(connection: &Connection, id: &str, name: &str) -> AppResult<()> {
    connection.execute(
        "UPDATE presets SET name = ?2, updated_at_ms = ?3 WHERE id = ?1",
        params![id, name, now_ms() as i64],
    )?;
    Ok(())
}

pub fn delete_preset(connection: &Connection, id: &str) -> AppResult<()> {
    connection.execute("DELETE FROM presets WHERE id = ?1", params![id])?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub fn record_bundle(
    connection: &Connection,
    project_id: &str,
    source_revision: &str,
    manifest: &leanai_core::manifest::BundleManifest,
    output_hash: &str,
    estimate_value: usize,
    estimate_kind: &str,
    file_count: usize,
    byte_len: u64,
    text: Option<&str>,
    retention: BundleRetention,
) -> AppResult<Option<String>> {
    if retention == BundleRetention::None {
        return Ok(None);
    }
    let id = uuid::Uuid::new_v4().to_string();
    let manifest_json =
        serde_json::to_string(manifest).map_err(|e| AppError::internal(e.to_string()))?;
    let stored_text = match retention {
        BundleRetention::FullText => text,
        _ => None,
    };
    connection.execute(
        "INSERT INTO bundles (id, project_id, source_revision, selection_manifest, output_hash, estimate_value, estimate_kind, file_count, byte_len, output_text, created_at_ms)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id,
            project_id,
            source_revision,
            manifest_json,
            output_hash,
            estimate_value as i64,
            estimate_kind,
            file_count as i64,
            byte_len as i64,
            stored_text,
            now_ms() as i64
        ],
    )?;
    Ok(Some(id))
}

pub fn list_bundles(
    connection: &Connection,
    project_id: &str,
    limit: u32,
) -> AppResult<Vec<BundleRecord>> {
    let mut statement = connection.prepare(
        "SELECT id, project_id, source_revision, output_hash, estimate_value, estimate_kind, file_count, byte_len, output_text IS NOT NULL, created_at_ms
         FROM bundles WHERE project_id = ?1 ORDER BY created_at_ms DESC LIMIT ?2",
    )?;
    let rows = statement.query_map(params![project_id, limit], |row| {
        Ok(BundleRecord {
            id: row.get(0)?,
            project_id: row.get(1)?,
            source_revision: row.get(2)?,
            output_hash: row.get(3)?,
            estimate_value: row.get(4)?,
            estimate_kind: row.get(5)?,
            file_count: row.get(6)?,
            byte_len: row.get(7)?,
            has_text: row.get(8)?,
            created_at_ms: row.get(9)?,
        })
    })?;
    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

pub fn clear_history(connection: &Connection, project_id: &str) -> AppResult<usize> {
    Ok(connection.execute(
        "DELETE FROM bundles WHERE project_id = ?1",
        params![project_id],
    )?)
}

pub fn save_context(
    connection: &mut Connection,
    project_id: &str,
    document: &ContextDocument,
) -> AppResult<String> {
    let id = uuid::Uuid::new_v4().to_string();
    let document_json =
        serde_json::to_string(document).map_err(|e| AppError::internal(e.to_string()))?;
    let transaction = connection.transaction()?;
    transaction.execute(
        "INSERT INTO context_documents (id, project_id, source_revision, schema_version, content_hash, freshness_state, document, created_at_ms)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            project_id,
            document.source_revision,
            document.schema_version,
            document.content_hash,
            format!("{:?}", document.freshness()).to_lowercase(),
            document_json,
            now_ms() as i64
        ],
    )?;
    for section in &document.sections {
        transaction.execute(
            "INSERT INTO context_sections (id, context_document_id, section_key, source_refs, freshness_state, generator)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                uuid::Uuid::new_v4().to_string(),
                id,
                section.key,
                serde_json::to_string(&section.source_refs).unwrap_or_else(|_| "[]".into()),
                format!("{:?}", section.freshness).to_lowercase(),
                serde_json::to_string(&section.generator).unwrap_or_else(|_| "{}".into())
            ],
        )?;
    }
    transaction.commit()?;
    Ok(id)
}

pub fn latest_context(
    connection: &Connection,
    project_id: &str,
) -> AppResult<Option<ContextDocument>> {
    let json: Option<String> = connection
        .query_row(
            "SELECT document FROM context_documents WHERE project_id = ?1 ORDER BY created_at_ms DESC LIMIT 1",
            params![project_id],
            |row| row.get(0),
        )
        .optional()?;
    Ok(json.and_then(|json| serde_json::from_str(&json).ok()))
}

pub fn get_setting(connection: &Connection, key: &str) -> AppResult<Option<String>> {
    Ok(connection
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |row| row.get(0),
        )
        .optional()?)
}

pub fn set_setting(connection: &Connection, key: &str, value: &str) -> AppResult<()> {
    connection.execute(
        "INSERT INTO settings (key, value, updated_at_ms) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at_ms = excluded.updated_at_ms",
        params![key, value, now_ms() as i64],
    )?;
    Ok(())
}

/// Appends an audit entry. Used for exports today and for agent runs later.
pub fn record_audit(
    connection: &Connection,
    project_id: &str,
    task: &str,
    mode: &str,
    manifest: &serde_json::Value,
    status: &str,
) -> AppResult<String> {
    let id = uuid::Uuid::new_v4().to_string();
    connection.execute(
        "INSERT INTO runs (id, project_id, task, mode, context_manifest, policy, status, started_at_ms, ended_at_ms)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
        params![
            id,
            project_id,
            task,
            mode,
            manifest.to_string(),
            serde_json::json!({ "policyVersion": leanai_core::policy::POLICY_VERSION }).to_string(),
            status,
            now_ms() as i64
        ],
    )?;
    Ok(id)
}

pub fn list_audit(
    connection: &Connection,
    project_id: &str,
    limit: u32,
) -> AppResult<Vec<serde_json::Value>> {
    let mut statement = connection.prepare(
        "SELECT id, task, mode, context_manifest, status, started_at_ms
         FROM runs WHERE project_id = ?1 ORDER BY started_at_ms DESC LIMIT ?2",
    )?;
    let rows = statement.query_map(params![project_id, limit], |row| {
        let manifest: String = row.get(3)?;
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "task": row.get::<_, String>(1)?,
            "mode": row.get::<_, String>(2)?,
            "manifest": serde_json::from_str::<serde_json::Value>(&manifest).unwrap_or(serde_json::Value::Null),
            "status": row.get::<_, String>(4)?,
            "startedAtMs": row.get::<_, i64>(5)?,
        }))
    })?;
    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}
