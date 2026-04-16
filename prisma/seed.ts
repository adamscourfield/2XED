import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding KS3 Maths (full curriculum: N1–N6, A1, G1, S1)...');

  // 1️⃣ Demo student
  const hashedPassword = await bcrypt.hash('password123', 10);
  const student = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: {
      email: 'student@example.com',
      password: hashedPassword,
      name: 'Test Student',
      role: 'STUDENT',
    },
  });

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@anaxi.local' },
    update: {},
    create: {
      email: 'admin@anaxi.local',
      password: adminPassword,
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  // Demo teacher
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@example.com' },
    update: {},
    create: {
      email: 'teacher@example.com',
      password: teacherPassword,
      name: 'Demo Teacher',
      role: 'TEACHER',
    },
  });

  // Teacher profile (required for /teacher/dashboard analytics)
  const teacherProfile = await prisma.teacherProfile.upsert({
    where: { userId: teacher.id },
    update: {},
    create: {
      userId: teacher.id,
      externalSource: 'anaxi_observe',
      externalTeacherId: 'demo-teacher-001',
      externalSchoolId: 'demo-school-001',
      displayName: 'Demo Teacher',
    },
  });

  // Demo classroom
  const classroom = await prisma.classroom.upsert({
    where: { externalSource_externalClassId: { externalSource: 'anaxi_observe', externalClassId: 'demo-class-7a' } },
    update: {},
    create: {
      externalSource: 'anaxi_observe',
      externalClassId: 'demo-class-7a',
      externalSchoolId: 'demo-school-001',
      name: 'Year 7A — Maths',
      yearGroup: 'Year 7',
      subjectSlug: 'ks3-maths',
    },
  });

  // Link teacher to classroom
  await prisma.teacherClassroom.upsert({
    where: { teacherProfileId_classroomId: { teacherProfileId: teacherProfile.id, classroomId: classroom.id } },
    update: {},
    create: {
      teacherProfileId: teacherProfile.id,
      classroomId: classroom.id,
      roleLabel: 'Lead teacher',
    },
  });

  // Enrol demo student in the classroom (requires a StudentProfile first)
  const studentProfile = await prisma.studentProfile.upsert({
    where: { userId: student.id },
    update: {},
    create: {
      userId: student.id,
      externalSource: 'anaxi_observe',
      externalStudentId: 'demo-student-001',
      externalSchoolId: 'demo-school-001',
    },
  });

  await prisma.classroomEnrollment.upsert({
    where: { classroomId_studentUserId: { classroomId: classroom.id, studentUserId: student.id } },
    update: {},
    create: {
      classroomId: classroom.id,
      studentUserId: student.id,
      studentProfileId: studentProfile.id,
    },
  });

  // 2️⃣ Subject
  const subject = await prisma.subject.upsert({
    where: { slug: 'ks3-maths' },
    update: {},
    create: {
      slug: 'ks3-maths',
      title: 'KS3 Maths',
      description: '2XED - Maths (Year 7 Entry) Number and FDP v1',
    },
  });

  // 3️⃣ Skill definitions
  const skillDefs = [
    { code: 'N1.1',  name: 'Recognise the place value of each digit in whole numbers up to millions',               strand: 'PV',  isStretch: false, sortOrder: 5   },
    { code: 'N1.2',  name: 'Write integers in words and figures',                                                    strand: 'PV',  isStretch: false, sortOrder: 7   },
    { code: 'N1.3',  name: 'Compare two numbers using =, ≠, <, >, ≤, ≥',                                            strand: 'PV',  isStretch: false, sortOrder: 10  },
    { code: 'N1.4',  name: 'Use and interpret inequalities in context (incl number lines and statements)',          strand: 'PV',  isStretch: false, sortOrder: 15  },
    { code: 'N1.5',  name: 'Find the median from a set of numbers (incl midpoint using a calculator)',               strand: 'STA', isStretch: false, sortOrder: 20  },
    { code: 'N1.6',  name: 'Decimal place value',                                                                    strand: 'PV',  isStretch: false, sortOrder: 30  },
    { code: 'N1.7',  name: 'Compare decimals using =, ≠, <, >, ≤, ≥',                                              strand: 'PV',  isStretch: false, sortOrder: 40  },
    { code: 'N1.8',  name: 'Order a list of decimals',                                                               strand: 'PV',  isStretch: false, sortOrder: 50  },
    { code: 'N1.9',  name: 'Position integers on a number line',                                                     strand: 'PV',  isStretch: false, sortOrder: 60  },
    { code: 'N1.10', name: 'Rounding to the nearest 10, 100, 1000, integer',                                         strand: 'PV',  isStretch: false, sortOrder: 70  },
    { code: 'N1.11', name: 'Position decimals on a number line (incl midpoint using a calculator)',                  strand: 'PV',  isStretch: false, sortOrder: 80  },
    { code: 'N1.12', name: 'Rounding to decimal places',                                                             strand: 'PV',  isStretch: false, sortOrder: 90  },
    { code: 'N1.13', name: 'Position negatives on a number line',                                                    strand: 'PV',  isStretch: false, sortOrder: 100 },
    { code: 'N1.14', name: 'Compare negatives using =, ≠, <, >, ≤, ≥',                                             strand: 'PV',  isStretch: false, sortOrder: 110 },
    { code: 'N1.15', name: 'Order any integers, negatives and decimals',                                             strand: 'PV',  isStretch: false, sortOrder: 120 },
    { code: 'N1.16', name: 'Rounding to significant figures',                                                        strand: 'PV',  isStretch: true,  sortOrder: 130 },
    { code: 'N1.17', name: 'Write 10, 100, 1000 etc. as powers of 10',                                              strand: 'POW', isStretch: true,  sortOrder: 140 },
    { code: 'N1.18', name: 'Write positive integers in the form A × 10^n',                                          strand: 'POW', isStretch: true,  sortOrder: 150 },
    { code: 'N1.19', name: 'Understand negative powers of 10',                                                       strand: 'POW', isStretch: true,  sortOrder: 160 },
    { code: 'N1.20', name: 'Place value systems beyond base 10',                                                     strand: 'PV',  isStretch: true,  sortOrder: 170 },
    { code: 'N2.1',  name: 'Properties of addition and subtraction',                                                 strand: 'ADD', isStretch: false, sortOrder: 180 },
    { code: 'N2.2',  name: 'Mental strategies for addition and subtraction',                                         strand: 'ADD', isStretch: false, sortOrder: 190 },
    { code: 'N2.3',  name: 'Use commutative and associative laws',                                                   strand: 'LAW', isStretch: false, sortOrder: 200 },
    { code: 'N2.4',  name: 'Use formal methods for addition of integers',                                            strand: 'ADD', isStretch: false, sortOrder: 205 },
    { code: 'N2.5',  name: 'Use formal methods for addition of decimals',                                            strand: 'ADD', isStretch: false, sortOrder: 210 },
    { code: 'N2.6',  name: 'Use formal methods for subtraction of integers',                                         strand: 'ADD', isStretch: false, sortOrder: 215 },
    { code: 'N2.7',  name: 'Use formal methods for subtraction of decimals; complement of a decimal (1 − p)',        strand: 'ADD', isStretch: false, sortOrder: 220 },
    { code: 'N2.8',  name: 'Money problems involving addition and subtraction',                                      strand: 'ADD', isStretch: false, sortOrder: 230 },
    { code: 'N2.9',  name: 'Perimeter of irregular polygons',                                                        strand: 'PER', isStretch: false, sortOrder: 240 },
    { code: 'N2.10', name: 'Perimeter of regular polygons',                                                          strand: 'PER', isStretch: false, sortOrder: 250 },
    { code: 'N2.11', name: 'Perimeter of rectangles and parallelograms',                                             strand: 'PER', isStretch: false, sortOrder: 260 },
    { code: 'N2.12', name: 'Perimeter of an isosceles triangle or an isosceles trapezium',                           strand: 'PER', isStretch: false, sortOrder: 270 },
    { code: 'N2.13', name: 'Perimeter of a compound shape',                                                          strand: 'PER', isStretch: false, sortOrder: 280 },
    { code: 'N2.14', name: 'Solve problems involving tables and timetables',                                         strand: 'REP', isStretch: false, sortOrder: 290 },
    { code: 'N2.15', name: 'Solve problems with frequency trees',                                                    strand: 'REP', isStretch: false, sortOrder: 300 },
    { code: 'N2.16', name: 'Add and subtract numbers given in standard form',                                        strand: 'POW', isStretch: true,  sortOrder: 310 },
    { code: 'N3.1',  name: 'Properties of multiplication and division',                                              strand: 'MUL', isStretch: false, sortOrder: 380 },
    { code: 'N3.2',  name: 'Mental strategies for multiplication and division',                                      strand: 'MUL', isStretch: false, sortOrder: 390 },
    { code: 'N3.3',  name: 'Multiply and divide integers and decimals by powers of 10',                             strand: 'MUL', isStretch: false, sortOrder: 400 },
    { code: 'N3.4',  name: 'Multiplication (without carrying)',                                                      strand: 'MUL', isStretch: false, sortOrder: 405 },
    { code: 'N3.5',  name: 'Multiplication (with carrying)',                                                         strand: 'MUL', isStretch: false, sortOrder: 410 },
    { code: 'N3.6',  name: 'Area of rectangles, parallelograms, triangles and compound shapes',                     strand: 'ARE', isStretch: false, sortOrder: 420 },
    { code: 'N3.7',  name: 'Short division (without carrying)',                                                      strand: 'MUL', isStretch: false, sortOrder: 425 },
    { code: 'N3.8',  name: 'Short division (with carrying)',                                                         strand: 'MUL', isStretch: false, sortOrder: 430 },
    { code: 'N3.9',  name: 'Order of Operations (DM before AS, L→R, indices/roots, brackets, inserting brackets)',  strand: 'ORD', isStretch: false, sortOrder: 440 },
    { code: 'N3.10', name: 'Multiples',                                                                              strand: 'FAC', isStretch: false, sortOrder: 450 },
    { code: 'N3.11', name: 'Factors',                                                                                strand: 'FAC', isStretch: false, sortOrder: 460 },
    { code: 'N3.12', name: 'Lowest Common Multiple',                                                                 strand: 'FAC', isStretch: false, sortOrder: 470 },
    { code: 'N3.13', name: 'Highest Common Factor',                                                                  strand: 'FAC', isStretch: false, sortOrder: 480 },
    { code: 'N3.14', name: 'Convert metric units',                                                                   strand: 'MEA', isStretch: false, sortOrder: 490 },
    { code: 'N3.15', name: 'Decimal multiplication (decimal × integer)',                                             strand: 'MUL', isStretch: false, sortOrder: 500 },
    { code: 'N3.16', name: 'Decimal multiplication (decimal × decimal)',                                             strand: 'MUL', isStretch: false, sortOrder: 510 },
    { code: 'N3.17', name: 'Multiply by 0.1 and 0.01',                                                              strand: 'MUL', isStretch: true,  sortOrder: 520 },
    { code: 'N3.18', name: 'Short division (remainders)',                                                            strand: 'MUL', isStretch: false, sortOrder: 530 },
    { code: 'N3.19', name: 'Short division (decimal answers)',                                                       strand: 'MUL', isStretch: false, sortOrder: 540 },
    { code: 'N3.20', name: 'Divide decimals (by an integer / by a decimal; incl ÷0.1, ÷0.2, ÷0.5 etc.)',           strand: 'MUL', isStretch: true,  sortOrder: 550 },
    { code: 'N3.21', name: 'Find missing lengths given area (rectangles, parallelograms, triangles and compound shapes)', strand: 'ARE', isStretch: false, sortOrder: 560 },
    { code: 'N3.22', name: 'Solve problems using the mean',                                                          strand: 'STA', isStretch: false, sortOrder: 570 },
    { code: 'N3.23', name: 'Square and cube numbers, roots',                                                         strand: 'SQR', isStretch: false, sortOrder: 580 },
    { code: 'N3.24', name: 'Introduction to primes',                                                                 strand: 'FAC', isStretch: false, sortOrder: 590 },
    { code: 'N4.1',  name: 'Understand a fraction as part of a whole and locate simple fractions on a number line',  strand: 'FDP', isStretch: false, sortOrder: 600 },
    { code: 'N4.2',  name: 'Generate equivalent fractions',                                                          strand: 'FDP', isStretch: false, sortOrder: 610 },
    { code: 'N4.3',  name: 'Simplify a fraction using factors/HCF',                                                  strand: 'FDP', isStretch: false, sortOrder: 620 },
    { code: 'N4.4',  name: 'Convert a fraction to a decimal (terminating decimals)',                                  strand: 'FDP', isStretch: false, sortOrder: 630 },
    { code: 'N4.5',  name: 'Convert a decimal to a fraction (simple/terminating)',                                   strand: 'FDP', isStretch: false, sortOrder: 640 },
    { code: 'N4.6',  name: 'Convert a decimal to a percentage and a percentage to a decimal',                        strand: 'FDP', isStretch: false, sortOrder: 650 },
    { code: 'N4.7',  name: 'Convert a fraction to a percentage (via decimal or equivalence to /100)',                strand: 'FDP', isStretch: false, sortOrder: 660 },
    { code: 'N4.8',  name: 'Compare and order fractions, decimals and percentages',                                  strand: 'FDP', isStretch: false, sortOrder: 670 },
    { code: 'N4.9',  name: 'Find a percentage of an amount (using non-calculator-friendly methods)',                  strand: 'FDP', isStretch: false, sortOrder: 680 },
    // ── N5: Fractions ──────────────────────────────────────────────────────────
    { code: 'N5.1',  name: 'Concept of a fraction — shading shapes, bar models, placing on a number line',            strand: 'FRA', isStretch: false, sortOrder: 700  },
    { code: 'N5.2',  name: 'Equivalent fractions: generating, showing equivalence, finding missing numbers',          strand: 'FRA', isStretch: false, sortOrder: 710  },
    { code: 'N5.3',  name: 'Place fractions on a number line; compare and order fractions',                           strand: 'FRA', isStretch: false, sortOrder: 720  },
    { code: 'N5.4',  name: 'Simplify fractions',                                                                      strand: 'FRA', isStretch: false, sortOrder: 730  },
    { code: 'N5.5',  name: 'Express one quantity as a fraction of another',                                           strand: 'FRA', isStretch: false, sortOrder: 740  },
    { code: 'N5.6',  name: 'Convert between mixed numbers and improper fractions; write integers as fractions',       strand: 'FRA', isStretch: false, sortOrder: 750  },
    { code: 'N5.7',  name: 'Add fractions (same then different denominators)',                                        strand: 'FRA', isStretch: false, sortOrder: 760  },
    { code: 'N5.8',  name: 'Subtract fractions (same then different denominators)',                                   strand: 'FRA', isStretch: false, sortOrder: 770  },
    { code: 'N5.9',  name: 'Add fractions with mixed numbers (same then different denominators)',                     strand: 'FRA', isStretch: false, sortOrder: 780  },
    { code: 'N5.10', name: 'Subtract fractions with mixed numbers (same then different denominators)',                strand: 'FRA', isStretch: false, sortOrder: 790  },
    { code: 'N5.11', name: 'Fractions with negatives (addition and subtraction)',                                     strand: 'FRA', isStretch: true,  sortOrder: 800  },
    { code: 'N5.12', name: 'Order of operations with fractions (addition and subtraction, no multiply/divide)',       strand: 'FRA', isStretch: true,  sortOrder: 810  },
    // ── A1: Algebra ────────────────────────────────────────────────────────────
    { code: 'A1.1',  name: 'Algebraic terminology (e.g. term, expression, coefficient)',                               strand: 'ALG', isStretch: false, sortOrder: 1100 },
    { code: 'A1.2',  name: 'Algebraic notation and basic collecting like terms (juxtaposition, index, fraction)',    strand: 'ALG', isStretch: false, sortOrder: 1110 },
    { code: 'A1.3',  name: 'Substitution into expressions',                                                           strand: 'ALG', isStretch: false, sortOrder: 1120 },
    { code: 'A1.4',  name: 'Simplify expressions by collecting like terms',                                           strand: 'ALG', isStretch: false, sortOrder: 1130 },
    { code: 'A1.5',  name: 'Multiply a single term over a bracket (expand)',                                          strand: 'ALG', isStretch: false, sortOrder: 1140 },
    { code: 'A1.6',  name: 'Factorise by taking out a common factor',                                                strand: 'ALG', isStretch: false, sortOrder: 1150 },
    { code: 'A1.7',  name: 'Write expressions and formulae from worded descriptions',                                strand: 'ALG', isStretch: false, sortOrder: 1160 },
    { code: 'A1.8',  name: 'Solve one-step linear equations',                                                         strand: 'ALG', isStretch: false, sortOrder: 1170 },
    { code: 'A1.9',  name: 'Solve two-step linear equations',                                                         strand: 'ALG', isStretch: false, sortOrder: 1180 },
    { code: 'A1.10', name: 'Solve equations with unknowns on both sides',                                            strand: 'ALG', isStretch: false, sortOrder: 1190 },
    { code: 'A1.11', name: 'Solve equations involving brackets',                                                      strand: 'ALG', isStretch: false, sortOrder: 1200 },
    { code: 'A1.12', name: 'Generate terms of a sequence from a term-to-term rule',                                  strand: 'SEQ', isStretch: false, sortOrder: 1210 },
    { code: 'A1.13', name: 'Generate terms of a sequence from a position-to-term (nth term) rule',                   strand: 'SEQ', isStretch: false, sortOrder: 1220 },
    { code: 'A1.14', name: 'Find the nth term rule for a linear sequence',                                           strand: 'SEQ', isStretch: false, sortOrder: 1230 },
    { code: 'A1.15', name: 'Recognise and use sequences of triangular, square and cube numbers',                     strand: 'SEQ', isStretch: false, sortOrder: 1240 },
    { code: 'A1.16', name: 'Use coordinates in all four quadrants',                                                   strand: 'GRA', isStretch: false, sortOrder: 1250 },
    { code: 'A1.17', name: 'Plot and interpret straight-line graphs (y = mx + c)',                                    strand: 'GRA', isStretch: false, sortOrder: 1260 },
    { code: 'A1.18', name: 'Inequalities on a number line (integer solutions)',                                       strand: 'ALG', isStretch: true,  sortOrder: 1270 },
    { code: 'A1.19', name: 'Form and solve equations from context (word problems)',                                   strand: 'ALG', isStretch: true,  sortOrder: 1280 },
    // ── G1: Angles and polygons ────────────────────────────────────────────────
    { code: 'G1.1',  name: 'Identify and name types of angles (acute, right, obtuse, reflex)',                        strand: 'GEO', isStretch: false, sortOrder: 1300 },
    { code: 'G1.1b', name: 'Understand angle notation (e.g. ∠ABC) and label angles correctly',                        strand: 'GEO', isStretch: false, sortOrder: 1305 },
    { code: 'G1.2',  name: 'Measure angles with a protractor',                                                        strand: 'GEO', isStretch: false, sortOrder: 1310 },
    { code: 'G1.3',  name: 'Draw angles with a protractor',                                                           strand: 'GEO', isStretch: false, sortOrder: 1320 },
    { code: 'G1.4',  name: 'Angles on a straight line sum to 180°',                                                  strand: 'GEO', isStretch: false, sortOrder: 1330 },
    { code: 'G1.5',  name: 'Angles around a point sum to 360°',                                                      strand: 'GEO', isStretch: false, sortOrder: 1340 },
    { code: 'G1.6',  name: 'Vertically opposite angles are equal',                                                    strand: 'GEO', isStretch: false, sortOrder: 1350 },
    { code: 'G1.7',  name: 'Angles in a triangle sum to 180°',                                                       strand: 'GEO', isStretch: false, sortOrder: 1360 },
    { code: 'G1.8',  name: 'Angles in a quadrilateral sum to 360°',                                                  strand: 'GEO', isStretch: false, sortOrder: 1370 },
    { code: 'G1.9',  name: 'Interior angle sum of any polygon',                                                       strand: 'GEO', isStretch: false, sortOrder: 1380 },
    { code: 'G1.10', name: 'Exterior angles of any polygon sum to 360°; regular polygon calculations',               strand: 'GEO', isStretch: true,  sortOrder: 1390 },
    // ── N6: Fractions, decimals, percentages (extended) ────────────────────────
    { code: 'N6.1',  name: 'Multiply a fraction by an integer',                                                       strand: 'FDP', isStretch: false, sortOrder: 1400 },
    { code: 'N6.2',  name: 'Multiply a fraction by a fraction',                                                       strand: 'FDP', isStretch: false, sortOrder: 1410 },
    { code: 'N6.3',  name: 'Divide a fraction by an integer',                                                         strand: 'FDP', isStretch: false, sortOrder: 1420 },
    { code: 'N6.4',  name: 'Divide an integer by a fraction',                                                         strand: 'FDP', isStretch: false, sortOrder: 1430 },
    { code: 'N6.5',  name: 'Divide a fraction by a fraction',                                                         strand: 'FDP', isStretch: false, sortOrder: 1440 },
    { code: 'N6.6',  name: 'Multiply and divide with mixed numbers',                                                  strand: 'FDP', isStretch: false, sortOrder: 1450 },
    { code: 'N6.7',  name: 'Order of operations with fractions (all four operations)',                                strand: 'FDP', isStretch: false, sortOrder: 1460 },
    { code: 'N6.8',  name: 'Convert a recurring decimal to a fraction',                                              strand: 'FDP', isStretch: true,  sortOrder: 1470 },
    { code: 'N6.9',  name: 'Recognise recurring decimals from fraction division',                                    strand: 'FDP', isStretch: false, sortOrder: 1480 },
    { code: 'N6.10', name: 'Find a percentage of an amount (with a calculator)',                                     strand: 'FDP', isStretch: false, sortOrder: 1490 },
    { code: 'N6.11', name: 'Express one quantity as a percentage of another',                                        strand: 'FDP', isStretch: false, sortOrder: 1500 },
    { code: 'N6.12', name: 'Percentage increase and decrease',                                                        strand: 'FDP', isStretch: false, sortOrder: 1510 },
    { code: 'N6.13', name: 'Find the original value after a percentage change (reverse percentages)',                 strand: 'FDP', isStretch: false, sortOrder: 1520 },
    { code: 'N6.14', name: 'Repeated percentage change (compound interest, depreciation)',                            strand: 'FDP', isStretch: true,  sortOrder: 1530 },
    { code: 'N6.15', name: 'Express one number as a fraction or percentage of another in context',                   strand: 'FDP', isStretch: false, sortOrder: 1540 },
    { code: 'N6.16', name: 'Use ratio notation; simplify ratios',                                                     strand: 'RAT', isStretch: false, sortOrder: 1550 },
    { code: 'N6.17', name: 'Share a quantity in a given ratio',                                                       strand: 'RAT', isStretch: false, sortOrder: 1560 },
    { code: 'N6.18', name: 'Use the unitary method for ratio and proportion problems',                               strand: 'RAT', isStretch: false, sortOrder: 1570 },
    { code: 'N6.19', name: 'Convert between fractions, decimals and percentages (including recurring)',              strand: 'FDP', isStretch: false, sortOrder: 1580 },
    { code: 'N6.20', name: 'Solve problems involving FDP in context (best buy, discounts, profit/loss)',             strand: 'FDP', isStretch: false, sortOrder: 1590 },
    // ── S1: Probability ────────────────────────────────────────────────────────
    { code: 'S1.1',  name: 'Use the vocabulary of probability and the probability scale',                             strand: 'PRO', isStretch: false, sortOrder: 1600 },
    { code: 'S1.2',  name: 'Understand that probabilities sum to 1 (using fractions, decimals and percentages)',      strand: 'PRO', isStretch: false, sortOrder: 1610 },
    { code: 'S1.3',  name: 'Calculate the probability of a single event',                                            strand: 'PRO', isStretch: false, sortOrder: 1620 },
    { code: 'S1.4',  name: 'Construct sample space diagrams for two events',                                         strand: 'PRO', isStretch: false, sortOrder: 1630 },
    { code: 'S1.5',  name: 'Calculate probabilities from sample space diagrams for two events',                       strand: 'PRO', isStretch: false, sortOrder: 1640 },
    { code: 'S1.6',  name: 'Identify and represent sets',                                                             strand: 'PRO', isStretch: false, sortOrder: 1650 },
    { code: 'S1.7',  name: 'Create Venn diagrams where all information is given',                                     strand: 'PRO', isStretch: false, sortOrder: 1660 },
    { code: 'S1.8',  name: 'Interpret Venn diagrams where all information is given',                                  strand: 'PRO', isStretch: false, sortOrder: 1670 },
    { code: 'S1.9',  name: 'Understand the intersection of sets to interpret and create Venn diagrams',              strand: 'PRO', isStretch: false, sortOrder: 1680 },
    { code: 'S1.10', name: 'Understand the union of sets to interpret and create Venn diagrams',                     strand: 'PRO', isStretch: false, sortOrder: 1690 },
    { code: 'S1.11', name: 'Calculate probability from Venn diagrams',                                               strand: 'PRO', isStretch: false, sortOrder: 1700 },
    { code: 'S1.12', name: 'The complement of a set',                                                                strand: 'PRO', isStretch: true,  sortOrder: 1710 },
  ];

  // 4️⃣ Upsert skills and build code→id map
  const skillMap = new Map<string, string>();
  for (const def of skillDefs) {
    const slug = def.code.toLowerCase().replace('.', '-');
    const skill = await prisma.skill.upsert({
      where: { subjectId_code: { subjectId: subject.id, code: def.code } },
      update: { name: def.name, strand: def.strand, isStretch: def.isStretch, sortOrder: def.sortOrder, slug },
      create: {
        code: def.code,
        name: def.name,
        slug,
        strand: def.strand,
        isStretch: def.isStretch,
        sortOrder: def.sortOrder,
        subjectId: subject.id,
      },
    });
    skillMap.set(def.code, skill.id);
  }

  // 5️⃣ SkillPrereq edges
  const prereqEdges: Array<{ parentCode: string; childCode: string; weight: number }> = [
    { parentCode: 'N1.1',  childCode: 'N1.2',  weight: 1 },
    { parentCode: 'N1.1',  childCode: 'N1.3',  weight: 1 },
    { parentCode: 'N1.3',  childCode: 'N1.4',  weight: 1 },
    { parentCode: 'N1.3',  childCode: 'N1.9',  weight: 1 },
    { parentCode: 'N1.6',  childCode: 'N1.7',  weight: 1 },
    { parentCode: 'N1.3',  childCode: 'N1.7',  weight: 1 },
    { parentCode: 'N1.7',  childCode: 'N1.8',  weight: 1 },
    { parentCode: 'N1.6',  childCode: 'N1.11', weight: 1 },
    { parentCode: 'N1.9',  childCode: 'N1.11', weight: 1 },
    { parentCode: 'N1.9',  childCode: 'N1.13', weight: 1 },
    { parentCode: 'N1.13', childCode: 'N1.14', weight: 1 },
    { parentCode: 'N1.3',  childCode: 'N1.14', weight: 1 },
    { parentCode: 'N1.8',  childCode: 'N1.15', weight: 1 },
    { parentCode: 'N1.14', childCode: 'N1.15', weight: 1 },
    { parentCode: 'N1.11', childCode: 'N1.15', weight: 1 },
    { parentCode: 'N1.9',  childCode: 'N1.10', weight: 1 },
    { parentCode: 'N1.6',  childCode: 'N1.12', weight: 1 },
    { parentCode: 'N1.11', childCode: 'N1.12', weight: 1 },
    { parentCode: 'N1.10', childCode: 'N1.16', weight: 1 },
    { parentCode: 'N1.12', childCode: 'N1.16', weight: 1 },
    { parentCode: 'N1.3',  childCode: 'N1.5',  weight: 1 },
    { parentCode: 'N1.15', childCode: 'N1.5',  weight: 1 },
    { parentCode: 'N1.3',  childCode: 'N2.1',  weight: 1 },
    { parentCode: 'N2.1',  childCode: 'N2.2',  weight: 1 },
    { parentCode: 'N2.2',  childCode: 'N2.4',  weight: 1 },
    { parentCode: 'N2.4',  childCode: 'N2.5',  weight: 1 },
    { parentCode: 'N2.4',  childCode: 'N2.6',  weight: 1 },
    { parentCode: 'N2.6',  childCode: 'N2.7',  weight: 1 },
    { parentCode: 'N1.3',  childCode: 'N2.3',  weight: 1 },
    { parentCode: 'N1.6',  childCode: 'N2.5',  weight: 1 },
    { parentCode: 'N2.5',  childCode: 'N2.7',  weight: 1 },
    { parentCode: 'N2.5',  childCode: 'N2.8',  weight: 1 },
    { parentCode: 'N2.7',  childCode: 'N2.8',  weight: 1 },
    { parentCode: 'N2.5',  childCode: 'N2.11', weight: 1 },
    { parentCode: 'N2.11', childCode: 'N2.10', weight: 1 },
    { parentCode: 'N2.11', childCode: 'N2.12', weight: 1 },
    { parentCode: 'N2.11', childCode: 'N2.9',  weight: 1 },
    { parentCode: 'N2.9',  childCode: 'N2.13', weight: 1 },
    { parentCode: 'N1.3',  childCode: 'N2.14', weight: 1 },
    { parentCode: 'N1.3',  childCode: 'N2.15', weight: 1 },
    { parentCode: 'N2.3',  childCode: 'N3.1',  weight: 1 },
    { parentCode: 'N3.1',  childCode: 'N3.2',  weight: 1 },
    { parentCode: 'N3.2',  childCode: 'N3.4',  weight: 1 },
    { parentCode: 'N1.6',  childCode: 'N3.3',  weight: 1 },
    { parentCode: 'N3.4',  childCode: 'N3.5',  weight: 1 },
    { parentCode: 'N3.4',  childCode: 'N3.7',  weight: 1 },
    { parentCode: 'N2.3',  childCode: 'N3.5',  weight: 1 },
    { parentCode: 'N3.5',  childCode: 'N3.15', weight: 1 },
    { parentCode: 'N1.6',  childCode: 'N3.15', weight: 1 },
    { parentCode: 'N3.15', childCode: 'N3.16', weight: 1 },
    { parentCode: 'N3.5',  childCode: 'N3.8',  weight: 1 },
    { parentCode: 'N3.7',  childCode: 'N3.8',  weight: 1 },
    { parentCode: 'N3.8',  childCode: 'N3.18', weight: 1 },
    { parentCode: 'N3.8',  childCode: 'N3.19', weight: 1 },
    { parentCode: 'N1.6',  childCode: 'N3.19', weight: 1 },
    { parentCode: 'N3.19', childCode: 'N3.20', weight: 1 },
    { parentCode: 'N3.3',  childCode: 'N3.20', weight: 1 },
    { parentCode: 'N2.5',  childCode: 'N3.6',  weight: 1 },
    { parentCode: 'N3.5',  childCode: 'N3.6',  weight: 1 },
    { parentCode: 'N3.6',  childCode: 'N3.21', weight: 1 },
    { parentCode: 'N3.8',  childCode: 'N3.21', weight: 1 },
    { parentCode: 'N3.3',  childCode: 'N3.14', weight: 1 },
    { parentCode: 'N3.5',  childCode: 'N3.10', weight: 1 },
    { parentCode: 'N3.10', childCode: 'N3.11', weight: 1 },
    { parentCode: 'N3.10', childCode: 'N3.12', weight: 1 },
    { parentCode: 'N3.11', childCode: 'N3.13', weight: 1 },
    { parentCode: 'N3.11', childCode: 'N3.24', weight: 1 },
    { parentCode: 'N3.5',  childCode: 'N3.23', weight: 1 },
    { parentCode: 'N2.5',  childCode: 'N3.9',  weight: 1 },
    { parentCode: 'N2.7',  childCode: 'N3.9',  weight: 1 },
    { parentCode: 'N3.5',  childCode: 'N3.9',  weight: 1 },
    { parentCode: 'N3.23', childCode: 'N3.9',  weight: 1 },
    { parentCode: 'N2.3',  childCode: 'N3.22', weight: 1 },
    { parentCode: 'N2.5',  childCode: 'N3.22', weight: 1 },
    { parentCode: 'N2.7',  childCode: 'N3.22', weight: 1 },
    { parentCode: 'N3.3',  childCode: 'N1.17', weight: 1 },
    { parentCode: 'N1.17', childCode: 'N1.18', weight: 1 },
    { parentCode: 'N1.17', childCode: 'N1.19', weight: 1 },
    { parentCode: 'N1.6',  childCode: 'N1.19', weight: 1 },
    { parentCode: 'N1.18', childCode: 'N2.16', weight: 1 },
    { parentCode: 'N2.5',  childCode: 'N2.16', weight: 1 },
    { parentCode: 'N2.7',  childCode: 'N2.16', weight: 1 },
    { parentCode: 'N1.6',  childCode: 'N1.20', weight: 1 },
    // FDP prereqs
    { parentCode: 'N1.3',  childCode: 'N4.1',  weight: 1 },
    { parentCode: 'N1.9',  childCode: 'N4.1',  weight: 1 },
    { parentCode: 'N1.15', childCode: 'N4.1',  weight: 1 },
    { parentCode: 'N4.1',  childCode: 'N4.2',  weight: 1 },
    { parentCode: 'N3.10', childCode: 'N4.2',  weight: 1 },
    { parentCode: 'N4.2',  childCode: 'N4.3',  weight: 1 },
    { parentCode: 'N3.13', childCode: 'N4.3',  weight: 1 },
    { parentCode: 'N3.19', childCode: 'N4.4',  weight: 1 },
    { parentCode: 'N1.6',  childCode: 'N4.4',  weight: 1 },
    { parentCode: 'N4.3',  childCode: 'N4.4',  weight: 1 },
    { parentCode: 'N4.4',  childCode: 'N4.5',  weight: 1 },
    { parentCode: 'N1.6',  childCode: 'N4.5',  weight: 1 },
    { parentCode: 'N1.6',  childCode: 'N4.6',  weight: 1 },
    { parentCode: 'N3.3',  childCode: 'N4.6',  weight: 1 },
    { parentCode: 'N4.4',  childCode: 'N4.7',  weight: 1 },
    { parentCode: 'N4.2',  childCode: 'N4.7',  weight: 1 },
    { parentCode: 'N4.3',  childCode: 'N4.8',  weight: 1 },
    { parentCode: 'N1.15', childCode: 'N4.8',  weight: 1 },
    { parentCode: 'N4.6',  childCode: 'N4.8',  weight: 1 },
    { parentCode: 'N4.7',  childCode: 'N4.8',  weight: 1 },
    { parentCode: 'N2.5',  childCode: 'N4.9',  weight: 1 },
    { parentCode: 'N3.5',  childCode: 'N4.9',  weight: 1 },
    { parentCode: 'N4.6',  childCode: 'N4.9',  weight: 1 },
    // ── N5 (Fractions) prereqs ──────────────────────────────────────────────
    { parentCode: 'N4.1',  childCode: 'N5.1',  weight: 1 },
    { parentCode: 'N5.1',  childCode: 'N5.2',  weight: 1 },
    { parentCode: 'N4.2',  childCode: 'N5.2',  weight: 1 },
    { parentCode: 'N5.2',  childCode: 'N5.3',  weight: 1 },
    { parentCode: 'N5.2',  childCode: 'N5.4',  weight: 1 },
    { parentCode: 'N4.3',  childCode: 'N5.4',  weight: 1 },
    { parentCode: 'N5.1',  childCode: 'N5.5',  weight: 1 },
    { parentCode: 'N5.4',  childCode: 'N5.5',  weight: 1 },
    { parentCode: 'N5.1',  childCode: 'N5.6',  weight: 1 },
    { parentCode: 'N5.2',  childCode: 'N5.6',  weight: 1 },
    { parentCode: 'N5.4',  childCode: 'N5.7',  weight: 1 },
    { parentCode: 'N3.12', childCode: 'N5.7',  weight: 1 },
    { parentCode: 'N5.7',  childCode: 'N5.8',  weight: 1 },
    { parentCode: 'N5.6',  childCode: 'N5.9',  weight: 1 },
    { parentCode: 'N5.7',  childCode: 'N5.9',  weight: 1 },
    { parentCode: 'N5.6',  childCode: 'N5.10', weight: 1 },
    { parentCode: 'N5.8',  childCode: 'N5.10', weight: 1 },
    { parentCode: 'N5.8',  childCode: 'N5.11', weight: 1 },
    { parentCode: 'N1.13', childCode: 'N5.11', weight: 1 },
    { parentCode: 'N5.7',  childCode: 'N5.12', weight: 1 },
    { parentCode: 'N5.8',  childCode: 'N5.12', weight: 1 },
    { parentCode: 'N3.9',  childCode: 'N5.12', weight: 1 },
    // ── A1 (Algebra) prereqs ────────────────────────────────────────────────
    { parentCode: 'N2.1',  childCode: 'A1.1',  weight: 1 },
    { parentCode: 'N3.1',  childCode: 'A1.1',  weight: 1 },
    { parentCode: 'A1.1',  childCode: 'A1.2',  weight: 1 },
    { parentCode: 'A1.2',  childCode: 'A1.3',  weight: 1 },
    { parentCode: 'N3.9',  childCode: 'A1.3',  weight: 1 },
    { parentCode: 'A1.2',  childCode: 'A1.4',  weight: 1 },
    { parentCode: 'A1.4',  childCode: 'A1.5',  weight: 1 },
    { parentCode: 'N3.5',  childCode: 'A1.5',  weight: 1 },
    { parentCode: 'A1.5',  childCode: 'A1.6',  weight: 1 },
    { parentCode: 'N3.11', childCode: 'A1.6',  weight: 1 },
    { parentCode: 'A1.2',  childCode: 'A1.7',  weight: 1 },
    { parentCode: 'A1.3',  childCode: 'A1.8',  weight: 1 },
    { parentCode: 'N2.1',  childCode: 'A1.8',  weight: 1 },
    { parentCode: 'A1.8',  childCode: 'A1.9',  weight: 1 },
    { parentCode: 'A1.9',  childCode: 'A1.10', weight: 1 },
    { parentCode: 'A1.4',  childCode: 'A1.10', weight: 1 },
    { parentCode: 'A1.10', childCode: 'A1.11', weight: 1 },
    { parentCode: 'A1.5',  childCode: 'A1.11', weight: 1 },
    { parentCode: 'A1.1',  childCode: 'A1.12', weight: 1 },
    { parentCode: 'A1.12', childCode: 'A1.13', weight: 1 },
    { parentCode: 'A1.3',  childCode: 'A1.13', weight: 1 },
    { parentCode: 'A1.13', childCode: 'A1.14', weight: 1 },
    { parentCode: 'A1.12', childCode: 'A1.15', weight: 1 },
    { parentCode: 'N3.23', childCode: 'A1.15', weight: 1 },
    { parentCode: 'A1.1',  childCode: 'A1.16', weight: 1 },
    { parentCode: 'N1.13', childCode: 'A1.16', weight: 1 },
    { parentCode: 'A1.16', childCode: 'A1.17', weight: 1 },
    { parentCode: 'A1.14', childCode: 'A1.17', weight: 1 },
    { parentCode: 'A1.9',  childCode: 'A1.18', weight: 1 },
    { parentCode: 'N1.4',  childCode: 'A1.18', weight: 1 },
    { parentCode: 'A1.9',  childCode: 'A1.19', weight: 1 },
    { parentCode: 'A1.7',  childCode: 'A1.19', weight: 1 },
    // ── G1 (Angles & polygons) prereqs ──────────────────────────────────────
    { parentCode: 'N1.3',  childCode: 'G1.1',  weight: 1 },
    { parentCode: 'G1.1',  childCode: 'G1.1b', weight: 1 },
    { parentCode: 'G1.1b', childCode: 'G1.2',  weight: 1 },
    { parentCode: 'G1.2',  childCode: 'G1.3',  weight: 1 },
    { parentCode: 'G1.1',  childCode: 'G1.4',  weight: 1 },
    { parentCode: 'N2.1',  childCode: 'G1.4',  weight: 1 },
    { parentCode: 'G1.4',  childCode: 'G1.5',  weight: 1 },
    { parentCode: 'G1.4',  childCode: 'G1.6',  weight: 1 },
    { parentCode: 'G1.4',  childCode: 'G1.7',  weight: 1 },
    { parentCode: 'G1.7',  childCode: 'G1.8',  weight: 1 },
    { parentCode: 'G1.5',  childCode: 'G1.8',  weight: 1 },
    { parentCode: 'G1.8',  childCode: 'G1.9',  weight: 1 },
    { parentCode: 'N3.5',  childCode: 'G1.9',  weight: 1 },
    { parentCode: 'G1.9',  childCode: 'G1.10', weight: 1 },
    { parentCode: 'G1.5',  childCode: 'G1.10', weight: 1 },
    { parentCode: 'N3.8',  childCode: 'G1.10', weight: 1 },
    // ── N6 (FDP extended) prereqs ───────────────────────────────────────────
    { parentCode: 'N5.7',  childCode: 'N6.1',  weight: 1 },
    { parentCode: 'N3.5',  childCode: 'N6.1',  weight: 1 },
    { parentCode: 'N6.1',  childCode: 'N6.2',  weight: 1 },
    { parentCode: 'N5.4',  childCode: 'N6.2',  weight: 1 },
    { parentCode: 'N5.8',  childCode: 'N6.3',  weight: 1 },
    { parentCode: 'N3.8',  childCode: 'N6.3',  weight: 1 },
    { parentCode: 'N6.2',  childCode: 'N6.4',  weight: 1 },
    { parentCode: 'N6.3',  childCode: 'N6.4',  weight: 1 },
    { parentCode: 'N6.4',  childCode: 'N6.5',  weight: 1 },
    { parentCode: 'N6.2',  childCode: 'N6.5',  weight: 1 },
    { parentCode: 'N5.6',  childCode: 'N6.6',  weight: 1 },
    { parentCode: 'N6.2',  childCode: 'N6.6',  weight: 1 },
    { parentCode: 'N6.5',  childCode: 'N6.6',  weight: 1 },
    { parentCode: 'N6.6',  childCode: 'N6.7',  weight: 1 },
    { parentCode: 'N3.9',  childCode: 'N6.7',  weight: 1 },
    { parentCode: 'N4.4',  childCode: 'N6.8',  weight: 1 },
    { parentCode: 'N6.9',  childCode: 'N6.8',  weight: 1 },
    { parentCode: 'N4.4',  childCode: 'N6.9',  weight: 1 },
    { parentCode: 'N3.19', childCode: 'N6.9',  weight: 1 },
    { parentCode: 'N4.9',  childCode: 'N6.10', weight: 1 },
    { parentCode: 'N3.15', childCode: 'N6.10', weight: 1 },
    { parentCode: 'N6.10', childCode: 'N6.11', weight: 1 },
    { parentCode: 'N4.7',  childCode: 'N6.11', weight: 1 },
    { parentCode: 'N6.10', childCode: 'N6.12', weight: 1 },
    { parentCode: 'N6.11', childCode: 'N6.12', weight: 1 },
    { parentCode: 'N6.12', childCode: 'N6.13', weight: 1 },
    { parentCode: 'A1.8',  childCode: 'N6.13', weight: 1 },
    { parentCode: 'N6.12', childCode: 'N6.14', weight: 1 },
    { parentCode: 'N3.23', childCode: 'N6.14', weight: 1 },
    { parentCode: 'N6.11', childCode: 'N6.15', weight: 1 },
    { parentCode: 'N5.5',  childCode: 'N6.15', weight: 1 },
    { parentCode: 'N5.4',  childCode: 'N6.16', weight: 1 },
    { parentCode: 'N3.13', childCode: 'N6.16', weight: 1 },
    { parentCode: 'N6.16', childCode: 'N6.17', weight: 1 },
    { parentCode: 'N3.8',  childCode: 'N6.17', weight: 1 },
    { parentCode: 'N6.17', childCode: 'N6.18', weight: 1 },
    { parentCode: 'N3.5',  childCode: 'N6.18', weight: 1 },
    { parentCode: 'N4.4',  childCode: 'N6.19', weight: 1 },
    { parentCode: 'N4.6',  childCode: 'N6.19', weight: 1 },
    { parentCode: 'N4.7',  childCode: 'N6.19', weight: 1 },
    { parentCode: 'N6.12', childCode: 'N6.20', weight: 1 },
    { parentCode: 'N6.16', childCode: 'N6.20', weight: 1 },
    { parentCode: 'N6.15', childCode: 'N6.20', weight: 1 },
    // ── S1 (Probability) prereqs ────────────────────────────────────────────
    { parentCode: 'N5.7',  childCode: 'S1.1',  weight: 1 },
    { parentCode: 'N4.6',  childCode: 'S1.1',  weight: 1 },
    { parentCode: 'S1.1',  childCode: 'S1.2',  weight: 1 },
    { parentCode: 'N5.7',  childCode: 'S1.2',  weight: 1 },
    { parentCode: 'S1.2',  childCode: 'S1.3',  weight: 1 },
    { parentCode: 'S1.3',  childCode: 'S1.4',  weight: 1 },
    { parentCode: 'S1.4',  childCode: 'S1.5',  weight: 1 },
    { parentCode: 'S1.3',  childCode: 'S1.5',  weight: 1 },
    { parentCode: 'S1.1',  childCode: 'S1.6',  weight: 1 },
    { parentCode: 'S1.6',  childCode: 'S1.7',  weight: 1 },
    { parentCode: 'S1.7',  childCode: 'S1.8',  weight: 1 },
    { parentCode: 'S1.8',  childCode: 'S1.9',  weight: 1 },
    { parentCode: 'S1.8',  childCode: 'S1.10', weight: 1 },
    { parentCode: 'S1.9',  childCode: 'S1.11', weight: 1 },
    { parentCode: 'S1.10', childCode: 'S1.11', weight: 1 },
    { parentCode: 'S1.3',  childCode: 'S1.11', weight: 1 },
    { parentCode: 'S1.10', childCode: 'S1.12', weight: 1 },
    { parentCode: 'S1.2',  childCode: 'S1.12', weight: 1 },
  ];

  for (const edge of prereqEdges) {
    const childId = skillMap.get(edge.childCode);
    const parentId = skillMap.get(edge.parentCode);
    if (!childId || !parentId) {
      console.warn(`⚠️  Skipping prereq ${edge.parentCode} → ${edge.childCode}: skill not found`);
      continue;
    }
    await prisma.skillPrereq.upsert({
      where: { skillId_prereqId: { skillId: childId, prereqId: parentId } },
      update: { weight: edge.weight },
      create: { skillId: childId, prereqId: parentId, weight: edge.weight },
    });
  }

  // 6️⃣ Placeholder MCQ items per skill (2 per skill, idempotent by question text)
  for (const def of skillDefs) {
    const skillId = skillMap.get(def.code);
    if (!skillId) continue;
    const placeholderItems = [
      {
        question: `[${def.code}] Placeholder question 1 for: ${def.name}`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        answer: 'Option A',
      },
      {
        question: `[${def.code}] Placeholder question 2 for: ${def.name}`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        answer: 'Option A',
      },
    ];
    for (const itemData of placeholderItems) {
      let item = await prisma.item.findFirst({
        where: { question: itemData.question },
      });
      if (!item) {
        item = await prisma.item.create({
          data: {
            question: itemData.question,
            options: itemData.options,
            answer: itemData.answer,
            type: 'MCQ',
            subjectId: subject.id,
          },
        });
      }
      await prisma.itemSkill.upsert({
        where: { itemId_skillId: { itemId: item.id, skillId } },
        update: {},
        create: { itemId: item.id, skillId },
      });
    }
  }

  console.log('✅ Seed complete:', {
    student: student.email,
    teacher: teacher.email,
    classroom: classroom.name,
    subject: subject.title,
    skills: skillDefs.length,
    prereqEdges: prereqEdges.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
