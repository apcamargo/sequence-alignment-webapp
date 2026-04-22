//! JSON output serialization for alignment results.

use serde::ser::{SerializeSeq, SerializeStruct};
use serde::{Serialize, Serializer};

use crate::alignment::{
    AlignedPair, AlignmentResult, Cell, DPMatrix, TracebackPath, TracebackStep,
};

struct CellOutputRef<'a>(&'a Cell);

impl Serialize for CellOutputRef<'_> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut state = serializer.serialize_struct("CellOutput", 2)?;
        state.serialize_field("score", &self.0.score)?;
        state.serialize_field("arrows", &self.0.arrows.bits())?;
        state.end()
    }
}

struct CellsRef<'a>(&'a [Cell]);

impl Serialize for CellsRef<'_> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut seq = serializer.serialize_seq(Some(self.0.len()))?;
        for cell in self.0 {
            seq.serialize_element(&CellOutputRef(cell))?;
        }
        seq.end()
    }
}

struct MatrixOutputRef<'a>(&'a DPMatrix);

impl Serialize for MatrixOutputRef<'_> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut state = serializer.serialize_struct("MatrixOutput", 3)?;
        state.serialize_field("rows", &self.0.rows)?;
        state.serialize_field("cols", &self.0.cols)?;
        state.serialize_field("cells", &CellsRef(&self.0.cells))?;
        state.end()
    }
}

struct StepOutputRef<'a>(&'a TracebackStep);

impl Serialize for StepOutputRef<'_> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut state = serializer.serialize_struct("StepOutput", 2)?;
        state.serialize_field("i", &self.0.i)?;
        state.serialize_field("j", &self.0.j)?;
        state.end()
    }
}

struct StepsRef<'a>(&'a [TracebackStep]);

impl Serialize for StepsRef<'_> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut seq = serializer.serialize_seq(Some(self.0.len()))?;
        for step in self.0 {
            seq.serialize_element(&StepOutputRef(step))?;
        }
        seq.end()
    }
}

struct PathOutputRef<'a>(&'a TracebackPath);

impl Serialize for PathOutputRef<'_> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut state = serializer.serialize_struct("PathOutput", 1)?;
        state.serialize_field("steps", &StepsRef(&self.0.steps))?;
        state.end()
    }
}

struct PathsRef<'a>(&'a [TracebackPath]);

impl Serialize for PathsRef<'_> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut seq = serializer.serialize_seq(Some(self.0.len()))?;
        for path in self.0 {
            seq.serialize_element(&PathOutputRef(path))?;
        }
        seq.end()
    }
}

struct AlignmentOutputRef<'a>(&'a AlignedPair);

impl Serialize for AlignmentOutputRef<'_> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut state = serializer.serialize_struct("AlignmentOutput", 2)?;
        state.serialize_field("seq1", &self.0.seq1_aligned)?;
        state.serialize_field("seq2", &self.0.seq2_aligned)?;
        state.end()
    }
}

struct AlignmentsRef<'a>(&'a [AlignedPair]);

impl Serialize for AlignmentsRef<'_> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut seq = serializer.serialize_seq(Some(self.0.len()))?;
        for alignment in self.0 {
            seq.serialize_element(&AlignmentOutputRef(alignment))?;
        }
        seq.end()
    }
}

struct SequencesOutputRef<'a> {
    seq1: &'a str,
    seq2: &'a str,
}

impl Serialize for SequencesOutputRef<'_> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut state = serializer.serialize_struct("SequencesOutput", 2)?;
        state.serialize_field("seq1", self.seq1)?;
        state.serialize_field("seq2", self.seq2)?;
        state.end()
    }
}

struct AlignmentResultOutputRef<'a>(&'a AlignmentResult);

impl Serialize for AlignmentResultOutputRef<'_> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let result = self.0;
        let mut state = serializer.serialize_struct("AlignmentResultOutput", 5)?;
        state.serialize_field(
            "sequences",
            &SequencesOutputRef {
                seq1: &result.seq1,
                seq2: &result.seq2,
            },
        )?;
        state.serialize_field("matrix", &MatrixOutputRef(&result.matrix))?;
        state.serialize_field("traceback_paths", &PathsRef(&result.traceback_paths))?;
        state.serialize_field("alignments", &AlignmentsRef(&result.alignments))?;
        state.serialize_field("final_score", &result.final_score)?;
        state.end()
    }
}

pub(crate) fn result_to_json(result: &AlignmentResult) -> Result<String, serde_json::Error> {
    serde_json::to_string(&AlignmentResultOutputRef(result))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::aligners::GlobalAligner;
    use crate::alignment::Aligner;
    use crate::scoring::ScoringConfig;

    #[test]
    fn test_json_serialization() {
        let aligner = GlobalAligner::new(ScoringConfig::default());
        let result = aligner.align(b"AC", b"AC").unwrap();

        let json = result_to_json(&result).unwrap();
        assert!(json.contains("\"final_score\":4"));
        assert!(json.contains("\"seq1\":\"AC\""));
        assert!(!json.contains("\"scoring\""));
    }
}
