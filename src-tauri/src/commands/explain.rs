use crate::commands::settings::get_settings;
use crate::db::{queries, AppDatabase};
use crate::models::{Flashcard, FlashcardsOutput};
use crate::utils::prompt_templates;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use thiserror::Error;

const MIN_TIMEOUT_SECS: u64 = 30;
const MAX_TIMEOUT_SECS: u64 = 1_800;
const DEFAULT_TIMEOUT_SECS: u64 = 300;

#[derive(Debug, Error)]
enum ExplainError {
    #[error("Please select some text first.")]
    EmptySelection,
    #[error("Unable to read settings: {0}")]
    SettingsReadFailed(String),
    #[error("Ollama is not running at {0}. Please start Ollama and try again.")]
    OllamaNotRunning(String),
    #[error("Model '{0}' is not downloaded. Run `ollama pull {0}` to download it.")]
    ModelNotFound(String),
    #[error("Explanation request timed out after {0} seconds.")]
    Timeout(u64),
    #[error("Unable to generate explanation: {0}")]
    RequestFailed(String),
    #[error("Database not initialised.")]
    DatabaseNotInitialised,
    #[error("Unable to access lecture storage.")]
    DatabaseUnavailable,
    #[error("Lecture not found.")]
    LectureNotFound,
    #[error("Flashcard front and back cannot be empty.")]
    InvalidFlashcard,
    #[error("Unable to parse stored flashcards.")]
    FlashcardsParseFailed,
    #[error("Unable to save flashcard.")]
    FlashcardsSaveFailed,
}

impl From<ExplainError> for String {
    fn from(value: ExplainError) -> Self {
        value.to_string()
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ExplainStreamEvent {
    pub token: String,
    pub done: bool,
}

#[derive(Debug, Deserialize)]
struct OllamaStreamChunk {
    response: Option<String>,
    done: Option<bool>,
    error: Option<String>,
}

fn clamp_timeout_secs(raw_timeout: u64) -> u64 {
    if raw_timeout == 0 {
        return DEFAULT_TIMEOUT_SECS;
    }
    raw_timeout.clamp(MIN_TIMEOUT_SECS, MAX_TIMEOUT_SECS)
}

async fn ensure_ollama_available(
    client: &reqwest::Client,
    base_url: &str,
) -> Result<(), ExplainError> {
    let url = format!("{}/api/tags", base_url.trim_end_matches('/'));
    let reachable = client
        .get(url)
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
        .map(|response| response.status().is_success())
        .unwrap_or(false);

    if reachable {
        Ok(())
    } else {
        Err(ExplainError::OllamaNotRunning(base_url.to_string()))
    }
}

fn process_stream_line(
    app: &AppHandle,
    line: &str,
    model: &str,
    accumulated: &mut String,
    emitted_done: &mut bool,
) -> Result<(), ExplainError> {
    let chunk = match serde_json::from_str::<OllamaStreamChunk>(line) {
        Ok(value) => value,
        Err(_) => return Ok(()),
    };

    if let Some(error) = chunk.error {
        if error.to_lowercase().contains("model") && error.to_lowercase().contains("not found") {
            return Err(ExplainError::ModelNotFound(model.to_string()));
        }
        return Err(ExplainError::RequestFailed(error));
    }

    let token = chunk.response.unwrap_or_default();
    if !token.is_empty() {
        accumulated.push_str(&token);
    }

    let done = chunk.done.unwrap_or(false);
    let _ = app.emit("explain-stream", ExplainStreamEvent { token, done });
    if done {
        *emitted_done = true;
    }

    Ok(())
}

#[tauri::command]
pub async fn explain_text(
    app: AppHandle,
    text: String,
    context: String,
    level: String,
) -> Result<String, String> {
    let selected_text = text.trim();
    if selected_text.is_empty() {
        return Err(ExplainError::EmptySelection.into());
    }

    let settings = get_settings(app.clone()).map_err(ExplainError::SettingsReadFailed)?;
    let effective_level = if level.trim().is_empty() {
        settings.personalization_level.clone()
    } else {
        level.trim().to_string()
    };
    let prompt =
        prompt_templates::explain_text_prompt(selected_text, context.trim(), &effective_level);
    let timeout_secs = clamp_timeout_secs(settings.llm_timeout_seconds);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(timeout_secs))
        .build()
        .map_err(|error| ExplainError::RequestFailed(error.to_string()))?;

    ensure_ollama_available(&client, &settings.ollama_url).await?;

    let url = format!("{}/api/generate", settings.ollama_url.trim_end_matches('/'));
    let body = serde_json::json!({
        "model": settings.llm_model,
        "prompt": prompt,
        "stream": true,
    });

    let response = client.post(url).json(&body).send().await.map_err(|error| {
        if error.is_timeout() {
            ExplainError::Timeout(timeout_secs)
        } else {
            ExplainError::RequestFailed(error.to_string())
        }
    })?;

    let status = response.status();
    if status == reqwest::StatusCode::NOT_FOUND {
        return Err(ExplainError::ModelNotFound(settings.llm_model).into());
    }

    if !status.is_success() {
        let body_text = response.text().await.unwrap_or_default();
        if body_text.to_lowercase().contains("model")
            && body_text.to_lowercase().contains("not found")
        {
            return Err(ExplainError::ModelNotFound(settings.llm_model).into());
        }
        return Err(ExplainError::RequestFailed(format!("HTTP {}: {}", status, body_text)).into());
    }

    let mut byte_stream = response.bytes_stream();
    let mut accumulated = String::new();
    let mut buffered_line = String::new();
    let mut emitted_done = false;

    while let Some(chunk_result) = byte_stream.next().await {
        let bytes = chunk_result.map_err(|error| {
            if error.is_timeout() {
                ExplainError::Timeout(timeout_secs)
            } else {
                ExplainError::RequestFailed(error.to_string())
            }
        })?;

        buffered_line.push_str(&String::from_utf8_lossy(&bytes));

        while let Some(newline_index) = buffered_line.find('\n') {
            let line = buffered_line[..newline_index].trim().to_string();
            buffered_line = buffered_line[(newline_index + 1)..].to_string();
            if line.is_empty() {
                continue;
            }

            process_stream_line(
                &app,
                &line,
                &settings.llm_model,
                &mut accumulated,
                &mut emitted_done,
            )?;
        }
    }

    let trailing = buffered_line.trim();
    if !trailing.is_empty() {
        process_stream_line(
            &app,
            trailing,
            &settings.llm_model,
            &mut accumulated,
            &mut emitted_done,
        )?;
    }

    if !emitted_done {
        let _ = app.emit(
            "explain-stream",
            ExplainStreamEvent {
                token: String::new(),
                done: true,
            },
        );
    }

    let explanation = accumulated.trim().to_string();
    if explanation.is_empty() {
        return Err(ExplainError::RequestFailed("No explanation was returned.".to_string()).into());
    }

    Ok(explanation)
}

#[tauri::command]
pub fn add_custom_flashcard(
    app: AppHandle,
    lecture_id: String,
    front: String,
    back: String,
) -> Result<(), String> {
    let lecture_id = lecture_id.trim();
    let front = front.trim();
    let back = back.trim();

    if lecture_id.is_empty() {
        return Err(ExplainError::LectureNotFound.into());
    }
    if front.is_empty() || back.is_empty() {
        return Err(ExplainError::InvalidFlashcard.into());
    }

    let database = app
        .try_state::<AppDatabase>()
        .ok_or(ExplainError::DatabaseNotInitialised)?;
    let connection = database
        .connect()
        .map_err(|_| ExplainError::DatabaseUnavailable)?;

    let lecture_exists = queries::get_lecture_by_id(&connection, lecture_id)
        .map_err(|_| ExplainError::DatabaseUnavailable)?
        .is_some();
    if !lecture_exists {
        return Err(ExplainError::LectureNotFound.into());
    }

    let mut flashcards = match queries::get_flashcards(&connection, lecture_id)
        .map_err(|_| ExplainError::DatabaseUnavailable)?
    {
        Some(raw) => serde_json::from_str::<FlashcardsOutput>(&raw)
            .map_err(|_| ExplainError::FlashcardsParseFailed)?,
        None => FlashcardsOutput { cards: Vec::new() },
    };

    flashcards.cards.push(Flashcard {
        front: front.to_string(),
        back: back.to_string(),
        tags: vec!["custom".to_string()],
    });

    let cards_json =
        serde_json::to_string(&flashcards).map_err(|_| ExplainError::FlashcardsSaveFailed)?;
    queries::upsert_flashcards(&connection, lecture_id, &cards_json)
        .map_err(|_| ExplainError::FlashcardsSaveFailed)?;

    Ok(())
}
