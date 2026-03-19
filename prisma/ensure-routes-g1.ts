/**
 * ensure-routes-g1.ts
 *
 * Seeds explanation routes (A / B / C) for:
 *   G1.1  — Identify and name types of angles (acute, right, obtuse, reflex)
 *   G1.1b — Understand angle notation (e.g. ∠ABC) and label angles correctly
 *   G1.2  — Measure angles with a protractor
 *   G1.3  — Draw angles with a protractor
 *   G1.4  — Angles on a straight line sum to 180°
 *   G1.5  — Angles around a point sum to 360°
 *   G1.6  — Vertically opposite angles are equal
 *   G1.7  — Angles in a triangle sum to 180°
 *   G1.8  — Angles in a quadrilateral sum to 360°
 *   G1.9  — Interior angle sum of any polygon
 *   G1.10 — Exterior angles of any polygon sum to 360°; regular polygon calculations
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

  /* ──────────────────────────────────────────────────────────────────────
   * G1.4 — Angles on a straight line sum to 180°
   * ────────────────────────────────────────────────────────────────────── */
  'G1.4': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students forget that angles on a straight line must add up to 180° and instead try to guess missing angles without using the rule.',
      workedExample: 'Two angles sit on a straight line. One is 110°. The other is 180° − 110° = 70°. Always subtract the known angle(s) from 180° to find the missing angle.',
      guidedPrompt: 'Two angles on a straight line are 65° and x°. Find x.',
      guidedAnswer: 'x = 180° − 65° = 115°.',
      steps: [
        {
          stepOrder: 1,
          title: 'The straight-line rule',
          explanation: 'When two or more angles sit on a straight line (forming a straight angle), they add up to 180°. A straight line is half a full turn, which is 180°. This rule lets you find any missing angle on the line.',
          checkpointQuestion: 'What do angles on a straight line add up to?',
          checkpointOptions: ['90°', '180°', '270°', '360°'],
          checkpointAnswer: '180°',
        },
        {
          stepOrder: 2,
          title: 'Finding a missing angle',
          explanation: 'To find a missing angle on a straight line, subtract the known angle(s) from 180°. For example, if one angle is 130°, the missing angle is 180° − 130° = 50°.',
          checkpointQuestion: 'Angles on a straight line are 130° and x°. What is x?',
          checkpointOptions: ['40°', '50°', '60°', '130°'],
          checkpointAnswer: '50°',
        },
        {
          stepOrder: 3,
          title: 'Multiple angles on a straight line',
          explanation: 'If three angles sit on a straight line, they still add up to 180°. Subtract all known angles from 180° to find the unknown. For example: 40° + 60° + x° = 180°, so x = 80°.',
          checkpointQuestion: 'Three angles on a straight line are 40°, 60°, and x°. What is x?',
          checkpointOptions: ['70°', '80°', '90°', '100°'],
          checkpointAnswer: '80°',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not understand why angles on a straight line total 180° — they apply the rule mechanically without grasping the half-turn concept.',
      workedExample: 'A full turn is 360°. A straight line is a half turn, so it is 360° ÷ 2 = 180°. Any angles that together make up that half turn must add to 180°.',
      guidedPrompt: 'Why do angles on a straight line add to 180° rather than some other number?',
      guidedAnswer: 'A straight line is half of a full turn (360°). Half of 360° is 180°, so any angles forming that half turn must total 180°.',
      steps: [
        {
          stepOrder: 1,
          title: 'Straight line as a half turn',
          explanation: 'Think of standing and turning all the way round — that is 360°. A straight line is exactly half a full turn, which is 180°. Any angles that sit along a straight line together make up that half turn.',
          checkpointQuestion: 'A straight line represents what fraction of a full turn?',
          checkpointOptions: ['One quarter', 'One half', 'Three quarters'],
          checkpointAnswer: 'One half',
        },
        {
          stepOrder: 2,
          title: 'Visualising with a straight angle',
          explanation: 'Imagine a protractor placed on a straight line — it shows 0° at one end and 180° at the other. All the angles along the straight edge must fit within that 180° range, so together they add up to 180°.',
          checkpointQuestion: 'True or false: a protractor shows that a straight line spans 180°.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
        {
          stepOrder: 3,
          title: 'Applying the concept',
          explanation: 'If two angles share a vertex on a straight line, they are called supplementary angles. Together they complete the half turn: 180°. Knowing one gives you the other by subtraction.',
          checkpointQuestion: 'Two supplementary angles are a° and 75°. What is a?',
          checkpointOptions: ['95°', '105°', '115°', '285°'],
          checkpointAnswer: '105°',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students confuse angles on a straight line (180°) with angles around a point (360°) and use the wrong total.',
      workedExample: 'A student writes x + 110° = 360° for two angles on a straight line. This is wrong — angles on a straight line sum to 180°, not 360°. The correct equation is x + 110° = 180°, so x = 70°.',
      guidedPrompt: 'A student says the missing angle on a straight line is 360° − 140° = 220°. What is their mistake?',
      guidedAnswer: 'They used 360° (angles around a point) instead of 180° (angles on a straight line). The correct answer is 180° − 140° = 40°.',
      steps: [
        {
          stepOrder: 1,
          title: 'Straight line vs full turn',
          explanation: 'Angles on a straight line add to 180°. Angles around a point add to 360°. These are two different rules. For a straight line, always subtract from 180°, not 360°.',
          checkpointQuestion: 'Two angles sit on a straight line. Which total should you use?',
          checkpointOptions: ['180°', '360°'],
          checkpointAnswer: '180°',
        },
        {
          stepOrder: 2,
          title: 'Spotting the error',
          explanation: 'If a student gets an answer larger than 180° for an angle on a straight line, they have probably used 360° by mistake. An angle on a straight line cannot exceed 180°.',
          checkpointQuestion: 'A student calculates a missing angle on a straight line as 250°. Is this possible?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'No',
        },
        {
          stepOrder: 3,
          title: 'Practice with the correct rule',
          explanation: 'Angles on a straight line: 180°. Find the missing angle: 180° − 55° = 125°. Always ask yourself: "Is this on a straight line or around a full point?" before choosing the rule.',
          checkpointQuestion: 'Angles on a straight line are 55° and x°. What is x?',
          checkpointOptions: ['115°', '125°', '305°'],
          checkpointAnswer: '125°',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * G1.5 — Angles around a point sum to 360°
   * ────────────────────────────────────────────────────────────────────── */
  'G1.5': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students forget that all angles around a single point must total 360° and leave out angles or use the wrong total.',
      workedExample: 'Three angles meet at a point: 120°, 90°, and x°. They must total 360°. So x = 360° − 120° − 90° = 150°.',
      guidedPrompt: 'Angles around a point are 100°, 80°, and y°. Find y.',
      guidedAnswer: 'y = 360° − 100° − 80° = 180°.',
      steps: [
        {
          stepOrder: 1,
          title: 'The full-turn rule',
          explanation: 'All angles meeting at a single point form a complete turn of 360°. No matter how many angles there are, they must add up to 360°.',
          checkpointQuestion: 'What do angles around a point add up to?',
          checkpointOptions: ['180°', '270°', '360°'],
          checkpointAnswer: '360°',
        },
        {
          stepOrder: 2,
          title: 'Finding a missing angle',
          explanation: 'Add all the known angles together, then subtract the total from 360°. For example, 90° + 150° + x° = 360°, so x = 360° − 240° = 120°.',
          checkpointQuestion: 'Angles around a point are 90°, 150°, and x°. What is x?',
          checkpointOptions: ['100°', '110°', '120°', '130°'],
          checkpointAnswer: '120°',
        },
        {
          stepOrder: 3,
          title: 'Four angles around a point',
          explanation: 'The same rule applies with four or more angles. Add the known angles, subtract from 360°. For instance: 80° + 70° + 100° + x° = 360°, so x = 110°.',
          checkpointQuestion: 'Four angles around a point are 80°, 70°, 100°, and x°. What is x?',
          checkpointOptions: ['90°', '100°', '110°', '120°'],
          checkpointAnswer: '110°',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students do not connect the 360° rule to the idea of a full rotation and treat it as an arbitrary fact to memorise.',
      workedExample: 'A full rotation brings you back to where you started — that is 360°. If you divide the space around a point into any number of angles, those pieces must re-combine to give the full rotation of 360°.',
      guidedPrompt: 'Why do angles around a point add to 360° and not some other number?',
      guidedAnswer: 'A full turn is 360° by definition. Angles around a point together make a complete turn, so they must total 360°.',
      steps: [
        {
          stepOrder: 1,
          title: 'A full turn equals 360°',
          explanation: 'Imagine spinning a pointer all the way round from start back to start. It sweeps through 360°. All the angles around the central point are slices of that full turn, so they add up to 360°.',
          checkpointQuestion: 'How many degrees is a full turn?',
          checkpointOptions: ['180°', '270°', '360°'],
          checkpointAnswer: '360°',
        },
        {
          stepOrder: 2,
          title: 'Dividing the full turn',
          explanation: 'Whether the space around a point is split into two angles, three, or ten, the total remains 360°. More angles simply means more slices of the same full turn.',
          checkpointQuestion: 'True or false: if you split the space around a point into five angles, they still total 360°.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
        {
          stepOrder: 3,
          title: 'Connecting to straight lines',
          explanation: 'A straight line is half of a full turn — 180°. Two straight lines through a point create four angles totalling 2 × 180° = 360°. This confirms the full-turn rule.',
          checkpointQuestion: 'Two straight lines cross at a point, creating four angles. What do those four angles add up to?',
          checkpointOptions: ['180°', '360°', '720°'],
          checkpointAnswer: '360°',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students confuse angles around a point (360°) with angles on a straight line (180°) and subtract from 180° instead of 360°.',
      workedExample: 'A student writes 180° − 100° − 50° = 30° for angles around a point. This is wrong — angles around a point total 360°. The correct answer is 360° − 100° − 50° = 210°.',
      guidedPrompt: 'A student says the missing angle around a point is 180° − 90° − 60° = 30°. What is their error?',
      guidedAnswer: 'They subtracted from 180° instead of 360°. The correct answer is 360° − 90° − 60° = 210°.',
      steps: [
        {
          stepOrder: 1,
          title: 'Which rule to use',
          explanation: 'Before calculating, identify the diagram. Angles on a straight line → 180°. Angles around a point → 360°. Look at whether the angles sit along one line or surround a point completely.',
          checkpointQuestion: 'Angles surround a point completely. Which total do you subtract from?',
          checkpointOptions: ['180°', '360°'],
          checkpointAnswer: '360°',
        },
        {
          stepOrder: 2,
          title: 'Checking for impossible answers',
          explanation: 'If you use 180° for angles around a point, you may get a negative answer or an answer that is far too small. A negative result is a sure sign you have used the wrong rule.',
          checkpointQuestion: 'A student calculates 180° − 120° − 100° = −40° for angles around a point. What went wrong?',
          checkpointOptions: ['Used 180° instead of 360°', 'Added the angles incorrectly'],
          checkpointAnswer: 'Used 180° instead of 360°',
        },
        {
          stepOrder: 3,
          title: 'Practice choosing the correct rule',
          explanation: 'For angles around a point: 360° − known angles = missing angle. For angles on a straight line: 180° − known angles = missing angle. Always check: does the diagram show a full turn or a half turn?',
          checkpointQuestion: 'Angles around a point are 145°, 85°, and x°. What is x?',
          checkpointOptions: ['50°', '130°', '310°'],
          checkpointAnswer: '130°',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * G1.6 — Vertically opposite angles are equal
   * ────────────────────────────────────────────────────────────────────── */
  'G1.6': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students do not recognise which angles are vertically opposite and instead try to add them to 180° or 360° without using the equality rule.',
      workedExample: 'Two straight lines cross. One angle is 70°. The angle directly opposite it is also 70° because vertically opposite angles are equal. The two adjacent angles are each 180° − 70° = 110°.',
      guidedPrompt: 'Two lines cross. One angle is 40°. What is the vertically opposite angle?',
      guidedAnswer: 'The vertically opposite angle is also 40° because vertically opposite angles are always equal.',
      steps: [
        {
          stepOrder: 1,
          title: 'What are vertically opposite angles?',
          explanation: 'When two straight lines cross, they form four angles. The pairs of angles that are across from each other (not next to each other) are called vertically opposite angles. They are always equal.',
          checkpointQuestion: 'Two straight lines cross to form four angles. How many pairs of vertically opposite angles are there?',
          checkpointOptions: ['1', '2', '3', '4'],
          checkpointAnswer: '2',
        },
        {
          stepOrder: 2,
          title: 'Using the rule',
          explanation: 'If you know one angle where two lines cross, the vertically opposite angle is the same. For example, if one angle is 65°, the opposite angle is also 65°.',
          checkpointQuestion: 'Two lines cross. One angle is 65°. What is the vertically opposite angle?',
          checkpointOptions: ['25°', '65°', '115°', '295°'],
          checkpointAnswer: '65°',
        },
        {
          stepOrder: 3,
          title: 'Finding adjacent angles',
          explanation: 'The two angles next to a given angle sit on a straight line with it, so they each equal 180° minus the given angle. If one angle is 70°, its neighbours are 180° − 70° = 110°.',
          checkpointQuestion: 'Two lines cross. One angle is 70°. What is the angle next to it on the same straight line?',
          checkpointOptions: ['70°', '90°', '110°', '290°'],
          checkpointAnswer: '110°',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students accept that vertically opposite angles are equal but do not understand why the rule works.',
      workedExample: 'Angles a and b sit on a straight line: a + b = 180°. Angles b and c also sit on a straight line: b + c = 180°. So a + b = b + c, which means a = c. The two opposite angles must be equal.',
      guidedPrompt: 'Explain why vertically opposite angles must be equal using the straight-line rule.',
      guidedAnswer: 'Each pair of adjacent angles sums to 180°. Setting the two sums equal shows the opposite angles are the same.',
      steps: [
        {
          stepOrder: 1,
          title: 'Adjacent angles and straight lines',
          explanation: 'When two lines cross, each pair of adjacent angles lies on a straight line and sums to 180°. If angles are a, b, c, d going round, then a + b = 180° and b + c = 180°.',
          checkpointQuestion: 'Two lines cross giving angles a, b, c, d in order. What does a + b equal?',
          checkpointOptions: ['90°', '180°', '360°'],
          checkpointAnswer: '180°',
        },
        {
          stepOrder: 2,
          title: 'Proving the equality',
          explanation: 'Since a + b = 180° and b + c = 180°, we get a + b = b + c. Subtract b from both sides: a = c. This proves that vertically opposite angles are always equal.',
          checkpointQuestion: 'If a + b = 180° and b + c = 180°, what can you conclude about a and c?',
          checkpointOptions: ['a + c = 180°', 'a = c', 'a + c = 360°'],
          checkpointAnswer: 'a = c',
        },
        {
          stepOrder: 3,
          title: 'Applying the proof',
          explanation: 'The algebraic proof shows the rule is not a coincidence — it must always be true whenever two straight lines cross. Use it with confidence to find unknown angles.',
          checkpointQuestion: 'Two lines cross. One angle is 125°. What is the vertically opposite angle?',
          checkpointOptions: ['55°', '125°', '235°'],
          checkpointAnswer: '125°',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students confuse vertically opposite angles with adjacent angles and incorrectly add them to 180° instead of recognising they are equal.',
      workedExample: 'A student sees two lines crossing with one angle of 60° and writes the opposite angle as 180° − 60° = 120°. This is wrong — 120° is the adjacent angle. The vertically opposite angle is 60°.',
      guidedPrompt: 'A student says the angle opposite 50° is 130°. What is their mistake?',
      guidedAnswer: 'They found the adjacent angle (180° − 50° = 130°) instead of the vertically opposite angle, which is 50°.',
      steps: [
        {
          stepOrder: 1,
          title: 'Adjacent vs opposite',
          explanation: 'Adjacent angles are next to each other and add to 180°. Vertically opposite angles are across from each other and are equal. The mistake is applying the adjacent rule to an opposite pair.',
          checkpointQuestion: 'Vertically opposite angles are always what?',
          checkpointOptions: ['Supplementary (add to 180°)', 'Equal', 'Complementary (add to 90°)'],
          checkpointAnswer: 'Equal',
        },
        {
          stepOrder: 2,
          title: 'Identifying the correct pair',
          explanation: 'To find vertically opposite angles, look for the angle directly across the crossing point — not next door. If angles are labelled a, b, c, d going round, then a is opposite c, and b is opposite d.',
          checkpointQuestion: 'Two lines cross giving angles p, q, r, s in order. Which angle is vertically opposite to p?',
          checkpointOptions: ['q', 'r', 's'],
          checkpointAnswer: 'r',
        },
        {
          stepOrder: 3,
          title: 'Correcting the common error',
          explanation: 'If a student writes 180° minus an angle to find the opposite angle, remind them: 180° minus gives the adjacent angle. The opposite angle is exactly equal. For instance, opposite 35° is 35°, not 145°.',
          checkpointQuestion: 'Two lines cross. One angle is 35°. What is the vertically opposite angle?',
          checkpointOptions: ['35°', '145°', '325°'],
          checkpointAnswer: '35°',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * G1.7 — Angles in a triangle sum to 180°
   * ────────────────────────────────────────────────────────────────────── */
  'G1.7': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students forget that the three interior angles of any triangle must add up to 180° and guess the missing angle rather than calculating it.',
      workedExample: 'A triangle has angles 50°, 70°, and x°. Since angles in a triangle sum to 180°: x = 180° − 50° − 70° = 60°.',
      guidedPrompt: 'A triangle has angles 80° and 45°. Find the third angle.',
      guidedAnswer: 'Third angle = 180° − 80° − 45° = 55°.',
      steps: [
        {
          stepOrder: 1,
          title: 'The triangle angle-sum rule',
          explanation: 'The three interior angles of every triangle add up to 180°. This is true for all triangles — equilateral, isosceles, scalene, right-angled, or any other type.',
          checkpointQuestion: 'What do the three angles in any triangle add up to?',
          checkpointOptions: ['90°', '180°', '270°', '360°'],
          checkpointAnswer: '180°',
        },
        {
          stepOrder: 2,
          title: 'Finding a missing angle',
          explanation: 'Add the two known angles, then subtract from 180°. For example, angles of 60° and 80°: missing angle = 180° − 60° − 80° = 40°.',
          checkpointQuestion: 'A triangle has angles 60° and 80°. What is the third angle?',
          checkpointOptions: ['30°', '40°', '50°', '60°'],
          checkpointAnswer: '40°',
        },
        {
          stepOrder: 3,
          title: 'Checking your answer',
          explanation: 'After finding the missing angle, add all three angles to verify the total is 180°. For example: 50° + 70° + 60° = 180° ✓. If the total is not 180°, re-check your calculation.',
          checkpointQuestion: 'A triangle has angles 50°, 70°, and 60°. Do these add up correctly?',
          checkpointOptions: ['Yes', 'No'],
          checkpointAnswer: 'Yes',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students know the rule but do not understand why the angles in a triangle sum to 180°.',
      workedExample: 'Tear off the three corners of a paper triangle and place them together — they form a straight line (180°). This demonstrates that the three angles always combine to make a half turn.',
      guidedPrompt: 'Explain why the angles in a triangle add up to 180° using a visual method.',
      guidedAnswer: 'Draw a line through one vertex parallel to the opposite side. The three angles of the triangle rearrange along the straight line, proving they sum to 180°.',
      steps: [
        {
          stepOrder: 1,
          title: 'The torn-corner demonstration',
          explanation: 'Cut out a triangle and tear off all three corners. Place them point-to-point — they fit together to make a straight line (180°). This physical proof works for any triangle you draw.',
          checkpointQuestion: 'When you tear off the three corners of a triangle and put them together, what do they form?',
          checkpointOptions: ['A right angle', 'A straight line', 'A full turn'],
          checkpointAnswer: 'A straight line',
        },
        {
          stepOrder: 2,
          title: 'Parallel-line proof',
          explanation: 'Draw a line through the top vertex parallel to the base. Alternate angles show that the base angles of the triangle sit on either side of the top angle along the straight line. All three angles lie on the line, so they total 180°.',
          checkpointQuestion: 'True or false: the parallel-line proof relies on alternate angles being equal.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'True',
        },
        {
          stepOrder: 3,
          title: 'Applying the understanding',
          explanation: 'Knowing why the rule works builds confidence. Whether the triangle is right-angled, obtuse, or acute, the three angles always rearrange to make a straight line — 180°.',
          checkpointQuestion: 'A right-angled triangle has one angle of 90° and another of 35°. What is the third angle?',
          checkpointOptions: ['45°', '55°', '65°'],
          checkpointAnswer: '55°',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students confuse the angle sum of a triangle (180°) with the angle sum around a point (360°) or incorrectly believe equilateral triangles are the only ones where the rule applies.',
      workedExample: 'A student writes 360° − 80° − 60° = 220° for the missing angle in a triangle. This is wrong — they used 360° instead of 180°. The correct answer is 180° − 80° − 60° = 40°.',
      guidedPrompt: 'A student says the missing angle in a triangle with 70° and 50° is 360° − 120° = 240°. What is their error?',
      guidedAnswer: 'They used 360° instead of 180°. The correct missing angle is 180° − 70° − 50° = 60°.',
      steps: [
        {
          stepOrder: 1,
          title: 'Triangle angles vs angles around a point',
          explanation: 'The interior angles of a triangle sum to 180° — not 360°. The 360° rule applies to angles around a point. If a student gets an answer over 180° for a triangle angle, they have used the wrong rule.',
          checkpointQuestion: 'What do the interior angles of a triangle always sum to?',
          checkpointOptions: ['180°', '360°'],
          checkpointAnswer: '180°',
        },
        {
          stepOrder: 2,
          title: 'The rule applies to all triangles',
          explanation: 'Some students think the 180° rule only applies to equilateral or right-angled triangles. In fact, every triangle — no matter its shape — has angles that sum to exactly 180°.',
          checkpointQuestion: 'True or false: the angle-sum rule of 180° only works for equilateral triangles.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'False',
        },
        {
          stepOrder: 3,
          title: 'Practise finding the missing angle',
          explanation: 'Always subtract the two known angles from 180° to find the third angle of a triangle. Check: all three must total 180°. For example: 45° + 75° + x° = 180°, so x = 60°.',
          checkpointQuestion: 'A triangle has angles 45° and 75°. What is the third angle?',
          checkpointOptions: ['50°', '55°', '60°', '65°'],
          checkpointAnswer: '60°',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * G1.8 — Angles in a quadrilateral sum to 360°
   * ────────────────────────────────────────────────────────────────────── */
  'G1.8': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students forget that the four interior angles of a quadrilateral always add up to 360° and guess or use 180° instead.',
      workedExample: 'A quadrilateral has angles 90°, 80°, and 110°. The fourth angle = 360° − 90° − 80° − 110° = 80°.',
      guidedPrompt: 'A quadrilateral has angles 100°, 85°, and 95°. Find the fourth angle.',
      guidedAnswer: 'Fourth angle = 360° − 100° − 85° − 95° = 80°.',
      steps: [
        {
          stepOrder: 1,
          title: 'The quadrilateral angle-sum rule',
          explanation: 'The four interior angles of every quadrilateral add up to 360°. This is true for squares, rectangles, parallelograms, trapeziums, kites, and any other four-sided shape.',
          checkpointQuestion: 'What do the four interior angles of any quadrilateral add up to?',
          checkpointOptions: ['180°', '270°', '360°', '540°'],
          checkpointAnswer: '360°',
        },
        {
          stepOrder: 2,
          title: 'Finding a missing angle',
          explanation: 'Add the three known angles, then subtract from 360°. For example, if the angles are 90°, 80°, and 110°: missing angle = 360° − 90° − 80° − 110° = 80°.',
          checkpointQuestion: 'A quadrilateral has angles 90°, 80°, and 110°. What is the fourth angle?',
          checkpointOptions: ['70°', '80°', '90°', '100°'],
          checkpointAnswer: '80°',
        },
        {
          stepOrder: 3,
          title: 'Checking your answer',
          explanation: 'After finding the missing angle, add all four to verify the total is 360°. For example: 120° + 60° + 85° + 95° = 360° ✓. If the total is not 360°, re-check your subtraction.',
          checkpointQuestion: 'A quadrilateral has angles 120°, 60°, and 85°. What is the fourth angle?',
          checkpointOptions: ['85°', '90°', '95°', '100°'],
          checkpointAnswer: '95°',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students accept the 360° rule but do not understand why it works or how it connects to the triangle angle-sum rule.',
      workedExample: 'Any quadrilateral can be split into two triangles by drawing one diagonal. Each triangle has angles summing to 180°, so the quadrilateral total is 2 × 180° = 360°.',
      guidedPrompt: 'Explain why the angles in a quadrilateral sum to 360° using triangles.',
      guidedAnswer: 'Draw a diagonal to split the quadrilateral into two triangles. Each triangle has an angle sum of 180°, so the total is 180° + 180° = 360°.',
      steps: [
        {
          stepOrder: 1,
          title: 'Splitting into triangles',
          explanation: 'Draw a diagonal across any quadrilateral to divide it into two triangles. Each triangle has interior angles summing to 180°, so the total for the quadrilateral is 180° + 180° = 360°.',
          checkpointQuestion: 'How many triangles can a quadrilateral be split into by drawing one diagonal?',
          checkpointOptions: ['1', '2', '3', '4'],
          checkpointAnswer: '2',
        },
        {
          stepOrder: 2,
          title: 'Connecting to the triangle rule',
          explanation: 'Since the quadrilateral becomes two triangles, and each triangle has an angle sum of 180°, the quadrilateral must have an angle sum of 2 × 180° = 360°. This proof works for every quadrilateral.',
          checkpointQuestion: 'What is 2 × 180°?',
          checkpointOptions: ['270°', '360°', '540°'],
          checkpointAnswer: '360°',
        },
        {
          stepOrder: 3,
          title: 'Applying the understanding',
          explanation: 'Once you understand that a quadrilateral is two triangles put together, the 360° rule is easy to remember. Use it to find any missing angle in a four-sided shape.',
          checkpointQuestion: 'A quadrilateral has angles 70°, 110°, and 90°. What is the fourth angle?',
          checkpointOptions: ['80°', '90°', '100°', '110°'],
          checkpointAnswer: '90°',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students confuse the quadrilateral angle sum (360°) with the triangle angle sum (180°) and subtract known angles from 180° instead of 360°.',
      workedExample: 'A student finds the missing angle in a quadrilateral with angles 100°, 90°, and 80° by writing 180° − 100° − 90° − 80° = −90°. They used 180° instead of 360°. The correct answer is 360° − 100° − 90° − 80° = 90°.',
      guidedPrompt: 'A student writes 180° − 60° − 70° − 80° for a quadrilateral. What is their mistake?',
      guidedAnswer: 'They used the triangle rule (180°) instead of the quadrilateral rule (360°). The correct calculation is 360° − 60° − 70° − 80° = 150°.',
      steps: [
        {
          stepOrder: 1,
          title: 'Choosing the right angle sum',
          explanation: 'Triangles have angles summing to 180°. Quadrilaterals have angles summing to 360°. The most common mistake is using 180° for a four-sided shape. Always count the number of sides first.',
          checkpointQuestion: 'Which angle sum should you use for a quadrilateral?',
          checkpointOptions: ['180°', '360°'],
          checkpointAnswer: '360°',
        },
        {
          stepOrder: 2,
          title: 'Spotting the error',
          explanation: 'If your subtraction gives a negative angle or an angle greater than 360°, you have probably used the wrong angle sum. A quadrilateral angle must be between 0° and 360°.',
          checkpointQuestion: 'A student writes 180° − 100° − 90° − 80° = −90° for a quadrilateral. What went wrong?',
          checkpointOptions: ['They added instead of subtracting', 'They used 180° instead of 360°', 'They missed an angle'],
          checkpointAnswer: 'They used 180° instead of 360°',
        },
        {
          stepOrder: 3,
          title: 'Correcting the calculation',
          explanation: 'Replace 180° with 360° and redo the subtraction. For angles 100°, 90°, and 80°: 360° − 100° − 90° − 80° = 90°. Check: 100° + 90° + 80° + 90° = 360° ✓.',
          checkpointQuestion: 'A quadrilateral has angles 100°, 90°, and 80°. What is the correct fourth angle?',
          checkpointOptions: ['80°', '90°', '100°', '110°'],
          checkpointAnswer: '90°',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * G1.9 — Interior angle sum of any polygon
   * ────────────────────────────────────────────────────────────────────── */
  'G1.9': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students do not know the formula for the interior angle sum of a polygon or use 180n instead of 180(n − 2).',
      workedExample: 'A pentagon has 5 sides. Interior angle sum = 180° × (5 − 2) = 180° × 3 = 540°.',
      guidedPrompt: 'Find the interior angle sum of a hexagon (6 sides).',
      guidedAnswer: 'Interior angle sum = 180° × (6 − 2) = 180° × 4 = 720°.',
      steps: [
        {
          stepOrder: 1,
          title: 'The interior angle sum formula',
          explanation: 'For any polygon with n sides, the sum of the interior angles is 180° × (n − 2). This works because the polygon can be split into (n − 2) triangles, each with angles summing to 180°.',
          checkpointQuestion: 'What is the formula for the sum of interior angles of an n-sided polygon?',
          checkpointOptions: ['180° × n', '180° × (n − 1)', '180° × (n − 2)', '360° × n'],
          checkpointAnswer: '180° × (n − 2)',
        },
        {
          stepOrder: 2,
          title: 'Applying the formula',
          explanation: 'For a pentagon (n = 5): angle sum = 180° × (5 − 2) = 180° × 3 = 540°. Always subtract 2 from the number of sides first, then multiply by 180°.',
          checkpointQuestion: 'What is the interior angle sum of a pentagon (5 sides)?',
          checkpointOptions: ['360°', '540°', '720°', '900°'],
          checkpointAnswer: '540°',
        },
        {
          stepOrder: 3,
          title: 'Finding a missing angle',
          explanation: 'To find a missing angle in a polygon, first calculate the total interior angle sum, then subtract all known angles. For a hexagon with five angles of 130°, 110°, 120°, 140°, and 100°: missing = 720° − 130° − 110° − 120° − 140° − 100° = 120°.',
          checkpointQuestion: 'What is the interior angle sum of a hexagon (6 sides)?',
          checkpointOptions: ['540°', '720°', '900°', '1080°'],
          checkpointAnswer: '720°',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students memorise the formula without understanding why subtracting 2 is necessary or how triangles relate to the polygon.',
      workedExample: 'Pick one vertex of a pentagon and draw diagonals to all non-adjacent vertices. This creates 3 triangles. Each has an angle sum of 180°, so the pentagon total is 3 × 180° = 540°. In general, n sides → (n − 2) triangles.',
      guidedPrompt: 'Explain why a hexagon has an interior angle sum of 720° using triangles.',
      guidedAnswer: 'From one vertex, draw diagonals to create 4 triangles (6 − 2 = 4). Each triangle sums to 180°, so the hexagon total is 4 × 180° = 720°.',
      steps: [
        {
          stepOrder: 1,
          title: 'Splitting polygons into triangles',
          explanation: 'From one vertex of an n-sided polygon, draw diagonals to all non-adjacent vertices. This creates (n − 2) triangles. The angles of these triangles cover all the interior angles of the polygon.',
          checkpointQuestion: 'How many triangles are formed when diagonals are drawn from one vertex of a pentagon?',
          checkpointOptions: ['2', '3', '4', '5'],
          checkpointAnswer: '3',
        },
        {
          stepOrder: 2,
          title: 'Why we subtract 2',
          explanation: 'A polygon with n sides produces (n − 2) triangles because two sides of the polygon are already connected to the chosen vertex. The remaining (n − 2) triangles fill the interior. Each contributes 180° to the total.',
          checkpointQuestion: 'A hexagon (6 sides) splits into how many triangles from one vertex?',
          checkpointOptions: ['3', '4', '5', '6'],
          checkpointAnswer: '4',
        },
        {
          stepOrder: 3,
          title: 'Applying the visual understanding',
          explanation: 'Knowing the triangle-splitting method helps you derive the formula on the spot. For an octagon (8 sides): 8 − 2 = 6 triangles, so angle sum = 6 × 180° = 1080°.',
          checkpointQuestion: 'What is the interior angle sum of an octagon (8 sides)?',
          checkpointOptions: ['720°', '900°', '1080°', '1260°'],
          checkpointAnswer: '1080°',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students use 180n instead of 180(n − 2), forgetting to subtract 2, which gives an answer that is 360° too large.',
      workedExample: 'A student calculates the angle sum of a pentagon as 180° × 5 = 900°. This is wrong — they forgot to subtract 2. The correct answer is 180° × (5 − 2) = 180° × 3 = 540°.',
      guidedPrompt: 'A student says the interior angle sum of a hexagon is 180° × 6 = 1080°. What is their error?',
      guidedAnswer: 'They used 180° × n instead of 180° × (n − 2). The correct answer is 180° × 4 = 720°.',
      steps: [
        {
          stepOrder: 1,
          title: 'The common formula mistake',
          explanation: 'The formula is 180° × (n − 2), not 180° × n. Forgetting to subtract 2 always gives an answer that is exactly 360° too large. If your answer seems too big, check whether you subtracted 2.',
          checkpointQuestion: 'What must you subtract from n before multiplying by 180° in the polygon angle-sum formula?',
          checkpointOptions: ['1', '2', '3'],
          checkpointAnswer: '2',
        },
        {
          stepOrder: 2,
          title: 'Spotting the error in practice',
          explanation: 'A student writes the angle sum of a pentagon (5 sides) as 180° × 5 = 900°. The correct calculation is 180° × (5 − 2) = 540°. Notice the difference is exactly 360°.',
          checkpointQuestion: 'What is the correct interior angle sum of a pentagon?',
          checkpointOptions: ['360°', '540°', '720°', '900°'],
          checkpointAnswer: '540°',
        },
        {
          stepOrder: 3,
          title: 'Quick-check strategy',
          explanation: 'A triangle (3 sides) has an angle sum of 180°. A quadrilateral (4 sides) has 360°. Check: 180° × (3 − 2) = 180° ✓ and 180° × (4 − 2) = 360° ✓. Use these known facts to verify you are applying the formula correctly.',
          checkpointQuestion: 'Using the formula 180° × (n − 2), what is the angle sum of a heptagon (7 sides)?',
          checkpointOptions: ['720°', '900°', '1080°', '1260°'],
          checkpointAnswer: '900°',
        },
      ],
    },
  ],

  /* ──────────────────────────────────────────────────────────────────────
   * G1.10 — Exterior angles of any polygon sum to 360°; regular polygon calculations
   * ────────────────────────────────────────────────────────────────────── */
  'G1.10': [
    {
      routeType: 'A',
      misconceptionSummary: 'Students do not know that the exterior angles of any convex polygon always sum to 360°, or they confuse exterior and interior angles.',
      workedExample: 'A regular hexagon has 6 equal exterior angles. Each exterior angle = 360° ÷ 6 = 60°. Check: the interior angle = 180° − 60° = 120°, and 6 × 120° = 720° ✓.',
      guidedPrompt: 'Find each exterior angle of a regular pentagon.',
      guidedAnswer: 'Each exterior angle = 360° ÷ 5 = 72°.',
      steps: [
        {
          stepOrder: 1,
          title: 'Exterior angles sum to 360°',
          explanation: 'If you walk around any convex polygon, turning at each vertex by the exterior angle, you make one full turn — 360°. So the exterior angles of any convex polygon always add up to 360°.',
          checkpointQuestion: 'What do the exterior angles of any convex polygon add up to?',
          checkpointOptions: ['180°', '360°', '540°', '720°'],
          checkpointAnswer: '360°',
        },
        {
          stepOrder: 2,
          title: 'Exterior angles of regular polygons',
          explanation: 'In a regular polygon all exterior angles are equal. If the polygon has n sides, each exterior angle = 360° ÷ n. For a regular octagon (8 sides): each exterior angle = 360° ÷ 8 = 45°.',
          checkpointQuestion: 'What is each exterior angle of a regular octagon (8 sides)?',
          checkpointOptions: ['30°', '40°', '45°', '60°'],
          checkpointAnswer: '45°',
        },
        {
          stepOrder: 3,
          title: 'Finding the number of sides',
          explanation: 'If you know each exterior angle of a regular polygon, divide 360° by it to find the number of sides. For example, if each exterior angle is 40°: n = 360° ÷ 40° = 9 sides.',
          checkpointQuestion: 'A regular polygon has exterior angles of 40°. How many sides does it have?',
          checkpointOptions: ['8', '9', '10', '12'],
          checkpointAnswer: '9',
        },
      ],
    },
    {
      routeType: 'B',
      misconceptionSummary: 'Students know the exterior angle sum is 360° but do not understand why, or cannot link interior and exterior angles at a vertex.',
      workedExample: 'At each vertex of a polygon, the interior and exterior angles lie on a straight line, so they add up to 180°. Walking around the polygon, each exterior angle represents the turn. A full walk returns you to the start — one full turn of 360°.',
      guidedPrompt: 'Explain why the exterior angles of any convex polygon sum to 360°.',
      guidedAnswer: 'Imagine walking along each side and turning through each exterior angle at each vertex. After completing the polygon you face the same direction as the start — a full 360° turn.',
      steps: [
        {
          stepOrder: 1,
          title: 'Interior and exterior angle pairs',
          explanation: 'At each vertex, the interior angle and the exterior angle sit on a straight line, so they add up to 180°. If the interior angle is 120°, the exterior angle is 180° − 120° = 60°.',
          checkpointQuestion: 'An interior angle of a polygon is 150°. What is the corresponding exterior angle?',
          checkpointOptions: ['30°', '60°', '150°', '210°'],
          checkpointAnswer: '30°',
        },
        {
          stepOrder: 2,
          title: 'The walking-around proof',
          explanation: 'Imagine walking along each edge of a polygon and turning through the exterior angle at each vertex. After visiting every vertex you are back at the start, facing the same direction — you have turned through exactly 360°.',
          checkpointQuestion: 'True or false: the exterior angle sum of 360° works only for regular polygons.',
          checkpointOptions: ['True', 'False'],
          checkpointAnswer: 'False',
        },
        {
          stepOrder: 3,
          title: 'Linking to interior angles',
          explanation: 'For a regular polygon with n sides: each exterior angle = 360° ÷ n, so each interior angle = 180° − (360° ÷ n). For a regular pentagon: exterior = 72°, interior = 108°.',
          checkpointQuestion: 'What is each interior angle of a regular pentagon?',
          checkpointOptions: ['72°', '90°', '108°', '120°'],
          checkpointAnswer: '108°',
        },
      ],
    },
    {
      routeType: 'C',
      misconceptionSummary: 'Students confuse interior and exterior angles, using the interior angle where the exterior angle is needed, or forget that interior + exterior = 180° at each vertex.',
      workedExample: 'A student says the exterior angle of a regular hexagon is 120°. That is actually the interior angle. The exterior angle = 180° − 120° = 60°. Each exterior angle of a regular hexagon is 360° ÷ 6 = 60°.',
      guidedPrompt: 'A student says the exterior angle of a regular pentagon is 108°. What is their mistake?',
      guidedAnswer: '108° is the interior angle. The exterior angle = 180° − 108° = 72°, or equivalently 360° ÷ 5 = 72°.',
      steps: [
        {
          stepOrder: 1,
          title: 'Interior vs exterior',
          explanation: 'The interior angle is inside the polygon. The exterior angle is formed by extending one side beyond the vertex. They sit on a straight line so they always add up to 180°. Mixing them up is the most common mistake.',
          checkpointQuestion: 'What do an interior angle and its corresponding exterior angle add up to?',
          checkpointOptions: ['90°', '180°', '360°'],
          checkpointAnswer: '180°',
        },
        {
          stepOrder: 2,
          title: 'Spotting the swap error',
          explanation: 'If a student says the exterior angle of a regular hexagon is 120°, check: 6 × 120° = 720° ≠ 360°. The sum of exterior angles must be 360°, so each must be 360° ÷ 6 = 60°. The 120° is the interior angle.',
          checkpointQuestion: 'A regular hexagon has interior angles of 120°. What is each exterior angle?',
          checkpointOptions: ['60°', '90°', '120°', '240°'],
          checkpointAnswer: '60°',
        },
        {
          stepOrder: 3,
          title: 'Using the correct angle',
          explanation: 'When a question asks for the exterior angle of a regular polygon, use 360° ÷ n. When it asks for the interior angle, use 180° − (360° ÷ n). Always check which angle the question requires.',
          checkpointQuestion: 'What is each exterior angle of a regular decagon (10 sides)?',
          checkpointOptions: ['24°', '36°', '45°', '60°'],
          checkpointAnswer: '36°',
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

  console.log('\n✅ ensured explanation routes for G1.1, G1.1b, G1.2, G1.3, G1.4, G1.5, G1.6, G1.7, G1.8, G1.9, G1.10');
}

// Only execute when run directly (not when imported by tests/other modules).
// We guard on DATABASE_URL rather than require.main because vitest transforms
// to ESM where CommonJS module globals are unavailable.
if (process.env.DATABASE_URL) {
  main().catch(console.error).finally(() => prisma.$disconnect());
}
