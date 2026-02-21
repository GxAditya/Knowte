use crate::db::{queries::get_pipeline_stages, queries::PipelineStageRecord, AppDatabase};
use crate::pipeline::orchestrator::run_full_pipeline;
use tauri::{AppHandle, Manager};

/// Start the full processing pipeline for a lecture.
///
/// This command returns immediately — the pipeline runs in a background tokio task
/// and communicates progress via `pipeline-stage` Tauri events.
#[tauri::command]
pub async fn start_pipeline(app: AppHandle, lecture_id: String) -> Result<(), String> {
    // Verify the database is available before spawning
    let _db = app
        .try_state::<AppDatabase>()
        .ok_or_else(|| "Database not initialised".to_string())?;

    let app_clone = app.clone();
    let lecture_id_clone = lecture_id.clone();

    // Spawn as a detached background task so the command returns immediately
    tokio::spawn(async move {
        run_full_pipeline(lecture_id_clone, app_clone).await;
    });

    Ok(())
}

/// Return the current pipeline stage statuses for a lecture.
///
/// Useful for restoring the UI state if the user navigates away and returns.
#[tauri::command]
pub async fn get_pipeline_status(
    app: AppHandle,
    lecture_id: String,
) -> Result<Vec<PipelineStageRecord>, String> {
    let db = app
        .try_state::<AppDatabase>()
        .ok_or_else(|| "Database not initialised".to_string())?;

    let connection = db.connect().map_err(|e| e.to_string())?;
    get_pipeline_stages(&connection, &lecture_id).map_err(|e| e.to_string())
}

/// Retrieve structured notes JSON for a lecture.
#[tauri::command]
pub async fn get_notes(app: AppHandle, lecture_id: String) -> Result<Option<String>, String> {
    let db = app
        .try_state::<AppDatabase>()
        .ok_or_else(|| "Database not initialised".to_string())?;
    let conn = db.connect().map_err(|e| e.to_string())?;
    crate::db::queries::get_notes(&conn, &lecture_id).map_err(|e| e.to_string())
}

/// Retrieve quiz JSON for a lecture.
#[tauri::command]
pub async fn get_quiz(app: AppHandle, lecture_id: String) -> Result<Option<String>, String> {
    let db = app
        .try_state::<AppDatabase>()
        .ok_or_else(|| "Database not initialised".to_string())?;
    let conn = db.connect().map_err(|e| e.to_string())?;
    crate::db::queries::get_quiz(&conn, &lecture_id).map_err(|e| e.to_string())
}

/// Retrieve flashcards JSON for a lecture.
#[tauri::command]
pub async fn get_flashcards(app: AppHandle, lecture_id: String) -> Result<Option<String>, String> {
    let db = app
        .try_state::<AppDatabase>()
        .ok_or_else(|| "Database not initialised".to_string())?;
    let conn = db.connect().map_err(|e| e.to_string())?;
    crate::db::queries::get_flashcards(&conn, &lecture_id).map_err(|e| e.to_string())
}

/// Retrieve mind-map JSON for a lecture.
#[tauri::command]
pub async fn get_mindmap(app: AppHandle, lecture_id: String) -> Result<Option<String>, String> {
    let db = app
        .try_state::<AppDatabase>()
        .ok_or_else(|| "Database not initialised".to_string())?;
    let conn = db.connect().map_err(|e| e.to_string())?;
    crate::db::queries::get_mindmap(&conn, &lecture_id).map_err(|e| e.to_string())
}
