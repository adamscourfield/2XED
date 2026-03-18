/**
 * extract-explanations-from-pptx.ts
 *
 * Reads Unit 1 (and optionally other) PPTX files, groups slides by skill code,
 * extracts Steps / I-do examples / Definition / Characteristics text, then
 * upserts ExplanationRoute (A / B / C) + ExplanationStep records into the DB.
 *
 * Run:
 *   ts-node --compiler-options '{"module":"CommonJS"}' prisma/extract-explanations-from-pptx.ts
 *   ts-node --compiler-options '{"module":"CommonJS"}' prisma/extract-explanations-from-pptx.ts --dry-run
 *   ts-node --compiler-options '{"module":"CommonJS"}' prisma/extract-explanations-from-pptx.ts --skill N1.10
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { validateExplanationStepWrite } from '../src/features/learn/explanationStepWriteGuard';

const prisma = new PrismaClient();

// ─── CLI flags ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SKILL_FILTER = (() => {
  const idx = args.indexOf('--skill');
  return idx !== -1 ? args[idx + 1]?.toUpperCase() : null;
})();

// ─── PPTX file list ───────────────────────────────────────────────────────────

const CURRICULUM_DIR = path.join(__dirname, '../Curriculum/Year 7');

const PPTX_FILES = [
  path.join(CURRICULUM_DIR, 'Unit 1 - Applications of Numeracy/(PART A) N1-3 Secondary Ready - Applications of Numeracy (CORE Meeting Expected Standard).pptx'),
  path.join(CURRICULUM_DIR, 'Unit 1 - Applications of Numeracy/(PART A) N1-3 Secondary Ready - Applications of Numeracy (FOUNDATION Not Meeting Expected Standard).pptx'),
  path.join(CURRICULUM_DIR, 'Unit 1 - Applications of Numeracy/(PART B) N1-3 Secondary Ready - Applications of Numeracy (CORE Meeting Expected Standard).pptx'),
  path.join(CURRICULUM_DIR, 'Unit 1 - Applications of Numeracy/(PART B) N1-3 Secondary Ready - Applications of Numeracy (FOUNDATION Not Meeting Expected Standard).pptx'),
];

// ─── XML helpers ──────────────────────────────────────────────────────────────

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2013;/gi, '–')
    .replace(/&#x2014;/gi, '—')
    .replace(/&#x2264;/gi, '≤')
    .replace(/&#x2265;/gi, '≥')
    .replace(/&#x2260;/gi, '≠')
    .replace(/&#xD7;/gi, '×')
    .replace(/&#xF7;/gi, '÷')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractSlideTexts(pptxPath: string): Array<{ slide: number; tokens: string[] }> {
  let entries: string[];
  try {
    entries = execFileSync('unzip', ['-Z1', pptxPath], { encoding: 'utf8' })
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^ppt\/slides\/slide\d+\.xml$/.test(l))
      .sort((a, b) => {
        const na = Number(a.match(/slide(\d+)/)?.[1] ?? 0);
        const nb = Number(b.match(/slide(\d+)/)?.[1] ?? 0);
        return na - nb;
      });
  } catch {
    console.warn(`  [WARN] Cannot read ${path.basename(pptxPath)}`);
    return [];
  }

  return entries.map((entry) => {
    const slideNum = Number(entry.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
    let xml: string;
    try {
      xml = execFileSync('unzip', ['-p', pptxPath, entry], { encoding: 'utf8' });
    } catch {
      return { slide: slideNum, tokens: [] };
    }

    const runs = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)]
      .map((m) => decodeXml(m[1]).trim())
      .filter((s) => s.length > 1);

    return { slide: slideNum, tokens: runs };
  });
}

// ─── Skill extraction ─────────────────────────────────────────────────────────

interface SkillSlides {
  skillCode: string;
  slides: Array<{ slide: number; tokens: string[]; text: string }>;
}

function groupSlidesBySkill(slideData: Array<{ slide: number; tokens: string[] }>): SkillSlides[] {
  const groups: SkillSlides[] = [];
  let current: SkillSlides | null = null;

  for (const { slide, tokens } of slideData) {
    const text = tokens.join(' | ');

    // Detect skill header: "Subtopic N1.3" or "SUBTOPIC N1.3"
    const skillMatch = text.match(/\bsubtopic\s+(N\d+\.\d+)\b/i);
    if (skillMatch) {
      const code = skillMatch[1].toUpperCase();

      // Only start a new group if the code changed
      if (!current || current.skillCode !== code) {
        current = { skillCode: code, slides: [] };
        groups.push(current);
      }
    }

    if (current) {
      current.slides.push({ slide, tokens, text });
    }
  }

  return groups;
}

// ─── Content parsing ──────────────────────────────────────────────────────────

interface ParsedSkillContent {
  skillCode: string;
  title: string | null;
  objectives: string[];
  steps: string[];           // numbered method steps: ["1) ...", "2) ..."]
  idoExample: string | null; // worked "I do" example text
  definition: string | null;
  characteristics: string[];
  nonExamples: string[];
  introText: string | null;
  learningOutcome: string | null;
}

function parseSkillContent(group: SkillSlides): ParsedSkillContent {
  // Flatten all tokens from all slides for this skill
  const allTokens: string[] = group.slides.flatMap((s) => s.tokens);

  // Title: "Subtopic N1.X – Title text"
  const titleRaw = allTokens.find((t) => /subtopic\s+N\d+\.\d+\s*[–-]/i.test(t));
  const title = titleRaw
    ? titleRaw.replace(/^subtopic\s+N\d+\.\d+\s*[–-]\s*/i, '').trim() || null
    : null;

  // Objectives: tokens after "Objectives:" until next recognisable section
  const objStart = allTokens.findIndex((t) => /^objectives:?$/i.test(t));
  const objectives: string[] = [];
  if (objStart !== -1) {
    for (let i = objStart + 1; i < Math.min(objStart + 8, allTokens.length); i++) {
      const t = allTokens[i];
      if (/^(LEARNING OUTCOME|keywords:?|Definition|Steps|Example \d)/i.test(t)) break;
      if (t.length > 8) objectives.push(t);
    }
  }

  // Learning outcome: inline in token text "LEARNING OUTCOME: ..."
  const loToken = allTokens.find((t) => /^LEARNING OUTCOME/i.test(t));
  const learningOutcome = loToken
    ? loToken.replace(/^LEARNING OUTCOME:\s*/i, '').trim() || null
    : null;

  // Steps: collect ALL numbered items across slides (the PPTX may split steps across slides)
  // Each slide may have its own "Steps" header.
  const steps: string[] = [];
  for (let i = 0; i < allTokens.length; i++) {
    if (/^Steps$/i.test(allTokens[i])) {
      for (let j = i + 1; j < Math.min(i + 20, allTokens.length); j++) {
        const t = allTokens[j];
        if (/^\d+\)/.test(t)) {
          const step = t.replace(/^\d+\)\s*/, '').trim();
          if (step && !steps.includes(step)) steps.push(step);
        }
        // Stop at a clear section boundary
        if (/^(Independent Practice|Subtopic N\d)/i.test(t) && j > i + 1) break;
      }
    }
  }

  // I do example: In the PPTX layout, the question text comes BEFORE the "Example 1 - I do…"
  // label in the token stream. Find the label, then look backward for question-like tokens.
  let idoExample: string | null = null;
  const idoIdx = allTokens.findIndex((t) => /Example\s+1\s*[-–]\s*I\s+do/i.test(t));
  if (idoIdx !== -1) {
    // Scan backwards up to 6 tokens for something that reads like a question or instruction
    const candidates: string[] = [];
    for (let i = idoIdx - 1; i >= Math.max(0, idoIdx - 10); i--) {
      const t = allTokens[i];
      if (/^Steps$/i.test(t) || /^\d+\)/.test(t)) break;
      if (t.length > 8 && !/^\d+$/.test(t) && !/^(Subtopic|SUBTOPIC|Objectives)/i.test(t)) {
        candidates.unshift(t);
        if (candidates.length >= 2) break;
      }
    }
    idoExample = candidates.join(' ') || null;
  }

  // Knowledge-organiser table:
  // Slides with the 4-column table emit headers then content in order:
  //   Definition | Characteristics | Examples | Non - Examples | [def text] | [char text] | [eg text] | [non-eg text]
  // Find the index of "Non - Examples" (last header) and collect content after it.
  const nonExHeaderIdx = allTokens.findIndex((t) => /^Non\s*[-–]?\s*Examples?$/i.test(t));
  let definition: string | null = null;
  const characteristics: string[] = [];
  const nonExamples: string[] = [];

  if (nonExHeaderIdx !== -1) {
    // Everything after the last table header
    const postTable = allTokens.slice(nonExHeaderIdx + 1);

    // First substantive token = definition (typically the longest first sentence)
    const meaningful = postTable.filter((t) =>
      t.length > 15 &&
      !/^(Example \d|Independent Practice|Introduction|Keywords|Rounding|Integer|Percentage)/i.test(t)
    );

    if (meaningful.length > 0) definition = meaningful[0];
    if (meaningful.length > 1) characteristics.push(...meaningful.slice(1, 3));

    // Non-examples: tokens that contain "≠" or look like counter-examples
    const nonEx = postTable.filter((t) => t.includes('≠') || /\bnot\b/i.test(t));
    nonExamples.push(...nonEx.slice(0, 4));
  }

  // Introduction text: long paragraph after "Introduction – Read and annotate:"
  const introIdx = allTokens.findIndex((t) => /introduction\s*[–-]\s*read/i.test(t));
  const introText = introIdx !== -1
    ? allTokens.slice(introIdx + 1, introIdx + 5)
        .filter((t) => t.length > 20)
        .join(' ') || null
    : null;

  return {
    skillCode: group.skillCode,
    title,
    objectives,
    steps,
    idoExample,
    definition,
    characteristics,
    nonExamples,
    introText,
    learningOutcome,
  };
}

// ─── Route building ───────────────────────────────────────────────────────────

interface RouteData {
  routeType: 'A' | 'B' | 'C';
  misconceptionSummary: string;
  workedExample: string;
  guidedPrompt: string;
  guidedAnswer: string;
  steps: Array<{
    stepOrder: number;
    title: string;
    explanation: string;
    stepType: string;
    checkpointQuestion: string;
    checkpointAnswer: string;
  }>;
}

/**
 * Guarantees a non-empty, trimmed checkpointAnswer.  Candidate values are
 * tried in order — the first one that is a non-empty string after trimming
 * wins.  If every candidate is null/undefined/empty/whitespace-only the
 * ultimate fallback (which embeds the skill code) is used.
 */
function safeCheckpointAnswer(skillCode: string, ...candidates: (string | null | undefined)[]): string {
  for (const c of candidates) {
    if (typeof c === 'string') {
      const trimmed = c.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return `Review the method for ${skillCode}.`;
}

function buildRoutes(content: ParsedSkillContent): RouteData[] {
  const { skillCode, title, steps, idoExample, definition, characteristics, nonExamples, introText, learningOutcome, objectives } = content;

  const skillLabel = title || skillCode;

  // ── Route A: Procedural (Steps-based) ──────────────────────────────────────
  const stepsText = steps.length > 0
    ? steps.map((s, i) => `${i + 1}) ${s}`).join(' ')
    : `Work through ${skillLabel} step by step.`;

  const workedA = idoExample
    ? `${stepsText} Example: ${idoExample}`
    : stepsText;

  const routeA: RouteData = {
    routeType: 'A',
    misconceptionSummary: `Students may struggle with the procedural steps for ${skillLabel}.`,
    workedExample: workedA.substring(0, 1000),
    guidedPrompt: idoExample ?? `Apply the steps to a ${skillLabel} question.`,
    guidedAnswer: 'See worked example above.',
    steps: [
      {
        stepOrder: 1,
        title: 'Step-by-step method',
        explanation: stepsText.substring(0, 500),
        stepType: 'visual_demo',
        checkpointQuestion: idoExample ?? `What is the first step for ${skillLabel}?`,
        checkpointAnswer: safeCheckpointAnswer(skillCode, steps[0], 'Follow the steps above.'),
      },
      {
        stepOrder: 2,
        title: 'Guided practice',
        explanation: `Apply the method: ${stepsText.substring(0, 300)}`,
        stepType: 'guided_action',
        checkpointQuestion: idoExample ?? `Use the method to solve a ${skillLabel} problem.`,
        checkpointAnswer: safeCheckpointAnswer(skillCode, steps[0], 'Follow the steps.'),
      },
      {
        stepOrder: 3,
        title: 'Independent check',
        explanation: `Transfer the same method to a new ${skillLabel} question.`,
        stepType: 'transfer_check',
        checkpointQuestion: `Apply what you have learned about ${skillLabel}.`,
        checkpointAnswer: safeCheckpointAnswer(skillCode, steps[0], 'Use the method above.'),
      },
    ],
  };

  // ── Route B: Conceptual ────────────────────────────────────────────────────
  const conceptParts: string[] = [];
  if (definition) conceptParts.push(definition);
  if (characteristics.length > 0) conceptParts.push(characteristics.join(' '));
  if (introText) conceptParts.push(introText);
  if (objectives.length > 0) conceptParts.push(objectives.join(' '));

  const conceptText = conceptParts.length > 0
    ? conceptParts.join(' ')
    : `Understand the concept of ${skillLabel}.`;

  const routeB: RouteData = {
    routeType: 'B',
    misconceptionSummary: `Students may lack conceptual understanding of ${skillLabel}.`,
    workedExample: conceptText.substring(0, 1000),
    guidedPrompt: definition
      ? `In your own words, what does this mean: "${definition.substring(0, 150)}"?`
      : `Explain what ${skillLabel} means.`,
    guidedAnswer: definition ?? skillLabel,
    steps: [
      {
        stepOrder: 1,
        title: 'Concept introduction',
        explanation: (definition ?? conceptText).substring(0, 500),
        stepType: 'visual_demo',
        checkpointQuestion: definition
          ? `Which of the following best describes: "${definition.substring(0, 100)}"?`
          : `What is the key idea behind ${skillLabel}?`,
        checkpointAnswer: safeCheckpointAnswer(skillCode, definition?.split('.')[0]?.trim(), skillLabel),
      },
      {
        stepOrder: 2,
        title: 'Characteristics check',
        explanation: (characteristics.join(' ') || conceptText).substring(0, 500),
        stepType: 'guided_action',
        checkpointQuestion: learningOutcome
          ? `True or false: ${learningOutcome}`
          : `Can you identify an example of ${skillLabel}?`,
        checkpointAnswer: safeCheckpointAnswer(skillCode, learningOutcome ? 'True' : 'Yes'),
      },
      {
        stepOrder: 3,
        title: 'Apply the concept',
        explanation: `Use your understanding of ${skillLabel} to solve a problem.`,
        stepType: 'transfer_check',
        checkpointQuestion: `Apply your knowledge of ${skillLabel} to a new situation.`,
        checkpointAnswer: safeCheckpointAnswer(skillCode, 'See explanation above.'),
      },
    ],
  };

  // ── Route C: Misconception-corrective ──────────────────────────────────────
  const nonExText = nonExamples.length > 0
    ? `Common errors: ${nonExamples.slice(0, 3).join('; ')}`
    : `Watch out for common mistakes with ${skillLabel}.`;

  const routeC: RouteData = {
    routeType: 'C',
    misconceptionSummary: nonExText.substring(0, 500),
    workedExample: `[Needs AI supplement] Correct the misconception for ${skillLabel}. ${nonExText}`.substring(0, 1000),
    guidedPrompt: nonExamples.length > 0
      ? `Why is this wrong: "${nonExamples[0]}"?`
      : `What is a common mistake when working with ${skillLabel}?`,
    guidedAnswer: nonExamples.length > 0
      ? `This is incorrect because it does not correctly apply ${skillLabel}.`
      : 'See the correct method in Route A.',
    steps: [
      {
        stepOrder: 1,
        title: 'Spot the mistake',
        explanation: nonExText.substring(0, 500),
        stepType: 'visual_demo',
        checkpointQuestion: nonExamples.length > 0
          ? `Is this correct: "${nonExamples[0]}"? True or false?`
          : `Is this approach to ${skillLabel} correct? True or false?`,
        checkpointAnswer: safeCheckpointAnswer(skillCode, 'False'),
      },
      {
        stepOrder: 2,
        title: 'Correct the error',
        explanation: `The correct approach for ${skillLabel}: ${stepsText.substring(0, 300)}`,
        stepType: 'guided_action',
        checkpointQuestion: `Now apply the correct method for ${skillLabel}.`,
        checkpointAnswer: safeCheckpointAnswer(skillCode, steps[0], 'Follow the correct steps.'),
      },
      {
        stepOrder: 3,
        title: 'Consolidation',
        explanation: `Make sure you avoid the common error when working with ${skillLabel}.`,
        stepType: 'transfer_check',
        checkpointQuestion: `Solve a ${skillLabel} problem using the correct method.`,
        checkpointAnswer: safeCheckpointAnswer(skillCode, steps[0], 'Use the method above.'),
      },
    ],
  };

  return [routeA, routeB, routeC];
}

// ─── DB upsert ────────────────────────────────────────────────────────────────

async function upsertRoutes(content: ParsedSkillContent, routes: RouteData[]): Promise<void> {
  const subject = await prisma.subject.findUnique({ where: { slug: 'ks3-maths' } });
  if (!subject) throw new Error('ks3-maths subject not found — run db:seed first');

  const skill = await prisma.skill.findUnique({
    where: { subjectId_code: { subjectId: subject.id, code: content.skillCode } },
  });
  if (!skill) {
    console.warn(`  [SKIP] Skill ${content.skillCode} not in DB — run db:seed first`);
    return;
  }

  // Ensure interaction types exist
  const [itSelect, itCompare] = await Promise.all([
    prisma.interactionType.upsert({
      where: { key_version: { key: 'pptx_extract_select', version: 'v1' } },
      update: { rendererKey: 'pptx_extract_select' },
      create: { key: 'pptx_extract_select', version: 'v1', rendererKey: 'pptx_extract_select' },
    }),
    prisma.interactionType.upsert({
      where: { key_version: { key: 'pptx_extract_check', version: 'v1' } },
      update: { rendererKey: 'pptx_extract_check' },
      create: { key: 'pptx_extract_check', version: 'v1', rendererKey: 'pptx_extract_check' },
    }),
  ]);

  for (const route of routes) {
    const dbRoute = await prisma.explanationRoute.upsert({
      where: { skillId_routeType: { skillId: skill.id, routeType: route.routeType } },
      update: {
        misconceptionSummary: route.misconceptionSummary,
        workedExample: route.workedExample,
        guidedPrompt: route.guidedPrompt,
        guidedAnswer: route.guidedAnswer,
        isActive: true,
      },
      create: {
        skillId: skill.id,
        routeType: route.routeType,
        misconceptionSummary: route.misconceptionSummary,
        workedExample: route.workedExample,
        guidedPrompt: route.guidedPrompt,
        guidedAnswer: route.guidedAnswer,
        isActive: true,
      },
    });

    for (const stepDef of route.steps) {
      const itId = stepDef.stepOrder === 1 ? itSelect.id : itCompare.id;

      // Defensive: ensure checkpoint fields are non-empty before validation
      const answer = stepDef.checkpointAnswer?.trim() || `Review the method for ${content.skillCode}.`;
      const question = stepDef.checkpointQuestion?.trim() || `What have you learned about ${content.skillCode}?`;

      // Use SHORT type for steps that aren't MCQ (avoids option validation issues)
      const validated = validateExplanationStepWrite({
        checkpointQuestion: question,
        checkpointOptions: undefined,
        checkpointAnswer: answer,
        questionType: 'SHORT',
      });

      const dbStep = await prisma.explanationStep.upsert({
        where: {
          explanationRouteId_stepOrder: {
            explanationRouteId: dbRoute.id,
            stepOrder: stepDef.stepOrder,
          },
        },
        update: {
          title: stepDef.title,
          explanation: stepDef.explanation,
          stepType: stepDef.stepType,
          checkpointQuestion: validated.checkpointQuestion,
          checkpointOptions: validated.checkpointOptions,
          checkpointAnswer: validated.checkpointAnswer,
          questionType: validated.questionType,
        },
        create: {
          explanationRouteId: dbRoute.id,
          stepOrder: stepDef.stepOrder,
          title: stepDef.title,
          explanation: stepDef.explanation,
          stepType: stepDef.stepType,
          checkpointQuestion: validated.checkpointQuestion,
          checkpointOptions: validated.checkpointOptions,
          checkpointAnswer: validated.checkpointAnswer,
          questionType: validated.questionType,
        },
      });

      await prisma.stepInteraction.upsert({
        where: {
          explanationStepId_sortOrder: { explanationStepId: dbStep.id, sortOrder: 1 },
        },
        update: { interactionTypeId: itId, config: { source: 'pptx_extract' } },
        create: {
          explanationStepId: dbStep.id,
          interactionTypeId: itId,
          sortOrder: 1,
          config: { source: 'pptx_extract' },
        },
      });
    }

    console.log(`    ✓ Route ${route.routeType} — ${route.steps.length} steps`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📚 PPTX → ExplanationRoute extractor${DRY_RUN ? ' [DRY RUN]' : ''}`);
  if (SKILL_FILTER) console.log(`   Filtering to skill: ${SKILL_FILTER}`);

  // Track which skills we've already written so later files don't overwrite
  const written = new Set<string>();

  let totalSkills = 0;
  let totalRoutes = 0;

  for (const pptxPath of PPTX_FILES) {
    const filename = path.basename(pptxPath);
    console.log(`\n📄 ${filename}`);

    const slideData = extractSlideTexts(pptxPath);
    if (slideData.length === 0) continue;

    const groups = groupSlidesBySkill(slideData);
    console.log(`   Found ${groups.length} skill groups`);

    for (const group of groups) {
      const code = group.skillCode;

      if (SKILL_FILTER && code !== SKILL_FILTER) continue;
      if (written.has(code)) {
        console.log(`   [SKIP] ${code} — already written from earlier file`);
        continue;
      }

      const content = parseSkillContent(group);
      const routes = buildRoutes(content);

      console.log(`\n  🎯 ${code}${content.title ? ` – ${content.title}` : ''}`);
      console.log(`     Steps: ${content.steps.length} | I-do: ${content.idoExample ? 'yes' : 'no'} | Definition: ${content.definition ? 'yes' : 'no'}`);

      if (DRY_RUN) {
        console.log(`     [DRY] Would upsert ${routes.length} routes`);
        routes.forEach((r) => console.log(`       Route ${r.routeType}: "${r.misconceptionSummary.substring(0, 80)}"`));
      } else {
        await upsertRoutes(content, routes);
        written.add(code);
        totalRoutes += routes.length;
      }

      totalSkills++;
    }
  }

  console.log(`\n✅ Done. ${totalSkills} skills processed, ${totalRoutes} routes upserted.`);
  if (DRY_RUN) console.log('   (Dry run — no DB writes performed)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
