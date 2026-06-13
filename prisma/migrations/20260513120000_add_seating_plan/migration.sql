-- CreateTable: SeatingPlan — one physical seating layout per classroom, reused
-- across live sessions. `seats` is a JSON array of { studentUserId, row, col }.
CREATE TABLE "SeatingPlan" (
    "id"          TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "rows"        INTEGER NOT NULL DEFAULT 5,
    "cols"        INTEGER NOT NULL DEFAULT 6,
    "seats"       JSONB NOT NULL DEFAULT '[]',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatingPlan_pkey" PRIMARY KEY ("id")
);

-- One plan per classroom.
CREATE UNIQUE INDEX "SeatingPlan_classroomId_key" ON "SeatingPlan"("classroomId");

ALTER TABLE "SeatingPlan" ADD CONSTRAINT "SeatingPlan_classroomId_fkey"
    FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
