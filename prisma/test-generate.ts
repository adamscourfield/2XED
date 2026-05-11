import { generateQuestionsForSkill } from '../src/lib/ai/questionGenerator';

function getChoiceList(options: unknown): string[] {
  if (!options || typeof options !== 'object') return [];
  const choices = (options as { choices?: unknown }).choices;
  return Array.isArray(choices) ? choices.filter((choice): choice is string => typeof choice === 'string') : [];
}

async function main() {
  const items = await generateQuestionsForSkill({ skillCode: 'N1.1', count: 3 });
  console.log('Generated', items.length, 'items:');
  for (const i of items) {
    const choices = getChoiceList(i.options);
    console.log('\n---');
    console.log('Q:', i.question);
    console.log('Options:', choices);
    console.log('Answer:', i.answer);
    const wrongMap = Object.entries(choices
      .filter(c => c !== i.answer)
      .reduce((acc: Record<string, unknown>, c) => {
        const m = (i as unknown as { misconceptionMap?: Record<string, string | null> }).misconceptionMap;
        acc[c] = m?.[c] ?? null;
        return acc;
      }, {}));
    console.log('Distractor → misconception:', wrongMap.map(([opt, id]) => `"${opt}" → ${id ?? 'null'}`).join(', '));
    console.log('DB id:', i.id);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
