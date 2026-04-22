ALTER TABLE "LiveParticipant"
  ADD COLUMN IF NOT EXISTS "pendingRecheckItemId" TEXT;
