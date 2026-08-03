/**
 * Seeds a full NEET/KCET practice dataset: 4 subjects (Physics, Chemistry,
 * Botany, Zoology — matching NEET's official scoring split, where Biology
 * counts as two separate sections), 10 chapters total, and 100+ original
 * practice MCQs (not reproductions of any real past paper), each embedded
 * and indexed into pgvector.
 *
 * This is scaffold/test data sized to exercise the schema and the
 * embedding pipeline realistically — swap in a licensed question bank
 * before using this in production.
 *
 * Usage: ts-node scripts/seed-neet-kcet.ts
 */
import { pgPool, embedAndIndexQuestion } from './shared';

interface SeedQuestion {
  questionText: string;
  options: { label: string; text: string }[];
  correctOption: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface SeedTopic {
  name: string;
  questions: SeedQuestion[];
}

interface SeedSubject {
  name: string;
  code: string;
  topics: SeedTopic[];
}

function opts(a: string, b: string, c: string, d: string) {
  return [
    { label: 'A', text: a },
    { label: 'B', text: b },
    { label: 'C', text: c },
    { label: 'D', text: d },
  ];
}

// --- Physics -------------------------------------------------------------

function kinematicsQuestions(): SeedQuestion[] {
  const variants = [
    { u: 20, g: 10 },
    { u: 30, g: 10 },
    { u: 40, g: 10 },
    { u: 50, g: 10 },
  ];
  return variants.map(({ u, g }) => {
    const h = (u * u) / (2 * g);
    return {
      questionText: `A body is thrown vertically upward with an initial velocity of ${u} m/s. Taking g = ${g} m/s^2 and ignoring air resistance, what is the maximum height reached?`,
      options: opts(`${h - 5} m`, `${h} m`, `${h + 5} m`, `${h + 10} m`),
      correctOption: 'B',
      explanation: `At maximum height, v = 0. Using v^2 = u^2 - 2gh: h = u^2 / (2g) = ${u * u} / ${2 * g} = ${h} m.`,
      difficulty: 'easy',
    };
  });
}

function lawsOfMotionQuestions(): SeedQuestion[] {
  const variants = [
    { m: 2, a: 3 },
    { m: 5, a: 2 },
    { m: 4, a: 5 },
    { m: 10, a: 1 },
  ];
  return variants.map(({ m, a }) => {
    const f = m * a;
    return {
      questionText: `A block of mass ${m} kg accelerates at ${a} m/s^2 under a horizontal force on a frictionless surface. What is the magnitude of the applied force?`,
      options: opts(`${f - 2} N`, `${f} N`, `${f + 2} N`, `${f + 4} N`),
      correctOption: 'B',
      explanation: `By Newton's second law, F = ma = ${m} x ${a} = ${f} N.`,
      difficulty: 'easy',
    };
  });
}

function workEnergyQuestions(): SeedQuestion[] {
  const variants = [
    { m: 2, v: 4 },
    { m: 1, v: 6 },
    { m: 3, v: 2 },
    { m: 5, v: 4 },
  ];
  return variants.map(({ m, v }) => {
    const ke = 0.5 * m * v * v;
    return {
      questionText: `What is the kinetic energy of a ${m} kg object moving at ${v} m/s?`,
      options: opts(`${ke - 4} J`, `${ke} J`, `${ke + 4} J`, `${ke + 8} J`),
      correctOption: 'B',
      explanation: `KE = (1/2)mv^2 = 0.5 x ${m} x ${v}^2 = ${ke} J.`,
      difficulty: 'easy',
    };
  });
}

function gravitationQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'According to Kepler\'s third law, the square of the orbital period of a planet is proportional to which power of its semi-major axis?',
      options: opts('1', '2', '3', '1/2'),
      correctOption: 'C',
      explanation: "Kepler's third law states T^2 is proportional to a^3.",
      difficulty: 'medium',
    },
    {
      questionText: 'The escape velocity of an object from Earth\'s surface is independent of which of the following?',
      options: opts("The object's mass", "Earth's mass", "Earth's radius", 'The gravitational constant G'),
      correctOption: 'A',
      explanation: 'Escape velocity v = sqrt(2GM/R) does not depend on the escaping object\'s own mass.',
      difficulty: 'medium',
    },
    {
      questionText: 'A satellite orbits Earth at twice the radius of a geostationary satellite. Compared to the geostationary orbit, its orbital period is:',
      options: opts('Shorter', 'The same', 'Longer', 'Undefined'),
      correctOption: 'C',
      explanation: 'Since T^2 is proportional to r^3, increasing r increases the orbital period.',
      difficulty: 'hard',
    },
    {
      questionText: 'Which quantity remains constant for a planet in an elliptical orbit around the Sun, according to Kepler\'s second law?',
      options: opts('Orbital speed', 'Angular momentum', 'Kinetic energy', 'Distance from the Sun'),
      correctOption: 'B',
      explanation: "Kepler's second law follows from conservation of angular momentum — the radius vector sweeps out equal areas in equal times.",
      difficulty: 'medium',
    },
  ];
}

function thermodynamicsPhysicsQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'In an adiabatic process, which of the following is true?',
      options: opts('No work is done', 'No heat is exchanged with surroundings', 'Temperature remains constant', 'Pressure remains constant'),
      correctOption: 'B',
      explanation: 'An adiabatic process is defined by zero heat transfer (Q = 0) between the system and surroundings.',
      difficulty: 'medium',
    },
    {
      questionText: 'The first law of thermodynamics is a statement of conservation of:',
      options: opts('Momentum', 'Energy', 'Entropy', 'Mass'),
      correctOption: 'B',
      explanation: 'The first law (dU = Q - W) expresses conservation of energy for a thermodynamic system.',
      difficulty: 'easy',
    },
    {
      questionText: 'For an ideal gas undergoing an isothermal process, which quantity remains constant?',
      options: opts('Pressure', 'Volume', 'Temperature', 'Internal energy change is zero and PV is constant'),
      correctOption: 'D',
      explanation: 'In an isothermal process for an ideal gas, T is constant, so PV = nRT is constant and the internal energy change is zero.',
      difficulty: 'medium',
    },
    {
      questionText: 'The efficiency of a Carnot engine operating between temperatures T1 (hot) and T2 (cold) is given by:',
      options: opts('T2/T1', '1 - T2/T1', 'T1/T2', '1 + T2/T1'),
      correctOption: 'B',
      explanation: 'Carnot efficiency = 1 - (T_cold / T_hot), with temperatures in Kelvin.',
      difficulty: 'medium',
    },
  ];
}

function electrostaticsQuestions(): SeedQuestion[] {
  const variants = [
    { q1: 2, q2: 3, r: 1 },
    { q1: 1, q2: 4, r: 2 },
    { q1: 3, q2: 3, r: 1 },
    { q1: 2, q2: 2, r: 2 },
  ];
  const k = 9; // x 10^9, simplified for whole-number answers with microcoulomb-scale charges
  return variants.map(({ q1, q2, r }) => {
    const f = (k * q1 * q2) / (r * r);
    return {
      questionText: `Two point charges of ${q1} uC and ${q2} uC are placed ${r} m apart in vacuum. Using k = 9 x 10^9 N m^2/C^2, what is the magnitude of the electrostatic force between them (in units of 10^-3 N)?`,
      options: opts(`${f - 3}`, `${f}`, `${f + 3}`, `${f + 6}`),
      correctOption: 'B',
      explanation: `Coulomb's law: F = k q1 q2 / r^2. With charges in microcoulombs and this simplified constant, F = ${k} x ${q1} x ${q2} / ${r * r} = ${f} (x10^-3 N).`,
      difficulty: 'medium',
    };
  });
}

function currentElectricityQuestions(): SeedQuestion[] {
  const variants = [
    { v: 12, r: 4 },
    { v: 9, r: 3 },
    { v: 20, r: 5 },
    { v: 6, r: 2 },
  ];
  return variants.map(({ v, r }) => {
    const i = v / r;
    return {
      questionText: `A resistor of ${r} ohm is connected across a ${v} V battery. What is the current flowing through the resistor?`,
      options: opts(`${i - 1} A`, `${i} A`, `${i + 1} A`, `${i + 2} A`),
      correctOption: 'B',
      explanation: `By Ohm's law, I = V/R = ${v}/${r} = ${i} A.`,
      difficulty: 'easy',
    };
  });
}

function magnetismQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'The magnetic field at the center of a current-carrying circular loop is directed:',
      options: opts('Along the plane of the loop', 'Perpendicular to the plane of the loop', 'Radially outward', 'Radially inward'),
      correctOption: 'B',
      explanation: "By the right-hand rule, the field at the center of a circular current loop is perpendicular to the loop's plane.",
      difficulty: 'easy',
    },
    {
      questionText: 'A charged particle moving parallel to a magnetic field experiences a force of magnitude:',
      options: opts('Maximum', 'Zero', 'Half the maximum', 'Depends on speed only'),
      correctOption: 'B',
      explanation: 'F = qv x B; when v is parallel to B, the cross product is zero, so the force is zero.',
      difficulty: 'medium',
    },
    {
      questionText: "Lenz's law is a consequence of which fundamental conservation principle?",
      options: opts('Conservation of charge', 'Conservation of energy', 'Conservation of momentum', 'Conservation of mass'),
      correctOption: 'B',
      explanation: "Lenz's law (the induced current opposes the change in flux) follows from conservation of energy.",
      difficulty: 'medium',
    },
    {
      questionText: 'The SI unit of magnetic flux is the:',
      options: opts('Tesla', 'Weber', 'Henry', 'Gauss'),
      correctOption: 'B',
      explanation: 'Magnetic flux is measured in Weber (Wb); magnetic field strength is measured in Tesla.',
      difficulty: 'easy',
    },
  ];
}

function opticsQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'A convex lens forms a real, inverted, and same-size image when the object is placed at:',
      options: opts('The focus', 'Twice the focal length (2F)', 'Infinity', 'Between F and the lens'),
      correctOption: 'B',
      explanation: 'For a convex lens, an object at 2F produces a real, inverted image of the same size at 2F on the other side.',
      difficulty: 'medium',
    },
    {
      questionText: 'In Young\'s double-slit experiment, the fringe width is directly proportional to:',
      options: opts('Slit separation', 'Wavelength of light', 'Slit width', 'Intensity of light'),
      correctOption: 'B',
      explanation: 'Fringe width beta = (lambda D) / d, so it is directly proportional to the wavelength lambda.',
      difficulty: 'medium',
    },
    {
      questionText: 'Total internal reflection occurs when light travels from a:',
      options: opts('Rarer to denser medium at any angle', 'Denser to rarer medium beyond the critical angle', 'Denser to rarer medium below the critical angle', 'Vacuum into any medium'),
      correctOption: 'B',
      explanation: 'Total internal reflection occurs at the denser-to-rarer interface when the angle of incidence exceeds the critical angle.',
      difficulty: 'medium',
    },
    {
      questionText: 'The power of a lens with focal length 0.5 m is:',
      options: opts('0.5 D', '1 D', '2 D', '5 D'),
      correctOption: 'C',
      explanation: 'Power P = 1/f (in meters) = 1/0.5 = 2 diopters.',
      difficulty: 'easy',
    },
  ];
}

function modernPhysicsQuestions(): SeedQuestion[] {
  return [
    {
      questionText: "According to Einstein's photoelectric equation, the maximum kinetic energy of emitted electrons depends on:",
      options: opts('Intensity of incident light only', 'Frequency of incident light and the work function', 'Distance from the source', 'Angle of incidence only'),
      correctOption: 'B',
      explanation: 'KE_max = hf - phi, where f is the frequency of incident light and phi is the work function of the metal.',
      difficulty: 'medium',
    },
    {
      questionText: "In Rutherford's alpha-particle scattering experiment, the large-angle scattering of alpha particles indicated:",
      options: opts('Electrons are heavy', 'Atoms have a small, dense, positively charged nucleus', 'Atoms are uniformly charged spheres', 'Atoms have no charge'),
      correctOption: 'B',
      explanation: 'Large-angle scattering indicated most of the atomic mass and positive charge is concentrated in a tiny nucleus.',
      difficulty: 'medium',
    },
    {
      questionText: 'The half-life of a radioactive substance is the time in which:',
      options: opts('All the substance decays', 'Half the nuclei present decay', 'The substance becomes stable', 'The decay rate doubles'),
      correctOption: 'B',
      explanation: 'Half-life is defined as the time for half of a given quantity of radioactive nuclei to decay.',
      difficulty: 'easy',
    },
    {
      questionText: "The de Broglie wavelength of a particle is inversely proportional to its:",
      options: opts('Mass only', 'Charge', 'Momentum', 'Energy squared'),
      correctOption: 'C',
      explanation: 'De Broglie wavelength lambda = h/p, inversely proportional to momentum p.',
      difficulty: 'medium',
    },
  ];
}

function physicsSubject(): SeedSubject {
  return {
    name: 'Physics',
    code: 'PHY',
    topics: [
      { name: 'Kinematics', questions: kinematicsQuestions() },
      { name: 'Laws of Motion', questions: lawsOfMotionQuestions() },
      { name: 'Work, Energy and Power', questions: workEnergyQuestions() },
      { name: 'Gravitation', questions: gravitationQuestions() },
      { name: 'Thermodynamics', questions: thermodynamicsPhysicsQuestions() },
      { name: 'Electrostatics', questions: electrostaticsQuestions() },
      { name: 'Current Electricity', questions: currentElectricityQuestions() },
      { name: 'Magnetism', questions: magnetismQuestions() },
      { name: 'Optics', questions: opticsQuestions() },
      { name: 'Modern Physics', questions: modernPhysicsQuestions() },
    ],
  };
}

// --- Chemistry -------------------------------------------------------------

function atomicStructureQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'The maximum number of electrons that can occupy the M shell (n=3) is:',
      options: opts('8', '18', '32', '2'),
      correctOption: 'B',
      explanation: 'Maximum electrons in a shell = 2n^2 = 2(3)^2 = 18.',
      difficulty: 'easy',
    },
    {
      questionText: "Heisenberg's uncertainty principle states that it is impossible to simultaneously determine, with arbitrary precision, a particle's:",
      options: opts('Charge and mass', 'Position and momentum', 'Energy and charge', 'Spin and mass'),
      correctOption: 'B',
      explanation: "Heisenberg's uncertainty principle: delta x * delta p >= h/(4*pi), limiting simultaneous precision of position and momentum.",
      difficulty: 'medium',
    },
    {
      questionText: 'The electronic configuration of an element with atomic number 17 is:',
      options: opts('2,8,7', '2,8,8', '2,7,8', '2,8,6'),
      correctOption: 'A',
      explanation: 'Chlorine (Z=17): 2 electrons in K shell, 8 in L shell, 7 in M shell.',
      difficulty: 'easy',
    },
    {
      questionText: "According to Bohr's model, the energy of an electron in the nth orbit of a hydrogen atom is proportional to:",
      options: opts('n', 'n^2', '1/n^2', '1/n'),
      correctOption: 'C',
      explanation: 'Bohr model: E_n = -13.6/n^2 eV, so energy magnitude is proportional to 1/n^2.',
      difficulty: 'medium',
    },
  ];
}

function chemicalBondingQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'According to VSEPR theory, the shape of a molecule with 4 bond pairs and 0 lone pairs around the central atom is:',
      options: opts('Trigonal planar', 'Tetrahedral', 'Linear', 'Octahedral'),
      correctOption: 'B',
      explanation: 'Four electron domains with no lone pairs arrange tetrahedrally to minimize repulsion.',
      difficulty: 'medium',
    },
    {
      questionText: 'Which type of bond results from the complete transfer of electrons from one atom to another?',
      options: opts('Covalent bond', 'Ionic bond', 'Metallic bond', 'Hydrogen bond'),
      correctOption: 'B',
      explanation: 'An ionic bond forms via complete electron transfer, creating oppositely charged ions held by electrostatic attraction.',
      difficulty: 'easy',
    },
    {
      questionText: 'The hybridization of carbon in methane (CH4) is:',
      options: opts('sp', 'sp2', 'sp3', 'sp3d'),
      correctOption: 'C',
      explanation: 'Carbon in methane forms four equivalent sigma bonds, consistent with sp3 hybridization.',
      difficulty: 'easy',
    },
    {
      questionText: 'Which of the following molecules is polar?',
      options: opts('CO2', 'CCl4', 'H2O', 'CH4'),
      correctOption: 'C',
      explanation: 'Water has a bent geometry with a net dipole moment, unlike the symmetric nonpolar CO2, CCl4, and CH4.',
      difficulty: 'medium',
    },
  ];
}

function statesOfMatterQuestions(): SeedQuestion[] {
  const variants = [
    { p1: 1, v1: 4, v2: 2 },
    { p1: 2, v1: 6, v2: 3 },
    { p1: 1, v1: 8, v2: 4 },
    { p1: 3, v1: 4, v2: 2 },
  ];
  return variants.map(({ p1, v1, v2 }) => {
    const p2 = (p1 * v1) / v2;
    return {
      questionText: `A fixed amount of gas at ${p1} atm occupies ${v1} L. At constant temperature, its volume is reduced to ${v2} L. What is the new pressure (Boyle's Law)?`,
      options: opts(`${p2 - 1} atm`, `${p2} atm`, `${p2 + 1} atm`, `${p2 + 2} atm`),
      correctOption: 'B',
      explanation: `By Boyle's Law, P1V1 = P2V2, so P2 = (${p1} x ${v1}) / ${v2} = ${p2} atm.`,
      difficulty: 'easy',
    };
  });
}

function thermodynamicsChemistryQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'For an exothermic reaction, the enthalpy change (delta H) is:',
      options: opts('Positive', 'Negative', 'Zero', 'Undefined'),
      correctOption: 'B',
      explanation: 'Exothermic reactions release heat to the surroundings, so delta H is negative.',
      difficulty: 'easy',
    },
    {
      questionText: 'Entropy is a measure of:',
      options: opts('Energy content', 'Disorder or randomness of a system', 'Temperature', 'Heat capacity'),
      correctOption: 'B',
      explanation: 'Entropy (S) quantifies the degree of disorder or randomness in a system.',
      difficulty: 'easy',
    },
    {
      questionText: 'According to the second law of thermodynamics, the entropy of an isolated system:',
      options: opts('Always decreases', 'Always increases or remains constant', 'Always remains constant', 'Always decreases to zero'),
      correctOption: 'B',
      explanation: 'The second law states the total entropy of an isolated system never decreases over time.',
      difficulty: 'medium',
    },
    {
      questionText: 'Gibbs free energy (delta G) is negative for a reaction that is:',
      options: opts('Non-spontaneous', 'Spontaneous', 'At equilibrium only', 'Endothermic only'),
      correctOption: 'B',
      explanation: 'A negative delta G indicates a thermodynamically spontaneous process at constant temperature and pressure.',
      difficulty: 'medium',
    },
  ];
}

function equilibriumQuestions(): SeedQuestion[] {
  return [
    {
      questionText: "According to Le Chatelier's principle, increasing the pressure on a gaseous equilibrium shifts it toward the side with:",
      options: opts('More moles of gas', 'Fewer moles of gas', 'No change', 'Higher temperature'),
      correctOption: 'B',
      explanation: 'Increasing pressure shifts equilibrium toward the side with fewer gas moles, reducing pressure.',
      difficulty: 'medium',
    },
    {
      questionText: 'A solution with pH = 3 is how many times more acidic than a solution with pH = 5?',
      options: opts('2 times', '10 times', '100 times', '1000 times'),
      correctOption: 'C',
      explanation: 'pH is a logarithmic scale (base 10); a difference of 2 pH units corresponds to a 10^2 = 100-fold difference in H+ concentration.',
      difficulty: 'medium',
    },
    {
      questionText: 'The equilibrium constant Kc for a reaction depends on:',
      options: opts('Concentration of reactants only', 'Temperature only', 'Pressure only', 'Catalyst used'),
      correctOption: 'B',
      explanation: 'Kc is a function of temperature only; it is unaffected by concentration, pressure, or catalysts.',
      difficulty: 'medium',
    },
    {
      questionText: 'A buffer solution resists changes in pH because it contains:',
      options: opts('A strong acid and strong base', 'A weak acid/base and its conjugate', 'Pure water only', 'Only a strong acid'),
      correctOption: 'B',
      explanation: 'Buffers combine a weak acid (or base) with its conjugate base (or acid) to neutralize small additions of acid or base.',
      difficulty: 'medium',
    },
  ];
}

function electrochemistryQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'In a galvanic cell, oxidation occurs at the:',
      options: opts('Cathode', 'Anode', 'Salt bridge', 'External circuit'),
      correctOption: 'B',
      explanation: 'By convention, oxidation always occurs at the anode in both galvanic and electrolytic cells.',
      difficulty: 'easy',
    },
    {
      questionText: "According to Faraday's first law of electrolysis, the mass of substance deposited is directly proportional to:",
      options: opts('The resistance of the cell', 'The quantity of charge passed', 'The temperature only', 'The volume of electrolyte'),
      correctOption: 'B',
      explanation: "Faraday's first law: mass deposited is proportional to the total electric charge (Q = It) passed through the electrolyte.",
      difficulty: 'medium',
    },
    {
      questionText: 'A standard hydrogen electrode (SHE) has a standard reduction potential of:',
      options: opts('+1.0 V', '0.0 V', '-1.0 V', '+0.5 V'),
      correctOption: 'B',
      explanation: 'The SHE is defined as the reference electrode with a standard reduction potential of exactly 0.0 V.',
      difficulty: 'easy',
    },
    {
      questionText: 'A cell reaction is spontaneous when the standard cell potential (E-cell) is:',
      options: opts('Negative', 'Zero', 'Positive', 'Independent of sign'),
      correctOption: 'C',
      explanation: 'A positive E-cell corresponds to a negative delta G, indicating a spontaneous reaction.',
      difficulty: 'medium',
    },
  ];
}

function organicBasicsQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'The IUPAC name for CH3-CH2-OH is:',
      options: opts('Methanol', 'Ethanol', 'Propanol', 'Ethanal'),
      correctOption: 'B',
      explanation: 'A two-carbon chain with an -OH group is named ethanol.',
      difficulty: 'easy',
    },
    {
      questionText: 'A functional group consisting of a carbon double-bonded to oxygen and single-bonded to -OH is called a:',
      options: opts('Aldehyde', 'Ketone', 'Carboxylic acid', 'Ester'),
      correctOption: 'C',
      explanation: 'The -COOH group (carbonyl + hydroxyl on the same carbon) defines a carboxylic acid.',
      difficulty: 'medium',
    },
    {
      questionText: 'Isomers that have the same molecular formula but different structural arrangements are called:',
      options: opts('Structural isomers', 'Isotopes', 'Allotropes', 'Homologs'),
      correctOption: 'A',
      explanation: 'Structural (constitutional) isomers share a molecular formula but differ in atom connectivity.',
      difficulty: 'easy',
    },
    {
      questionText: 'Which of the following best describes a nucleophile?',
      options: opts('An electron-poor species that accepts electrons', 'An electron-rich species that donates an electron pair', 'A neutral species with no charge', 'A species that always carries a positive charge'),
      correctOption: 'B',
      explanation: 'Nucleophiles are electron-rich species (often with lone pairs or negative charge) that donate electrons to form a new bond.',
      difficulty: 'medium',
    },
  ];
}

function hydrocarbonsQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'The general formula for alkanes is:',
      options: opts('CnH2n', 'CnH2n+2', 'CnH2n-2', 'CnHn'),
      correctOption: 'B',
      explanation: 'Saturated acyclic hydrocarbons (alkanes) follow the general formula CnH2n+2.',
      difficulty: 'easy',
    },
    {
      questionText: 'Alkenes are characterized by the presence of:',
      options: opts('A carbon-carbon single bond only', 'At least one carbon-carbon double bond', 'A carbon-carbon triple bond', 'An aromatic ring'),
      correctOption: 'B',
      explanation: 'Alkenes contain at least one C=C double bond, following the general formula CnH2n.',
      difficulty: 'easy',
    },
    {
      questionText: 'Benzene is an example of a(n):',
      options: opts('Saturated hydrocarbon', 'Aromatic hydrocarbon', 'Alkyne', 'Cycloalkane'),
      correctOption: 'B',
      explanation: 'Benzene (C6H6) is the archetypal aromatic hydrocarbon, with a delocalized pi-electron ring system.',
      difficulty: 'easy',
    },
    {
      questionText: 'The addition of HBr to an unsymmetrical alkene follows which rule to determine the major product?',
      options: opts("Le Chatelier's principle", "Markovnikov's rule", "Hund's rule", "Pauli's exclusion principle"),
      correctOption: 'B',
      explanation: "Markovnikov's rule: the hydrogen adds to the carbon with more existing hydrogens, and the halide adds to the more substituted carbon.",
      difficulty: 'medium',
    },
  ];
}

function coordinationCompoundsQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'In coordination chemistry, the species that donates a lone pair to the central metal atom is called the:',
      options: opts('Counter ion', 'Ligand', 'Coordination number', 'Oxidation state'),
      correctOption: 'B',
      explanation: 'A ligand is an ion or molecule that donates a pair of electrons to the central metal atom or ion.',
      difficulty: 'easy',
    },
    {
      questionText: 'The coordination number of the central metal ion in [Co(NH3)6]3+ is:',
      options: opts('4', '6', '2', '8'),
      correctOption: 'B',
      explanation: 'Six ammonia ligands are directly bonded to the cobalt ion, giving a coordination number of 6.',
      difficulty: 'medium',
    },
    {
      questionText: 'A bidentate ligand donates how many electron pairs to the central metal atom?',
      options: opts('One', 'Two', 'Three', 'Four'),
      correctOption: 'B',
      explanation: 'A bidentate ligand has two donor atoms and forms two coordinate bonds with the central metal.',
      difficulty: 'medium',
    },
    {
      questionText: 'According to crystal field theory, in an octahedral complex, the d-orbitals split into:',
      options: opts('One set of equal energy', 'Two sets: t2g (lower) and eg (higher)', 'Three sets of equal energy', 'Five non-degenerate levels only in tetrahedral fields'),
      correctOption: 'B',
      explanation: 'In an octahedral field, d-orbitals split into the lower-energy t2g set and higher-energy eg set.',
      difficulty: 'hard',
    },
  ];
}

function periodicTableQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'Across a period from left to right, atomic radius generally:',
      options: opts('Increases', 'Decreases', 'Remains constant', 'Varies unpredictably'),
      correctOption: 'B',
      explanation: 'Effective nuclear charge increases across a period, pulling electrons closer and decreasing atomic radius.',
      difficulty: 'easy',
    },
    {
      questionText: 'Which of the following elements has the highest first ionization energy?',
      options: opts('Sodium', 'Chlorine', 'Neon', 'Magnesium'),
      correctOption: 'C',
      explanation: 'Ionization energy increases across a period; noble gases have the highest values due to stable, filled electron configurations.',
      difficulty: 'medium',
    },
    {
      questionText: 'Elements in the same group of the periodic table have similar chemical properties primarily because they have the same:',
      options: opts('Atomic mass', 'Number of valence electrons', 'Number of neutrons', 'Atomic radius'),
      correctOption: 'B',
      explanation: 'Elements in a group share the same number of valence electrons, which governs their chemical behavior.',
      difficulty: 'easy',
    },
    {
      questionText: 'Electronegativity generally increases in which direction on the periodic table?',
      options: opts('Left to right, top to bottom', 'Left to right, bottom to top', 'Right to left, top to bottom', 'Right to left, bottom to top'),
      correctOption: 'B',
      explanation: 'Electronegativity increases across a period (left to right) and up a group (bottom to top), peaking near fluorine.',
      difficulty: 'medium',
    },
  ];
}

function chemistrySubject(): SeedSubject {
  return {
    name: 'Chemistry',
    code: 'CHEM',
    topics: [
      { name: 'Atomic Structure', questions: atomicStructureQuestions() },
      { name: 'Chemical Bonding', questions: chemicalBondingQuestions() },
      { name: 'States of Matter', questions: statesOfMatterQuestions() },
      { name: 'Thermodynamics', questions: thermodynamicsChemistryQuestions() },
      { name: 'Equilibrium', questions: equilibriumQuestions() },
      { name: 'Electrochemistry', questions: electrochemistryQuestions() },
      { name: 'Organic Chemistry Basics', questions: organicBasicsQuestions() },
      { name: 'Hydrocarbons', questions: hydrocarbonsQuestions() },
      { name: 'Coordination Compounds', questions: coordinationCompoundsQuestions() },
      { name: 'Periodic Table', questions: periodicTableQuestions() },
    ],
  };
}

// --- Biology -------------------------------------------------------------

function cellBiologyQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'Which organelle is primarily responsible for ATP production in eukaryotic cells?',
      options: opts('Nucleus', 'Mitochondrion', 'Golgi apparatus', 'Lysosome'),
      correctOption: 'B',
      explanation: 'Mitochondria carry out oxidative phosphorylation, producing the majority of a cell\'s ATP.',
      difficulty: 'easy',
    },
    {
      questionText: 'The cell membrane is best described by which model?',
      options: opts('Solid sandwich model', 'Fluid mosaic model', 'Rigid lattice model', 'Static bilayer model'),
      correctOption: 'B',
      explanation: 'The fluid mosaic model describes the membrane as a dynamic bilayer with mobile proteins embedded in it.',
      difficulty: 'easy',
    },
    {
      questionText: 'Ribosomes are the site of:',
      options: opts('DNA replication', 'Protein synthesis', 'Lipid digestion', 'ATP storage'),
      correctOption: 'B',
      explanation: 'Ribosomes translate mRNA into polypeptide chains, i.e., protein synthesis.',
      difficulty: 'easy',
    },
    {
      questionText: 'Which of the following structures is unique to plant cells and not found in animal cells?',
      options: opts('Mitochondria', 'Cell wall', 'Ribosome', 'Nucleus'),
      correctOption: 'B',
      explanation: 'Plant cells possess a rigid cellulose cell wall external to the cell membrane, which animal cells lack.',
      difficulty: 'easy',
    },
  ];
}

function geneticsQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'In a monohybrid cross between two heterozygous (Aa x Aa) individuals, the expected phenotypic ratio is:',
      options: opts('1:1', '9:3:3:1', '3:1', '1:2:1'),
      correctOption: 'C',
      explanation: "Mendel's law of segregation predicts a 3:1 phenotypic ratio (dominant:recessive) from an Aa x Aa cross.",
      difficulty: 'medium',
    },
    {
      questionText: 'A cross between two individuals heterozygous for two independently assorting genes (AaBb x AaBb) gives a phenotypic ratio of:',
      options: opts('3:1', '9:3:3:1', '1:1:1:1', '15:1'),
      correctOption: 'B',
      explanation: "Mendel's law of independent assortment predicts a 9:3:3:1 ratio in a dihybrid cross.",
      difficulty: 'hard',
    },
    {
      questionText: 'A human male has which sex chromosome combination?',
      options: opts('XX', 'XY', 'XXY only', 'YY'),
      correctOption: 'B',
      explanation: 'Human males typically carry one X and one Y chromosome (XY); females carry XX.',
      difficulty: 'easy',
    },
    {
      questionText: 'A mutation that changes a single nucleotide base in DNA is called a:',
      options: opts('Frameshift mutation', 'Point mutation', 'Chromosomal inversion', 'Translocation'),
      correctOption: 'B',
      explanation: 'A point mutation involves the alteration of a single nucleotide base pair.',
      difficulty: 'medium',
    },
  ];
}

function humanPhysiologyQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'The primary site of nutrient absorption in the human digestive system is the:',
      options: opts('Stomach', 'Large intestine', 'Small intestine', 'Esophagus'),
      correctOption: 'C',
      explanation: 'The small intestine, with its villi and microvilli, is the main site of nutrient absorption.',
      difficulty: 'easy',
    },
    {
      questionText: 'Which chamber of the human heart pumps oxygenated blood to the rest of the body?',
      options: opts('Right atrium', 'Right ventricle', 'Left atrium', 'Left ventricle'),
      correctOption: 'D',
      explanation: 'The left ventricle pumps oxygenated blood into the aorta and out to systemic circulation.',
      difficulty: 'medium',
    },
    {
      questionText: 'Gas exchange in the lungs primarily occurs across the walls of the:',
      options: opts('Bronchi', 'Trachea', 'Alveoli', 'Larynx'),
      correctOption: 'C',
      explanation: 'Alveoli are thin-walled air sacs where oxygen and carbon dioxide diffuse between air and blood.',
      difficulty: 'easy',
    },
    {
      questionText: 'The functional unit of the kidney responsible for filtration is the:',
      options: opts('Neuron', 'Nephron', 'Alveolus', 'Hepatocyte'),
      correctOption: 'B',
      explanation: 'The nephron, containing the glomerulus and renal tubules, is the kidney\'s basic filtering unit.',
      difficulty: 'easy',
    },
  ];
}

function plantPhysiologyQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'Photosynthesis in plants primarily occurs in which organelle?',
      options: opts('Mitochondrion', 'Chloroplast', 'Nucleus', 'Vacuole'),
      correctOption: 'B',
      explanation: 'Chloroplasts contain chlorophyll and the machinery for the light and dark reactions of photosynthesis.',
      difficulty: 'easy',
    },
    {
      questionText: 'The movement of water in xylem from roots to leaves is best explained by the:',
      options: opts('Cohesion-tension theory', 'Pressure-flow hypothesis', 'Osmotic diffusion theory', 'Active pumping theory'),
      correctOption: 'A',
      explanation: 'The cohesion-tension theory explains xylem water transport via transpirational pull and water cohesion.',
      difficulty: 'medium',
    },
    {
      questionText: 'Stomata primarily regulate:',
      options: opts('Nutrient storage', 'Gas exchange and transpiration', 'Cell division', 'Seed dispersal'),
      correctOption: 'B',
      explanation: 'Stomata are pores that open and close to control gas exchange (CO2/O2) and water loss via transpiration.',
      difficulty: 'easy',
    },
    {
      questionText: 'The hormone primarily responsible for stem elongation and apical dominance in plants is:',
      options: opts('Auxin', 'Cytokinin', 'Ethylene', 'Abscisic acid'),
      correctOption: 'A',
      explanation: 'Auxin promotes cell elongation and maintains apical dominance by suppressing lateral bud growth.',
      difficulty: 'medium',
    },
  ];
}

function ecologyQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'The flow of energy through an ecosystem, from producers to consumers, is generally:',
      options: opts('Cyclic', 'Unidirectional', 'Bidirectional', 'Random'),
      correctOption: 'B',
      explanation: 'Energy flows unidirectionally through trophic levels, unlike nutrients, which cycle.',
      difficulty: 'medium',
    },
    {
      questionText: 'Which of the following best defines a population in ecological terms?',
      options: opts('All organisms in an area regardless of species', 'A group of interbreeding individuals of the same species in a given area', 'All species interacting within a habitat', 'A single organism and its offspring'),
      correctOption: 'B',
      explanation: 'A population is a group of interbreeding individuals of one species occupying a defined area.',
      difficulty: 'easy',
    },
    {
      questionText: 'The progressive series of changes in a community over time, from pioneer species to a climax community, is called:',
      options: opts('Ecological succession', 'Biomagnification', 'Species diversity', 'Symbiosis'),
      correctOption: 'A',
      explanation: 'Ecological succession describes the gradual, sequential replacement of species in a community over time.',
      difficulty: 'medium',
    },
    {
      questionText: 'Biomagnification refers to the:',
      options: opts('Increase in population size over generations', 'Increase in concentration of a toxin at higher trophic levels', 'Growth in size of individual organisms', 'Spread of a species to a new habitat'),
      correctOption: 'B',
      explanation: 'Biomagnification is the increasing concentration of persistent substances (like pesticides) at successive trophic levels.',
      difficulty: 'medium',
    },
  ];
}

function evolutionQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'Natural selection acts on:',
      options: opts('The genotype directly', 'Heritable phenotypic variation within a population', 'Only dominant traits', 'Individual organisms across their lifetime'),
      correctOption: 'B',
      explanation: 'Natural selection acts on heritable phenotypic variation, favoring traits that improve reproductive success.',
      difficulty: 'medium',
    },
    {
      questionText: 'Structures that are similar in different species due to shared ancestry, though they may serve different functions, are called:',
      options: opts('Analogous structures', 'Homologous structures', 'Vestigial structures', 'Convergent structures'),
      correctOption: 'B',
      explanation: 'Homologous structures share a common evolutionary origin, even if their current function differs.',
      difficulty: 'medium',
    },
    {
      questionText: 'The process by which two unrelated species independently evolve similar traits due to similar environmental pressures is:',
      options: opts('Divergent evolution', 'Convergent evolution', 'Coevolution', 'Adaptive radiation'),
      correctOption: 'B',
      explanation: 'Convergent evolution produces analogous structures in unrelated lineages facing similar selective pressures.',
      difficulty: 'medium',
    },
    {
      questionText: 'The Hardy-Weinberg principle describes conditions under which:',
      options: opts('Allele frequencies in a population remain constant across generations', 'Mutation rates increase', 'Species always speciate', 'Genetic drift is maximized'),
      correctOption: 'A',
      explanation: 'The Hardy-Weinberg principle describes a theoretical equilibrium where allele and genotype frequencies remain constant absent evolutionary influences.',
      difficulty: 'hard',
    },
  ];
}

function reproductionQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'In humans, fertilization normally occurs in the:',
      options: opts('Uterus', 'Ovary', 'Fallopian tube', 'Vagina'),
      correctOption: 'C',
      explanation: 'Fertilization typically occurs in the ampulla of the fallopian tube (oviduct).',
      difficulty: 'medium',
    },
    {
      questionText: 'The process of cell division that produces gametes with half the chromosome number is called:',
      options: opts('Mitosis', 'Meiosis', 'Binary fission', 'Budding'),
      correctOption: 'B',
      explanation: 'Meiosis reduces the chromosome number by half, producing haploid gametes from diploid cells.',
      difficulty: 'easy',
    },
    {
      questionText: 'The hormone responsible for maintaining the endometrial lining during early pregnancy is primarily:',
      options: opts('Estrogen only', 'Progesterone', 'FSH', 'Oxytocin'),
      correctOption: 'B',
      explanation: 'Progesterone, secreted by the corpus luteum and later the placenta, maintains the endometrium during pregnancy.',
      difficulty: 'medium',
    },
    {
      questionText: 'Double fertilization, a process unique to flowering plants, produces:',
      options: opts('Two embryos', 'A zygote and an endosperm', 'Two endosperms', 'A seed coat only'),
      correctOption: 'B',
      explanation: 'Double fertilization in angiosperms produces a diploid zygote and a triploid endosperm.',
      difficulty: 'hard',
    },
  ];
}

function biotechnologyQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'Restriction endonucleases are enzymes that:',
      options: opts('Join DNA fragments together', 'Cut DNA at specific recognition sequences', 'Synthesize new DNA strands', 'Unwind the DNA double helix'),
      correctOption: 'B',
      explanation: 'Restriction enzymes recognize specific DNA sequences and cleave the DNA at or near those sites.',
      difficulty: 'medium',
    },
    {
      questionText: 'PCR (Polymerase Chain Reaction) is primarily used to:',
      options: opts('Sequence an entire genome directly', 'Amplify a specific DNA segment', 'Translate mRNA into protein', 'Separate proteins by size'),
      correctOption: 'B',
      explanation: 'PCR amplifies a targeted DNA sequence exponentially using repeated cycles of denaturation, annealing, and extension.',
      difficulty: 'medium',
    },
    {
      questionText: 'A plasmid used to carry foreign DNA into a host cell is an example of a:',
      options: opts('Restriction enzyme', 'Vector', 'Probe', 'Primer'),
      correctOption: 'B',
      explanation: 'Plasmids commonly serve as vectors, carrying and replicating foreign DNA inserts within a host cell.',
      difficulty: 'medium',
    },
    {
      questionText: 'Gel electrophoresis separates DNA fragments based on:',
      options: opts('Their color', 'Their size and charge', 'Their temperature stability', 'Their taste'),
      correctOption: 'B',
      explanation: 'Gel electrophoresis separates charged DNA fragments by size as they migrate through a gel under an electric field.',
      difficulty: 'easy',
    },
  ];
}

function humanHealthQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'Antibiotics are effective against:',
      options: opts('Viruses', 'Bacteria', 'Prions', 'All pathogens equally'),
      correctOption: 'B',
      explanation: 'Antibiotics target bacterial structures/processes and are ineffective against viruses.',
      difficulty: 'easy',
    },
    {
      questionText: 'Vaccination works by stimulating the immune system to produce:',
      options: opts('Antigens', 'Memory cells and antibodies', 'Red blood cells', 'Digestive enzymes'),
      correctOption: 'B',
      explanation: 'Vaccines expose the immune system to antigens, prompting antibody production and immunological memory.',
      difficulty: 'medium',
    },
    {
      questionText: 'HIV primarily infects and destroys which type of immune cell?',
      options: opts('Red blood cells', 'Platelets', 'Helper T (CD4+) cells', 'Neurons'),
      correctOption: 'C',
      explanation: 'HIV targets CD4+ helper T cells, progressively weakening the immune response.',
      difficulty: 'medium',
    },
    {
      questionText: 'Which of the following is a common cause of type 2 diabetes?',
      options: opts('Complete absence of insulin production from birth', 'Insulin resistance in body tissues', 'A viral infection of the pancreas only', 'An autoimmune attack on beta cells exclusively'),
      correctOption: 'B',
      explanation: 'Type 2 diabetes typically involves insulin resistance, where tissues respond poorly to insulin despite its presence.',
      difficulty: 'medium',
    },
  ];
}

function biomoleculesQuestions(): SeedQuestion[] {
  return [
    {
      questionText: 'Proteins are polymers made up of monomer units called:',
      options: opts('Nucleotides', 'Amino acids', 'Monosaccharides', 'Fatty acids'),
      correctOption: 'B',
      explanation: 'Proteins are built from chains of amino acids linked by peptide bonds.',
      difficulty: 'easy',
    },
    {
      questionText: 'The primary structure of a protein refers to its:',
      options: opts('Overall 3D shape', 'Sequence of amino acids', 'Alpha-helix and beta-sheet content', 'Association of multiple subunits'),
      correctOption: 'B',
      explanation: 'Primary structure is the linear sequence of amino acids in the polypeptide chain.',
      difficulty: 'medium',
    },
    {
      questionText: 'Enzymes function primarily by:',
      options: opts('Being consumed in the reaction', 'Lowering the activation energy of a reaction', 'Increasing the free energy of products', 'Changing the equilibrium constant of a reaction'),
      correctOption: 'B',
      explanation: 'Enzymes act as catalysts, lowering activation energy without being consumed or altering the equilibrium.',
      difficulty: 'medium',
    },
    {
      questionText: 'DNA differs from RNA in that DNA contains:',
      options: opts('Uracil instead of thymine', 'Deoxyribose sugar and thymine', 'Ribose sugar only', 'No nitrogenous bases'),
      correctOption: 'B',
      explanation: 'DNA contains deoxyribose sugar and thymine, whereas RNA contains ribose and uracil in place of thymine.',
      difficulty: 'easy',
    },
  ];
}

// NEET scores Biology as two separate 45-question sections (Botany + Zoology),
// not one combined subject. The topic split below follows the common
// NEET-coaching convention — plant/cell/biochemistry-leaning topics under
// Botany, animal/human-leaning topics under Zoology. A few of these (e.g.
// Genetics, Reproduction) legitimately span both in the real syllabus; this
// is a reasonable default for practice-data purposes, not an official ruling.
function botanySubject(): SeedSubject {
  return {
    name: 'Botany',
    code: 'BOT',
    topics: [
      { name: 'Cell Biology', questions: cellBiologyQuestions() },
      { name: 'Plant Physiology', questions: plantPhysiologyQuestions() },
      { name: 'Ecology', questions: ecologyQuestions() },
      { name: 'Biotechnology', questions: biotechnologyQuestions() },
      { name: 'Biomolecules', questions: biomoleculesQuestions() },
    ],
  };
}

function zoologySubject(): SeedSubject {
  return {
    name: 'Zoology',
    code: 'ZOO',
    topics: [
      { name: 'Genetics', questions: geneticsQuestions() },
      { name: 'Human Physiology', questions: humanPhysiologyQuestions() },
      { name: 'Evolution', questions: evolutionQuestions() },
      { name: 'Reproduction', questions: reproductionQuestions() },
      { name: 'Human Health and Disease', questions: humanHealthQuestions() },
    ],
  };
}

// --- Seeding logic -----------------------------------------------------

async function upsertSubject(name: string, code: string): Promise<string> {
  const { rows } = await pgPool.query(
    `INSERT INTO subjects (name, code) VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code
     RETURNING id`,
    [name, code]
  );
  return rows[0].id;
}

async function upsertTopic(subjectId: string, name: string): Promise<string> {
  const { rows } = await pgPool.query(
    `SELECT id FROM topic_hierarchy WHERE subject_id = $1 AND name = $2 AND parent_id IS NULL`,
    [subjectId, name]
  );
  if (rows.length > 0) return rows[0].id;

  const inserted = await pgPool.query(
    `INSERT INTO topic_hierarchy (subject_id, name, level) VALUES ($1, $2, 0) RETURNING id`,
    [subjectId, name]
  );
  return inserted.rows[0].id;
}

async function getOrCreateSeedExam(): Promise<string> {
  const { rows } = await pgPool.query(`SELECT id FROM exams WHERE name = 'NEET/KCET Practice Set 1'`);
  if (rows.length > 0) return rows[0].id;

  const inserted = await pgPool.query(
    `INSERT INTO exams (name, exam_type, description, total_questions, duration_minutes)
     VALUES ('NEET/KCET Practice Set 1', 'NEET', 'Original practice questions covering the core Physics, Chemistry, Botany, and Zoology syllabus.', 0, 180)
     RETURNING id`
  );
  return inserted.rows[0].id;
}

async function main() {
  const examId = await getOrCreateSeedExam();
  const subjects = [physicsSubject(), chemistrySubject(), botanySubject(), zoologySubject()];

  let totalInserted = 0;

  for (const subject of subjects) {
    const subjectId = await upsertSubject(subject.name, subject.code);
    console.log(`Subject: ${subject.name} (${subjectId})`);

    for (const topic of subject.topics) {
      const topicId = await upsertTopic(subjectId, topic.name);

      for (const q of topic.questions) {
        const { rows } = await pgPool.query(
          `INSERT INTO questions (exam_id, subject_id, topic_id, question_text, options, correct_option, explanation, difficulty)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [examId, subjectId, topicId, q.questionText, JSON.stringify(q.options), q.correctOption, q.explanation, q.difficulty]
        );
        const questionId = rows[0].id;
        await embedAndIndexQuestion(questionId, q.questionText);
        totalInserted += 1;
      }

      console.log(`  Topic: ${topic.name} — ${topic.questions.length} questions`);
    }
  }

  await pgPool.query(`UPDATE exams SET total_questions = $1 WHERE id = $2`, [totalInserted, examId]);

  console.log(`\nSeed complete: ${totalInserted} questions inserted and embedded across ${subjects.length} subjects.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pgPool.end());
