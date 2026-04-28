-- Add self-reported confidence to LiveAttempt (populated from practice submissions)
ALTER TABLE "LiveAttempt" ADD COLUMN "confidence" TEXT;
