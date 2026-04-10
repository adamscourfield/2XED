-- AddColumn phases to LiveSession for lesson phase plan
ALTER TABLE "LiveSession" ADD COLUMN "phases" JSONB;

-- AddColumn currentPhaseIndex to LiveSession
ALTER TABLE "LiveSession" ADD COLUMN "currentPhaseIndex" INTEGER NOT NULL DEFAULT 0;

-- AddColumn currentContent to LiveSession
ALTER TABLE "LiveSession" ADD COLUMN "currentContent" JSONB;
