export interface Misconception {
  title: string;
  desc: string;
  answer: string;
  affected: string;
  routes: { name: string; time: string; steps: string[] }[];
}

export interface Student {
  id: number;
  name: string;
  color: string;
  status: string;
  statusColor: string;
  misconception: Misconception | null;
}

export const students: Student[] = [
  {
    id: 1,
    name: 'Alex M.',
    color: 'bg-green-400',
    status: 'On Track',
    statusColor: 'bg-green-100 text-green-700',
    misconception: null,
  },
  {
    id: 2,
    name: 'Jordan T.',
    color: 'bg-green-400',
    status: 'On Track',
    statusColor: 'bg-green-100 text-green-700',
    misconception: null,
  },
  {
    id: 3,
    name: 'Casey R.',
    color: 'bg-yellow-400',
    status: 'Needs Check',
    statusColor: 'bg-yellow-100 text-yellow-700',
    misconception: {
      title: 'Vague understanding of energy transfer',
      desc: 'Can identify photosynthesis but cannot explain the energy conversion step.',
      answer: '"Plants make food from the sun" — missing the chemical energy conversion concept.',
      affected: '2 other students',
      routes: [
        {
          name: 'Analogy Bridge',
          time: '4 min',
          steps: [
            'Compare to charging a battery (sunlight = plug, glucose = stored charge)',
            'Use the "solar panel to battery" analogy',
            'Have students draw the energy flow',
          ],
        },
        {
          name: 'Hands-On Lab',
          time: '8 min',
          steps: [
            'Set up elodea experiment with light/dark conditions',
            'Measure oxygen bubbles as proxy for photosynthesis rate',
            'Connect bubble count to energy capture',
          ],
        },
        {
          name: 'Peer Teaching',
          time: '6 min',
          steps: [
            'Pair with student who mastered the concept',
            'Have them explain using their own words',
            'Switch roles and check understanding',
          ],
        },
      ],
    },
  },
  {
    id: 4,
    name: 'Taylor S.',
    color: 'bg-green-400',
    status: 'On Track',
    statusColor: 'bg-green-100 text-green-700',
    misconception: null,
  },
  {
    id: 5,
    name: 'Morgan L.',
    color: 'bg-red-400',
    status: 'Misconception',
    statusColor: 'bg-red-100 text-red-700',
    misconception: {
      title: 'Confusing respiration with photosynthesis',
      desc: 'Believes plants "breathe in" CO2 and "breathe out" O2 as a respiratory process, not understanding the chemical build-up.',
      answer: '"Plants breathe like us — they take in CO2 and breathe out oxygen to stay alive."',
      affected: '4 other students',
      routes: [
        {
          name: 'Chemical Equation Walkthrough',
          time: '5 min',
          steps: [
            'Write both equations side by side',
            'Highlight: photosynthesis BUILDS glucose, respiration BREAKS it',
            'Use color coding: green for build, red for break',
          ],
        },
        {
          name: 'Role-Play Activity',
          time: '7 min',
          steps: [
            'Students act as atoms in CO2 and H2O',
            ' physically assemble into glucose',
            'Then reverse: break apart and release energy',
          ],
        },
        {
          name: 'Visual Diagram Method',
          time: '4 min',
          steps: [
            'Draw a simple cell with chloroplast vs mitochondria',
            'Label inputs/outputs for each organelle',
            'Quiz: "Which organelle is the factory? Which is the power plant?"',
          ],
        },
      ],
    },
  },
  {
    id: 6,
    name: 'Riley K.',
    color: 'bg-green-400',
    status: 'On Track',
    statusColor: 'bg-green-100 text-green-700',
    misconception: null,
  },
  {
    id: 7,
    name: 'Quinn P.',
    color: 'bg-yellow-400',
    status: 'Needs Check',
    statusColor: 'bg-yellow-100 text-yellow-700',
    misconception: {
      title: 'Thinks plants get energy FROM soil',
      desc: 'Confuses nutrients/minerals with energy source. Believes roots "suck up energy" like a straw.',
      answer: '"The roots get energy from the soil and the leaves get energy from the sun."',
      affected: '3 other students',
      routes: [
        {
          name: 'Nutrient vs Energy Sort',
          time: '5 min',
          steps: [
            'Give cards: "minerals", "water", "sunlight", "glucose"',
            'Have students sort into "building blocks" vs "energy source"',
            'Discuss: soil gives materials, not power',
          ],
        },
        {
          name: 'Plant in the Dark Demo',
          time: '6 min',
          steps: [
            'Show a plant grown in complete darkness (etiolated)',
            'Compare to healthy plant in light',
            'Ask: "If soil had energy, why is this plant dying?"',
          ],
        },
        {
          name: 'Energy Chain Drawing',
          time: '4 min',
          steps: [
            'Draw chain: Sun to Leaf (chloroplast) to Glucose to Mitochondria to ATP',
            'Emphasize: soil is NOT in the energy chain',
            'Have students add their own examples',
          ],
        },
      ],
    },
  },
  {
    id: 8,
    name: 'Avery B.',
    color: 'bg-green-400',
    status: 'On Track',
    statusColor: 'bg-green-100 text-green-700',
    misconception: null,
  },
  {
    id: 9,
    name: 'Sam W.',
    color: 'bg-green-400',
    status: 'On Track',
    statusColor: 'bg-green-100 text-green-700',
    misconception: null,
  },
  {
    id: 10,
    name: 'Jamie D.',
    color: 'bg-red-400',
    status: 'Misconception',
    statusColor: 'bg-red-100 text-red-700',
    misconception: {
      title: 'Photosynthesis only happens during the day',
      desc: 'Does not understand that the products (glucose) are used continuously, and that the chemical reactions stored energy is available 24/7.',
      answer: '"Photosynthesis stops at night so plants do not grow when it is dark."',
      affected: '5 other students',
      routes: [
        {
          name: '24-Hour Timeline',
          time: '5 min',
          steps: [
            'Draw a 24-hour clock for a plant',
            'Day: photosynthesis (factory running)',
            'Night: respiration (using stored battery)',
            'Emphasize: growth uses stored energy at night',
          ],
        },
        {
          name: 'Battery Analogy Deep Dive',
          time: '6 min',
          steps: [
            'Plant charges "battery" (glucose) during day',
            'At night, it runs on battery power',
            'Ask: "Can your phone work at night if it charged all day?"',
          ],
        },
        {
          name: 'Data Graph Analysis',
          time: '7 min',
          steps: [
            'Show real CO2 uptake graph over 24 hours',
            'Point to nighttime respiration spike',
            'Have students annotate when energy is used vs made',
          ],
        },
      ],
    },
  },
  {
    id: 11,
    name: 'Drew H.',
    color: 'bg-green-400',
    status: 'On Track',
    statusColor: 'bg-green-100 text-green-700',
    misconception: null,
  },
  {
    id: 12,
    name: 'Peyton G.',
    color: 'bg-yellow-400',
    status: 'Needs Check',
    statusColor: 'bg-yellow-100 text-yellow-700',
    misconception: {
      title: 'Oxygen is the GOAL of photosynthesis',
      desc: 'Thinks plants make oxygen "for us to breathe" rather than understanding it as a byproduct of water splitting.',
      answer: '"Plants make oxygen so animals can breathe — that is their job."',
      affected: '3 other students',
      routes: [
        {
          name: 'Byproduct vs Purpose Sort',
          time: '4 min',
          steps: [
            'List: oxygen, glucose, CO2, water',
            'Categorize: "What the plant WANTS" vs "What it makes by accident"',
            'Discuss: oxygen is waste to the plant, treasure to us',
          ],
        },
        {
          name: 'Factory Analogy',
          time: '5 min',
          steps: [
            'Factory makes toys (glucose) from plastic (CO2) + glue (water)',
            'Heat (oxygen) is released as waste',
            'Would the factory care about the heat? No — it cares about toys!',
          ],
        },
        {
          name: 'Evolutionary Context',
          time: '6 min',
          steps: [
            'Explain: oxygen was toxic to early life',
            'It accumulated as waste for billions of years',
            'Only later did life adapt to USE it',
            'Plants do not "try" to make oxygen',
          ],
        },
      ],
    },
  },
  {
    id: 13,
    name: 'Cameron J.',
    color: 'bg-green-400',
    status: 'On Track',
    statusColor: 'bg-green-100 text-green-700',
    misconception: null,
  },
  {
    id: 14,
    name: 'Reese A.',
    color: 'bg-green-400',
    status: 'On Track',
    statusColor: 'bg-green-100 text-green-700',
    misconception: null,
  },
  {
    id: 15,
    name: 'Skyler N.',
    color: 'bg-red-400',
    status: 'Misconception',
    statusColor: 'bg-red-100 text-red-700',
    misconception: {
      title: 'All plants photosynthesize equally',
      desc: 'Does not understand that different plant types (C3, C4, CAM) have adapted photosynthesis for different environments.',
      answer: '"All plants do photosynthesis the same way, just some are bigger."',
      affected: '2 other students',
      routes: [
        {
          name: 'Desert vs Rainforest Compare',
          time: '6 min',
          steps: [
            'Show cactus vs fern photosynthesis timing',
            'Cactus: night CO2 capture (CAM)',
            'Fern: daytime only (C3)',
            'Discuss: same goal, different strategy',
          ],
        },
        {
          name: 'Adaptation Story',
          time: '5 min',
          steps: [
            'Tell story of plants "moving" to harsh environments',
            'They had to "invent" new ways to photosynthesize',
            'Connect to survival = adaptation',
          ],
        },
        {
          name: 'Corn vs Wheat Experiment',
          time: '8 min',
          steps: [
            'C4 corn tolerates heat better than C3 wheat',
            'Show photosynthesis rate graphs at different temps',
            'Ask: "Which plant would survive climate change better?"',
          ],
        },
      ],
    },
  },
  {
    id: 16,
    name: 'Dakota F.',
    color: 'bg-green-400',
    status: 'On Track',
    statusColor: 'bg-green-100 text-green-700',
    misconception: null,
  },
  {
    id: 17,
    name: 'Hayden C.',
    color: 'bg-yellow-400',
    status: 'Needs Check',
    statusColor: 'bg-yellow-100 text-yellow-700',
    misconception: {
      title: 'Chlorophyll is "plant blood"',
      desc: 'Anthropomorphizes chlorophyll as a circulatory fluid rather than a pigment molecule that absorbs light.',
      answer: '"The green stuff in leaves is like blood that carries food around the plant."',
      affected: '2 other students',
      routes: [
        {
          name: 'Pigment Extraction Demo',
          time: '7 min',
          steps: [
            'Crush spinach leaves with acetone',
            'Show green pigment separating',
            'Explain: it is a dye, not a liquid',
            'Compare to food coloring in water',
          ],
        },
        {
          name: 'Light Filter Experiment',
          time: '6 min',
          steps: [
            'Shine light through green filter onto solar panel',
            'Show it produces LESS energy',
            'Green light is REFLECTED, not absorbed',
            'Chlorophyll rejects green — that is why we see it!',
          ],
        },
        {
          name: 'Molecule Model Build',
          time: '5 min',
          steps: [
            'Build simple chlorophyll model with paper',
            'Show porphyrin ring "catching" light',
            'Compare to catching a ball — it grabs photons',
            'Not a liquid that flows',
          ],
        },
      ],
    },
  },
  {
    id: 18,
    name: 'Emerson V.',
    color: 'bg-green-400',
    status: 'On Track',
    statusColor: 'bg-green-100 text-green-700',
    misconception: null,
  },
  {
    id: 19,
    name: 'Finley O.',
    color: 'bg-green-400',
    status: 'On Track',
    statusColor: 'bg-green-100 text-green-700',
    misconception: null,
  },
  {
    id: 20,
    name: 'Rowan E.',
    color: 'bg-red-400',
    status: 'Misconception',
    statusColor: 'bg-red-100 text-red-700',
    misconception: {
      title: 'CO2 is "bad air" plants clean up',
      desc: 'Frames photosynthesis as environmental service rather than metabolic necessity. Does not see CO2 as a raw material.',
      answer: '"Plants clean the air by eating the bad CO2 and giving us good oxygen."',
      affected: '4 other students',
      routes: [
        {
          name: 'Ingredient vs Pollution Reframe',
          time: '5 min',
          steps: [
            'List ingredients for a cake: flour, eggs, sugar',
            'Is flour "bad"? No — it is necessary!',
            'CO2 is flour for the plant. Not pollution.',
            'Oxygen is the "steam" from baking — a byproduct',
          ],
        },
        {
          name: 'CO2 Limitation Experiment',
          time: '7 min',
          steps: [
            'Blow into bromothymol blue (turns yellow = acidic)',
            'Plant in sealed container with indicator',
            'Watch it turn back blue as CO2 is used',
            'CO2 is CONSUMED, not "cleaned"',
          ],
        },
        {
          name: 'Economic Analogy',
          time: '4 min',
          steps: [
            'Plant is a factory, CO2 is free raw material',
            'Sunlight is the power source (also free)',
            'Glucose is the product (profit)',
            'Oxygen is exhaust (waste, but useful to others)',
          ],
        },
      ],
    },
  },
];

export const patterns = [
  { label: 'Respiration to Photosynthesis mix-up', count: 4, color: 'bg-red-50 text-red-600 border-red-200' },
  { label: 'Soil = energy source', count: 3, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { label: 'Oxygen is the purpose', count: 3, color: 'bg-orange-50 text-orange-600 border-orange-200' },
  { label: 'Photosynthesis stops at night', count: 5, color: 'bg-red-50 text-red-600 border-red-200' },
];
