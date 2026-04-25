-- Opening check plan (teacher setup) and per-student resolved check queue
ALTER TABLE "LiveSession" ADD COLUMN IF NOT EXISTS "checkPlan" JSONB;

ALTER TABLE "LiveParticipant" ADD COLUMN IF NOT EXISTS "openingCheckQueue" JSONB;
ALTER TABLE "LiveParticipant" ADD COLUMN IF NOT EXISTS "openingCheckIndex" INTEGER NOT NULL DEFAULT 0;
