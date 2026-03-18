-- Add missing fields to ExplanationRoute: defaultPriorityRank, animationSchema, animationVersion, animationGeneratedAt

ALTER TABLE "ExplanationRoute"
  ADD COLUMN IF NOT EXISTS "defaultPriorityRank" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "animationSchema" JSONB,
  ADD COLUMN IF NOT EXISTS "animationVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "animationGeneratedAt" TIMESTAMP(3);
