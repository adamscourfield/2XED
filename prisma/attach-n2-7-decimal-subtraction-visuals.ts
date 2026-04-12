import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type JsonLike = Record<string, unknown> | string | number | boolean | null | JsonLike[];

const makeDecimalColumn = (operands: string[], prompt: string, showCarries = false): JsonLike[] => [
  {
    type: 'arithmetic-layout',
    layout: 'column-subtraction',
    altText: prompt,
    operands,
    operator: '-',
    align: 'decimal',
    showOperator: true,
    showAnswerLine: true,
    showAnswer: false,
    annotations: { showCarries },
  },
];

const VISUALS: Record<string, JsonLike[]> = {
  'Slide165-N2.7-ONB-01': makeDecimalColumn(['3.8', '2.5'], 'Calculate 3.8 - 2.5.'),
  'Slide165-N2.7-LRN-01': makeDecimalColumn(['1.8', '0.6'], 'Calculate 1.8 - 0.6 using column subtraction.'),
  'Slide165-N2.7-LRN-02': makeDecimalColumn(['8.7', '1.3'], 'Calculate 8.7 - 1.3 using column subtraction.'),
  'Slide165-N2.7-RT-01': makeDecimalColumn(['4.2', '1.7'], 'What is the correct answer to 4.2 - 1.7?', true),
  'Draft-N2.7-TOPUP-01': makeDecimalColumn(['6.4', '2.1'], 'Calculate 6.4 - 2.1 using column subtraction.'),
  'Draft-N2.7-TOPUP-02': makeDecimalColumn(['9.5', '4.2'], 'Calculate 9.5 - 4.2 using column subtraction.'),
  'Draft-N2.7-TOPUP-03': makeDecimalColumn(['7.2', '0.8'], 'Calculate 7.2 - 0.8 using column subtraction.', true),
  'Draft-N2.7-TOPUP-04': makeDecimalColumn(['5.1', '2.7'], 'Calculate 5.1 - 2.7 using column subtraction.', true),
  'Draft-N2.7-TOPUP-05': makeDecimalColumn(['4.85', '1.32'], 'Calculate 4.85 - 1.32 using column subtraction.'),
  'Draft-N2.7-TOPUP-06': makeDecimalColumn(['6.40', '2.75'], 'Calculate 6.40 - 2.75 using column subtraction.', true),
  'Draft-N2.7-TOPUP-07': makeDecimalColumn(['10.03', '4.58'], 'Calculate 10.03 - 4.58 using column subtraction.', true),
  'Draft-N2.7-TOPUP-08': makeDecimalColumn(['3.200', '1.485'], 'Calculate 3.200 - 1.485 using column subtraction.', true),
  'Draft-N2.7-TOPUP-09': makeDecimalColumn(['4.2', '1.7'], 'Lena writes 4.2 - 1.7 = 3.5. Which explanation best describes the mistake?', true),
  'Draft-N2.7-TOPUP-10': makeDecimalColumn(['4.2', '1.7'], 'What is the correct answer to 4.2 - 1.7 when written using column subtraction?', true),
  'Draft-N2.7-TOPUP-11': makeDecimalColumn(['10.03', '4.58'], 'Which answer is correct for 10.03 - 4.58 using column subtraction?', true),
  'Draft-N2.7-TOPUP-12': makeDecimalColumn(['8.7', '1.3'], 'True or false: when using column subtraction with decimals, the decimal points must line up in the same column.'),
  'Draft-N2.7-TOPUP-13': makeDecimalColumn(['8.05', '3.7'], 'Calculate 8.05 - 3.7 using column subtraction.'),
  'Draft-N2.7-TOPUP-14': makeDecimalColumn(['12.00', '8.46'], 'Calculate 12.00 - 8.46 using column subtraction.', true),
  'Draft-N2.7-TOPUP2-01': makeDecimalColumn(['9.0', '4.7'], 'Calculate 9.0 - 4.7 using column subtraction.', true),
  'Draft-N2.7-TOPUP2-02': makeDecimalColumn(['6.00', '2.48'], 'Calculate 6.00 - 2.48 using column subtraction.', true),
  'Draft-N2.7-TOPUP2-03': makeDecimalColumn(['5.30', '1.86'], 'Calculate 5.30 - 1.86 using column subtraction.', true),
  'Draft-N2.7-TOPUP2-04': makeDecimalColumn(['7.04', '2.67'], 'Calculate 7.04 - 2.67 using column subtraction.', true),
  'Draft-N2.7-TOPUP2-05': makeDecimalColumn(['12.4', '3.58'], 'Calculate 12.4 - 3.58 using column subtraction.', true),
  'Draft-N2.7-TOPUP2-06': makeDecimalColumn(['20.00', '7.95'], 'Calculate 20.00 - 7.95 using column subtraction.', true),
  'Draft-N2.7-TOPUP2-07': makeDecimalColumn(['2.500', '0.876'], 'Calculate 2.500 - 0.876 using column subtraction.', true),
  'Draft-N2.7-TOPUP2-08': makeDecimalColumn(['4.003', '1.298'], 'Calculate 4.003 - 1.298 using column subtraction.', true),
  'Draft-N2.7-TOPUP2-09': makeDecimalColumn(['6.00', '2.48'], 'Which answer is correct for 6.00 - 2.48 using column subtraction?', true),
  'Draft-N2.7-TOPUP2-10': makeDecimalColumn(['2.500', '0.876'], 'Which answer is correct for 2.500 - 0.876 using column subtraction?', true),
  'Draft-N2.7-TOPUP2-11': makeDecimalColumn(['7.04', '2.67'], 'Lena writes 7.04 - 2.67 = 5.63. Which explanation best describes the mistake?', true),
  'Draft-N2.7-TOPUP2-12': makeDecimalColumn(['5.30', '1.86'], 'True or false: when subtracting decimals using the column method, you may need to exchange across decimal places just as you do with whole numbers.', true),
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
