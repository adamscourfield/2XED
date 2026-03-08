-- Add misconception mapping for distractor-level diagnostics
ALTER TABLE "Item"
ADD COLUMN IF NOT EXISTS "misconceptionMap" JSONB;

-- Explanation routes per skill
CREATE TABLE IF NOT EXISTS "ExplanationRoute" (
  "id" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "routeType" TEXT NOT NULL,
  "misconceptionSummary" TEXT NOT NULL,
  "workedExample" TEXT NOT NULL,
  "guidedPrompt" TEXT NOT NULL,
  "guidedAnswer" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExplanationRoute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExplanationRoute_skillId_routeType_key"
ON "ExplanationRoute"("skillId", "routeType");

ALTER TABLE "ExplanationRoute"
ADD CONSTRAINT "ExplanationRoute_skillId_fkey"
FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Stepwise checkpoints inside each route
CREATE TABLE IF NOT EXISTS "ExplanationStep" (
  "id" TEXT NOT NULL,
  "explanationRouteId" TEXT NOT NULL,
  "stepOrder" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "checkpointQuestion" TEXT NOT NULL,
  "checkpointOptions" JSONB NOT NULL,
  "checkpointAnswer" TEXT NOT NULL,
  "alternativeHint" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExplanationStep_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExplanationStep_explanationRouteId_stepOrder_key"
ON "ExplanationStep"("explanationRouteId", "stepOrder");

ALTER TABLE "ExplanationStep"
ADD CONSTRAINT "ExplanationStep_explanationRouteId_fkey"
FOREIGN KEY ("explanationRouteId") REFERENCES "ExplanationRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
