-- DropForeignKey
ALTER TABLE "QuestionAttempt" DROP CONSTRAINT "QuestionAttempt_explanationId_fkey";

-- AlterTable
ALTER TABLE "Classroom" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "EnglishContentBlock" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GuessingSafeguardState" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InteractionType" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StepInteraction" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StudentProfile" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StudentRewardBalance" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TeacherProfile" ALTER COLUMN "updatedAt" DROP DEFAULT;
