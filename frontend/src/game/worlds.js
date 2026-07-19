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
    palette: { sky: '#5fa8e8', hills: '#3aa65a', ground: '#8b5a2b', platform: '#8b5a2b', accent: '#ffd23f' },
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
    palette: { sky: '#ffc2d1', hills: '#e8899c', ground: '#c97b8a', platform: '#c97b8a', accent: '#ff2f76' },
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
    palette: { sky: '#cfd6e4', hills: '#9aa3b5', ground: '#8f8975', platform: '#8f8975', accent: '#5a4a8f' },
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
    palette: { sky: '#ff9e80', hills: '#e2694a', ground: '#a8402c', platform: '#a8402c', accent: '#ffffff' },
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
    palette: { sky: '#c9b8ff', hills: '#a190e8', ground: '#6a5acd', platform: '#6a5acd', accent: '#00b8d9' },
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
    palette: { sky: '#e8536b', hills: '#b8324a', ground: '#5c1e2a', platform: '#5c1e2a', accent: '#ffd23f' },
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
    // Final world — this is where the Phase 5 boss battle (dragon, HP bar
    // near the flag) will live, per the "boss fight moves to World 7"
    // decision. The regular patrol enemies stay lab-cat themed either way.
    palette: { sky: '#b8f2d8', hills: '#7fdba0', ground: '#3d8c5f', platform: '#3d8c5f', accent: '#1f6b45' },
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

// Teacher Mode's builder offers these as pick-a-theme presets for brand-new
// custom worlds (built-in edits keep the built-in's own theme/enemy).
export const ENEMY_TYPE_OPTIONS = [
  { type: 'goomba', label: 'Goomba-style blob' },
  { type: 'skinBlob', label: 'Skin-disease blob' },
  { type: 'skeleton', label: 'Skeleton' },
  { type: 'muscleBrawler', label: 'Muscle-brawler' },
  { type: 'neuron', label: 'Neuron' },
  { type: 'clot', label: 'Blood clot' },
  { type: 'labCat', label: 'Lab cat' },
];

export const PALETTE_PRESETS = WORLDS.map((w) => ({ key: w.id, label: w.name, palette: w.palette }));
