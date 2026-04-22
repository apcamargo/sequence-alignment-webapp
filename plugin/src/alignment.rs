//! Core alignment data structures and algorithm trait.

use crate::scoring::{AlignmentError, ScoringConfig, SubstitutionScorer};

/// Arrow directions stored as a 3-bit bitmask.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub(crate) struct Arrows(u8);

impl Arrows {
    pub(crate) fn new() -> Self {
        Self(0)
    }

    pub(crate) fn bits(&self) -> u8 {
        self.0
    }

    pub(crate) fn has_diagonal(&self) -> bool {
        (self.0 & 1) != 0
    }

    pub(crate) fn has_up(&self) -> bool {
        (self.0 & 2) != 0
    }

    pub(crate) fn has_left(&self) -> bool {
        (self.0 & 4) != 0
    }
}

impl Arrows {
    pub const NONE: u8 = 0;
    pub const DIAGONAL: u8 = 1;
    pub const UP: u8 = 2;
    pub const LEFT: u8 = 4;

    pub(crate) fn set_up(&mut self) {
        self.0 |= Self::UP;
    }

    pub(crate) fn set_left(&mut self) {
        self.0 |= Self::LEFT;
    }
}

/// A cell in the dynamic programming matrix.
#[derive(Debug, Clone, Copy)]
pub(crate) struct Cell {
    pub(crate) score: i32,
    pub(crate) arrows: Arrows,
}

impl Cell {
    pub(crate) fn new(score: i32) -> Self {
        Self {
            score,
            arrows: Arrows::new(),
        }
    }

    pub(crate) fn with_arrows(score: i32, arrows: Arrows) -> Self {
        Self { score, arrows }
    }
}

impl Default for Cell {
    fn default() -> Self {
        Self {
            score: i32::MIN,
            arrows: Arrows::new(),
        }
    }
}

/// The dynamic programming matrix.
#[derive(Debug, Clone)]
pub(crate) struct DPMatrix {
    pub(crate) rows: usize,
    pub(crate) cols: usize,
    pub(crate) cells: Vec<Cell>,
}

impl DPMatrix {
    pub(crate) fn new(rows: usize, cols: usize) -> Self {
        Self {
            rows,
            cols,
            cells: vec![Cell::default(); rows * cols],
        }
    }

    #[inline]
    pub(crate) fn get(&self, i: usize, j: usize) -> &Cell {
        &self.cells[i * self.cols + j]
    }

    #[inline]
    pub(crate) fn set(&mut self, i: usize, j: usize, cell: Cell) {
        self.cells[i * self.cols + j] = cell;
    }
}

/// A step in the traceback path.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct TracebackStep {
    pub(crate) i: usize,
    pub(crate) j: usize,
}

impl TracebackStep {
    pub(crate) fn new(i: usize, j: usize) -> Self {
        Self { i, j }
    }
}

/// A complete traceback path.
#[derive(Debug, Clone)]
pub(crate) struct TracebackPath {
    pub(crate) steps: Vec<TracebackStep>,
}

impl TracebackPath {
    fn new() -> Self {
        Self { steps: Vec::new() }
    }

    fn with_capacity(capacity: usize) -> Self {
        Self {
            steps: Vec::with_capacity(capacity),
        }
    }

    fn push(&mut self, i: usize, j: usize) {
        self.steps.push(TracebackStep::new(i, j));
    }
}

impl Default for TracebackPath {
    fn default() -> Self {
        Self::new()
    }
}

/// A pair of aligned sequences.
#[derive(Debug, Clone)]
pub(crate) struct AlignedPair {
    pub(crate) seq1_aligned: String,
    pub(crate) seq2_aligned: String,
}

impl AlignedPair {
    fn new(seq1: String, seq2: String) -> Self {
        Self {
            seq1_aligned: seq1,
            seq2_aligned: seq2,
        }
    }
}

/// The complete result of an alignment operation.
#[derive(Debug, Clone)]
pub(crate) struct AlignmentResult {
    pub(crate) seq1: String,
    pub(crate) seq2: String,
    pub(crate) matrix: DPMatrix,
    pub(crate) traceback_paths: Vec<TracebackPath>,
    pub(crate) alignments: Vec<AlignedPair>,
    pub(crate) final_score: i32,
}

/// Trait for sequence alignment algorithms.
pub(crate) trait Aligner {
    fn align(&self, seq1: &[u8], seq2: &[u8]) -> Result<AlignmentResult, AlignmentError>;
}

#[derive(Debug, Clone)]
pub(crate) struct FillResult {
    pub max_score: i32,
    pub max_positions: Vec<(usize, usize)>,
}

#[inline]
fn update_local_max(
    max_score: &mut i32,
    max_positions: &mut Vec<(usize, usize)>,
    i: usize,
    j: usize,
    cell_score: i32,
) {
    if cell_score > *max_score {
        *max_score = cell_score;
        max_positions.clear();
        if cell_score > 0 {
            max_positions.push((i, j));
        }
    } else if cell_score == *max_score && cell_score > 0 {
        max_positions.push((i, j));
    }
}

pub(crate) fn fill_matrix_linear(
    matrix: &mut DPMatrix,
    seq1: &[u8],
    seq2: &[u8],
    scoring: &ScoringConfig,
    local: bool,
) -> FillResult {
    match &scoring.scorer {
        SubstitutionScorer::Simple {
            match_score,
            mismatch_score,
        } => fill_matrix_linear_simple(
            matrix,
            seq1,
            seq2,
            *match_score,
            *mismatch_score,
            scoring.gap_open,
            local,
        ),
        SubstitutionScorer::Matrix(matrix_scorer) => fill_matrix_linear_matrix(
            matrix,
            seq1,
            seq2,
            MatrixScoringView {
                lookup_map: matrix_scorer.lookup_map(),
                score_table: matrix_scorer.scores(),
                score_dimension: matrix_scorer.score_dimension(),
                gap: scoring.gap_open,
            },
            local,
        ),
    }
}

struct MatrixScoringView<'a> {
    lookup_map: &'a [Option<u8>; 256],
    score_table: &'a [i32],
    score_dimension: usize,
    gap: i32,
}

fn fill_matrix_linear_simple(
    matrix: &mut DPMatrix,
    seq1: &[u8],
    seq2: &[u8],
    match_score: i32,
    mismatch_score: i32,
    gap: i32,
    local: bool,
) -> FillResult {
    let n = seq1.len();
    let m = seq2.len();
    let cols = matrix.cols;
    let seq2_upper_storage = uppercase_ascii_if_needed(seq2);
    let seq2_upper = seq2_upper_storage.as_deref().unwrap_or(seq2);

    if local {
        let mut max_score = 0;
        let mut max_positions = Vec::new();

        for i in 1..=n {
            let row_offset = i * cols;
            let prev_row_offset = (i - 1) * cols;
            let (prior_rows, current_and_after) = matrix.cells.split_at_mut(row_offset);
            let prev_row = &prior_rows[prev_row_offset..row_offset];
            let row = &mut current_and_after[..cols];
            let seq1_char = seq1[i - 1].to_ascii_uppercase();

            for j in 1..=m {
                let substitution = if seq1_char == seq2_upper[j - 1] {
                    match_score
                } else {
                    mismatch_score
                };
                let diag_score = prev_row[j - 1].score.saturating_add(substitution);
                let up_score = prev_row[j].score.saturating_add(gap);
                let left_score = row[j - 1].score.saturating_add(gap);

                let max_candidate = diag_score.max(up_score).max(left_score);
                let cell_score = max_candidate.max(0);

                let mut arrows = Arrows::NONE;
                if cell_score > 0 {
                    if diag_score == cell_score {
                        arrows |= Arrows::DIAGONAL;
                    }
                    if up_score == cell_score {
                        arrows |= Arrows::UP;
                    }
                    if left_score == cell_score {
                        arrows |= Arrows::LEFT;
                    }
                }

                row[j] = Cell::with_arrows(cell_score, Arrows(arrows));
                update_local_max(&mut max_score, &mut max_positions, i, j, cell_score);
            }
        }

        FillResult {
            max_score,
            max_positions,
        }
    } else {
        for i in 1..=n {
            let row_offset = i * cols;
            let prev_row_offset = (i - 1) * cols;
            let (prior_rows, current_and_after) = matrix.cells.split_at_mut(row_offset);
            let prev_row = &prior_rows[prev_row_offset..row_offset];
            let row = &mut current_and_after[..cols];
            let seq1_char = seq1[i - 1].to_ascii_uppercase();

            for j in 1..=m {
                let substitution = if seq1_char == seq2_upper[j - 1] {
                    match_score
                } else {
                    mismatch_score
                };
                let diag_score = prev_row[j - 1].score.saturating_add(substitution);
                let up_score = prev_row[j].score.saturating_add(gap);
                let left_score = row[j - 1].score.saturating_add(gap);

                let max_score = diag_score.max(up_score).max(left_score);

                let mut arrows = Arrows::NONE;
                if diag_score == max_score {
                    arrows |= Arrows::DIAGONAL;
                }
                if up_score == max_score {
                    arrows |= Arrows::UP;
                }
                if left_score == max_score {
                    arrows |= Arrows::LEFT;
                }

                row[j] = Cell::with_arrows(max_score, Arrows(arrows));
            }
        }

        FillResult {
            max_score: matrix.cells[n * cols + m].score,
            max_positions: Vec::new(),
        }
    }
}

fn fill_matrix_linear_matrix(
    matrix: &mut DPMatrix,
    seq1: &[u8],
    seq2: &[u8],
    scoring: MatrixScoringView<'_>,
    local: bool,
) -> FillResult {
    let n = seq1.len();
    let m = seq2.len();
    let cols = matrix.cols;
    let seq1_indices = encode_matrix_sequence(seq1, scoring.lookup_map);
    let seq2_indices = encode_matrix_sequence(seq2, scoring.lookup_map);

    if local {
        let mut max_score = 0;
        let mut max_positions = Vec::new();

        for i in 1..=n {
            let row_offset = i * cols;
            let prev_row_offset = (i - 1) * cols;
            let (prior_rows, current_and_after) = matrix.cells.split_at_mut(row_offset);
            let prev_row = &prior_rows[prev_row_offset..row_offset];
            let row = &mut current_and_after[..cols];
            let seq1_index = seq1_indices[i - 1] * scoring.score_dimension;

            for j in 1..=m {
                let substitution = scoring.score_table[seq1_index + seq2_indices[j - 1]];
                let diag_score = prev_row[j - 1].score.saturating_add(substitution);
                let up_score = prev_row[j].score.saturating_add(scoring.gap);
                let left_score = row[j - 1].score.saturating_add(scoring.gap);

                let max_candidate = diag_score.max(up_score).max(left_score);
                let cell_score = max_candidate.max(0);

                let mut arrows = Arrows::NONE;
                if cell_score > 0 {
                    if diag_score == cell_score {
                        arrows |= Arrows::DIAGONAL;
                    }
                    if up_score == cell_score {
                        arrows |= Arrows::UP;
                    }
                    if left_score == cell_score {
                        arrows |= Arrows::LEFT;
                    }
                }

                row[j] = Cell::with_arrows(cell_score, Arrows(arrows));
                update_local_max(&mut max_score, &mut max_positions, i, j, cell_score);
            }
        }

        FillResult {
            max_score,
            max_positions,
        }
    } else {
        for i in 1..=n {
            let row_offset = i * cols;
            let prev_row_offset = (i - 1) * cols;
            let (prior_rows, current_and_after) = matrix.cells.split_at_mut(row_offset);
            let prev_row = &prior_rows[prev_row_offset..row_offset];
            let row = &mut current_and_after[..cols];
            let seq1_index = seq1_indices[i - 1] * scoring.score_dimension;

            for j in 1..=m {
                let substitution = scoring.score_table[seq1_index + seq2_indices[j - 1]];
                let diag_score = prev_row[j - 1].score.saturating_add(substitution);
                let up_score = prev_row[j].score.saturating_add(scoring.gap);
                let left_score = row[j - 1].score.saturating_add(scoring.gap);

                let max_score = diag_score.max(up_score).max(left_score);

                let mut arrows = Arrows::NONE;
                if diag_score == max_score {
                    arrows |= Arrows::DIAGONAL;
                }
                if up_score == max_score {
                    arrows |= Arrows::UP;
                }
                if left_score == max_score {
                    arrows |= Arrows::LEFT;
                }

                row[j] = Cell::with_arrows(max_score, Arrows(arrows));
            }
        }

        FillResult {
            max_score: matrix.cells[n * cols + m].score,
            max_positions: Vec::new(),
        }
    }
}

fn uppercase_ascii_if_needed(seq: &[u8]) -> Option<Vec<u8>> {
    seq.iter()
        .any(|byte| byte.is_ascii_lowercase())
        .then(|| seq.iter().map(|byte| byte.to_ascii_uppercase()).collect())
}

fn encode_matrix_sequence(seq: &[u8], lookup_map: &[Option<u8>; 256]) -> Vec<usize> {
    seq.iter()
        .map(|&residue| {
            lookup_map[residue as usize]
                .expect("matrix-scored sequences must be validated before DP filling")
                as usize
        })
        .collect()
}

#[derive(Debug, Clone, Copy)]
enum TracebackMove {
    Start,
    Diagonal,
    Up,
    Left,
}

#[derive(Debug, Clone, Copy)]
struct TracebackFrame {
    i: usize,
    j: usize,
    next_branch: u8,
    incoming: TracebackMove,
    entered: bool,
}

impl TracebackFrame {
    fn new(i: usize, j: usize, incoming: TracebackMove) -> Self {
        Self {
            i,
            j,
            next_branch: 0,
            incoming,
            entered: false,
        }
    }
}

enum TracebackAction {
    Push(TracebackFrame),
    Pop,
}

pub(crate) fn traceback_all_paths(
    matrix: &DPMatrix,
    seq1: &[u8],
    seq2: &[u8],
    start_positions: &[(usize, usize)],
    stop_condition: impl Fn(usize, usize, &Cell) -> bool + Copy,
    stop_on_no_arrows: bool,
) -> (Vec<TracebackPath>, Vec<AlignedPair>) {
    let mut all_paths = Vec::new();
    let mut all_alignments = Vec::new();
    let capacity = seq1.len() + seq2.len();
    let mut current_path = TracebackPath::with_capacity(capacity);
    let mut current_aln1 = Vec::with_capacity(capacity);
    let mut current_aln2 = Vec::with_capacity(capacity);
    let mut frames = Vec::with_capacity(capacity.max(1));

    for &(start_i, start_j) in start_positions {
        current_path.steps.clear();
        current_aln1.clear();
        current_aln2.clear();
        frames.clear();
        frames.push(TracebackFrame::new(start_i, start_j, TracebackMove::Start));

        while !frames.is_empty() {
            let action = {
                let frame = frames
                    .last_mut()
                    .expect("traceback frame stack is non-empty");

                if !frame.entered {
                    current_path.push(frame.i, frame.j);
                    frame.entered = true;

                    let cell = matrix.get(frame.i, frame.j);
                    if stop_condition(frame.i, frame.j, cell)
                        || (stop_on_no_arrows && cell.arrows.bits() == 0)
                    {
                        all_paths.push(TracebackPath {
                            steps: current_path.steps.clone(),
                        });
                        all_alignments.push(AlignedPair::new(
                            reversed_utf8_string(&current_aln1),
                            reversed_utf8_string(&current_aln2),
                        ));
                        TracebackAction::Pop
                    } else {
                        next_traceback_action(
                            frame,
                            cell.arrows,
                            seq1,
                            seq2,
                            &mut current_aln1,
                            &mut current_aln2,
                        )
                    }
                } else {
                    let cell = matrix.get(frame.i, frame.j);
                    next_traceback_action(
                        frame,
                        cell.arrows,
                        seq1,
                        seq2,
                        &mut current_aln1,
                        &mut current_aln2,
                    )
                }
            };

            match action {
                TracebackAction::Push(next_frame) => frames.push(next_frame),
                TracebackAction::Pop => unwind_traceback_frame(
                    &mut frames,
                    &mut current_path,
                    &mut current_aln1,
                    &mut current_aln2,
                ),
            }
        }
    }

    (all_paths, all_alignments)
}

fn next_traceback_action(
    frame: &mut TracebackFrame,
    arrows: Arrows,
    seq1: &[u8],
    seq2: &[u8],
    current_aln1: &mut Vec<u8>,
    current_aln2: &mut Vec<u8>,
) -> TracebackAction {
    while frame.next_branch < 3 {
        let branch = frame.next_branch;
        frame.next_branch += 1;

        match branch {
            0 if arrows.has_diagonal() && frame.i > 0 && frame.j > 0 => {
                current_aln1.push(seq1[frame.i - 1]);
                current_aln2.push(seq2[frame.j - 1]);
                return TracebackAction::Push(TracebackFrame::new(
                    frame.i - 1,
                    frame.j - 1,
                    TracebackMove::Diagonal,
                ));
            }
            1 if arrows.has_up() && frame.i > 0 => {
                current_aln1.push(seq1[frame.i - 1]);
                current_aln2.push(b'-');
                return TracebackAction::Push(TracebackFrame::new(
                    frame.i - 1,
                    frame.j,
                    TracebackMove::Up,
                ));
            }
            2 if arrows.has_left() && frame.j > 0 => {
                current_aln1.push(b'-');
                current_aln2.push(seq2[frame.j - 1]);
                return TracebackAction::Push(TracebackFrame::new(
                    frame.i,
                    frame.j - 1,
                    TracebackMove::Left,
                ));
            }
            _ => {}
        }
    }

    TracebackAction::Pop
}

fn unwind_traceback_frame(
    frames: &mut Vec<TracebackFrame>,
    current_path: &mut TracebackPath,
    current_aln1: &mut Vec<u8>,
    current_aln2: &mut Vec<u8>,
) {
    let frame = frames.pop().expect("traceback frame stack is non-empty");
    current_path.steps.pop();

    match frame.incoming {
        TracebackMove::Start => {}
        TracebackMove::Diagonal | TracebackMove::Up | TracebackMove::Left => {
            current_aln1.pop();
            current_aln2.pop();
        }
    }
}

fn reversed_utf8_string(bytes: &[u8]) -> String {
    let reversed: Vec<u8> = bytes.iter().rev().copied().collect();
    String::from_utf8_lossy(&reversed).into_owned()
}
