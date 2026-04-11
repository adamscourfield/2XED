import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type JsonLike = Record<string, unknown> | string | number | boolean | null | JsonLike[];

const VISUALS: Record<string, JsonLike[]> = {
  'Slide106-N2.2-ONB-01': [
    {
      type: 'number_line',
      start: 4,
      end: 7,
      tickStep: 1,
      jumps: [{ from: 4, to: 7, label: '+3', direction: 'forward' }],
      question: 'Use the number line to calculate 4 + 3.',
    },
  ],
  'Slide107-N2.2-LRN-01': [
    {
      type: 'number_line',
      start: 5,
      end: 11,
      tickStep: 1,
      jumps: [{ from: 5, to: 11, label: '+6', direction: 'forward' }],
      question: 'Calculate 5 + 6 mentally using the number line idea.',
    },
  ],
  'Slide108-N2.2-LRN-02': [
    {
      type: 'number_line',
      start: 10,
      end: 16,
      tickStep: 1,
      jumps: [{ from: 10, to: 16, label: '+6', direction: 'forward' }],
      question: 'What addition is shown on this number line?',
    },
  ],
  'Draft-N2.2-TOPUP-01': [{ type: 'number_line', start: 1, end: 3, tickStep: 1, jumps: [{ from: 1, to: 3, label: '+2', direction: 'forward' }], question: 'Use the number line to calculate 1 + 2.' }],
  'Draft-N2.2-TOPUP-02': [{ type: 'number_line', start: 3, end: 5, tickStep: 1, jumps: [{ from: 3, to: 5, label: '+2', direction: 'forward' }], question: 'Use the number line to calculate 3 + 2.' }],
  'Draft-N2.2-TOPUP-03': [{ type: 'number_line', start: 4, end: 9, tickStep: 1, jumps: [{ from: 4, to: 9, label: '+5', direction: 'forward' }], question: 'Use the number line to calculate 4 + 5.' }],
  'Draft-N2.2-TOPUP-04': [{ type: 'number_line', start: 8, end: 11, tickStep: 1, jumps: [{ from: 8, to: 11, label: '+3', direction: 'forward' }], question: 'What addition is shown on this number line?' }],
  'Draft-N2.2-TOPUP-05': [{ type: 'number_line', start: 13, end: 17, tickStep: 1, jumps: [{ from: 13, to: 17, label: '+4', direction: 'forward' }], question: 'What addition is shown on this number line?' }],
  'Draft-N2.2-TOPUP-06': [{ type: 'number_line', start: 5, end: 2, tickStep: 1, jumps: [{ from: 5, to: 2, label: '-3', direction: 'backward' }], question: 'Use the number line to calculate 5 - 3.' }],
  'Draft-N2.2-TOPUP-07': [{ type: 'number_line', start: 6, end: 4, tickStep: 1, jumps: [{ from: 6, to: 4, label: '-2', direction: 'backward' }], question: 'Use the number line to calculate 6 - 2.' }],
  'Draft-N2.2-TOPUP-08': [{ type: 'number_line', start: 11, end: 4, tickStep: 1, jumps: [{ from: 11, to: 4, label: '-7', direction: 'backward' }], question: 'Use the number line to calculate 11 - 7.' }],
  'Draft-N2.2-TOPUP-09': [{ type: 'number_line', start: 36, end: 31, tickStep: 1, jumps: [{ from: 36, to: 31, label: '-5', direction: 'backward' }], question: 'What subtraction is shown on this number line?' }],
  'Draft-N2.2-TOPUP-10': [{ type: 'number_line', start: 70, end: 80, tickStep: 5, jumps: [{ from: 70, to: 80, label: '+10', direction: 'forward' }], question: 'What calculation is shown on this number line?' }],
  'Draft-N2.2-TOPUP-11': [{ type: 'bar_model', total: 5, showTotal: true, question: 'Which addition facts belong to this bar model?', segments: [{ value: 2, label: '2', color: 'primary' }, { value: 3, label: '3', color: 'secondary' }] }],
  'Draft-N2.2-TOPUP-12': [{ type: 'bar_model', total: 13, showTotal: true, question: 'What is the missing part?', segments: [{ value: 6, label: '6', color: 'primary' }, { value: 7, label: '?', isQuestion: true, color: 'question' }] }],
  'Draft-N2.2-TOPUP-14': [{ type: 'bar_model', total: 13, showTotal: true, question: 'What subtraction facts are associated with this addition fact family?', segments: [{ value: 6, label: '6', color: 'primary' }, { value: 7, label: '7', color: 'secondary' }] }],
  'Draft-N2.2-TOPUP2-01': [{ type: 'number_line', start: 2, end: 5, tickStep: 1, jumps: [{ from: 2, to: 5, label: '+3', direction: 'forward' }], question: 'Use the number line to calculate 2 + 3.' }],
  'Draft-N2.2-TOPUP2-02': [{ type: 'number_line', start: 5, end: 9, tickStep: 1, jumps: [{ from: 5, to: 9, label: '+4', direction: 'forward' }], question: 'Use the number line to calculate 5 + 4.' }],
  'Draft-N2.2-TOPUP2-03': [{ type: 'number_line', start: 5, end: 10, tickStep: 1, jumps: [{ from: 5, to: 10, label: '+5', direction: 'forward' }], question: 'Use the number line to calculate 5 + 5.' }],
  'Draft-N2.2-TOPUP2-04': [{ type: 'number_line', start: 18, end: 24, tickStep: 1, jumps: [{ from: 18, to: 24, label: '+6', direction: 'forward' }], question: 'What addition is shown on this number line?' }],
  'Draft-N2.2-TOPUP2-05': [{ type: 'number_line', start: 23, end: 30, tickStep: 1, jumps: [{ from: 23, to: 30, label: '+7', direction: 'forward' }], question: 'What addition is shown on this number line?' }],
  'Draft-N2.2-TOPUP2-06': [{ type: 'number_line', start: 3, end: 2, tickStep: 1, jumps: [{ from: 3, to: 2, label: '-1', direction: 'backward' }], question: 'Use the number line to calculate 3 - 1.' }],
  'Draft-N2.2-TOPUP2-07': [{ type: 'number_line', start: 5, end: 3, tickStep: 1, jumps: [{ from: 5, to: 3, label: '-2', direction: 'backward' }], question: 'Use the number line to calculate 5 - 2.' }],
  'Draft-N2.2-TOPUP2-08': [{ type: 'number_line', start: 42, end: 36, tickStep: 1, jumps: [{ from: 42, to: 36, label: '-6', direction: 'backward' }], question: 'What subtraction is shown on this number line?' }],
  'Draft-N2.2-TOPUP2-09': [{ type: 'number_line', start: 54, end: 47, tickStep: 1, jumps: [{ from: 54, to: 47, label: '-7', direction: 'backward' }], question: 'What subtraction is shown on this number line?' }],
  'Draft-N2.2-TOPUP2-10': [{ type: 'bar_model', total: 7, showTotal: true, question: 'Which addition fact matches this bar model?', segments: [{ value: 3, label: '3', color: 'primary' }, { value: 4, label: '4', color: 'secondary' }] }],
  'Draft-N2.2-TOPUP2-11': [{ type: 'bar_model', total: 9, showTotal: true, question: 'What is the missing part?', segments: [{ value: 5, label: '5', color: 'primary' }, { value: 4, label: '?', isQuestion: true, color: 'question' }] }],
};

async function main() {
  const subject = await prisma.subject.findUnique({ where: { slug: 'ks3-maths' } });
  if (!subject) throw new Error('Subject ks3-maths not found');

  for (const [questionRef, visuals] of Object.entries(VISUALS)) {
    const item = await prisma.item.findFirst({
      where: { subjectId: subject.id, question: { startsWith: `[${questionRef}]` } },
    });
    if (!item) {
      console.warn(`Skipping missing item ${questionRef}`);
      continue;
    }
    const options = (item.options ?? {}) as Record<string, unknown>;
    await prisma.item.update({
      where: { id: item.id },
      data: { options: { ...options, visuals } as any },
    });
    console.log(`Updated ${questionRef}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
