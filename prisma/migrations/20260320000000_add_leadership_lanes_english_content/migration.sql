-- Add LEADERSHIP to Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'LEADERSHIP';

-- CreateEnum: DelayBucket
CREATE TYPE "DelayBucket" AS ENUM ('IMMEDIATE', 'SAME_DAY', 'D1', 'D3', 'D7_PLUS');

-- CreateEnum: DurabilityBand
CREATE TYPE "DurabilityBand" AS ENUM ('AT_RISK', 'DEVELOPING', 'DURABLE');

-- CreateEnum: QuestionContextType
CREATE TYPE "QuestionContextType" AS ENUM ('ROUTINE', 'MIXED', 'TRANSFER');

-- CreateEnum: LiveSessionPhase
CREATE TYPE "LiveSessionPhase" AS ENUM ('DIAGNOSTIC', 'EXPLANATION', 'SHADOW_CHECK', 'REVIEW');

-- CreateEnum: StudentLane
CREATE TYPE "StudentLane" AS ENUM ('LANE_1', 'LANE_2', 'LANE_3');

-- CreateEnum: EscalationReason
CREATE TYPE "EscalationReason" AS ENUM ('SHADOW_CHECK_FAILED', 'ANCHOR_FAILED', 'MISCONCEPTION_FAILED', 'SCAFFOLDED_CORRECT', 'MANUAL_TEACHER');

-- CreateEnum: LaneTransitionType
CREATE TYPE "LaneTransitionType" AS ENUM ('ASSIGNED', 'ESCALATED', 'HANDED_BACK', 'RESOLVED');

-- Add missing columns to StudentSkillState
ALTER TABLE "StudentSkillState"
  ADD COLUMN IF NOT EXISTS "latestDle" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "latestLearningGain" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "latestKnowledgeStability" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "latestInstructionalTimeMs" INTEGER,
  ADD COLUMN IF NOT EXISTS "durabilityBand" "DurabilityBand" NOT NULL DEFAULT 'AT_RISK';

-- Add missing columns to QuestionAttempt
ALTER TABLE "QuestionAttempt"
  ADD COLUMN IF NOT EXISTS "contextType" "QuestionContextType" NOT NULL DEFAULT 'ROUTINE',
  ADD COLUMN IF NOT EXISTS "delayBucket" "DelayBucket" NOT NULL DEFAULT 'IMMEDIATE',
  ADD COLUMN IF NOT EXISTS "instructionalTimeMs" INTEGER NOT NULL DEFAULT 0;

-- Add missing columns to LiveSession
ALTER TABLE "LiveSession"
  ADD COLUMN IF NOT EXISTS "phase" "LiveSessionPhase" NOT NULL DEFAULT 'DIAGNOSTIC',
  ADD COLUMN IF NOT EXISTS "reteachAlert" BOOLEAN NOT NULL DEFAULT false;

-- Add missing columns to LiveParticipant
ALTER TABLE "LiveParticipant"
  ADD COLUMN IF NOT EXISTS "currentLane" "StudentLane" NOT NULL DEFAULT 'LANE_3',
  ADD COLUMN IF NOT EXISTS "currentExplanationId" TEXT,
  ADD COLUMN IF NOT EXISTS "escalationReason" "EscalationReason",
  ADD COLUMN IF NOT EXISTS "isUnexpectedFailure" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "holdingAtFinalCheck" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "laneAssignedAt" TIMESTAMP(3);

-- Add index for LiveParticipant lane queries
CREATE INDEX IF NOT EXISTS "LiveParticipant_liveSessionId_currentLane_idx" ON "LiveParticipant"("liveSessionId", "currentLane");

-- CreateTable: LaneTransition
CREATE TABLE IF NOT EXISTS "LaneTransition" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "fromLane" "StudentLane",
    "toLane" "StudentLane" NOT NULL,
    "transitionType" "LaneTransitionType" NOT NULL,
    "reason" "EscalationReason",
    "triggeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaneTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for LaneTransition
CREATE INDEX IF NOT EXISTS "LaneTransition_liveSessionId_createdAt_idx" ON "LaneTransition"("liveSessionId", "createdAt");

-- AddForeignKey for LaneTransition
ALTER TABLE "LaneTransition" ADD CONSTRAINT "LaneTransition_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LaneTransition" ADD CONSTRAINT "LaneTransition_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "LiveParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: EnglishContentBlock
CREATE TABLE IF NOT EXISTS "EnglishContentBlock" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "blockType" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "sourceRef" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnglishContentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for EnglishContentBlock
CREATE INDEX IF NOT EXISTS "EnglishContentBlock_skillId_sortOrder_idx" ON "EnglishContentBlock"("skillId", "sortOrder");
CREATE INDEX IF NOT EXISTS "EnglishContentBlock_skillId_isPublished_idx" ON "EnglishContentBlock"("skillId", "isPublished");

-- AddForeignKey for EnglishContentBlock
ALTER TABLE "EnglishContentBlock" ADD CONSTRAINT "EnglishContentBlock_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: AIMarkResult
CREATE TABLE IF NOT EXISTS "AIMarkResult" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "mode" "AttemptMode" NOT NULL,
    "answer" TEXT NOT NULL,
    "markResult" JSONB NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMarkResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for AIMarkResult
CREATE INDEX IF NOT EXISTS "AIMarkResult_attemptId_idx" ON "AIMarkResult"("attemptId");
CREATE INDEX IF NOT EXISTS "AIMarkResult_questionId_createdAt_idx" ON "AIMarkResult"("questionId", "createdAt");

-- CreateTable: AnnotationLayer
CREATE TABLE IF NOT EXISTS "AnnotationLayer" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "strokes" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnotationLayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for AnnotationLayer
CREATE INDEX IF NOT EXISTS "AnnotationLayer_blockId_idx" ON "AnnotationLayer"("blockId");

-- AddForeignKey for AnnotationLayer
ALTER TABLE "AnnotationLayer" ADD CONSTRAINT "AnnotationLayer_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "EnglishContentBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
