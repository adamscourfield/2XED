-- AlterEnum: Add TEACHER and ADMIN to Role
ALTER TYPE "Role" ADD VALUE 'TEACHER';
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- CreateEnum: DiagnosticStatus
CREATE TYPE "DiagnosticStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum: AttemptMode
CREATE TYPE "AttemptMode" AS ENUM ('PRACTICE', 'DIAGNOSTIC', 'REVIEW');

-- AlterTable: SkillMastery add new fields
ALTER TABLE "SkillMastery" ADD COLUMN "lastReviewedAt" TIMESTAMP(3);
ALTER TABLE "SkillMastery" ADD COLUMN "attemptsSinceConfirm" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Attempt add sessionId and mode
ALTER TABLE "Attempt" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "Attempt" ADD COLUMN "mode" "AttemptMode" NOT NULL DEFAULT 'PRACTICE';

-- CreateTable: DiagnosticSession
CREATE TABLE "DiagnosticSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "DiagnosticStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "maxItems" INTEGER NOT NULL DEFAULT 25,
    "minItems" INTEGER NOT NULL DEFAULT 12,
    "confidenceTarget" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "itemsSeen" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "DiagnosticSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InterventionFlag
CREATE TABLE "InterventionFlag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "InterventionFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: InterventionFlag unique
CREATE UNIQUE INDEX "InterventionFlag_userId_skillId_key" ON "InterventionFlag"("userId", "skillId");

-- AddForeignKey: DiagnosticSession -> User
ALTER TABLE "DiagnosticSession" ADD CONSTRAINT "DiagnosticSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: DiagnosticSession -> Subject
ALTER TABLE "DiagnosticSession" ADD CONSTRAINT "DiagnosticSession_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Attempt -> DiagnosticSession
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DiagnosticSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: InterventionFlag -> User
ALTER TABLE "InterventionFlag" ADD CONSTRAINT "InterventionFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: InterventionFlag -> Subject
ALTER TABLE "InterventionFlag" ADD CONSTRAINT "InterventionFlag_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: InterventionFlag -> Skill
ALTER TABLE "InterventionFlag" ADD CONSTRAINT "InterventionFlag_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
