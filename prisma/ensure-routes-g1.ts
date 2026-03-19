/**
 * ensure-routes-g1.ts
 *
 * Seeds explanation routes (A / B / C) for:
 *   G1.1  — Identify and name types of angles (acute, right, obtuse, reflex)
 *   G1.1b — Understand angle notation (e.g. ∠ABC) and label angles correctly
 *   G1.2  — Measure angles with a protractor
 *   G1.3  — Draw angles with a protractor
 *
 * Run:
 *   ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' prisma/ensure-routes-g1.ts
 */

import { PrismaClient } from '@prisma/client';
import { validateExplanationStepWrite } from '../src/features/learn/explanationStepWriteGuard';

const prisma = new PrismaClient();

export type RouteType = 'A' | 'B' | 'C';

export interface StepDef {
  stepOrder: number;
  title: string;
  explanation: string;
  checkpointQuestion: string;
  checkpointOptions?: string[];
  checkpointAnswer: string;
}

export interface RouteDef {
  routeType: RouteType;
  misconceptionSummary: string;
  workedExample: string;
  guidedPrompt: string;
  guidedAnswer: string;
  steps: StepDef[];
}

export const SKILL_ROUTES: Record<string, RouteDef[]> = {
  /* ──────────────────────────────────────────────────────────────────────
   * G1.1 — Identify and name types of angles (acute, right, obtuse, reflex)
   * ────────────────────────────────────────────────────────────────────── */
  'G1.1': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students confuse angle types, especially obtuse and reflex, or forget that a right angle is exactly 90°.',
      workedExample: 'An angle of 120° is greater than 90° but less than 180°, so it is obtuse. An angle of 250° is greater than 180°, so it is reflex.',
      guidedPrompt: 'Classify an angle of 75°.',
      guidedAnswer: '75° is greater than 0° and less than 90°, so it is an acute angle.',
      steps: [
        {
          stepOrder: 1,
          title: 'The four angle types',
          explanation: 'Acute angles are between 0° and 90°. Right angles are exactly 90°. Obtuse angles are between 90° and 180°. Reflex angles are between 180° and 360°. Learn these four ranges and you can classify any angle.',
          checkpointQuestion: 'What type of angle is exactly 90°?',
          checkpointOptions: ['Acute', 'Right', 'Obtuse', 'Reflex'],
          checkpointAnswer: 'Right',
        },
        {
          stepOrder: 2,
          title: 'Classifying by size',
          explanation: 'To classify an angle, check which range it falls in. For example, 135° is greater than 90° and less than 180°, so it is obtuse. Always compare the angle to the key boundaries: 90°, 180°, and 360°.',
          checkpointQuestion: 'What type of angle is 135°?',
          checkpointOptions: ['Acute', 'Right', 'Obtuse', 'Reflex'],
          checkpointAnswer: 'Obtuse',
        },
        {
          stepOrder: 3,
          title: 'Identifying reflex angles',
          explanation: 'A reflex angle is greater than 180° but less than 360°. If you see a very large turn — more than a straight line — it is reflex. For example, 270° is three-quarters of a full turn and is reflex.',
          checkpointQuestion: 'What type of angle is 200°?',
          checkpointOptions: ['Acute', 'Obtuse', 'Reflex'],
          checkpointAnswer: 'Reflex',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students identify angles by the length of the arms rather than the amount of turn between them.',
      workedExample: 'Imagine a clock: from 12 to 3 the hand turns 90° (right angle). From 12 to 6 is 180° (straight line). From 12 past 6 back toward 12 is reflex (more than 180°).',
      guidedPrompt: 'A door opens from closed to halfway open. What type of angle does it make?',
      guidedAnswer: 'Halfway open is about 90°, so it makes a right angle.',
      steps: [
        {
          stepOrder: 1,
          title: 'Angle as an amount of turn',
          explanation: 'An angle measures how much one line has turned from another. It does not depend on the length of the lines — only on the rotation between them. A small opening can be acute even if the arms are very long.',
          checkpointQuestion: 'True or false: a longer line always makes a bigger angle.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'False',
        },
        {
          stepOrder: 2,
          title: 'Visualising angle types',
          explanation: 'Picture a clock face. 12 to 3 is a right angle (90°). 12 to just before 3 is acute (less than 90°). 12 to past 3 but before 6 is obtuse (90°–180°). Past 6 going the long way round is reflex (180°–360°).',
          checkpointQuestion: 'A clock hand moves from 12 to 4. Is this angle acute, right, obtuse, or reflex?',
          checkpointOptions: ['Acute', 'Right', 'Obtuse', 'Reflex'],
          checkpointAnswer: 'Obtuse',
        },
        {
          stepOrder: 3,
          title: 'Sorting angles visually',
          explanation: 'When comparing angles without a protractor, look at the opening. An acute angle looks narrow. An obtuse angle looks wide but does not go past a straight line. A reflex angle wraps most of the way around.',
          checkpointQuestion: 'An angle looks wider than a straight line and wraps almost all the way around. What type is it?',
          checkpointOptions: ['Obtuse', 'Reflex'],
          checkpointAnswer: 'Reflex',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students confuse obtuse and reflex angles because both are "bigger than a right angle".',
      workedExample: '150° is obtuse (between 90° and 180°), but 210° is reflex (between 180° and 360°). The key boundary is 180° — a straight line.',
      guidedPrompt: 'A student says 170° is reflex. What is their error?',
      guidedAnswer: '170° is less than 180°, so it is obtuse, not reflex. Reflex starts above 180°.',
      steps: [
        {
          stepOrder: 1,
          title: 'The 180° boundary',
          explanation: 'The boundary between obtuse and reflex is 180° (a straight line). Obtuse = more than 90° but less than 180°. Reflex = more than 180° but less than 360°. Always compare to 180° first.',
          checkpointQuestion: 'Is 179° obtuse or reflex?',
          checkpointOptions: ['Obtuse', 'Reflex'],
          checkpointAnswer: 'Obtuse',
        },
        {
          stepOrder: 2,
          title: 'Spotting the mistake',
          explanation: 'A common error is calling any large angle "reflex". To check, ask: is it more than a straight line (180°)? If not, it is obtuse. Only angles that go past a straight line are reflex.',
          checkpointQuestion: 'A student calls 160° a reflex angle. Are they correct?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 3,
          title: 'Practise the four categories',
          explanation: 'Sort these angles: 45° is acute, 90° is right, 150° is obtuse, 300° is reflex. Every angle between 0° and 360° falls into exactly one category.',
          checkpointQuestion: 'What type of angle is 350°?',
          checkpointOptions: ['Obtuse', 'Reflex'],
          checkpointAnswer: 'Reflex',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * G1.1b — Understand angle notation (e.g. ∠ABC) and label angles correctly
   * ────────────────────────────────────────────────────────────────────── */
  'G1.1b': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students do not realise the middle letter of ∠ABC is the vertex of the angle.',
      workedExample: 'In ∠PQR, the angle is at Q. P and R are points on the two arms. The middle letter always names the vertex.',
      guidedPrompt: 'In ∠XYZ, which point is the vertex of the angle?',
      guidedAnswer: 'Y — the middle letter is always the vertex.',
      steps: [
        {
          stepOrder: 1,
          title: 'Three-letter angle notation',
          explanation: 'An angle is named with three letters such as ∠ABC. The first and last letters are points on the two arms. The middle letter is the vertex — the point where the arms meet. Reading ∠ABC means "the angle at B".',
          checkpointQuestion: 'In ∠DEF, which letter names the vertex?',
          checkpointOptions: ['D', 'E', 'F'],
          checkpointAnswer: 'E',
        },
        {
          stepOrder: 2,
          title: 'Order of the letters',
          explanation: 'The order matters: ∠ABC and ∠CBA describe the same angle (vertex at B, arms through A and C). However, ∠BAC is a different angle — it has its vertex at A.',
          checkpointQuestion: 'Do ∠PQR and ∠RQP describe the same angle?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'Yes',
        },
        {
          stepOrder: 3,
          title: 'Labelling angles on a diagram',
          explanation: 'To label an angle on a diagram, identify the vertex and one point on each arm. Write the angle symbol ∠ followed by arm-point, vertex, arm-point. For example, if the vertex is M with arms going to L and N, write ∠LMN.',
          checkpointQuestion: 'The vertex of an angle is at point G, with arms going to points F and H. Write the angle using correct notation.',
          checkpointAnswer: '∠FGH',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students struggle to identify which angle is meant when several angles share a vertex.',
      workedExample: 'At vertex B, three rays go to A, C, and D. ∠ABC is the angle between arms BA and BC. ∠ABD is a different angle, between arms BA and BD. The notation tells you which two arms to use.',
      guidedPrompt: 'At vertex O, rays go to P, Q, and R. How do you tell ∠POQ apart from ∠POR?',
      guidedAnswer: '∠POQ uses arms OP and OQ. ∠POR uses arms OP and OR. The outer letters identify which pair of arms.',
      steps: [
        {
          stepOrder: 1,
          title: 'Why three letters are needed',
          explanation: 'When more than two lines meet at one point, a single letter cannot uniquely identify an angle. The three-letter notation picks out exactly which pair of arms you mean. Without it, "the angle at B" could refer to several different angles.',
          checkpointQuestion: 'True or false: if three lines meet at point T, there is only one angle at T.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'False',
        },
        {
          stepOrder: 2,
          title: 'Picking the correct pair of arms',
          explanation: 'The first and last letters in ∠ABC tell you which arms to look at. Travel from A to the vertex B, then from B to C — the rotation between those directions is the angle.',
          checkpointQuestion: 'At vertex K, rays go to J, L, and M. Which angle is between arms KJ and KM?',
          checkpointOptions: ['∠JKL', '∠JKM', '∠LKM'],
          checkpointAnswer: '∠JKM',
        },
        {
          stepOrder: 3,
          title: 'Using angle notation to communicate',
          explanation: 'Clear angle notation avoids confusion. In a triangle with vertices A, B, and C, the three interior angles are ∠BAC (at A), ∠ABC (at B), and ∠BCA (at C). Each name uniquely identifies one angle.',
          checkpointQuestion: 'In triangle PQR, which notation names the angle at vertex Q?',
          checkpointOptions: ['∠PQR', '∠QPR', '∠QRP'],
          checkpointAnswer: '∠PQR',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students read ∠ABC and incorrectly think A is the vertex instead of the middle letter B.',
      workedExample: 'In ∠ABC the vertex is B (the middle letter), not A. A common mistake is to assume the first letter is the vertex because we read left-to-right.',
      guidedPrompt: 'A student says the vertex of ∠MNP is M. What error have they made?',
      guidedAnswer: 'They picked the first letter instead of the middle letter. The vertex is N.',
      steps: [
        {
          stepOrder: 1,
          title: 'The middle-letter rule',
          explanation: 'In three-letter angle notation the vertex is always the middle letter. ∠ABC → vertex B. ∠XYZ → vertex Y. A frequent error is to assume the first letter is the vertex because we read left-to-right, but that is incorrect.',
          checkpointQuestion: 'In ∠RST, which letter is the vertex?',
          checkpointOptions: ['R', 'S', 'T'],
          checkpointAnswer: 'S',
        },
        {
          stepOrder: 2,
          title: 'Correcting the first-letter error',
          explanation: 'If a student says ∠ABC has vertex A, they are using the first letter by mistake. Remind them: the angle is at the point where the two arms meet, and that point is always written in the middle.',
          checkpointQuestion: 'A student says the vertex of ∠WXY is W. What should the vertex be?',
          checkpointOptions: ['W', 'X', 'Y'],
          checkpointAnswer: 'X',
        },
        {
          stepOrder: 3,
          title: 'Practice identifying the vertex',
          explanation: 'Look at the three letters and circle the middle one — that is the vertex every time. ∠FGH → G. ∠JKL → K. Once this rule is automatic, reading angle notation becomes easy.',
          checkpointQuestion: 'What is the vertex of ∠BCD?',
          checkpointOptions: ['B', 'C', 'D'],
          checkpointAnswer: 'C',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * G1.2 — Measure angles with a protractor
   * ────────────────────────────────────────────────────────────────────── */
  'G1.2': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students read the wrong scale on the protractor (inner vs outer) and get 180° minus the correct answer.',
      workedExample: 'Place the protractor centre on the vertex, baseline along one arm. The other arm crosses the protractor at 55° (inner scale). Reading the outer scale by mistake would give 125°.',
      guidedPrompt: 'An angle is clearly acute but a student reads 130° from the protractor. What went wrong?',
      guidedAnswer: 'They read the outer scale instead of the inner scale. The correct reading is 180° − 130° = 50°.',
      steps: [
        {
          stepOrder: 1,
          title: 'Setting up the protractor',
          explanation: 'Place the centre mark (crosshair or small hole) of the protractor exactly on the vertex of the angle. Align the baseline (0° line) along one arm of the angle so it reads 0°.',
          checkpointQuestion: 'Where should the centre mark of the protractor be placed?',
          checkpointOptions: ['On the vertex', 'On one arm', 'At the end of an arm'],
          checkpointAnswer: 'On the vertex',
        },
        {
          stepOrder: 2,
          title: 'Choosing the correct scale',
          explanation: 'A protractor has two scales (inner and outer) running in opposite directions. Start reading from the scale that shows 0° on the baseline arm. Follow that same scale round to where the second arm crosses.',
          checkpointQuestion: 'An angle opens from the left arm at 0° on the inner scale. The right arm crosses at 70° inner and 110° outer. What is the angle?',
          checkpointOptions: ['70°', '110°'],
          checkpointAnswer: '70°',
        },
        {
          stepOrder: 3,
          title: 'Checking your reading',
          explanation: 'After reading the angle, do a quick sense check. If the angle looks acute (less than a right angle), your reading should be under 90°. If it looks obtuse, the reading should be between 90° and 180°.',
          checkpointQuestion: 'You read 145° but the angle looks acute. What should you do?',
          checkpointOptions: ['Keep 145°', 'Subtract from 180° to get 35°'],
          checkpointAnswer: 'Subtract from 180° to get 35°',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not align the baseline properly, leading to systematic errors in all their readings.',
      workedExample: 'If the baseline is placed 10° off from one arm, every reading will be 10° too large or too small. Careful alignment at 0° is essential for an accurate measurement.',
      guidedPrompt: 'Why does the protractor baseline need to sit exactly on one arm?',
      guidedAnswer: 'Because the measurement counts degrees from that arm. If the baseline is off, the reading will be wrong by the same amount.',
      steps: [
        {
          stepOrder: 1,
          title: 'Baseline alignment matters',
          explanation: 'The baseline must lie exactly along one arm of the angle. If it is even a few degrees off, every measurement will be wrong by that amount. Take time to line it up carefully before reading.',
          checkpointQuestion: 'True or false: small alignment errors do not matter when measuring angles.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'False',
        },
        {
          stepOrder: 2,
          title: 'Reading from 0°',
          explanation: 'Once aligned, start reading from 0° on whichever scale touches your baseline arm. Count up to where the other arm crosses. This tells you how far the second arm has rotated from the first.',
          checkpointQuestion: 'If the baseline arm sits at 0° and the other arm crosses the scale at 90°, what is the angle?',
          checkpointAnswer: '90°',
        },
        {
          stepOrder: 3,
          title: 'Measuring obtuse angles',
          explanation: 'For an obtuse angle, the second arm will cross the scale between 90° and 180°. Make sure you continue reading along the same scale you started on — do not switch scales partway through.',
          checkpointQuestion: 'An obtuse angle has its second arm at 130° on the inner scale. What is the measurement?',
          checkpointAnswer: '130°',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students confuse the inner and outer scales and report 180° minus the correct angle.',
      workedExample: 'A student measures an obtuse angle as 60°. The angle is clearly more than 90°, so they read the wrong scale. The correct answer is 180° − 60° = 120°.',
      guidedPrompt: 'A student says an obtuse angle is 50°. Explain their mistake.',
      guidedAnswer: 'They read the wrong scale. 180° − 50° = 130°, which makes sense for an obtuse angle.',
      steps: [
        {
          stepOrder: 1,
          title: 'Sense-checking the answer',
          explanation: 'Always compare your reading with the angle type. An acute angle must be under 90°. An obtuse angle must be between 90° and 180°. If your reading contradicts the type you can see, you have read the wrong scale.',
          checkpointQuestion: 'You measure a clearly obtuse angle as 40°. What has gone wrong?',
          checkpointOptions: ['Read the wrong scale', 'Protractor is broken'],
          checkpointAnswer: 'Read the wrong scale',
        },
        {
          stepOrder: 2,
          title: 'The two-scale trap',
          explanation: 'The inner scale goes 0°→180° from left to right. The outer scale goes 0°→180° from right to left. If you start on the wrong scale your answer will be 180° minus the true value.',
          checkpointQuestion: 'Inner scale reads 65° and outer scale reads 115° at the same point. The baseline is at 0° inner. What is the angle?',
          checkpointOptions: ['65°', '115°'],
          checkpointAnswer: '65°',
        },
        {
          stepOrder: 3,
          title: 'Correcting a wrong-scale reading',
          explanation: 'If you suspect you read the wrong scale, subtract your answer from 180°. For example, you read 155° but the angle looks acute: 180° − 155° = 25°, which makes sense for an acute angle.',
          checkpointQuestion: 'A student reads 160° for an angle that is clearly acute. What is the correct measurement?',
          checkpointAnswer: '20°',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * G1.3 — Draw angles with a protractor
   * ────────────────────────────────────────────────────────────────────── */
  'G1.3': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students draw the baseline but then mark the wrong scale on the protractor, producing 180° minus the intended angle.',
      workedExample: 'To draw 70°: draw a baseline, place the protractor centre on one end, mark 70° on the correct scale, remove the protractor, and join the mark to the baseline end.',
      guidedPrompt: 'Describe the steps to draw a 55° angle.',
      guidedAnswer: 'Draw a baseline. Place the protractor centre on the vertex end, baseline along the line. Count 55° on the correct scale and make a small mark. Remove the protractor and draw a line from the vertex through the mark.',
      steps: [
        {
          stepOrder: 1,
          title: 'Draw the baseline',
          explanation: 'Start by drawing a straight baseline using a ruler. Mark one end as the vertex where your angle will be. This is the arm from which you measure.',
          checkpointQuestion: 'What is the first step when drawing an angle with a protractor?',
          checkpointOptions: ['Draw a baseline', 'Place the protractor', 'Mark the angle'],
          checkpointAnswer: 'Draw a baseline',
        },
        {
          stepOrder: 2,
          title: 'Mark the angle',
          explanation: 'Place the protractor centre on the vertex and the baseline along your drawn line (reading 0°). Find the required angle on the correct scale and mark a small dot on the paper at that position.',
          checkpointQuestion: 'You want to draw 80°. Your baseline is at 0° on the inner scale. Where do you mark?',
          checkpointAnswer: '80° on the inner scale',
        },
        {
          stepOrder: 3,
          title: 'Complete the angle',
          explanation: 'Remove the protractor and use a ruler to draw a straight line from the vertex through the dot you marked. This second line is the other arm of the angle. Label the angle if required.',
          checkpointQuestion: 'After marking the dot, what tool do you use to draw the second arm?',
          checkpointOptions: ['Protractor', 'Ruler', 'Compass'],
          checkpointAnswer: 'Ruler',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not understand why the centre must be on the vertex, and place it at the mid-point of the baseline instead.',
      workedExample: 'The centre must be on the vertex because all angles are measured from that point. If the centre is elsewhere, the arms will not meet correctly and the angle will be wrong.',
      guidedPrompt: 'A student places the protractor centre in the middle of their baseline. Why is this wrong?',
      guidedAnswer: 'The angle is formed at the vertex (end of the baseline), not the middle. Placing the centre elsewhere means the rotation is measured from the wrong point.',
      steps: [
        {
          stepOrder: 1,
          title: 'Why the vertex is the centre',
          explanation: 'An angle is the rotation between two lines meeting at a point — the vertex. The protractor centre must sit on this point so that the rotation is measured from the correct place.',
          checkpointQuestion: 'True or false: the protractor centre should be placed on the vertex of the angle.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
        {
          stepOrder: 2,
          title: 'Connecting measurement to drawing',
          explanation: 'Drawing an angle is measuring in reverse. When measuring, you align and read. When drawing, you align, mark, and then draw. Both use the same protractor skills — just in opposite order.',
          checkpointQuestion: 'How is drawing an angle related to measuring one?',
          checkpointOptions: ['They use the same alignment skills', 'They use different tools'],
          checkpointAnswer: 'They use the same alignment skills',
        },
        {
          stepOrder: 3,
          title: 'Checking your drawn angle',
          explanation: 'After drawing, re-measure the angle with the protractor to verify it is correct. This catches alignment errors and wrong-scale mistakes before they go unnoticed.',
          checkpointQuestion: 'You drew a 65° angle. How can you verify it is correct?',
          checkpointOptions: ['Re-measure it with the protractor', 'Estimate by eye'],
          checkpointAnswer: 'Re-measure it with the protractor',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students use the wrong protractor scale when drawing, producing 180° minus the intended angle.',
      workedExample: 'A student wants to draw 40° but reads 40° on the outer scale (which actually gives 140°). They should use the scale that starts at 0° on their baseline.',
      guidedPrompt: 'A student tries to draw 30° but the angle looks obtuse. What went wrong?',
      guidedAnswer: 'They used the wrong scale and actually drew 180° − 30° = 150°. They should have used the scale starting at 0° on their baseline.',
      steps: [
        {
          stepOrder: 1,
          title: 'Choosing the right scale for drawing',
          explanation: 'When drawing, identify which scale reads 0° along your baseline. Use that same scale to find your target angle. If your baseline is on the left, this is usually the inner scale.',
          checkpointQuestion: 'Your baseline reads 0° on the inner scale. To draw 50° you should use which scale?',
          checkpointOptions: ['Inner scale', 'Outer scale'],
          checkpointAnswer: 'Inner scale',
        },
        {
          stepOrder: 2,
          title: 'Checking with the angle type',
          explanation: 'After drawing, sense-check: if you wanted an acute angle (less than 90°) but your drawn angle looks obtuse, you used the wrong scale. Re-draw using the other scale.',
          checkpointQuestion: 'You drew what should be 45° but it looks much bigger than a right angle. What should you do?',
          checkpointOptions: ['Use the other scale and re-draw', 'Accept the drawing'],
          checkpointAnswer: 'Use the other scale and re-draw',
        },
        {
          stepOrder: 3,
          title: 'Drawing obtuse angles correctly',
          explanation: 'For obtuse angles like 140°, the protractor dot should be past the 90° mark on the same scale you started from. If your angle is meant to be obtuse but looks acute, you have read the wrong scale again.',
          checkpointQuestion: 'A student draws 140° but the angle looks acute (about 40°). What is the error?',
          checkpointOptions: ['Read the wrong scale', 'Used the wrong vertex'],
          checkpointAnswer: 'Read the wrong scale',
        },
      ],
    },
  ],
};

async function main() {
  const subject = await prisma.subject.findFirstOrThrow({ where: { slug: 'ks3-maths' } });

  for (const [skillCode, routes] of Object.entries(SKILL_ROUTES)) {
    const skill = await prisma.skill.findUnique({
      where: { subjectId_code: { subjectId: subject.id, code: skillCode } },
    });
    if (!skill) {
      console.warn(`[SKIP] Skill ${skillCode} not found in DB.`);
      continue;
    }

    for (const route of routes) {
      const upserted = await prisma.explanationRoute.upsert({
        where: { skillId_routeType: { skillId: skill.id, routeType: route.routeType } },
        create: {
          skillId: skill.id,
          routeType: route.routeType,
          misconceptionSummary: route.misconceptionSummary,
          workedExample: route.workedExample,
          guidedPrompt: route.guidedPrompt,
          guidedAnswer: route.guidedAnswer,
          isActive: true,
        },
        update: {
          misconceptionSummary: route.misconceptionSummary,
          workedExample: route.workedExample,
          guidedPrompt: route.guidedPrompt,
          guidedAnswer: route.guidedAnswer,
          isActive: true,
        },
      });

      for (const step of route.steps) {
        const validated = validateExplanationStepWrite({
          checkpointQuestion: step.checkpointQuestion,
          checkpointOptions: step.checkpointOptions,
          checkpointAnswer: step.checkpointAnswer,
        });

        await prisma.explanationStep.upsert({
          where: { explanationRouteId_stepOrder: { explanationRouteId: upserted.id, stepOrder: step.stepOrder } },
          create: {
            explanationRouteId: upserted.id,
            stepOrder: step.stepOrder,
            title: step.title,
            explanation: step.explanation,
            stepType: 'checkpoint',
            checkpointQuestion: validated.checkpointQuestion,
            checkpointOptions: validated.checkpointOptions,
            checkpointAnswer: validated.checkpointAnswer,
            questionType: validated.questionType,
          },
          update: {
            title: step.title,
            explanation: step.explanation,
            stepType: 'checkpoint',
            checkpointQuestion: validated.checkpointQuestion,
            checkpointOptions: validated.checkpointOptions,
            checkpointAnswer: validated.checkpointAnswer,
            questionType: validated.questionType,
          },
        });
      }

      console.log(`  ✓ ${skillCode} Route ${route.routeType}`);
    }
  }

  console.log('\n✅ ensured explanation routes for G1.1, G1.1b, G1.2, G1.3');
}

// Only execute when run directly (not when imported by tests/other modules).
// We guard on DATABASE_URL rather than require.main because vitest transforms
// to ESM where CommonJS module globals are unavailable.
if (process.env.DATABASE_URL) {
  main().catch(console.error).finally(() => prisma.$disconnect());
}
