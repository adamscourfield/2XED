import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type JsonLike = Record<string, unknown> | string | number | boolean | null | JsonLike[];

const makeColumn = (operands: string[], answer: string, prompt: string, showCarries = false): JsonLike[] => [
  {
    type: 'arithmetic-layout',
    layout: 'column-addition',
    altText: prompt,
    operands,
    operator: '+',
    align: 'right',
    showOperator: true,
    showAnswerLine: true,
    showAnswer: false,
    annotations: { showCarries },
  },
];

const VISUALS: Record<string, JsonLike[]> = {
  'Slide133-N2.4-ONB-01': makeColumn(['15', '30'], '45', 'Calculate 15 + 30 using column addition.'),
  'Slide134-N2.4-LRN-01': makeColumn(['45', '32'], '77', 'Calculate 45 + 32 using column addition.'),
  'Slide135-N2.4-LRN-02': makeColumn(['444', '351'], '795', 'Calculate 444 + 351 using column addition.'),
  'Slide135-N2.4-RT-01': makeColumn(['438', '100'], '538', 'What is the correct answer to 438 + 100 using column addition?'),
  'Draft-N2.4-TOPUP-01': makeColumn(['27', '41'], '68', 'Use column addition to calculate 27 + 41.'),
  'Draft-N2.4-TOPUP-02': makeColumn(['63', '25'], '88', 'Use column addition to calculate 63 + 25.'),
  'Draft-N2.4-TOPUP-03': makeColumn(['47', '38'], '85', 'Use column addition to calculate 47 + 38.', true),
  'Draft-N2.4-TOPUP-04': makeColumn(['58', '27'], '85', 'Use column addition to calculate 58 + 27.', true),
  'Draft-N2.4-TOPUP-05': makeColumn(['136', '243'], '379', 'Use column addition to calculate 136 + 243.'),
  'Draft-N2.4-TOPUP-06': makeColumn(['278', '145'], '423', 'Use column addition to calculate 278 + 145.'),
  'Draft-N2.4-TOPUP-07': makeColumn(['247', '185'], '432', 'Use column addition to calculate 247 + 185.', true),
  'Draft-N2.4-TOPUP-08': makeColumn(['368', '157'], '525', 'Use column addition to calculate 368 + 157.', true),
  'Draft-N2.4-TOPUP-09': makeColumn(['1235', '2341'], '3576', 'Use column addition to calculate 1,235 + 2,341.'),
  'Draft-N2.4-TOPUP-10': makeColumn(['2408', '1325'], '3733', 'Use column addition to calculate 2,408 + 1,325.'),
  'Draft-N2.4-TOPUP-11': makeColumn(['2746', '1587'], '4333', 'Use column addition to calculate 2,746 + 1,587.', true),
  'Draft-N2.4-TOPUP-12': makeColumn(['3658', '2475'], '6133', 'Use column addition to calculate 3,658 + 2,475.', true),
  'Draft-N2.4-TOPUP-13': makeColumn(['438', '100'], '538', 'Sally writes 438 + 100 = 4480. Which explanation best describes her mistake?'),
  'Draft-N2.4-TOPUP-14': makeColumn(['438', '100'], '538', 'What is the correct answer to 438 + 100 when written using column addition?'),
  'Draft-N2.4-TOPUP2-01': makeColumn(['1472', '2315'], '3787', 'Use column addition to calculate 1,472 + 2,315.'),
  'Draft-N2.4-TOPUP2-02': makeColumn(['2104', '3221'], '5325', 'Use column addition to calculate 2,104 + 3,221.'),
  'Draft-N2.4-TOPUP2-03': makeColumn(['1586', '2447'], '4033', 'Use column addition to calculate 1,586 + 2,447.', true),
  'Draft-N2.4-TOPUP2-04': makeColumn(['2759', '1684'], '4443', 'Use column addition to calculate 2,759 + 1,684.', true),
  'Draft-N2.4-TOPUP2-05': makeColumn(['3468', '2157'], '5625', 'Use column addition to calculate 3,468 + 2,157.', true),
  'Draft-N2.4-TOPUP2-06': makeColumn(['4286', '3517'], '7803', 'Use column addition to calculate 4,286 + 3,517.', true),
  'Draft-N2.4-TOPUP2-07': makeColumn(['5347', '2416'], '7763', 'Use column addition to calculate 5,347 + 2,416.'),
  'Draft-N2.4-TOPUP2-08': makeColumn(['6125', '1874'], '7999', 'Use column addition to calculate 6,125 + 1,874.', true),
  'Draft-N2.4-TOPUP2-09': makeColumn(['2099', '1902'], '4001', 'Use column addition to calculate 2,099 + 1,902.', true),
  'Draft-N2.4-TOPUP2-10': makeColumn(['3795', '2408'], '6203', 'Use column addition to calculate 3,795 + 2,408.', true),
  'Draft-N2.4-TOPUP2-11': makeColumn(['4438', '100'], '4538', 'Which answer is correct for 4,438 + 100 when set out using column addition?'),
  'Draft-N2.4-TOPUP2-12': makeColumn(['2746', '1587'], '4333', 'True or false: when using column addition for 2,746 + 1,587, you must line up the digits by place value before adding.', true),
};

async function main() {
  const subject = await prisma.subject.findUnique({ where: { slug: 'ks3-maths' } });
  if (!subject) throw new Error('Subject ks3-maths not found');
  for (const [questionRef, visuals] of Object.entries(VISUALS)) {
    const item = await prisma.item.findFirst({ where: { subjectId: subject.id, question: { startsWith: `[${questionRef}]` } } });
    if (!item) {
      console.warn(`Skipping missing item ${questionRef}`);
      continue;
    }
    const options = (item.options ?? {}) as Record<string, unknown>;
    await prisma.item.update({ where: { id: item.id }, data: { options: { ...options, visuals } as any } });
    console.log(`Updated ${questionRef}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
