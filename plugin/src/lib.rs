//! Wasm entrypoints for the sequence alignment webapp.

mod aligners;
mod alignment;
mod matrices;
mod output;
mod scoring;

use wasm_bindgen::prelude::*;

use aligners::{GlobalAligner, LocalAligner};
use alignment::Aligner;
use matrices::matrix_data_by_name;
use output::result_to_json;
use scoring::ScoringConfig;

/// WASM entry point for sequence alignment (supports both global and local).
///
/// # Arguments
/// * `seq1` - First sequence
/// * `seq2` - Second sequence
/// * `matrix_name` - Optional name of built-in matrix (e.g., BLOSUM62, EDNAFULL, PAM250)
/// * `match_score` - Match score (used if matrix_name is NULL/None)
/// * `mismatch_score` - Mismatch score (used if matrix_name is NULL/None)
/// * `gap_open` - Gap opening penalty
/// * `gap_extend` - Gap extension penalty (must equal gap_open for now)
/// * `mode` - Alignment mode: "global" or "local"
///
/// # Returns
/// JSON string of AlignmentResult or an error string starting with "Error:".
#[wasm_bindgen]
#[allow(clippy::too_many_arguments)]
pub fn align_wasm(
    seq1: &str,
    seq2: &str,
    matrix_name: Option<String>,
    match_score: i32,
    mismatch_score: i32,
    gap_open: i32,
    gap_extend: i32,
    mode: &str,
) -> String {
    let scoring = if let Some(name) = matrix_name {
        if let Ok(bm) = name.parse() {
            ScoringConfig::with_matrix(bm, gap_open, gap_extend)
        } else {
            return format!("Error: Unknown matrix name '{}'", name);
        }
    } else {
        ScoringConfig::linear(match_score, mismatch_score, gap_open, gap_extend)
    };

    let result = if mode.eq_ignore_ascii_case("global") {
        let aligner = GlobalAligner::new(scoring);
        aligner.align(seq1.as_bytes(), seq2.as_bytes())
    } else if mode.eq_ignore_ascii_case("local") {
        let aligner = LocalAligner::new(scoring);
        aligner.align(seq1.as_bytes(), seq2.as_bytes())
    } else {
        return format!(
            "Error: Unknown alignment mode '{}'. Use 'global' or 'local'.",
            mode
        );
    };

    match result {
        Ok(alignment_result) => match result_to_json(&alignment_result) {
            Ok(json) => json,
            Err(e) => format!("Error: Serialization failed: {}", e),
        },
        Err(e) => format!("Error: {}", e),
    }
}

/// WASM entry point for retrieving built-in scoring matrix data.
///
/// # Arguments
/// * `name` - Matrix name (e.g., BLOSUM62, EDNAFULL, PAM250)
///
/// # Returns
/// JSON string with matrix data or an error string starting with "Error:".
#[wasm_bindgen]
pub fn matrix_data_wasm(name: &str) -> String {
    let data = match matrix_data_by_name(name) {
        Some(data) => data,
        None => {
            return format!("Error: Unknown matrix name '{}'", name);
        }
    };

    serde_json::to_string(&data)
        .unwrap_or_else(|e| format!("Error: JSON serialization failed: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_align_wasm_mode_is_case_insensitive() {
        let json = align_wasm("AC", "AC", None, 2, -1, -2, -2, "GLOBAL");
        assert!(json.contains("\"final_score\":4"));
        assert!(!json.contains("\"scoring\""));
    }
}
