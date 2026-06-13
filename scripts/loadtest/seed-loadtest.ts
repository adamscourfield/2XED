/**
 * Load-test fixture seeder.
 *
 * Provisions an isolated, ACTIVE live session with N enrolled + joined students
 * so the load driver has real authenticated accounts and a real session to hit.
 * Everything it creates is namespaced with the LOADTEST_PREFIX and torn down on
 * each run, so re-running is safe and it never touches real data.
 *
 * Usage:
 *   STUDENTS=300 npx ts-node -r tsconfig-paths/register \
 *     --compiler-options '{"module":"CommonJS"}' scripts/loadtest/seed-loadtest.ts
 *
 * Writes scripts/loadtest/fixture.json (gitignored) consumed by run-loadtest.mjs.
 */

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const LOADTEST_PREFIX = 'loadtest';
const STUDENT_DOMAIN = 'loadtest.ember.local';
const STUDENTS = Number(process.env.STUDENTS ?? 200);
const PASSWORD = process.env.LOADTEST_PASSWORD ?? 'loadtest123';
const ITEM_POOL = Number(process.env.ITEMS ?? 8); // items the driver rotates through for attempts

function studentEmail(i: number): string {
  return `${LOADTEST_PREFIX}-student-${i}@${STUDENT_DOMAIN}`;
}

async function main() {
  if (!Number.isInteger(STUDENTS) || STUDENTS < 1 || STUDENTS > 5000) {
    throw new Error(`STUDENTS must be 1–5000 (got ${process.env.STUDENTS})`);
  }

  console.log(`[loadtest-seed] provisioning ${STUDENTS} students…`);

  // 1. Find a subject → skill → items chain to target. Prefer MCQ items so the
  //    attempts path never invokes AI marking, and a skill with enough items
  //    that next-item selection won't trigger AI generation mid-test.
  const skillWithItems = await prisma.skill.findFirst({
    where: { items: { some: { item: { type: 'MCQ' } } } },
    select: {
      id: true,
      code: true,
      subjectId: true,
      items: {
        where: { item: { type: 'MCQ' } },
        select: { item: { select: { id: true, type: true } } },
        take: ITEM_POOL,
      },
    },
  });

  if (!skillWithItems || skillWithItems.items.length === 0) {
    throw new Error(
      'No subject/skill with MCQ items found. Run the main DB seed first (npm run db:seed).',
    );
  }

  const subjectId = skillWithItems.subjectId;
  const skillId = skillWithItems.id;
  const itemIds = skillWithItems.items.map((s) => s.item.id);
  console.log(`[loadtest-seed] targeting skill ${skillWithItems.code} with ${itemIds.length} MCQ item(s)`);

  // 2. Tear down any prior load-test fixture (idempotent re-runs).
  const priorStudents = await prisma.user.findMany({
    where: { email: { endsWith: `@${STUDENT_DOMAIN}` } },
    select: { id: true },
  });
  const priorStudentIds = priorStudents.map((s) => s.id);
  const priorTeacher = await prisma.user.findUnique({
    where: { email: `${LOADTEST_PREFIX}-teacher@${STUDENT_DOMAIN}` },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.liveAttempt.deleteMany({ where: { studentUserId: { in: priorStudentIds } } }),
    prisma.laneTransition.deleteMany({ where: { studentUserId: { in: priorStudentIds } } }),
    // LiveParticipant + LiveSession cascade from session delete below.
    prisma.liveSession.deleteMany({
      where: { teacherUserId: priorTeacher?.id ?? '__none__' },
    }),
    prisma.classroomEnrollment.deleteMany({ where: { studentUserId: { in: priorStudentIds } } }),
  ]);

  // 3. Teacher + profile.
  const teacherPassword = await bcrypt.hash(PASSWORD, 10);
  const teacher = await prisma.user.upsert({
    where: { email: `${LOADTEST_PREFIX}-teacher@${STUDENT_DOMAIN}` },
    update: {},
    create: {
      email: `${LOADTEST_PREFIX}-teacher@${STUDENT_DOMAIN}`,
      password: teacherPassword,
      name: 'Load Test Teacher',
      role: 'TEACHER',
    },
    select: { id: true },
  });
  const teacherProfile = await prisma.teacherProfile.upsert({
    where: { userId: teacher.id },
    update: {},
    create: { userId: teacher.id, externalTeacherId: `${LOADTEST_PREFIX}-teacher` },
    select: { id: true },
  });

  // 4. Classroom + teacher link.
  const classroom = await prisma.classroom.upsert({
    where: { externalSource_externalClassId: { externalSource: LOADTEST_PREFIX, externalClassId: `${LOADTEST_PREFIX}-class` } },
    update: {},
    create: {
      externalSource: LOADTEST_PREFIX,
      externalClassId: `${LOADTEST_PREFIX}-class`,
      name: 'Load Test Class',
      yearGroup: '8',
    },
    select: { id: true },
  });
  await prisma.teacherClassroom.upsert({
    where: { teacherProfileId_classroomId: { teacherProfileId: teacherProfile.id, classroomId: classroom.id } },
    update: {},
    create: { teacherProfileId: teacherProfile.id, classroomId: classroom.id },
  });

  // 5. Students — created in batches; passwords share one hash (load test only).
  const studentHash = await bcrypt.hash(PASSWORD, 10);
  const BATCH = 200;
  const studentIds: string[] = [];
  for (let start = 0; start < STUDENTS; start += BATCH) {
    const end = Math.min(start + BATCH, STUDENTS);
    const rows: Prisma.UserCreateManyInput[] = [];
    for (let i = start; i < end; i++) {
      rows.push({ email: studentEmail(i), password: studentHash, name: `LT Student ${i}`, role: 'STUDENT' });
    }
    await prisma.user.createMany({ data: rows, skipDuplicates: true });
    process.stdout.write(`\r[loadtest-seed] students created: ${end}/${STUDENTS}`);
  }
  process.stdout.write('\n');

  const students = await prisma.user.findMany({
    where: { email: { endsWith: `@${STUDENT_DOMAIN}` }, role: 'STUDENT' },
    select: { id: true },
  });
  for (const s of students) studentIds.push(s.id);

  // 6. Enrol students.
  await prisma.classroomEnrollment.createMany({
    data: studentIds.map((id) => ({ classroomId: classroom.id, studentUserId: id })),
    skipDuplicates: true,
  });

  // 7. ACTIVE live session + participants.
  const joinCode = `LT${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const session = await prisma.liveSession.create({
    data: {
      classroomId: classroom.id,
      teacherUserId: teacher.id,
      subjectId,
      skillId,
      status: 'ACTIVE',
      phase: 'DIAGNOSTIC',
      joinCode,
      startedAt: new Date(),
    },
    select: { id: true, joinCode: true },
  });

  await prisma.liveParticipant.createMany({
    data: studentIds.map((id) => ({
      liveSessionId: session.id,
      studentUserId: id,
      currentLane: 'LANE_1' as const,
      laneAssignedAt: new Date(),
    })),
    skipDuplicates: true,
  });

  // 8. Write the fixture the driver consumes.
  const fixture = {
    baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
    sessionId: session.id,
    joinCode: session.joinCode,
    subjectId,
    skillId,
    itemIds,
    studentCount: STUDENTS,
    studentEmailPattern: `${LOADTEST_PREFIX}-student-{i}@${STUDENT_DOMAIN}`,
    password: PASSWORD,
    seededAt: new Date().toISOString(),
  };
  const outPath = path.join(__dirname, 'fixture.json');
  writeFileSync(outPath, JSON.stringify(fixture, null, 2));

  console.log(`[loadtest-seed] done.`);
  console.log(`  session:   ${session.id} (join ${session.joinCode})`);
  console.log(`  students:  ${STUDENTS}`);
  console.log(`  fixture:   ${outPath}`);
  console.log(`\nRun the driver:  node scripts/loadtest/run-loadtest.mjs`);
}

main()
  .catch((err) => {
    console.error('[loadtest-seed] failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
