-- CreateEnum
CREATE TYPE "TimetableSlotRecurrence" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY_NTH');

-- CreateTable
CREATE TABLE "ClassroomTimetableSlot" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "label" TEXT,
    "room" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "minuteOfDay" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "recurrence" "TimetableSlotRecurrence" NOT NULL DEFAULT 'WEEKLY',
    "week0Anchor" TIMESTAMP(3),
    "nthWeekOfMonth" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/London',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomTimetableSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassroomTimetableSlot_classroomId_idx" ON "ClassroomTimetableSlot"("classroomId");

-- AddForeignKey
ALTER TABLE "ClassroomTimetableSlot" ADD CONSTRAINT "ClassroomTimetableSlot_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
