use crate::commands::llm::OllamaClient;
use crate::commands::settings::get_settings;
use crate::db::{queries, AppDatabase};
use crate::models::{Flashcard, FlashcardsOutput};
use std::collections::BTreeSet;
use std::path::Path;
use tauri::{AppHandle, Manager};
use thiserror::Error;

#[derive(Debug, Error)]
enum CompareError {
    #[error("Please select 2 or 3 lectures to compare.")]
    InvalidLectureCount,
    #[error("Database not initialised.")]
    DatabaseNotInitialised,
    #[error("Unable to access lecture data.")]
    DatabaseUnavailable,
    #[error("Lecture not found: {0}")]
    LectureNotFound(String),
    #[error("No summary found for lecture '{0}'. Process the lecture first.")]
    SummaryMissing(String),
    #[error("No flashcards found for lecture '{0}'. Generate flashcards first.")]
    FlashcardsMissing(String),
    #[error("Failed to parse flashcards for lecture '{0}'.")]
    FlashcardsParseFailed(String),
    #[error("Comparison failed: {0}")]
    ComparisonFailed(String),
}

impl From<CompareError> for String {
    fn from(value: CompareError) -> Self {
        value.to_string()
    }
}

#[derive(Debug, Clone)]
struct LectureSummaryInput {
    id: String,
    title: String,
    summary: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MergeFlashcardsResult {
    pub cards: Vec<Flashcard>,
    pub source_count: usize,
    pub duplicate_count: usize,
}

#[tauri::command]
pub async fn compare_lectures(app: AppHandle, lecture_ids: Vec<String>) -> Result<String, String> {
    compare_lectures_impl(&app, lecture_ids)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub fn merge_flashcards(
    app: AppHandle,
    lecture_ids: Vec<String>,
) -> Result<MergeFlashcardsResult, String> {
    merge_flashcards_impl(&app, lecture_ids).map_err(Into::into)
}

async fn compare_lectures_impl(
    app: &AppHandle,
    lecture_ids: Vec<String>,
) -> Result<String, CompareError> {
    let lecture_ids = dedupe_ids(lecture_ids);
    if !(2..=3).contains(&lecture_ids.len()) {
        return Err(CompareError::InvalidLectureCount);
    }

    let db = app
        .try_state::<AppDatabase>()
        .ok_or(CompareError::DatabaseNotInitialised)?;
    let connection = db
        .connect()
        .map_err(|_| CompareError::DatabaseUnavailable)?;

    let mut selected = Vec::with_capacity(lecture_ids.len());
    for lecture_id in &lecture_ids {
        let lecture = queries::get_lecture_by_id(&connection, lecture_id)
            .map_err(|_| CompareError::DatabaseUnavailable)?
            .ok_or_else(|| CompareError::LectureNotFound(lecture_id.clone()))?;

        let summary = queries::get_lecture_summary(&connection, lecture_id)
            .map_err(|_| CompareError::DatabaseUnavailable)?
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .ok_or_else(|| CompareError::SummaryMissing(lecture.filename.clone()))?;

        selected.push(LectureSummaryInput {
            id: lecture.id,
            title: lecture_title_from_filename(&lecture.filename),
            summary,
        });
    }

    let settings = get_settings(app.clone()).map_err(|error| {
        CompareError::ComparisonFailed(format!("Unable to load settings: {error}"))
    })?;

    let prompt = build_compare_prompt(&selected);
    let client = OllamaClient::new(settings.ollama_url.clone(), settings.llm_timeout_seconds);
    let stream_lecture_id = selected
        .first()
        .map(|item| item.id.clone())
        .unwrap_or_else(|| "compare".to_string());

    let response = client
        .generate(
            app,
            &settings.llm_model,
            &prompt,
            &stream_lecture_id,
            "comparison",
        )
        .await
        .map_err(|error| CompareError::ComparisonFailed(error.to_string()))?;

    let trimmed = response.trim().to_string();
    if trimmed.is_empty() {
        return Err(CompareError::ComparisonFailed(
            "LLM returned an empty comparison.".to_string(),
        ));
    }

    Ok(trimmed)
}

fn merge_flashcards_impl(
    app: &AppHandle,
    lecture_ids: Vec<String>,
) -> Result<MergeFlashcardsResult, CompareError> {
    let lecture_ids = dedupe_ids(lecture_ids);
    if !(2..=3).contains(&lecture_ids.len()) {
        return Err(CompareError::InvalidLectureCount);
    }

    let db = app
        .try_state::<AppDatabase>()
        .ok_or(CompareError::DatabaseNotInitialised)?;
    let connection = db
        .connect()
        .map_err(|_| CompareError::DatabaseUnavailable)?;

    let mut merged_cards: Vec<Flashcard> = Vec::new();
    let mut duplicate_count = 0_usize;

    for lecture_id in &lecture_ids {
        let lecture = queries::get_lecture_by_id(&connection, lecture_id)
            .map_err(|_| CompareError::DatabaseUnavailable)?
            .ok_or_else(|| CompareError::LectureNotFound(lecture_id.clone()))?;

        let raw_cards = queries::get_flashcards(&connection, lecture_id)
            .map_err(|_| CompareError::DatabaseUnavailable)?
            .ok_or_else(|| CompareError::FlashcardsMissing(lecture.filename.clone()))?;

        let parsed: FlashcardsOutput = serde_json::from_str(&raw_cards)
            .map_err(|_| CompareError::FlashcardsParseFailed(lecture.filename.clone()))?;

        for card in parsed.cards {
            let front = card.front.trim().to_string();
            let back = card.back.trim().to_string();
            if front.is_empty() || back.is_empty() {
                continue;
            }

            let candidate = Flashcard {
                front,
                back,
                tags: card.tags,
            };

            if let Some(existing) = merged_cards
                .iter_mut()
                .find(|existing| are_near_duplicates(existing, &candidate))
            {
                duplicate_count += 1;
                merge_flashcard(existing, &candidate);
            } else {
                merged_cards.push(candidate);
            }
        }
    }

    Ok(MergeFlashcardsResult {
        cards: merged_cards,
        source_count: lecture_ids.len(),
        duplicate_count,
    })
}

fn dedupe_ids(ids: Vec<String>) -> Vec<String> {
    let mut seen = BTreeSet::new();
    let mut output = Vec::new();
    for id in ids {
        let trimmed = id.trim();
        if trimmed.is_empty() {
            continue;
        }
        if seen.insert(trimmed.to_string()) {
            output.push(trimmed.to_string());
        }
    }
    output
}

fn lecture_title_from_filename(filename: &str) -> String {
    Path::new(filename)
        .file_stem()
        .and_then(|value| value.to_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(filename)
        .to_string()
}

fn build_compare_prompt(lectures: &[LectureSummaryInput]) -> String {
    let mut blocks = Vec::with_capacity(lectures.len());
    for (index, lecture) in lectures.iter().enumerate() {
        blocks.push(format!(
            "Lecture {} ({})\nSummary:\n{}",
            index + 1,
            lecture.title,
            lecture.summary
        ));
    }

    format!(
        "Compare these lecture summaries. Identify:\n\
1. Common themes\n\
2. Unique topics in each lecture\n\
3. Contradictions or different perspectives\n\
4. Suggested study order\n\n\
Output format:\n\
- Start with a short overall comparison paragraph.\n\
- Then provide four markdown sections with clear bullet points.\n\
- Keep the output concise and practical for study planning.\n\n\
{}\n",
        blocks.join("\n\n")
    )
}

fn normalize_text(value: &str) -> String {
    let mut text = String::with_capacity(value.len());
    for character in value.chars() {
        if character.is_alphanumeric() || character.is_whitespace() {
            text.push(character.to_ascii_lowercase());
        } else {
            text.push(' ');
        }
    }
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn jaccard_similarity(left: &str, right: &str) -> f64 {
    let left_tokens: BTreeSet<&str> = left.split_whitespace().collect();
    let right_tokens: BTreeSet<&str> = right.split_whitespace().collect();

    if left_tokens.is_empty() && right_tokens.is_empty() {
        return 1.0;
    }
    if left_tokens.is_empty() || right_tokens.is_empty() {
        return 0.0;
    }

    let intersection = left_tokens.intersection(&right_tokens).count() as f64;
    let union = left_tokens.union(&right_tokens).count() as f64;
    intersection / union
}

fn token_overlap_ratio(left: &str, right: &str) -> f64 {
    let left_tokens: BTreeSet<&str> = left.split_whitespace().collect();
    let right_tokens: BTreeSet<&str> = right.split_whitespace().collect();

    if left_tokens.is_empty() && right_tokens.is_empty() {
        return 1.0;
    }
    if left_tokens.is_empty() || right_tokens.is_empty() {
        return 0.0;
    }

    let intersection = left_tokens.intersection(&right_tokens).count() as f64;
    let min_size = left_tokens.len().min(right_tokens.len()) as f64;
    intersection / min_size
}

fn are_near_duplicates(existing: &Flashcard, candidate: &Flashcard) -> bool {
    let front_existing = normalize_text(&existing.front);
    let front_candidate = normalize_text(&candidate.front);
    if front_existing == front_candidate {
        return true;
    }

    let front_similarity = jaccard_similarity(&front_existing, &front_candidate);
    let front_overlap = token_overlap_ratio(&front_existing, &front_candidate);
    if front_similarity >= 0.82 {
        return true;
    }
    if front_overlap >= 0.9 {
        return true;
    }

    if front_similarity < 0.6 && front_overlap < 0.75 {
        return false;
    }

    let back_existing = normalize_text(&existing.back);
    let back_candidate = normalize_text(&candidate.back);
    let back_similarity = jaccard_similarity(&back_existing, &back_candidate);
    back_similarity >= 0.5
}

fn merge_flashcard(existing: &mut Flashcard, candidate: &Flashcard) {
    if candidate.back.len() > existing.back.len() {
        existing.back = candidate.back.clone();
    }

    let mut tag_set: BTreeSet<String> = existing
        .tags
        .iter()
        .map(|tag| tag.trim().to_ascii_lowercase())
        .filter(|tag| !tag.is_empty())
        .collect();
    for tag in &candidate.tags {
        let normalized = tag.trim().to_ascii_lowercase();
        if !normalized.is_empty() {
            tag_set.insert(normalized);
        }
    }
    existing.tags = tag_set.into_iter().collect();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dedupe_ids_trims_and_removes_duplicates() {
        let output = dedupe_ids(vec![
            " lecture-a ".to_string(),
            "lecture-a".to_string(),
            "lecture-b".to_string(),
            "".to_string(),
        ]);

        assert_eq!(output, vec!["lecture-a", "lecture-b"]);
    }

    #[test]
    fn near_duplicates_detects_highly_similar_fronts() {
        let left = Flashcard {
            front: "What is gradient descent".to_string(),
            back: "An optimization method.".to_string(),
            tags: vec![],
        };
        let right = Flashcard {
            front: "What is the gradient descent algorithm?".to_string(),
            back: "Optimization algorithm for minimizing loss.".to_string(),
            tags: vec![],
        };

        assert!(are_near_duplicates(&left, &right));
    }
}
