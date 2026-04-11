import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Visual = {
  type: 'bar_model';
  total: number;
  segments: { value: number; label?: string; highlight?: boolean; isQuestion?: boolean; color?: 'primary' | 'secondary' | 'question' }[];
  showTotal?: boolean;
  question?: string;
};

const VISUALS: Record<string, Visual[]> = {
  'Slide96-N2.1-ONB-01': [
    {
      type: 'bar_model',
      total: 12,
      showTotal: true,
      question: 'Which addition fact matches this bar model?',
      segments: [
        { value: 6, label: '6', color: 'primary' },
        { value: 6, label: '6', color: 'secondary' },
      ],
    },
  ],
  'Slide97-N2.1-LRN-01': [
    {
      type: 'bar_model',
      total: 14,
      showTotal: true,
      question: 'Write the two addition facts for this part-whole model.',
      segments: [
        { value: 9, label: '9', color: 'primary' },
        { value: 5, label: '5', color: 'secondary' },
      ],
    },
  ],
  'Slide100-N2.1-LRN-02': [
    {
      type: 'bar_model',
      total: 10,
      showTotal: true,
      question: 'Write the two subtraction facts for this part-whole model.',
      segments: [
        { value: 7, label: '7', color: 'primary' },
        { value: 3, label: '3', color: 'secondary' },
      ],
    },
  ],
  'Slide99-N2.1-RT-01': [
    {
      type: 'bar_model',
      total: 5,
      showTotal: true,
      question: 'Why is 5 - 10 = 5 not correct?',
      segments: [
        { value: 5, label: 'start', color: 'primary' },
        { value: 10, label: 'subtract 10', color: 'question' },
      ],
    },
  ],
  'Draft-N2.1-TOPUP-01': [{ type: 'bar_model', total: 15, showTotal: true, question: 'Which addition fact matches this bar model?', segments: [{ value: 7, label: '7', color: 'primary' }, { value: 8, label: '8', color: 'secondary' }] }],
  'Draft-N2.1-TOPUP-02': [{ type: 'bar_model', total: 18, showTotal: true, question: 'Write two addition facts for this bar model.', segments: [{ value: 11, label: '11', color: 'primary' }, { value: 7, label: '7', color: 'secondary' }] }],
  'Draft-N2.1-TOPUP-03': [{ type: 'bar_model', total: 13, showTotal: true, question: 'Write two subtraction facts for this bar model.', segments: [{ value: 9, label: '9', color: 'primary' }, { value: 4, label: '4', color: 'secondary' }] }],
  'Draft-N2.1-TOPUP-04': [{ type: 'bar_model', total: 20, showTotal: true, question: 'Which subtraction fact matches this bar model?', segments: [{ value: 14, label: '14', color: 'primary' }, { value: 6, label: '6', color: 'secondary' }] }],
  'Draft-N2.1-TOPUP-07': [{ type: 'bar_model', total: 16, showTotal: true, question: 'Find the missing part.', segments: [{ value: 9, label: '9', color: 'primary' }, { value: 7, label: '?', isQuestion: true, color: 'question' }] }],
  'Draft-N2.1-TOPUP-08': [{ type: 'bar_model', total: 17, showTotal: true, question: 'Which two addition facts belong to this model?', segments: [{ value: 10, label: '10', color: 'primary' }, { value: 7, label: '7', color: 'secondary' }] }],
  'Draft-N2.1-TOPUP-09': [{ type: 'bar_model', total: 19, showTotal: true, question: 'Which two subtraction facts belong to this model?', segments: [{ value: 12, label: '12', color: 'primary' }, { value: 7, label: '7', color: 'secondary' }] }],
  'Draft-N2.1-TOPUP-11': [{ type: 'bar_model', total: 21, showTotal: true, question: 'Which subtraction gives the missing part?', segments: [{ value: 13, label: '13', color: 'primary' }, { value: 8, label: '?', isQuestion: true, color: 'question' }] }],
  'Draft-N2.1-TOPUP-12': [{ type: 'bar_model', total: 9, showTotal: true, question: 'Write one addition fact and one subtraction fact.', segments: [{ value: 4, label: '4', color: 'primary' }, { value: 5, label: '5', color: 'secondary' }] }],
};

async function main() {
  const subject = await prisma.subject.findUnique({ where: { slug: 'ks3-maths' } });
  if (!subject) throw new Error('Subject ks3-maths not found');

  for (const [questionRef, visuals] of Object.entries(VISUALS)) {
    const item = await prisma.item.findFirst({
      where: {
        subjectId: subject.id,
        question: { startsWith: `[${questionRef}]` },
      },
    });

    if (!item) {
      console.warn(`Skipping missing item ${questionRef}`);
      continue;
    }

    const options = (item.options ?? {}) as Record<string, unknown>;
    await prisma.item.update({
      where: { id: item.id },
      data: {
        options: {
          ...options,
          visuals,
        },
      },
    });
    console.log(`Updated ${questionRef}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
