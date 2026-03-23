// ── ExplanationBlock ─────────────────────────────────────────────────────────────
// Represents a single content block within a skill's explanation page.
// Blocks are ordered (sortOrder) and rendered sequentially.
// A MODEL block carries annotation data (teacher markup on a worked example).

export type ExplanationBlockType =
  | 'TEXT'           // rich text explainer
  | 'IMAGE'          // static image with optional caption
  | 'ANIMATION'      // references an animation schema on the ExplanationRoute
  | 'CALLOUT'        // key term, tip, or warning box
  | 'QUOTATION'      // extracted literary quote with source
  | 'MODEL'          // teacher-annotated worked example
  | 'SCAFFOLD'       // structured writing frame
  | 'CHECKPOINT';    // embedded checkpoint question

export interface ExplanationBlock {
  id: string;
  type: ExplanationBlockType;
  /** markdown for TEXT/QUOTATION/CALLOUT/SCAFFOLD; JSON string for ANIMATION */
  content: string;
  /** Serialised AnnotationData — present when type === 'MODEL' */
  annotationData?: AnnotationData;
  /** Skill code this block belongs to */
  skillCode: string;
  /** If type === ANIMATION, this is the ExplanationRoute.id */
  animationRouteId?: string;
  /** Pause and wait for student interaction before auto-advancing */
  pauseForInteraction?: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// ── AnnotationData ─────────────────────────────────────────────────────────────
// Captures teacher markup on a worked example (strokes + labels).
// Playback is sequential — strokes and labels appear in the order defined
// by playbackSequence, enabling a "watch the teacher annotate" reveal.

export interface AnnotationLabel {
  id: string;
  text: string;
  x: number;      // absolute canvas coordinate
  y: number;
  color: string;
  fontSize: number;
}

export interface AnnotationData {
  /** The ExplanationBlock.id of the content being annotated (e.g. an IMAGE block) */
  targetBlockId?: string;
  strokes: Stroke[];
  labels: AnnotationLabel[];
  /** Ordered indices into strokes[] | labels[] — defines reveal sequence */
  playbackSequence: Array<{ kind: 'stroke'; index: number } | { kind: 'label'; index: number }>;
}

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface Stroke {
  points: StrokePoint[];
  color: string;
  width: number;
}

// ── EnglishAnimationSchema ─────────────────────────────────────────────────────
// Schema for English curriculum animations.
// Forked from the maths animation system but scoped to English visual primitives.

export const ENGLISH_ANIMATION_SCHEMA_VERSION = '1.0';

export type EnglishVisualStyle =
  | 'inference_chain'      // text → evidence → inference chain reveal
  | 'sentence_parse'        // annotate S/V/O, grammatical functions visually
  | 'paragraph_structure'   // PEEL paragraph reveal (Point, Evidence, Explain, Link)
  | 'persuasive_device'     // highlight rhetorical techniques in text
  | 'vocab_root'            // word family / root / prefix / suffix breakdown
  | 'summary_build'          // build a summary sentence from key points
  | 'text_highlight'        // layered text reveals (quote, then meaning)
  | 'character_analysis'    // character traits + evidence from text
  | 'quotation_reveal';    // reveal a quotation, then annotate

export type EnglishRouteType = 'A' | 'B' | 'C';

export interface EnglishAnimationStep {
  stepIndex: number;
  id: string;
  visuals: EnglishVisual[];
  narration: string;
  audioFile: string | null;
}

// Discriminated union for type-safe visual primitives
export type EnglishVisual =
  | { type: 'text_block'; content: string; highlightSpans?: Array<{ text: string; style: 'bold' | 'underline' | 'italic' | 'accent' | 'evidence' }> }
  | { type: 'inference_chain'; nodes: Array<{ label: string; text: string; highlight?: boolean }>; highlightNode?: number }
  | { type: 'sentence_parse'; sentence: string; annotations: Array<{ text: string; start: number; end: number; label: string; color: string }> }
  | { type: 'peel_reveal'; paragraphIndex: number; elements: Array<{ role: 'P' | 'E' | 'E2' | 'L'; text: string }> }
  | { type: 'persuasive_highlight'; text: string; device: string; explanation: string }
  | { type: 'vocab_breakdown'; word: string; root: string; prefix?: string; suffix?: string; family: string[] }
  | { type: 'quotation_annotate'; quote: string; annotation: string; annotationSide: 'above' | 'below' }
  | { type: 'step_reveal'; lines: Array<{ text: string; highlight: 'accent' | 'evidence' | 'green' | null }> }
  | { type: 'rule_callout'; ruleText: string; subText: string }
  | { type: 'result_reveal'; expression: string; label: string };

export interface EnglishAnimationSchema {
  schemaVersion: typeof ENGLISH_ANIMATION_SCHEMA_VERSION;
  skillCode: string;
  skillName: string;
  routeType: EnglishRouteType;
  routeLabel: string;
  misconceptionSummary?: string;
  generatedAt: string;
  steps: EnglishAnimationStep[];
  loopable: boolean;
  pauseAtEndMs: number;
}

// ── QuestionBlock ──────────────────────────────────────────────────────────────
// A QuestionBlock groups one or more SubQuestions presented together on a page.
// Used for booklet-style spreads where instruction and practice sit side by side.

export type SubQuestionInputType = 'MCQ' | 'SHORT_TEXT' | 'NUMERIC' | 'CANVAS' | 'MIXED';

export interface SubQuestion {
  index: number;
  stem: string;
  /** How the student enters their answer */
  inputType: SubQuestionInputType;
  /** For MCQ */
  options?: string[];
  /** For CANVAS mode — rubric for AI marking */
  rubric?: Rubric;
  /** For AUTO_* marking modes — exact/tolerance match */
  acceptedAnswers?: string[];
  points: number;
}

export interface QuestionBlock {
  id: string;
  skillCode: string;
  questions: SubQuestion[];
  /** How questions are shown to the student */
  presentationHint: 'sequential' | 'all_visible' | 'accordion';
  /** When does submission happen */
  submitRule: 'per_question' | 'all_together';
  /** Optional preamble shown above all questions */
  instructionText?: string;
}

// ── Rubric ─────────────────────────────────────────────────────────────────────
// Structured rubric — not free text. Teachers fill in criteria descriptors.
// Stored on ImportedQuestion.marking.rubric for AI marking.

export interface RubricCriterion {
  element: string;      // e.g. "spelling" | "grammar" | "content" | "structure" | "analysis"
  weight: number;        // 0–1; all weights must sum to 1
  descriptors: Array<{
    score: number;       // 0–4 (0=missing, 4=exemplar)
    descriptor: string; // e.g. "Clear and accurate spelling throughout"
  }>;
}

export interface Rubric {
  criteria: RubricCriterion[];
  overall: {
    wtmTemplate: string; // e.g. "Your {strength} was strong because…"
    ebiTemplate: string; // e.g. "To improve, focus on {area}…"
  };
}
