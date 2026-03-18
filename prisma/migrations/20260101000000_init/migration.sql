-- Initial schema: base tables required before stage3_mastery_engine migration

-- CreateEnum: Role (STUDENT only — TEACHER and ADMIN added in stage3)
CREATE TYPE "Role" AS ENUM ('STUDENT');

-- CreateTable: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable: Subject
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subject_slug_key" ON "Subject"("slug");

-- CreateTable: Skill
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "strand" TEXT NOT NULL DEFAULT '',
    "isStretch" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "intro" TEXT,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Skill_subjectId_slug_key" ON "Skill"("subjectId", "slug");
CREATE UNIQUE INDEX "Skill_subjectId_code_key" ON "Skill"("subjectId", "code");

ALTER TABLE "Skill" ADD CONSTRAINT "Skill_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: SkillPrereq
CREATE TABLE "SkillPrereq" (
    "skillId" TEXT NOT NULL,
    "prereqId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SkillPrereq_pkey" PRIMARY KEY ("skillId", "prereqId")
);

ALTER TABLE "SkillPrereq" ADD CONSTRAINT "SkillPrereq_skillId_fkey"
    FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SkillPrereq" ADD CONSTRAINT "SkillPrereq_prereqId_fkey"
    FOREIGN KEY ("prereqId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: Item
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MCQ',
    "options" JSONB NOT NULL,
    "answer" TEXT NOT NULL,
    "subjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Item" ADD CONSTRAINT "Item_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: ItemSkill
CREATE TABLE "ItemSkill" (
    "itemId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "ItemSkill_pkey" PRIMARY KEY ("itemId", "skillId")
);

ALTER TABLE "ItemSkill" ADD CONSTRAINT "ItemSkill_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ItemSkill" ADD CONSTRAINT "ItemSkill_skillId_fkey"
    FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: Attempt (without sessionId/mode — added in stage3)
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: SkillMastery (without lastReviewedAt/attemptsSinceConfirm — added in stage3)
CREATE TABLE "SkillMastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "mastery" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "confirmedCount" INTEGER NOT NULL DEFAULT 0,
    "lastPracticedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillMastery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SkillMastery_userId_skillId_key" ON "SkillMastery"("userId", "skillId");

ALTER TABLE "SkillMastery" ADD CONSTRAINT "SkillMastery_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SkillMastery" ADD CONSTRAINT "SkillMastery_skillId_fkey"
    FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: Event
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "actorUserId" TEXT,
    "studentUserId" TEXT,
    "subjectId" TEXT,
    "skillId" TEXT,
    "itemId" TEXT,
    "attemptId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Event" ADD CONSTRAINT "Event_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_skillId_fkey"
    FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
