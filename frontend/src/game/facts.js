// A shared pool of general body/health trivia — deliberately NOT scoped to
// any one world's body system, so a level about the skeleton can just as
// easily surface a fact about the nervous system. Every bonus-room lore
// card and the level's own highest-platform card draw from this same list
// (see GameCanvas.jsx's pickFieldNoteFacts) rather than a per-world set, and
// every fact collected gets logged permanently to the player's Field Notes
// journal (see storage.js's addFieldNote / FieldNotes.jsx).
export const GENERAL_FACTS = [
  "Anatomical position — standing, facing forward, palms out — is the fixed reference point every 'anterior/posterior/medial' direction is described from.",
  "Doctors and EMTs use the same anterior/posterior/medial/lateral vocabulary worldwide specifically so a description of an injury can't be misread across languages.",
  'Skin is the largest organ in the body — an average adult carries about 8 pounds and 22 square feet of it.',
  'The epidermis fully replaces itself roughly every 27 days; most household dust is actually shed skin cells.',
  'Babies are born with about 300 bones; many fuse together as they grow, leaving adults with 206.',
  'The femur is the longest AND strongest bone in the body — it can withstand more pressure per square inch than concrete.',
  'The heart is the one muscle you can never voluntarily stop flexing — cardiac muscle contracts on its own, roughly 100,000 times a day.',
  'The strongest muscle for its size is the masseter, in your jaw — it can close your teeth with over 150 lbs of force.',
  'A single neuron can fire signals up to 268 miles per hour, and the nervous system carries millions of them at once.',
  'The longest axon in your body runs from the base of your spine to your big toe — over 3 feet in a tall adult.',
  "Laid end to end, an adult's blood vessels — arteries, veins, and capillaries — would stretch about 60,000 miles, roughly 2.5 times around the Earth.",
  'The heart pumps around 2,000 gallons of blood a day without you ever thinking about it.',
  'The small intestine is roughly 22 feet long — about four times your own height — coiled into a space the size of a dinner plate.',
  'Stomach acid is strong enough to dissolve metal; a mucus lining is the only thing keeping it from digesting the stomach itself.',
  'Adults breathe about 20,000 times a day, moving roughly 2,000 gallons of air in and out of the lungs.',
  'Sneezes can travel over 100 miles per hour — one reason covering a sneeze actually matters.',
  'The human body contains trillions of bacteria, most of them helpful — you have roughly as many microbial cells as human ones.',
  'A fever is the immune system deliberately raising body temperature, since many pathogens reproduce more slowly in the heat.',
  'The eye can distinguish about 10 million different colors, but it only has three types of color-sensing cone cells to do it.',
  'Tears that come from cutting an onion are chemically different from emotional tears — different glands, different composition.',
  "Kidneys filter your entire blood supply about 40 times a day, roughly 50 gallons, keeping only what the body still needs.",
  'The liver can regenerate — even after losing up to two-thirds of its tissue, it can regrow to nearly full size in a matter of weeks.',
  'Adults lose and regrow roughly 1% of their red blood cells every day — about 2 million new ones every second.',
  'A full night of sleep lets the brain clear out metabolic waste through a drainage system that only runs efficiently while asleep.',
  'The human body is about 60% water by weight, and the brain alone is roughly 75% water.',
  'Fingernails grow about four times faster than toenails, and grow fastest on your dominant hand.',
];
