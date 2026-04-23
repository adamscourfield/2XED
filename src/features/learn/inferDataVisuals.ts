import type {
  DataTableVisual,
  FrequencyTreeVisual,
  MathsVisual,
  PartWholeBarModelVisual,
  TimetableVisual,
} from '../../lib/maths/visuals/types';
import {
  BAKERSTOWN_FIVE_TOWN_LABELS,
  BAKERSTOWN_FIVE_TOWN_MATRIX_KM,
  matrixToDataTable,
  MILTON_FIVE_TOWN_LABELS,
  MILTON_FIVE_TOWN_MATRIX_KM,
} from '../../lib/maths/visuals/curriculumDistanceTables';
import { LEEK_MILTON_TIMETABLE, LONDON_PARIS_TIMETABLE, NI_TRAIN_TIMETABLE } from '../../lib/maths/visuals/curriculumTimetables';

export function inferPartWholeBarModel(question: string): PartWholeBarModelVisual | null {
  const q = question.replace(/\s+/g, ' ');
  let m = q.match(/\btotal of (\d+)\s+split into (\d+)\s+and (\d+)/i);
  if (m) {
    const total = Number(m[1]);
    const a = Number(m[2]);
    const b = Number(m[3]);
    if (![total, a, b].every((n) => Number.isFinite(n)) || total <= 0) return null;
    if (a + b !== total) return null;
    return {
      type: 'part-whole-bar-model',
      total,
      parts: [{ value: a, label: 'Part' }, { value: b, label: 'Part' }],
      altText: `Bar model with whole ${total} split into ${a} and ${b}.`,
      caption: 'Part–whole bar model from the question.',
    };
  }

  m = q.match(/\bwith total (\d+)\s+and parts (\d+)\s+and (\d+)/i);
  if (m) {
    const total = Number(m[1]);
    const a = Number(m[2]);
    const b = Number(m[3]);
    if (![total, a, b].every((n) => Number.isFinite(n)) || total <= 0) return null;
    if (a + b !== total) return null;
    return {
      type: 'part-whole-bar-model',
      total,
      parts: [{ value: a, label: 'Part' }, { value: b, label: 'Part' }],
      altText: `Bar model with whole ${total} and parts ${a} and ${b}.`,
      caption: 'Part–whole bar model from the question.',
    };
  }

  m = q.match(/\btotal (\d+)\s+and parts (\d+)\s+and (\d+)/i);
  if (m) {
    const total = Number(m[1]);
    const a = Number(m[2]);
    const b = Number(m[3]);
    if (![total, a, b].every((n) => Number.isFinite(n)) || total <= 0) return null;
    if (a + b !== total) return null;
    return {
      type: 'part-whole-bar-model',
      total,
      parts: [{ value: a, label: 'Part' }, { value: b, label: 'Part' }],
      altText: `Bar model with whole ${total} and parts ${a} and ${b}.`,
      caption: 'Part–whole bar model from the question.',
    };
  }

  m = q.match(/\btotal (\d+)\.\s*One part is (\d+)\.\s*What is the missing part/i);
  if (m) {
    const total = Number(m[1]);
    const known = Number(m[2]);
    if (!Number.isFinite(total) || !Number.isFinite(known) || total <= 0) return null;
    if (known > total) return null;
    return {
      type: 'part-whole-bar-model',
      total,
      parts: [{ value: known, label: 'Part' }, { value: null, label: '?' }],
      altText: `Bar model with whole ${total}; one part ${known} and one part unknown.`,
      caption: 'Part–whole bar model from the question.',
    };
  }

  return null;
}

function distTableVisual(
  title: string,
  labels: readonly string[],
  matrix: number[][],
  alt: string
): DataTableVisual {
  const t = matrixToDataTable(labels, matrix, title);
  return {
    type: 'data-table',
    title,
    unit: 'km',
    columnHeaders: t.columnHeaders,
    rows: t.rows,
    altText: alt,
    caption: 'Distance table from the Unit 1 curriculum example.',
  };
}

export function inferN214DataVisual(question: string, primarySkillCode?: string): DataTableVisual | TimetableVisual | null {
  const lower = question.toLowerCase();

  const timetableCue =
    /\b(timetable|train from|train to|train leaves|train departs|train that leaves|train at)\b/i.test(question) ||
    /\b(antrim|randalstown|ballycastle|ballymena|leek|southville)\b/.test(lower) ||
    (/\b(london|paris)\b/.test(lower) && /\b(train|arrive|depart)\b/.test(lower));

  const distanceCue =
    /\b(distance table|distance chart|first distance table|second distance table)\b/i.test(question) ||
    MILTON_FIVE_TOWN_LABELS.some((t) => lower.includes(t.toLowerCase())) ||
    BAKERSTOWN_FIVE_TOWN_LABELS.some((t) => lower.includes(t.toLowerCase())) ||
    (/\bkm\b/.test(lower) &&
      /\b(milton|toddsville|oldtown|southville|northbrook|bakerstown|jaxonville|red island|grasswich|greenwood)\b/.test(lower));

  if (primarySkillCode !== 'N2.14') {
    if (!timetableCue && !distanceCue) return null;
  } else {
    const timeOnly =
      (/\bconvert\b|\bchange\b|\bwhat time\b|\bminutes after\b|\bmidnight\b|\b24-?hour\b|\b12-?hour\b|\bam\b|\bpm\b/i.test(
        question
      ) &&
        !timetableCue &&
        !distanceCue) ||
      /\bhow many minutes does the journey take\b/i.test(question);
    if (timeOnly) return null;
  }

  if (/\b(london|paris)\b/.test(lower) && (/\b(train|timetable|gmt)\b/.test(lower) || /\b0?4:21|0?5:19|14:40|15:28\b/.test(question))) {
    return LONDON_PARIS_TIMETABLE;
  }

  if (/\b(leek|southville)\b/.test(lower) && /\b(milton|train|timetable|0?6:30|0?7:15)\b/.test(lower)) {
    return LEEK_MILTON_TIMETABLE;
  }

  if (/\b(antrim|randalstown|ballycastle|ballymena)\b/.test(lower)) {
    return NI_TRAIN_TIMETABLE;
  }

  const wantsSecond = /\bsecond distance table\b/i.test(question);
  if (wantsSecond || /\bbakerstown\b/i.test(lower)) {
    return distTableVisual(
      'Distance between towns (km)',
      BAKERSTOWN_FIVE_TOWN_LABELS,
      BAKERSTOWN_FIVE_TOWN_MATRIX_KM,
      'Five-town distance table (second chart)'
    );
  }

  if (
    /\bfirst distance table\b/i.test(question) ||
    /\bdistance table\b/i.test(lower) ||
    MILTON_FIVE_TOWN_LABELS.some((t) => lower.includes(t.toLowerCase()))
  ) {
    return distTableVisual(
      'Distance between towns (km)',
      MILTON_FIVE_TOWN_LABELS,
      MILTON_FIVE_TOWN_MATRIX_KM,
      'Five-town distance table (first chart)'
    );
  }

  return null;
}

export function inferN215FrequencyTree(question: string, primarySkillCode?: string): FrequencyTreeVisual | null {
  if (primarySkillCode !== 'N2.15' && !/\bfrequency tree\b/i.test(question)) return null;

  let m = question.match(
    /frequency tree shows (\d+) people surveyed about snow[^.]*\. (\d+) were late when it snowed\. (\d+) were late when it did not snow\. (\d+) were on time when it did not snow/i
  );
  if (m) {
    const total = Number(m[1]);
    const lateSnow = Number(m[2]);
    const lateNo = Number(m[3]);
    const onNo = Number(m[4]);
    const noSnow = lateNo + onNo;
    const snow = total - noSnow;
    const onSnow = snow - lateSnow;
    return {
      type: 'frequency-tree',
      root: {
        label: 'Total',
        value: total,
        children: [
          {
            label: 'Snow',
            value: snow,
            children: [
              { label: 'Late', value: lateSnow },
              { label: 'On time', value: onSnow },
            ],
          },
          {
            label: 'No snow',
            value: noSnow,
            children: [
              { label: 'Late', value: lateNo },
              { label: 'On time', value: onNo },
            ],
          },
        ],
      },
      altText: 'Frequency tree for snow and lateness survey.',
      caption: 'Frequency tree diagram for the snow and lateness context.',
    };
  }

  m = question.match(/frequency tree shows (\d+) people who took a test\. (\d+) predicted they would pass/i);
  if (m) {
    const total = Number(m[1]);
    const passPred = Number(m[2]);
    return {
      type: 'frequency-tree',
      root: {
        label: 'People',
        value: total,
        children: [
          { label: 'Predicted pass', value: passPred },
          { label: 'Predicted fail', value: total - passPred },
        ],
      },
      altText: 'Frequency tree for test predictions.',
      caption: 'Frequency tree from the question.',
    };
  }

  m = question.match(/frequency tree shows (\d+) students\. (\d+) are boys/i);
  if (m) {
    const total = Number(m[1]);
    const boys = Number(m[2]);
    const girls = total - boys;
    return {
      type: 'frequency-tree',
      root: {
        label: 'Students',
        value: total,
        children: [
          { label: 'Boys', value: boys },
          { label: 'Girls', value: girls },
        ],
      },
      altText: `Frequency tree with ${total} students split into boys and girls.`,
      caption: 'Frequency tree from the question.',
    };
  }

  m = question.match(/frequency tree shows (\d+) students\. (\d+) are girls, and (\d+) girls did their homework/i);
  if (m) {
    const total = Number(m[1]);
    const girls = Number(m[2]);
    const did = Number(m[3]);
    const boys = total - girls;
    return {
      type: 'frequency-tree',
      root: {
        label: 'Students',
        value: total,
        children: [
          { label: 'Boys', value: boys },
          {
            label: 'Girls',
            value: girls,
            children: [
              { label: 'Did homework', value: did },
              { label: 'Did not', value: girls - did },
            ],
          },
        ],
      },
      altText: 'Frequency tree with homework branch on girls.',
      caption: 'Frequency tree from the question.',
    };
  }

  m = question.match(/\b(\d+) people were asked whether they prefer cola A or cola B\. (\d+) were male/i);
  if (m) {
    const total = Number(m[1]);
    const male = Number(m[2]);
    return {
      type: 'frequency-tree',
      root: {
        label: 'People',
        value: total,
        children: [
          { label: 'Male', value: male },
          { label: 'Female', value: total - male },
        ],
      },
      altText: 'Frequency tree for cola preference survey by gender.',
      caption: 'Frequency tree from the question.',
    };
  }

  m = question.match(/\bThere are (\d+) pupils in Year 10\. (\d+) are boys/i);
  if (m) {
    const total = Number(m[1]);
    const boys = Number(m[2]);
    return {
      type: 'frequency-tree',
      root: {
        label: 'Year 10',
        value: total,
        children: [
          { label: 'Boys', value: boys },
          { label: 'Girls', value: total - boys },
        ],
      },
      altText: 'Frequency tree for Year 10 boys and girls.',
      caption: 'Frequency tree from the question.',
    };
  }

  m = question.match(/\bThere are (\d+) pupils in Year 10\. (\d+) are girls, and (\d+) girls have school lunch/i);
  if (m) {
    const total = Number(m[1]);
    const girls = Number(m[2]);
    const lunch = Number(m[3]);
    const boys = total - girls;
    return {
      type: 'frequency-tree',
      root: {
        label: 'Year 10',
        value: total,
        children: [
          { label: 'Boys', value: boys },
          {
            label: 'Girls',
            value: girls,
            children: [
              { label: 'School lunch', value: lunch },
              { label: 'Packed lunch', value: girls - lunch },
            ],
          },
        ],
      },
      altText: 'Frequency tree for Year 10 lunch choices among girls.',
      caption: 'Frequency tree from the question.',
    };
  }

  m = question.match(/\bIn a survey of (\d+) people, (\d+) are left handed/i);
  if (m) {
    const total = Number(m[1]);
    const left = Number(m[2]);
    return {
      type: 'frequency-tree',
      root: {
        label: 'Surveyed',
        value: total,
        children: [
          { label: 'Left handed', value: left },
          { label: 'Right handed', value: total - left },
        ],
      },
      altText: 'Frequency tree for handedness survey.',
      caption: 'Frequency tree from the question.',
    };
  }

  m = question.match(/frequency tree shows (\d+) students\. (\d+) are girls\. (\d+) girls cycle/i);
  if (m) {
    const total = Number(m[1]);
    const girls = Number(m[2]);
    const girlsCycle = Number(m[3]);
    const boys = total - girls;
    m = question.match(/(\d+) boys cycle/i);
    const boysCycle = m ? Number(m[1]) : null;
    return {
      type: 'frequency-tree',
      root: {
        label: 'Students',
        value: total,
        children: [
          {
            label: 'Girls',
            value: girls,
            children: [
              { label: 'Cycle', value: girlsCycle },
              { label: 'Do not cycle', value: girls - girlsCycle },
            ],
          },
          {
            label: 'Boys',
            value: boys,
            children: boysCycle != null ? [
              { label: 'Cycle', value: boysCycle },
              { label: 'Do not cycle', value: boys - boysCycle },
            ] : undefined,
          },
        ],
      },
      altText: 'Frequency tree for cycling to school.',
      caption: 'Frequency tree from the question.',
    };
  }

  m = question.match(/frequency tree shows (\d+) students\. (\d+) are girls\./i);
  if (m && !/girls cycle|girls did their homework/i.test(question)) {
    const total = Number(m[1]);
    const girls = Number(m[2]);
    const boys = total - girls;
    return {
      type: 'frequency-tree',
      root: {
        label: 'Students',
        value: total,
        children: [
          { label: 'Boys', value: boys },
          { label: 'Girls', value: girls },
        ],
      },
      altText: `Frequency tree with ${total} students split into boys and girls.`,
      caption: 'Frequency tree from the question.',
    };
  }

  m = question.match(/\bA class has (\d+) children\. There are (\d+) boys\./i);
  if (m) {
    const total = Number(m[1]);
    const boys = Number(m[2]);
    const girls = total - boys;
    const gWalk = question.match(/(\d+) girls walk/i);
    const bWalk = question.match(/(\d+) boys walk/i);
    if (gWalk && bWalk) {
      const gw = Number(gWalk[1]);
      const bw = Number(bWalk[1]);
      return {
        type: 'frequency-tree',
        root: {
          label: 'Children',
          value: total,
          children: [
            {
              label: 'Girls',
              value: girls,
              children: [
                { label: 'Walk', value: gw },
                { label: 'Car / other', value: girls - gw },
              ],
            },
            {
              label: 'Boys',
              value: boys,
              children: [
                { label: 'Walk', value: bw },
                { label: 'Car / other', value: boys - bw },
              ],
            },
          ],
        },
        altText: 'Frequency tree for how children travel to school.',
        caption: 'Frequency tree from the question.',
      };
    }
    return {
      type: 'frequency-tree',
      root: {
        label: 'Children',
        value: total,
        children: [
          { label: 'Boys', value: boys },
          { label: 'Girls', value: girls },
        ],
      },
      altText: 'Frequency tree for boys and girls in the class.',
      caption: 'Frequency tree from the question.',
    };
  }

  return null;
}

export function inferDataVisualsForItem(question: string, primarySkillCode?: string): MathsVisual[] {
  const out: MathsVisual[] = [];
  const bar = inferPartWholeBarModel(question);
  if (bar) out.push(bar);

  const n214 = inferN214DataVisual(question, primarySkillCode);
  if (n214) out.push(n214);

  const n215 = inferN215FrequencyTree(question, primarySkillCode);
  if (n215) out.push(n215);

  return out;
}
