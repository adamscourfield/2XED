-- Migration: skill enrichment fields + LiveAttempt.misconceptionId
-- Adds AI generation metadata to Skill nodes and a misconception tag to LiveAttempt.

-- Skill enrichment columns (all nullable — populated by apply-skill-enrichment.ts)
ALTER TABLE "Skill" ADD COLUMN IF NOT EXISTS "masteryDefinition"    TEXT;
ALTER TABLE "Skill" ADD COLUMN IF NOT EXISTS "misconceptions"       JSONB;
ALTER TABLE "Skill" ADD COLUMN IF NOT EXISTS "difficultyDimensions" JSONB;
ALTER TABLE "Skill" ADD COLUMN IF NOT EXISTS "transferContexts"     JSONB;
ALTER TABLE "Skill" ADD COLUMN IF NOT EXISTS "generativeContext"    TEXT;

-- LiveAttempt: tag which misconception a wrong answer demonstrated
-- References misconceptions[].id on the Skill node (not a FK — the vocabulary
-- lives in the JSON column, not a separate table).
ALTER TABLE "LiveAttempt" ADD COLUMN IF NOT EXISTS "misconceptionId" TEXT;
