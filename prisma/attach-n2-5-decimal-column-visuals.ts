import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type JsonLike = Record<string, unknown> | string | number | boolean | null | JsonLike[];

const makeDecimalColumn = (operands: string[], prompt: string, showCarries = false): JsonLike[] => [
  {
    type: 'arithmetic-layout',
    layout: 'column-addition',
    altText: prompt,
    operands,
    operator: '+',
    align: 'decimal',
    showOperator: true,
    showAnswerLine: true,
    showAnswer: false,
    annotations: { showCarries },
  },
];

const VISUALS: Record<string, JsonLike[]> = {
  'Slide148-N2.5-ONB-01': makeDecimalColumn(['11.8', '2.3'], 'Calculate 11.8 + 2.3.'),
  'Slide148-N2.5-LRN-01': makeDecimalColumn(['2.04', '0.7'], 'Calculate 2.04 + 0.7 using column addition.'),
  'Slide148-N2.5-LRN-02': makeDecimalColumn(['0.53', '5.27'], 'Calculate 0.53 + 5.27 using column addition.'),
  'Slide148-N2.5-RT-01': makeDecimalColumn(['3.4', '0.27'], 'What is the correct answer to 3.4 + 0.27?', true),
  'Draft-N2.5-TOPUP-01': makeDecimalColumn(['4.2', '1.5'], 'Calculate 4.2 + 1.5 using column addition.'),
  'Draft-N2.5-TOPUP-02': makeDecimalColumn(['2.34', '0.5'], 'Calculate 2.34 + 0.5 using column addition.'),
  'Draft-N2.5-TOPUP-03': makeDecimalColumn(['0.76', '1.08'], 'Calculate 0.76 + 1.08 using column addition.'),
  'Draft-N2.5-TOPUP-04': makeDecimalColumn(['3.58', '2.47'], 'Calculate 3.58 + 2.47 using column addition.', true),
  'Draft-N2.5-TOPUP-05': makeDecimalColumn(['7.49', '0.36'], 'Calculate 7.49 + 0.36 using column addition.', true),
  'Draft-N2.5-TOPUP-06': makeDecimalColumn(['12.7', '3.48'], 'Calculate 12.7 + 3.48 using column addition.'),
  'Draft-N2.5-TOPUP-07': makeDecimalColumn(['0.405', '1.27'], 'Calculate 0.405 + 1.27 using column addition.'),
  'Draft-N2.5-TOPUP-08': makeDecimalColumn(['2.308', '0.49'], 'Calculate 2.308 + 0.49 using column addition.'),
  'Draft-N2.5-TOPUP-09': makeDecimalColumn(['4.6', '0.35'], 'Is 4.6 + 0.35 = 4.95 correct?'),
  'Draft-N2.5-TOPUP-10': makeDecimalColumn(['3.4', '0.27'], 'Which explanation best describes the mistake in 3.4 + 0.27 = 3.61?', true),
  'Draft-N2.5-TOPUP-11': makeDecimalColumn(['3.4', '0.27'], 'What is the correct answer to 3.4 + 0.27 when written using column addition?', true),
  'Draft-N2.5-TOPUP-12': makeDecimalColumn(['5.08', '0.7'], 'Which answer is correct for 5.08 + 0.7 using column addition?'),
  'Draft-N2.5-TOPUP-13': makeDecimalColumn(['0.53', '5.27'], 'Which answer is correct for 0.53 + 5.27 using column addition?'),
  'Draft-N2.5-TOPUP-14': makeDecimalColumn(['2.04', '0.7'], 'True or false: when using column addition with decimals, the decimal points must line up in the same column.'),
};

async function main() {
  const subject = await prisma.subject.findUnique({ where: { slug: 'ks3-maths' } });
  if (!subject) throw new Error('Subject ks3-maths not found');
  for (const [questionRef, visuals] of Object.entries(VISUALS)) {
    const item = await prisma.item.findFirst({ where: { subjectId: subject.id, question: { startsWith: `[${questionRef}]` } } });
    if (!item) { console.warn(`Skipping missing item ${questionRef}`); continue; }
    const options = (item.options ?? {}) as Record<string, unknown>;
    await prisma.item.update({ where: { id: item.id }, data: { options: { ...options, visuals } as any } });
    console.log(`Updated ${questionRef}`);
  }
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
