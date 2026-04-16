import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding KS3 English (Year 7 Foundation)...');

  // 1️⃣ Subject
  const subject = await prisma.subject.upsert({
    where: { slug: 'ks3-english' },
    update: {},
    create: {
      slug: 'ks3-english',
      title: 'KS3 English',
      description: '2XED – English (Year 7 Entry) Foundation Set v1',
    },
  });

  // 2️⃣ Skill definitions (4 foundation nodes)
  const skillDefs = [
    { code: 'Y7-CON-03', name: 'Explain how a character is presented',             strand: 'CON', isStretch: false, sortOrder: 10 },
    { code: 'Y7-ANA-04', name: 'Explain evidence clearly',                          strand: 'ANA', isStretch: false, sortOrder: 20 },
    { code: 'Y7-CON-05', name: 'Explain how a moment links to a theme',            strand: 'CON', isStretch: false, sortOrder: 30 },
    { code: 'Y7-WRT-04', name: 'Show emotion instead of telling it directly',      strand: 'WRT', isStretch: false, sortOrder: 40 },
    // Gothic unit nodes
    { code: 'Y7-LIT-01', name: 'Recall and apply Gothic conventions',              strand: 'LIT', isStretch: false, sortOrder: 50 },
    { code: 'Y7-CRA-02', name: 'Explain how setting creates atmosphere',           strand: 'CRA', isStretch: false, sortOrder: 60 },
    { code: 'Y7-ANA-06', name: 'Plan and write a What-How-Why analytical paragraph', strand: 'ANA', isStretch: false, sortOrder: 70 },
  ];

  // 3️⃣ Upsert skills and build code→id map
  const skillMap = new Map<string, string>();
  for (const def of skillDefs) {
    const slug = def.code.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const skill = await prisma.skill.upsert({
      where: { subjectId_code: { subjectId: subject.id, code: def.code } },
      update: { name: def.name, strand: def.strand, isStretch: def.isStretch, sortOrder: def.sortOrder, slug },
      create: {
        code: def.code,
        name: def.name,
        slug,
        strand: def.strand,
        isStretch: def.isStretch,
        sortOrder: def.sortOrder,
        subjectId: subject.id,
      },
    });
    skillMap.set(def.code, skill.id);
  }

  // 4️⃣ SkillPrereq edges (Y7-CON-03 → Y7-ANA-04 → Y7-CON-05)
  const prereqEdges: Array<{ parentCode: string; childCode: string; weight: number }> = [
    { parentCode: 'Y7-CON-03', childCode: 'Y7-ANA-04', weight: 1 },
    { parentCode: 'Y7-ANA-04', childCode: 'Y7-CON-05', weight: 1 },
    // Gothic unit edges
    { parentCode: 'Y7-LIT-01', childCode: 'Y7-CRA-02', weight: 1 },
    { parentCode: 'Y7-ANA-04', childCode: 'Y7-CRA-02', weight: 1 },
    { parentCode: 'Y7-ANA-04', childCode: 'Y7-ANA-06', weight: 1 },
    { parentCode: 'Y7-CON-03', childCode: 'Y7-ANA-06', weight: 1 },
    { parentCode: 'Y7-CRA-02', childCode: 'Y7-ANA-06', weight: 1 },
  ];

  for (const edge of prereqEdges) {
    const childId = skillMap.get(edge.childCode);
    const parentId = skillMap.get(edge.parentCode);
    if (!childId || !parentId) {
      console.warn(`⚠️  Skipping prereq ${edge.parentCode} → ${edge.childCode}: skill not found`);
      continue;
    }
    await prisma.skillPrereq.upsert({
      where: { skillId_prereqId: { skillId: childId, prereqId: parentId } },
      update: { weight: edge.weight },
      create: { skillId: childId, prereqId: parentId, weight: edge.weight },
    });
  }

  // 5️⃣ Placeholder items per skill (2 per skill, idempotent by question text)
  for (const def of skillDefs) {
    const skillId = skillMap.get(def.code);
    if (!skillId) continue;
    const placeholderItems = [
      {
        question: `[${def.code}] Placeholder question 1 for: ${def.name}`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        answer: 'Option A',
      },
      {
        question: `[${def.code}] Placeholder question 2 for: ${def.name}`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        answer: 'Option A',
      },
    ];
    for (const itemData of placeholderItems) {
      let item = await prisma.item.findFirst({
        where: { question: itemData.question },
      });
      if (!item) {
        item = await prisma.item.create({
          data: {
            question: itemData.question,
            options: itemData.options,
            answer: itemData.answer,
            type: 'MCQ',
            subjectId: subject.id,
          },
        });
      }
      await prisma.itemSkill.upsert({
        where: { itemId_skillId: { itemId: item.id, skillId } },
        update: {},
        create: { itemId: item.id, skillId },
      });
    }
  }

  console.log('✅ English seed complete:', {
    subject: subject.title,
    skills: skillDefs.length,
    prereqEdges: prereqEdges.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
