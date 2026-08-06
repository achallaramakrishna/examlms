#!/usr/bin/env node
/**
 * Pattern-based Practice learning_aid seed for topic "Kinematics"
 * (covers NCERT Ch2 Motion in a Straight Line + Ch3 Motion in a Plane bank).
 *
 * Usage:
 *   node vectordb/scripts/seed-kinematics-learning-aids.js \
 *     --in vectordb/data/kinematics-questions.json \
 *     --out /tmp/kinematics-learning-aids.sql
 *
 * Then: psql … -f /tmp/kinematics-learning-aids.sql
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

const inFile = arg('--in', path.join(__dirname, '../data/kinematics-questions.json'));
const outFile = arg('--out', '/tmp/kinematics-learning-aids.sql');

const CHAPTER = 'Kinematics';
const SUBJECT = 'Physics';

/** @typedef {'recall'|'formula'|'concept'|'reaction'|'process'} CoachMode */

/**
 * @typedef {{
 *   key: string,
 *   examPattern: string,
 *   coachMode: CoachMode,
 *   questionType: string,
 *   tags: string[],
 *   highlights: {term:string, aliases?:string[], meaning:string, subjectNote?:string}[],
 *   ladder: {rung:number, title:string, detail:string, latex?:string|null}[],
 *   commonMistake: string,
 *   examTransferTip: string,
 *   limitingCase?: string,
 *   ncertLine?: string,
 * }} Pattern
 */

/** @type {Pattern[]} */
const PATTERNS = [
  {
    key: 'average_speed',
    examPattern: 'Average speed over equal distance segments',
    coachMode: 'formula',
    questionType: 'numerical_mcq',
    tags: ['average speed', 'harmonic mean', 'kinematics'],
    highlights: [
      {
        term: 'average speed',
        aliases: ['avg. speed', 'mean speed'],
        meaning: 'Total distance ÷ total time (scalar). Not the arithmetic mean of speeds when distances are equal.',
        subjectNote: 'For equal distances at v₁, v₂: 2v₁v₂/(v₁+v₂).',
      },
    ],
    ladder: [
      {
        rung: 1,
        title: 'Write total distance and total time',
        detail: 'Split the path into segments; tᵢ = sᵢ / vᵢ.',
        latex: 'v_{av} = \\frac{\\sum s_i}{\\sum (s_i/v_i)}',
      },
      {
        rung: 2,
        title: 'Equal-distance shortcut',
        detail: 'Two equal halves → harmonic mean; three equal thirds → 3/(1/v₁+1/v₂+1/v₃).',
        latex: 'v_{av} = \\frac{2 v_1 v_2}{v_1 + v_2}',
      },
      {
        rung: 3,
        title: 'Convert units if needed',
        detail: 'Keep km/h consistent, or convert to m/s only if options demand it.',
        latex: null,
      },
    ],
    commonMistake: 'Taking (v₁+v₂)/2 when the question splits equal distances (not equal times).',
    examTransferTip: 'If times are equal, arithmetic mean; if distances are equal, harmonic mean.',
    limitingCase: 'If v₂ → v₁, average → v₁.',
  },
  {
    key: 'equations_motion',
    examPattern: 'Kinematic equations under constant acceleration',
    coachMode: 'formula',
    questionType: 'numerical_mcq',
    tags: ['equations of motion', 'constant a', 'kinematics'],
    highlights: [
      {
        term: 'acceleration',
        aliases: ['uniform acceleration'],
        meaning: 'Constant rate of change of velocity; use suvat / v²=u²+2as family.',
      },
    ],
    ladder: [
      {
        rung: 1,
        title: 'List knowns (u, v, a, s, t)',
        detail: 'Mark what is asked; drop zero values carefully (from rest → u=0).',
        latex: null,
      },
      {
        rung: 2,
        title: 'Pick the equation missing the unused variable',
        detail: 'v = u+at; s = ut+½at²; v² = u²+2as; s = ((u+v)/2)t.',
        latex: 'v^{2} = u^{2} + 2as',
      },
      {
        rung: 3,
        title: 'Solve and check sign',
        detail: 'Upward positive or downward positive — stay consistent.',
        latex: null,
      },
    ],
    commonMistake: 'Mixing g sign or using v=u+at when a is not constant.',
    examTransferTip: 'Same ladder for braking distance, stopping time, and “from rest” starts.',
    limitingCase: 'If a=0, motion is uniform: s=ut.',
  },
  {
    key: 'equations_motion_nth',
    examPattern: 'Distance in nth second (constant a)',
    coachMode: 'formula',
    questionType: 'numerical_mcq',
    tags: ['nth second', 'equations of motion', 'kinematics'],
    highlights: [
      {
        term: 'nth second',
        aliases: ['4th second', 'nth', '1st, 2nd'],
        meaning: 'Distance covered between t=n−1 and t=n, not distance at time n.',
      },
    ],
    ladder: [
      {
        rung: 1,
        title: 'Recall sn formula',
        detail: 'From rest or with u: distance in nth second.',
        latex: 's_n = u + \\tfrac{1}{2}a(2n-1)',
      },
      {
        rung: 2,
        title: 'Form ratios if asked',
        detail: 'For free fall from rest, s_n ∝ (2n−1).',
        latex: 's_1:s_2:s_3:s_4 = 1:3:5:7',
      },
      {
        rung: 3,
        title: 'Match options',
        detail: 'Watch “during 4th second” vs “in 4 seconds”.',
        latex: null,
      },
    ],
    commonMistake: 'Confusing distance in 4 s with distance during the 4th second.',
    examTransferTip: 'Odd-number ratio 1:3:5:7 is high-yield for free-fall from rest.',
  },
  {
    key: 'free_fall',
    examPattern: 'Free fall / vertical throw under gravity',
    coachMode: 'formula',
    questionType: 'numerical_mcq',
    tags: ['free fall', 'g', 'vertical throw', 'kinematics'],
    highlights: [
      {
        term: 'g',
        aliases: ['gravity', '10 m/s²', '9.8'],
        meaning: 'Acceleration due to gravity; take magnitude from the question (often 10).',
      },
      {
        term: 'projected upwards',
        aliases: ['thrown vertically', 'projected vertically'],
        meaning: 'Initial velocity upward; a = −g if up is positive.',
      },
    ],
    ladder: [
      {
        rung: 1,
        title: 'Choose sign convention',
        detail: 'Up positive → a=−g; or down positive → a=+g for drops.',
        latex: 'a = \\pm g',
      },
      {
        rung: 2,
        title: 'Apply kinematic equation',
        detail: 'Tower drop: h=½gt²; up-and-down: time to ground from v=0 at top + descent.',
        latex: 'h = \\tfrac{1}{2} g t^{2}',
      },
      {
        rung: 3,
        title: 'Use symmetry',
        detail: 'Speed at height h same going up and down; time to top = u/g.',
        latex: 't_{up} = u/g',
      },
    ],
    commonMistake: 'Using h=ut+½gt² with wrong sign for upward projection.',
    examTransferTip: '“Velocity at half height” → use v²=u²−2gh with h=H/2.',
    limitingCase: 'At highest point v=0.',
  },
  {
    key: 'graphs',
    examPattern: 'Position / velocity–time graph reading',
    coachMode: 'concept',
    questionType: 'conceptual',
    tags: ['graphs', 'slope', 'area', 'kinematics'],
    highlights: [
      {
        term: 'velocity-time',
        aliases: ['v-t', 'velocity–time', 'Velocity-time'],
        meaning: 'Slope = acceleration; area under curve = displacement.',
      },
      {
        term: 'displacement-time',
        aliases: ['s-t', 'position-time', 'Displacement-time'],
        meaning: 'Slope = instantaneous velocity.',
      },
    ],
    ladder: [
      {
        rung: 1,
        title: 'Identify axes',
        detail: 's–t → slope is v; v–t → slope is a, area is s.',
        latex: null,
      },
      {
        rung: 2,
        title: 'Read slope / area at the asked point',
        detail: 'Instantaneous values from tangent; averages from Δy/Δx or net area.',
        latex: 'v = \\frac{ds}{dt},\\quad a = \\frac{dv}{dt}',
      },
      {
        rung: 3,
        title: 'Eliminate impossible shapes',
        detail: '1-D motion cannot require multi-valued s at one t; vertical v–t means infinite a.',
        latex: null,
      },
    ],
    commonMistake: 'Reading s–t slope as acceleration, or v–t slope as velocity.',
    examTransferTip: 'Constant g ⇒ straight line with constant slope on v–t for vertical throw.',
    ncertLine: 'Slope and area interpretations of kinematic graphs.',
  },
  {
    key: 'projectile',
    examPattern: 'Projectile motion (range, height, time)',
    coachMode: 'formula',
    questionType: 'numerical_mcq',
    tags: ['projectile', 'range', 'time of flight', 'kinematics'],
    highlights: [
      {
        term: 'projectile',
        aliases: ['projected', 'angle of projection'],
        meaning: 'Motion under gravity with initial velocity at an angle; ax=0, ay=−g (no air).',
      },
      {
        term: 'range',
        aliases: ['horizontal range'],
        meaning: 'Horizontal distance until return to same level: (u²sin2θ)/g.',
      },
    ],
    ladder: [
      {
        rung: 1,
        title: 'Resolve u into components',
        detail: 'ux = u cosθ, uy = u sinθ.',
        latex: 'u_x = u\\cos\\theta,\\quad u_y = u\\sin\\theta',
      },
      {
        rung: 2,
        title: 'Use standard results',
        detail: 'T = 2uy/g; H = uy²/(2g); R = u²sin2θ/g (same level).',
        latex: 'R = \\frac{u^{2}\\sin 2\\theta}{g}',
      },
      {
        rung: 3,
        title: 'Check level / landing height',
        detail: 'If landing is not at same height, solve quadratic in t for y(t).',
        latex: null,
      },
    ],
    commonMistake: 'Using R=(u²sin2θ)/g when the projectile lands on a different horizontal level.',
    examTransferTip: 'Max range at 45° on level ground; complementary angles give same range.',
    limitingCase: 'θ→0 ⇒ R→0 and H→0.',
  },
  {
    key: 'relative_motion',
    examPattern: 'Relative velocity (1D/2D, rain/boat)',
    coachMode: 'formula',
    questionType: 'numerical_mcq',
    tags: ['relative velocity', 'boat', 'rain', 'kinematics'],
    highlights: [
      {
        term: 'relative',
        aliases: ['relative velocity', 'relative speed'],
        meaning: 'Velocity of A as seen from B: v_A − v_B (vector subtraction).',
      },
    ],
    ladder: [
      {
        rung: 1,
        title: 'Write velocities in one frame',
        detail: 'Ground frame first; draw arrows.',
        latex: '\\vec{v}_{AB} = \\vec{v}_A - \\vec{v}_B',
      },
      {
        rung: 2,
        title: 'Subtract vectors',
        detail: '1-D: signed speeds; 2-D: components or parallelogram.',
        latex: null,
      },
      {
        rung: 3,
        title: 'Interpret the ask',
        detail: 'Time to meet / rain angle / shortest path across river.',
        latex: null,
      },
    ],
    commonMistake: 'Adding speeds instead of subtracting vectors for relative velocity.',
    examTransferTip: 'Rain–man and boat–river are the same pattern: relative velocity direction.',
  },
  {
    key: 'vectors',
    examPattern: 'Vector algebra (dot / cross / resultant)',
    coachMode: 'formula',
    questionType: 'numerical_mcq',
    tags: ['vectors', 'dot product', 'cross product', 'kinematics'],
    highlights: [
      {
        term: 'vector',
        aliases: ['vectors', 'resultant'],
        meaning: 'Quantity with magnitude and direction; add by parallelogram / components.',
      },
    ],
    ladder: [
      {
        rung: 1,
        title: 'Identify operation',
        detail: 'Dot → scalar; cross → vector ⊥ plane; |A×B|=AB sinθ; A·B=AB cosθ.',
        latex: '\\vec{A}\\cdot\\vec{B}=AB\\cos\\theta',
      },
      {
        rung: 2,
        title: 'Use given magnitude conditions',
        detail: '|A+B|=|A−B| ⇒ A⊥B; |A+B|=|A|+|B| ⇒ parallel.',
        latex: null,
      },
      {
        rung: 3,
        title: 'Compute components',
        detail: 'i, j, k products; check unit-vector normalisation if asked.',
        latex: null,
      },
    ],
    commonMistake: 'Treating cross product as commutative or forgetting sin/cos of the angle.',
    examTransferTip: '|A×B| / (A·B) = tanθ gives the angle quickly.',
  },
  {
    key: 'position_function',
    examPattern: 'x(t) / r(t) → velocity & acceleration',
    coachMode: 'formula',
    questionType: 'numerical_mcq',
    tags: ['differentiation', 'x(t)', 'kinematics'],
    highlights: [
      {
        term: 'position',
        aliases: ['position vector', 'x(t)', 'R'],
        meaning: 'Differentiate once for velocity, twice for acceleration.',
      },
    ],
    ladder: [
      {
        rung: 1,
        title: 'Differentiate position',
        detail: 'v = dx/dt (or dR/dt).',
        latex: 'v = \\frac{dx}{dt}',
      },
      {
        rung: 2,
        title: 'Differentiate again for a',
        detail: 'a = dv/dt = d²x/dt²; set a=0 if asked when acceleration vanishes.',
        latex: 'a = \\frac{d^{2}x}{dt^{2}}',
      },
      {
        rung: 3,
        title: 'Interpret path if 2-D',
        detail: 'Eliminate t for y(x) if the question asks the trajectory.',
        latex: null,
      },
    ],
    commonMistake: 'Using average velocity formulas instead of differentiating x(t).',
    examTransferTip: '“Acceleration zero at time t” means solve d²x/dt² = 0.',
  },
  {
    key: 'vector_basics_recall',
    examPattern: 'Acceleration / vector quantity identification',
    coachMode: 'recall',
    questionType: 'conceptual',
    tags: ['vectors', 'acceleration', 'definitions'],
    highlights: [
      {
        term: 'acceleration',
        meaning: 'Rate of change of velocity; a vector — changes if magnitude or direction changes.',
      },
    ],
    ladder: [],
    commonMistake: 'Thinking acceleration changes only when speed changes (direction also counts).',
    examTransferTip: 'Uniform circular motion: speed constant, acceleration nonzero (centripetal).',
    ncertLine: 'Acceleration is a vector; it changes when velocity’s magnitude or direction changes.',
  },
  {
    key: 'assertion_reason',
    examPattern: 'Assertion–reason (kinematics)',
    coachMode: 'concept',
    questionType: 'assertion_reason',
    tags: ['assertion reason', 'kinematics'],
    highlights: [
      {
        term: 'Assertion',
        aliases: ['Reason'],
        meaning: 'Decide truth of each statement, then whether Reason explains Assertion.',
      },
    ],
    ladder: [
      {
        rung: 1,
        title: 'Judge Assertion alone',
        detail: 'True or false from NCERT definitions / laws.',
        latex: null,
      },
      {
        rung: 2,
        title: 'Judge Reason alone',
        detail: 'True or false independently.',
        latex: null,
      },
      {
        rung: 3,
        title: 'Link them',
        detail: 'Only if both true: does Reason correctly explain Assertion?',
        latex: null,
      },
    ],
    commonMistake: 'Marking “both true, Reason explains” when Reason is merely related, not causal.',
    examTransferTip: 'Same 4-option AR pattern across Physics — train the three-step check.',
  },
  {
    key: 'displacement_distance',
    examPattern: 'Distance vs displacement / 1-D motion',
    coachMode: 'recall',
    questionType: 'conceptual',
    tags: ['distance', 'displacement', '1D'],
    highlights: [
      {
        term: 'displacement',
        aliases: ['distance'],
        meaning: 'Displacement is net change in position (vector/shortest); distance is path length (scalar).',
      },
    ],
    ladder: [],
    commonMistake: 'Equating distance and displacement for non-straight paths.',
    examTransferTip: 'Round trip: displacement 0, distance ≠ 0.',
    ncertLine: 'Distance ≥ |displacement|; equal only for straight-line motion without turning back.',
  },
  {
    key: 'general',
    examPattern: 'General kinematics method',
    coachMode: 'concept',
    questionType: 'conceptual',
    tags: ['kinematics'],
    highlights: [
      {
        term: 'velocity',
        aliases: ['speed', 'acceleration'],
        meaning: 'Identify whether the stem asks a definition, a graph read, or a calculation.',
      },
    ],
    ladder: [
      {
        rung: 1,
        title: 'Parse what is given / asked',
        detail: 'Scalars vs vectors; 1-D vs 2-D; constant a or not.',
        latex: null,
      },
      {
        rung: 2,
        title: 'Choose tool',
        detail: 'Definition, graph, relative velocity, or kinematic equation.',
        latex: null,
      },
      {
        rung: 3,
        title: 'Eliminate options',
        detail: 'Units, limiting cases, and vector direction.',
        latex: null,
      },
    ],
    commonMistake: 'Jumping to a formula before confirming constant acceleration / same-level landing.',
    examTransferTip: 'Label knowns first; most NEET kinematics errors are setup, not algebra.',
  },
];

function classify(q) {
  const t = (q.questionText || '').toLowerCase();
  const e = (q.explanation || '').toLowerCase();
  const blob = `${t} ${e}`;

  if (t.includes('assertion') || t.startsWith('assertion')) return 'assertion_reason';
  if (
    /identify the vector|vector quantity|unit vector|resultant of a\s*x\s*0|a̅\s*and\s*b̅|\\vec\{|magnitude of (sum|difference|vectors)|six vectors|torque of the force|torque of a force|linear velocity, if r =|f = q\(|\\times|dot product|a̅ ·|a̅\.|cross/i.test(
      blob
    ) ||
    /\|a.*b\||a × b|a · b/.test(blob)
  ) {
    return 'vectors';
  }
  if (/position (vector|x of a particle|of a particle moving)|x = |r = 4sin|s = \(3t|f = f0|accelerates from rest at a constant rate α/.test(blob)) {
    return 'position_function';
  }
  if (/projectile|angle of projection|horizontal range|maximum height|time of flight|projected at|projected from/.test(blob)) {
    return 'projectile';
  }
  if (/relative|boat|river|rain|two cars p and q|two boys are standing/.test(blob)) {
    return 'relative_motion';
  }
  if (/graph|curve for a body|shown below|velocity-time|displacement-time|v-t|s-t|does not represent motion/.test(blob)) {
    return 'graphs';
  }
  if (
    /average speed|average velocity|one-third|one third|first half|2\/5|covers the first|travels along a straight road for half/.test(
      blob
    )
  ) {
    return 'average_speed';
  }
  if (
    /nth second|4th and|during the 4th|1st, 2nd, 3rd|ratio of the distances travelled by a freely falling/.test(blob)
  ) {
    return 'equations_motion_nth';
  }
  if (
    /dropped|projected upwards|projected vertically|strike the ground|height of the tower|freely falling|thrown vertically|balloon with mass|water drop falls|velocity at half of the height|last t seconds of its asc/.test(
      blob
    )
  ) {
    return 'free_fall';
  }
  if (/acceleration of a particle changes when|identify the vector quantity among/.test(t)) {
    return 'vector_basics_recall';
  }
  if (/one dimension|distance vs|displacement/.test(blob) && !/\d/.test(t.slice(0, 80))) {
    return 'displacement_distance';
  }
  if (/u \+|v\^2|from rest|uniform acceleration|constant acceleration|covers a distance|moving with/.test(blob)) {
    return 'equations_motion';
  }
  return 'general';
}

function optionText(q, label) {
  const opt = (q.options || []).find((o) => o.label === label);
  if (!opt) return '';
  return (opt.text || '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function wrongOptions(q) {
  const correct = q.correctOption;
  return (q.options || [])
    .filter((o) => o.label !== correct)
    .map((o) => ({
      option: o.label,
      whyStudentsPick: `Common distractor (${optionText(q, o.label) || o.label}).`,
      howToAvoid: 'Re-check definitions, signs, and whether distance segments or times are equal.',
    }));
}

function buildAid(q, pattern) {
  const correct = q.correctOption;
  const value = optionText(q, correct) || correct;
  const why =
    (q.explanation || '').trim() ||
    `(${correct}) ${value}`;

  const coachMode = pattern.coachMode;
  const ladder = coachMode === 'recall' ? [] : pattern.ladder;

  const steps =
    coachMode === 'recall'
      ? [
          ...(pattern.ncertLine ? [pattern.ncertLine] : []),
          `Key from solution: ${why.slice(0, 280)}`,
        ]
      : [
          ...ladder.map((r) => `${r.title}: ${r.detail}`),
          `Key from solution: ${why.slice(0, 280)}`,
        ];

  return {
    meta: {
      subject: SUBJECT,
      chapter: CHAPTER,
      questionType: pattern.questionType,
      coachMode,
      examPattern: pattern.examPattern,
      difficulty: q.difficulty || 'medium',
      neetRelevance: 'high',
    },
    stemHighlights: pattern.highlights,
    readQuestionAudio:
      coachMode === 'recall'
        ? `This is a short recall question on ${pattern.examPattern}. Read the stem carefully and match the definition before looking at options.`
        : `This is a Kinematics question of type: ${pattern.examPattern}. Note what is given and what is asked. Decide the method before calculating.`,
    conceptTags: pattern.tags,
    formulaLadder: ladder,
    solutionSteps: steps,
    finalAnswer: {
      option: correct,
      value,
      whyCorrect: why.slice(0, 500),
    },
    optionTraps: wrongOptions(q),
    solutionAudio:
      coachMode === 'recall'
        ? `Pattern: ${pattern.examPattern}. Remember: ${pattern.ncertLine || pattern.commonMistake}. Correct option ${correct}.`
        : `Pattern: ${pattern.examPattern}. ${ladder
            .map((r) => `Step ${r.rung}: ${r.title}.`)
            .join(' ')} The correct option is ${correct}. Watch out: ${pattern.commonMistake}`,
    commonMistake: pattern.commonMistake,
    examTransferTip: pattern.examTransferTip,
    quickCheck: {
      unitsOk: true,
      limitingCase: pattern.limitingCase || undefined,
      ncertOrKeyLine: pattern.ncertLine || undefined,
    },
    subjectExtras: {
      physics: {
        signOrDiagramNote:
          coachMode === 'formula'
            ? 'Sketch the motion (axes / projectile / relative arrows) before algebra.'
            : undefined,
      },
    },
  };
}

function sqlEscape(str) {
  return str.replace(/'/g, "''");
}

function main() {
  const questions = JSON.parse(fs.readFileSync(inFile, 'utf8'));
  const byKey = Object.fromEntries(PATTERNS.map((p) => [p.key, p]));
  const counts = {};
  const lines = ['BEGIN;', '-- Kinematics learning aids (pattern seed)', ''];

  for (const q of questions) {
    const key = classify(q);
    counts[key] = (counts[key] || 0) + 1;
    const pattern = byKey[key] || byKey.general;
    const aid = buildAid(q, pattern);
    const json = sqlEscape(JSON.stringify(aid));
    lines.push(
      `UPDATE questions SET learning_aid = '${json}'::jsonb, updated_at = NOW() WHERE id = '${q.id}' AND learning_aid IS NULL;`
    );
  }

  lines.push('', 'COMMIT;', '');
  fs.writeFileSync(outFile, lines.join('\n'));
  console.log('Wrote', outFile);
  console.log('Patterns:', counts);
  console.log('Total', questions.length);
}

main();
