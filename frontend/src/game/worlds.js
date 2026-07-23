import { loadCustomWorldData, loadJoinedWorlds } from '../storage';

// 7 built-in world "shells": theme, enemy type, and a small sample vocab set
// per world. Teacher Mode (Phase 6) lets teachers replace/extend any world's
// vocab — these are just enough sample terms for a working demo, not full
// medical term sets.
export const WORLDS = [
  {
    id: 'world-1',
    index: 1,
    name: 'Orientation Oasis',
    subtitle: 'Anatomical & Regional Terms',
    enemyType: 'goomba',
    defaultDurationMinutes: 3,
    palette: { sky: '#68b5f8', hills: '#3ccc67', ground: '#bb7029', platform: '#bb7029', accent: '#ffd85a' },
    funFacts: [
      "Anatomical position — standing, facing forward, palms out — is the fixed reference point every 'anterior/posterior/medial' direction is described from.",
      "Doctors and EMTs use the same anterior/posterior/medial/lateral vocabulary worldwide specifically so a description of an injury can't be misread across languages.",
    ],
    vocab: [
      { id: 'anterior', term: 'Anterior', definition: 'Toward the front of the body.' },
      { id: 'posterior', term: 'Posterior', definition: 'Toward the back of the body.' },
      { id: 'superior', term: 'Superior', definition: 'Toward the head; above.' },
      { id: 'inferior', term: 'Inferior', definition: 'Away from the head; below.' },
      { id: 'medial', term: 'Medial', definition: 'Toward the midline of the body.' },
      { id: 'lateral', term: 'Lateral', definition: 'Away from the midline of the body.' },
      { id: 'proximal', term: 'Proximal', definition: 'Closer to the point of attachment on a limb.' },
      { id: 'distal', term: 'Distal', definition: 'Farther from the point of attachment on a limb.' },
      { id: 'superficial', term: 'Superficial', definition: 'Closer to the surface of the body.' },
      { id: 'deep', term: 'Deep', definition: 'Farther from the surface of the body.' },
    ],
  },
  {
    id: 'world-2',
    index: 2,
    name: 'Integumentary Kingdom',
    subtitle: 'Integumentary System',
    enemyType: 'skinBlob',
    defaultDurationMinutes: 3,
    palette: { sky: '#ffcbd7', hills: '#f491a4', ground: '#d88696', platform: '#d88696', accent: '#ff4c89' },
    funFacts: [
      'Skin is the largest organ in the body — an average adult carries about 8 pounds and 22 square feet of it.',
      'The epidermis fully replaces itself roughly every 27 days; most household dust is actually shed skin cells.',
    ],
    vocab: [
      { id: 'epidermis', term: 'Epidermis', definition: 'The outer, protective layer of the skin.' },
      { id: 'dermis', term: 'Dermis', definition: 'The layer of skin beneath the epidermis containing vessels and nerves.' },
      { id: 'hypodermis', term: 'Hypodermis', definition: 'The fatty layer beneath the dermis; also called subcutaneous tissue.' },
      { id: 'melanin', term: 'Melanin', definition: 'The pigment that gives skin, hair, and eyes their color.' },
      { id: 'keratin', term: 'Keratin', definition: 'A tough protein found in skin, hair, and nails.' },
      { id: 'sebaceous', term: 'Sebaceous Gland', definition: 'A gland that secretes oil to lubricate skin and hair.' },
      { id: 'sudoriferous', term: 'Sudoriferous Gland', definition: 'A gland that produces sweat.' },
      { id: 'follicle', term: 'Hair Follicle', definition: 'The structure in skin from which hair grows.' },
    ],
  },
  {
    id: 'world-3',
    index: 3,
    name: 'Skeletal Caverns',
    subtitle: 'Skeletal System',
    enemyType: 'skeleton',
    defaultDurationMinutes: 3,
    palette: { sky: '#d4dbea', hills: '#a6afc2', ground: '#a19b86', platform: '#a19b86', accent: '#6750b2' },
    funFacts: [
      'Babies are born with about 300 bones; many fuse together as they grow, leaving adults with 206.',
      'The femur is the longest AND strongest bone in the body — it can withstand more pressure per square inch than concrete.',
    ],
    vocab: [
      { id: 'cranium', term: 'Cranium', definition: 'The part of the skull that encloses the brain.' },
      { id: 'vertebra', term: 'Vertebra', definition: 'One of the bones that make up the spinal column.' },
      { id: 'femur', term: 'Femur', definition: 'The thigh bone; the longest bone in the body.' },
      { id: 'humerus', term: 'Humerus', definition: 'The long bone of the upper arm.' },
      { id: 'pelvis', term: 'Pelvis', definition: 'The basin-shaped ring of bones at the base of the spine.' },
      { id: 'sternum', term: 'Sternum', definition: 'The flat bone in the center of the chest; the breastbone.' },
      { id: 'joint', term: 'Joint', definition: 'A point where two or more bones meet.' },
      { id: 'cartilage', term: 'Cartilage', definition: 'Flexible connective tissue that cushions joints.' },
    ],
  },
  {
    id: 'world-4',
    index: 4,
    name: 'Muscular Mountains',
    subtitle: 'Muscular System',
    enemyType: 'muscleBrawler',
    defaultDurationMinutes: 3,
    palette: { sky: '#ffac92', hills: '#f47555', ground: '#d94224', platform: '#d94224', accent: '#ffffff' },
    funFacts: [
      'The heart is the one muscle you can never voluntarily stop flexing — cardiac muscle contracts on its own, roughly 100,000 times a day.',
      'The strongest muscle for its size is the masseter, in your jaw — it can close your teeth with over 150 lbs of force.',
    ],
    vocab: [
      { id: 'tendon', term: 'Tendon', definition: 'Connective tissue that attaches muscle to bone.' },
      { id: 'ligament', term: 'Ligament', definition: 'Connective tissue that attaches bone to bone.' },
      { id: 'cardiac-muscle', term: 'Cardiac Muscle', definition: 'Involuntary striated muscle found only in the heart.' },
      { id: 'smooth-muscle', term: 'Smooth Muscle', definition: 'Involuntary muscle found in organs like the stomach and blood vessels.' },
      { id: 'skeletal-muscle', term: 'Skeletal Muscle', definition: 'Voluntary striated muscle attached to bone.' },
      { id: 'contraction', term: 'Contraction', definition: 'The shortening of a muscle to produce movement or force.' },
      { id: 'flexor', term: 'Flexor', definition: 'A muscle that bends a joint.' },
      { id: 'extensor', term: 'Extensor', definition: 'A muscle that straightens a joint.' },
    ],
  },
  {
    id: 'world-5',
    index: 5,
    name: 'Nervous Nexus',
    subtitle: 'Nervous System',
    enemyType: 'neuron',
    defaultDurationMinutes: 3,
    palette: { sky: '#d1c2ff', hills: '#a997f4', ground: '#7766df', platform: '#7766df', accent: '#03d9ff' },
    funFacts: [
      'A single neuron can fire signals up to 268 miles per hour, and the nervous system carries millions of them at once.',
      'The longest axon in your body runs from the base of your spine to your big toe — over 3 feet in a tall adult.',
    ],
    vocab: [
      { id: 'neuron', term: 'Neuron', definition: 'A nerve cell that transmits electrical and chemical signals.' },
      { id: 'synapse', term: 'Synapse', definition: 'The junction where a signal passes from one neuron to another.' },
      { id: 'axon', term: 'Axon', definition: 'The long fiber of a neuron that carries signals away from the cell body.' },
      { id: 'dendrite', term: 'Dendrite', definition: 'A branched extension of a neuron that receives signals.' },
      { id: 'myelin', term: 'Myelin Sheath', definition: 'The fatty covering that insulates axons and speeds signal transmission.' },
      { id: 'cerebrum', term: 'Cerebrum', definition: 'The largest part of the brain, responsible for thought and voluntary action.' },
      { id: 'cerebellum', term: 'Cerebellum', definition: 'The part of the brain that coordinates balance and movement.' },
      { id: 'reflex', term: 'Reflex Arc', definition: 'A neural pathway that produces a rapid, involuntary response.' },
    ],
  },
  {
    id: 'world-6',
    index: 6,
    name: 'Cardiovascular Castle',
    subtitle: 'Cardiovascular System',
    enemyType: 'clot',
    defaultDurationMinutes: 3,
    palette: { sky: '#f95d76', hills: '#db3553', ground: '#8f2237', platform: '#8f2237', accent: '#ffd85a' },
    funFacts: [
      "Laid end to end, an adult's blood vessels — arteries, veins, and capillaries — would stretch about 60,000 miles, roughly 2.5 times around the Earth.",
      'The heart pumps around 2,000 gallons of blood a day without you ever thinking about it.',
    ],
    vocab: [
      { id: 'aorta', term: 'Aorta', definition: 'The largest artery, carrying oxygen-rich blood away from the heart.' },
      { id: 'atrium', term: 'Atrium', definition: 'An upper chamber of the heart that receives incoming blood.' },
      { id: 'ventricle', term: 'Ventricle', definition: 'A lower chamber of the heart that pumps blood out.' },
      { id: 'systole', term: 'Systole', definition: 'The phase of the heartbeat when the heart muscle contracts.' },
      { id: 'diastole', term: 'Diastole', definition: 'The phase of the heartbeat when the heart muscle relaxes and refills.' },
      { id: 'artery', term: 'Artery', definition: 'A blood vessel that carries blood away from the heart.' },
      { id: 'vein', term: 'Vein', definition: 'A blood vessel that carries blood back to the heart.' },
      { id: 'capillary', term: 'Capillary', definition: 'A tiny blood vessel where oxygen and nutrients exchange with tissue.' },
    ],
  },
  {
    id: 'world-7',
    index: 7,
    name: 'Feline Frontier',
    subtitle: 'Cat Dissection',
    enemyType: 'labCat',
    defaultDurationMinutes: 3,
    palette: { sky: '#bcf9de', hills: '#88e9ab', ground: '#40b572', platform: '#40b572', accent: '#1f9f5f' },
    funFacts: [
      "A cat's whiskers are roughly as wide as its body — they use them to judge whether a gap is safe to fit through.",
      'Cat dissection is still used in some A&P courses because feline anatomy closely mirrors human anatomy in organ placement and structure.',
    ],
    vocab: [
      { id: 'whiskers', term: 'Vibrissae', definition: "The technical term for a cat's whiskers, used for sensing surroundings." },
      { id: 'claw', term: 'Retractable Claw', definition: 'A claw that can be pulled back into a protective sheath.' },
      { id: 'dewclaw', term: 'Dewclaw', definition: "A vestigial digit set higher on a cat's leg than the other toes." },
      { id: 'trachea', term: 'Trachea', definition: 'The windpipe; carries air to the lungs.' },
      { id: 'diaphragm', term: 'Diaphragm', definition: 'The muscle that separates the chest and abdominal cavities and drives breathing.' },
      { id: 'peritoneum', term: 'Peritoneum', definition: 'The membrane lining the abdominal cavity.' },
      { id: 'renal', term: 'Renal Artery', definition: 'The blood vessel that supplies the kidney.' },
      { id: 'spinal-cord', term: 'Spinal Cord', definition: 'The bundle of nerves running through the vertebral column.' },
    ],
  },
];

// Merges the 7 built-ins (with any Teacher Mode override applied) with
// locally-created custom worlds — this is the *teacher's* authoring list
// only. `getWorld`/the teacher menu both read through this rather than the
// static `WORLDS` array directly, so custom worlds are playable via the
// exact same world-select -> character-select -> GameCanvas flow. Classroom
// worlds a student has joined by code are deliberately NOT included here —
// those live entirely in StudentHome.jsx via loadJoinedWorlds() directly, so
// a teacher's own authoring list never mixes with anyone's play library.
export function getAllWorlds() {
  const { overrides, custom } = loadCustomWorldData();

  const builtIns = WORLDS.map((world) => {
    const override = overrides[world.id];
    if (!override) return world;
    return {
      ...world,
      name: override.name ?? world.name,
      subtitle: override.subtitle ?? world.subtitle,
      defaultDurationMinutes: override.defaultDurationMinutes ?? world.defaultDurationMinutes,
      questionStyle: override.questionStyle ?? world.questionStyle,
      vocab: override.vocab ?? world.vocab,
      updatedAt: override.updatedAt,
      customized: true,
      custom: true,
    };
  });

  const customWorlds = custom.map((world, i) => ({
    ...world,
    index: WORLDS.length + 1 + i,
    isCustom: true,
    custom: true,
  }));

  return [...builtIns, ...customWorlds];
}

// Teacher's world list, grouped and ordered the way Quizlet groups "my
// decks" above "templates": anything the teacher has actually touched
// (edited a built-in, or created from scratch) first — newest edit first —
// then the untouched built-in templates in their original World 1-7 order.
export function getGroupedWorlds() {
  const all = getAllWorlds();
  const myDecks = all.filter((w) => w.custom).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  const templates = all.filter((w) => !w.custom);
  return { myDecks, templates };
}

export function getWorld(id) {
  const found = getAllWorlds().find((w) => w.id === id);
  if (found) return found;
  // Not in the teacher's own authoring list — check classroom worlds this
  // device has joined by code (the student path never touches getAllWorlds).
  const joined = loadJoinedWorlds().find((w) => w.id === id);
  return joined ?? WORLDS[0];
}

export const DURATION_SECONDS = { 2: 120, 3: 180, 5: 300 };
export const WIDTH_BY_DURATION = { 2: 4800, 3: 7400, 5: 12000 };

export const PALETTE_PRESETS = WORLDS.map((w) => ({ key: w.id, label: w.name, palette: w.palette }));
