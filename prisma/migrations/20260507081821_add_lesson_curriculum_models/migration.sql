-- CreateEnum
CREATE TYPE "LessonBlockType" AS ENUM ('DO_NOW', 'EXPLAIN', 'MODEL', 'CHECK', 'PRACTICE');

-- CreateEnum
CREATE TYPE "LessonItemType" AS ENUM ('SLIDE', 'QUESTION', 'IMAGE', 'CANVAS_FRAME');

-- CreateEnum
CREATE TYPE "AnswerMode" AS ENUM ('MCQ', 'ORDER', 'SHORT_ANSWER', 'PICK');

-- AlterTable: add lessonId FK to LiveSession
ALTER TABLE "LiveSession" ADD COLUMN "lessonId" TEXT;

-- CreateTable: CurriculumPlan
CREATE TABLE "CurriculumPlan" (
    "id"            TEXT NOT NULL,
    "title"         TEXT NOT NULL,
    "subjectId"     TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "academicYear"  TEXT,
    "termLabel"     TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CurriculumUnit
CREATE TABLE "CurriculumUnit" (
    "id"              TEXT NOT NULL,
    "planId"          TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "aims"            TEXT,
    "successMeasures" TEXT,
    "dateStart"       TIMESTAMP(3),
    "dateEnd"         TIMESTAMP(3),
    "sortOrder"       INTEGER NOT NULL DEFAULT 0,
    "aiReviewNotes"   JSONB,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CurriculumUnitSkill
CREATE TABLE "CurriculumUnitSkill" (
    "unitId"  TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "CurriculumUnitSkill_pkey" PRIMARY KEY ("unitId","skillId")
);

-- CreateTable: Lesson
CREATE TABLE "Lesson" (
    "id"                        TEXT NOT NULL,
    "title"                     TEXT NOT NULL,
    "topic"                     TEXT NOT NULL,
    "teacherUserId"             TEXT NOT NULL,
    "subjectId"                 TEXT NOT NULL,
    "curriculumUnitId"          TEXT,
    "curriculumPromptDismissed" BOOLEAN NOT NULL DEFAULT false,
    "isPublished"               BOOLEAN NOT NULL DEFAULT false,
    "isCopy"                    BOOLEAN NOT NULL DEFAULT false,
    "sourceId"                  TEXT,
    "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                 TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LessonBlock
CREATE TABLE "LessonBlock" (
    "id"        TEXT NOT NULL,
    "lessonId"  TEXT NOT NULL,
    "type"      "LessonBlockType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "title"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LessonItem
CREATE TABLE "LessonItem" (
    "id"           TEXT NOT NULL,
    "blockId"      TEXT NOT NULL,
    "sortOrder"    INTEGER NOT NULL DEFAULT 0,
    "itemType"     "LessonItemType" NOT NULL,
    "answerMode"   "AnswerMode",
    "content"      JSONB NOT NULL,
    "skillId"      TEXT,
    "sourceItemId" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CurriculumPlan_teacherUserId_idx" ON "CurriculumPlan"("teacherUserId");

-- CreateIndex
CREATE INDEX "CurriculumUnit_planId_sortOrder_idx" ON "CurriculumUnit"("planId", "sortOrder");

-- CreateIndex
CREATE INDEX "Lesson_teacherUserId_idx" ON "Lesson"("teacherUserId");

-- CreateIndex
CREATE INDEX "Lesson_subjectId_idx" ON "Lesson"("subjectId");

-- CreateIndex
CREATE INDEX "LessonBlock_lessonId_sortOrder_idx" ON "LessonBlock"("lessonId", "sortOrder");

-- CreateIndex
CREATE INDEX "LessonItem_blockId_sortOrder_idx" ON "LessonItem"("blockId", "sortOrder");

-- AddForeignKey: LiveSession → Lesson
ALTER TABLE "LiveSession"
    ADD CONSTRAINT "LiveSession_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: CurriculumPlan → Subject
ALTER TABLE "CurriculumPlan"
    ADD CONSTRAINT "CurriculumPlan_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "Subject"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: CurriculumPlan → User
ALTER TABLE "CurriculumPlan"
    ADD CONSTRAINT "CurriculumPlan_teacherUserId_fkey"
    FOREIGN KEY ("teacherUserId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: CurriculumUnit → CurriculumPlan
ALTER TABLE "CurriculumUnit"
    ADD CONSTRAINT "CurriculumUnit_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "CurriculumPlan"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: CurriculumUnitSkill → CurriculumUnit
ALTER TABLE "CurriculumUnitSkill"
    ADD CONSTRAINT "CurriculumUnitSkill_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "CurriculumUnit"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: CurriculumUnitSkill → Skill
ALTER TABLE "CurriculumUnitSkill"
    ADD CONSTRAINT "CurriculumUnitSkill_skillId_fkey"
    FOREIGN KEY ("skillId") REFERENCES "Skill"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Lesson → User
ALTER TABLE "Lesson"
    ADD CONSTRAINT "Lesson_teacherUserId_fkey"
    FOREIGN KEY ("teacherUserId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Lesson → Subject
ALTER TABLE "Lesson"
    ADD CONSTRAINT "Lesson_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "Subject"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Lesson → CurriculumUnit
ALTER TABLE "Lesson"
    ADD CONSTRAINT "Lesson_curriculumUnitId_fkey"
    FOREIGN KEY ("curriculumUnitId") REFERENCES "CurriculumUnit"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Lesson self-reference (copies)
ALTER TABLE "Lesson"
    ADD CONSTRAINT "Lesson_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "Lesson"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: LessonBlock → Lesson
ALTER TABLE "LessonBlock"
    ADD CONSTRAINT "LessonBlock_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LessonItem → LessonBlock
ALTER TABLE "LessonItem"
    ADD CONSTRAINT "LessonItem_blockId_fkey"
    FOREIGN KEY ("blockId") REFERENCES "LessonBlock"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LessonItem → Skill
ALTER TABLE "LessonItem"
    ADD CONSTRAINT "LessonItem_skillId_fkey"
    FOREIGN KEY ("skillId") REFERENCES "Skill"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: LessonItem → Item (source from question bank)
ALTER TABLE "LessonItem"
    ADD CONSTRAINT "LessonItem_sourceItemId_fkey"
    FOREIGN KEY ("sourceItemId") REFERENCES "Item"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
