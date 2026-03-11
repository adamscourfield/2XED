# Answer Mode Bank (Y7–Y11 Mastery Maths)

This folder contains a first-pass architecture for answer mode selection:

- `answer-mode-bank.json`: canonical answer mode definitions (purpose, format, feedback, retention strength)
- `curriculum-objective-map.csv`: example objective-to-mode mapping by phase (introduce/practice/secure/retain)
- `mode-selection-rules.yaml`: rule engine and scoring logic for mode recommendation

## Intended flow

1. Tag each item/question with `objective_id` and `learning_phase`.
2. Use `curriculum-objective-map.csv` to get allowed phase modes.
3. Score candidate modes using `mode-selection-rules.yaml`.
4. Persist chosen mode + outcomes for adaptive optimization.

## Next implementation step

Convert `mode-selection-rules.yaml` into a `selectAnswerMode()` service and emit analytics events for mode effectiveness.
