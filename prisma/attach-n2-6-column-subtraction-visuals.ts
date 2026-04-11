import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type JsonLike = Record<string, unknown> | string | number | boolean | null | JsonLike[];

const makeColumn = (operands: string[], prompt: string, showCarries = false): JsonLike[] => [
  {
    type: 'arithmetic-layout',
    layout: 'column-subtraction',
    altText: prompt,
    operands,
    operator: '-',
    align: 'right',
    showOperator: true,
    showAnswerLine: true,
    showAnswer: false,
    annotations: { showCarries },
  },
];

const VISUALS: Record<string, JsonLike[]> = {
  'Slide159-N2.6-ONB-01': makeColumn(['83', '52'], 'Calculate 83 - 52 using column subtraction.'),
  'Slide159-N2.6-LRN-01': makeColumn(['96', '24'], 'Calculate 96 - 24 using column subtraction.'),
  'Slide159-N2.6-LRN-02': makeColumn(['45', '32'], 'Calculate 45 - 32 using column subtraction.'),
  'Slide159-N2.6-RT-01': makeColumn(['74', '21'], 'What is the correct answer to 74 - 21?', false),
  'Draft-N2.6-TOPUP-01': makeColumn(['64', '21'], 'Calculate 64 - 21 using column subtraction.'),
  'Draft-N2.6-TOPUP-02': makeColumn(['87', '35'], 'Calculate 87 - 35 using column subtraction.'),
  'Draft-N2.6-TOPUP-03': makeColumn(['73', '28'], 'Calculate 73 - 28 using column subtraction.', true),
  'Draft-N2.6-TOPUP-04': makeColumn(['82', '47'], 'Calculate 82 - 47 using column subtraction.', true),
  'Draft-N2.6-TOPUP-05': makeColumn(['354', '122'], 'Calculate 354 - 122 using column subtraction.'),
  'Draft-N2.6-TOPUP-06': makeColumn(['685', '241'], 'Calculate 685 - 241 using column subtraction.'),
  'Draft-N2.6-TOPUP-07': makeColumn(['503', '278'], 'Calculate 503 - 278 using column subtraction.', true),
  'Draft-N2.6-TOPUP-08': makeColumn(['742', '186'], 'Calculate 742 - 186 using column subtraction.', true),
  'Draft-N2.6-TOPUP-09': makeColumn(['4685', '2341'], 'Calculate 4,685 - 2,341 using column subtraction.'),
  'Draft-N2.6-TOPUP-10': makeColumn(['6504', '3212'], 'Calculate 6,504 - 3,212 using column subtraction.'),
  'Draft-N2.6-TOPUP-11': makeColumn(['5002', '1786'], 'Calculate 5,002 - 1,786 using column subtraction.', true),
  'Draft-N2.6-TOPUP-12': makeColumn(['7403', '2587'], 'Calculate 7,403 - 2,587 using column subtraction.', true),
  'Draft-N2.6-TOPUP-13': makeColumn(['82', '47'], 'Amir writes 82 - 47 = 45. Which explanation best describes the mistake?', true),
  'Draft-N2.6-TOPUP-14': makeColumn(['82', '47'], 'What is the correct answer to 82 - 47 when written using column subtraction?', true),
  'Draft-N2.6-TOPUP-15': makeColumn(['503', '278'], 'Which answer is correct for 503 - 278 using column subtraction?', true),
  'Draft-N2.6-TOPUP-16': makeColumn(['742', '186'], 'True or false: when using column subtraction, digits must line up by place value before subtracting.', true),
  'Draft-N2.6-TOPUP2-01': makeColumn(['91', '56'], 'Calculate 91 - 56 using column subtraction.', true),
  'Draft-N2.6-TOPUP2-02': makeColumn(['104', '57'], 'Calculate 104 - 57 using column subtraction.', true),
  'Draft-N2.6-TOPUP2-03': makeColumn(['302', '168'], 'Calculate 302 - 168 using column subtraction.', true),
  'Draft-N2.6-TOPUP2-04': makeColumn(['620', '285'], 'Calculate 620 - 285 using column subtraction.', true),
  'Draft-N2.6-TOPUP2-05': makeColumn(['1002', '478'], 'Calculate 1,002 - 478 using column subtraction.', true),
  'Draft-N2.6-TOPUP2-06': makeColumn(['2300', '1457'], 'Calculate 2,300 - 1,457 using column subtraction.', true),
  'Draft-N2.6-TOPUP2-07': makeColumn(['4010', '2786'], 'Calculate 4,010 - 2,786 using column subtraction.', true),
  'Draft-N2.6-TOPUP2-08': makeColumn(['6200', '3875'], 'Calculate 6,200 - 3,875 using column subtraction.', true),
  'Draft-N2.6-TOPUP2-09': makeColumn(['7105', '2948'], 'Calculate 7,105 - 2,948 using column subtraction.', true),
  'Draft-N2.6-TOPUP2-10': makeColumn(['104', '57'], 'Which answer is correct for 104 - 57 using column subtraction?', true),
  'Draft-N2.6-TOPUP2-11': makeColumn(['1002', '478'], 'Which answer is correct for 1,002 - 478 using column subtraction?', true),
  'Draft-N2.6-TOPUP2-12': makeColumn(['302', '168'], 'Amir writes 302 - 168 = 266. Which explanation best describes the mistake?', true),
  'Draft-N2.6-TOPUP2-13': makeColumn(['302', '168'], 'What is the correct answer to 302 - 168 when written using column subtraction?', true),
  'Draft-N2.6-TOPUP2-14': makeColumn(['91', '56'], 'True or false: when the top digit is smaller than the bottom digit in a column, you may need to exchange from the column to the left.', true),
  'Draft-N2.6-TOPUP2-15': makeColumn(['8000', '3764'], 'Calculate 8,000 - 3,764 using column subtraction.', true),
  'Draft-N2.6-TOPUP2-16': makeColumn(['9001', '4587'], 'Calculate 9,001 - 4,587 using column subtraction.', true),
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
