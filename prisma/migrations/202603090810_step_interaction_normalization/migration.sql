-- Full normalization scaffold for reteach interactions

ALTER TABLE "ExplanationStep"
ADD COLUMN IF NOT EXISTS "stepType" TEXT NOT NULL DEFAULT 'checkpoint',
ADD COLUMN IF NOT EXISTS "subtopicCode" TEXT,
ADD COLUMN IF NOT EXISTS "questionType" TEXT;

CREATE TABLE IF NOT EXISTS "InteractionType" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "schema" JSONB,
  "rendererKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "InteractionType_key_version_key"
  ON "InteractionType"("key", "version");

CREATE TABLE IF NOT EXISTS "StepInteraction" (
  "id" TEXT PRIMARY KEY,
  "explanationStepId" TEXT NOT NULL,
  "interactionTypeId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 1,
  "config" JSONB NOT NULL,
  "completionRule" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StepInteraction_explanationStepId_fkey"
    FOREIGN KEY ("explanationStepId") REFERENCES "ExplanationStep"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StepInteraction_interactionTypeId_fkey"
    FOREIGN KEY ("interactionTypeId") REFERENCES "InteractionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "StepInteraction_explanationStepId_sortOrder_key"
  ON "StepInteraction"("explanationStepId", "sortOrder");
