# Question Type Framework (v1)

## Purpose
Choose input format by **diagnostic value**, not convenience.

## Core principle
Use the question type that best exposes the likely misconception with the least interface friction.

## Decision matrix

### 1) MCQ
**Best for**
- Fast misconception sorting
- Early diagnostic screening
- Low-friction engagement

**Strengths**
- Quick completion
- Easy auto-marking
- Good for distractor-based diagnosis

**Risks**
- Guessing inflation
- Can hide procedural weakness

**Use when**
- You need route decision signals
- Distractors map to known misconceptions

---

### 2) Free text / numeric entry
**Best for**
- Mastery confirmation
- Procedural fluency and recall
- Reducing guessability

**Strengths**
- Better evidence of independent thinking
- Stronger for secure/not-secure boundary

**Risks**
- Input formatting issues (spaces, commas, notation)

**Use when**
- You are validating route success (shadow checks)
- You need exact output

---

### 3) Equation/symbol builder
**Best for**
- Algebraic structure tasks
- Multi-step expression construction
- Avoiding keyboard notation friction

**Strengths**
- Captures construction process
- Better for equation-formation errors

**Risks**
- UI overhead if overused
- Requires robust component design

**Use when**
- Objective depends on symbolic structure
- You want step-level diagnostic telemetry

---

## Recommended blend by stage
- **Diagnostic stage:** 60-80% MCQ, 20-40% short entry
- **Route teaching checks:** 40-60% short entry, 20-40% MCQ, optional builder
- **Mastery gate:** 70% short entry, 30% applied MCQ/builder

## Anti-guess controls
- Weighted confidence (MCQ lower weight than free entry)
- Rapid-guess cooldown
- Secure threshold requires at least one non-MCQ pass in gate set
