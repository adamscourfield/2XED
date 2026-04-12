import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type JsonLike = Record<string, unknown> | string | number | boolean | null | JsonLike[];

const moneyTable = (rows: { label: string; type?: string; amount: string }[], prompt: string): JsonLike[] => [
  {
    type: 'arithmetic-layout',
    layout: 'place-value-table',
    altText: prompt,
    columnHeaders: rows.some((r) => r.type) ? ['Type', 'Amount'] : ['Item', 'Amount'],
    rows: rows.map((row) => ({ label: row.label, values: row.type ? [row.type, row.amount] : [row.amount] })),
  },
];

const VISUALS: Record<string, JsonLike[]> = {
  'Draft-N2.8-TOPUP-05': moneyTable([
    { label: 'Card payment', type: 'Debit', amount: '£12.45' },
    { label: 'Cash withdrawal', type: 'Debit', amount: '£20.00' },
    { label: 'Refund', type: 'Credit', amount: '£8.00' },
  ], 'Bank statement transactions for net change.'),
  'Draft-N2.8-TOPUP-06': moneyTable([
    { label: 'Starting balance', type: 'Balance', amount: '£150.00' },
    { label: 'Transaction 1', type: 'Debit', amount: '£24.75' },
    { label: 'Transaction 2', type: 'Debit', amount: '£18.20' },
    { label: 'Transaction 3', type: 'Credit', amount: '£40.00' },
  ], 'Bank statement with starting balance and transactions.'),
  'Draft-N2.8-TOPUP-07': moneyTable([
    { label: 'Starting balance', type: 'Balance', amount: '£82.50' },
    { label: 'Transaction 1', type: 'Credit', amount: '£25.00' },
    { label: 'Transaction 2', type: 'Debit', amount: '£13.45' },
    { label: 'Transaction 3', type: 'Debit', amount: '£8.20' },
  ], 'Bank statement with mixed credits and debits.'),
  'Draft-N2.8-TOPUP-12': moneyTable([
    { label: 'Starting balance', type: 'Balance', amount: '£95.00' },
    { label: 'Transaction 1', type: 'Debit', amount: '£14.35' },
    { label: 'Transaction 2', type: 'Credit', amount: '£9.50' },
  ], 'Bank statement with one debit and one credit.'),
  'Draft-N2.8-TOPUP-13': moneyTable([
    { label: 'Starting balance', type: 'Balance', amount: '£120.00' },
    { label: 'Card payment', type: 'Debit', amount: '£18.60' },
    { label: 'Salary credit', type: 'Credit', amount: '£50.00' },
    { label: 'Cash withdrawal', type: 'Debit', amount: '£20.00' },
  ], 'Bank statement showing balance, debit, credit, and withdrawal.'),
  'Draft-N2.8-TOPUP2-03': moneyTable([
    { label: 'Starting balance', type: 'Balance', amount: '£210.00' },
    { label: 'Transaction 1', type: 'Debit', amount: '£34.50' },
    { label: 'Transaction 2', type: 'Debit', amount: '£12.99' },
    { label: 'Transaction 3', type: 'Credit', amount: '£18.40' },
  ], 'Bank statement with mixed debits and a credit.'),
  'Draft-N2.8-TOPUP2-04': moneyTable([
    { label: 'Starting balance', type: 'Balance', amount: '£54.20' },
    { label: 'Transaction 1', type: 'Credit', amount: '£16.00' },
    { label: 'Transaction 2', type: 'Debit', amount: '£7.35' },
    { label: 'Transaction 3', type: 'Debit', amount: '£12.40' },
  ], 'Bank statement with one credit and two debits.'),
  'Draft-N2.8-TOPUP2-05': moneyTable([
    { label: 'Transaction 1', type: 'Debit', amount: '£15.00' },
    { label: 'Transaction 2', type: 'Debit', amount: '£6.75' },
    { label: 'Transaction 3', type: 'Credit', amount: '£20.00' },
    { label: 'Transaction 4', type: 'Debit', amount: '£3.50' },
  ], 'Bank statement transactions for net change.'),
  'Draft-N2.8-TOPUP2-12': moneyTable([
    { label: 'Starting balance', type: 'Balance', amount: '£68.00' },
    { label: 'Transaction 1', type: 'Debit', amount: '£12.50' },
    { label: 'Transaction 2', type: 'Debit', amount: '£4.75' },
    { label: 'Transaction 3', type: 'Credit', amount: '£6.20' },
  ], 'Bank statement with starting balance and mixed transactions.'),
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
