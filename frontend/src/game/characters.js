export const CHARACTERS = [
  {
    id: 'doc',
    name: 'Marrow of the Bone',
    ability: 'coinCombo',
    abilityName: 'Coin Combo',
    abilityDescription: 'Every 5th coin collected is worth 2x points.',
    colors: {
      cap: '#c0392b',
      brim: '#8e2a1f',
      skin: '#f0c090',
      mustache: '#3a2a1a',
      body: '#2255cc',
      bodyDark: '#173c8f',
      shoe: '#3a2a1a',
    },
  },
  {
    id: 'vee',
    name: 'Liggy of the Ligament',
    ability: 'superJump',
    abilityName: 'Super Jump',
    abilityDescription: 'Jumps 20% higher than the others.',
    colors: {
      cap: '#27ae60',
      brim: '#1e8449',
      skin: '#f0c090',
      body: '#2255cc',
      bodyDark: '#173c8f',
      shoe: '#3a2a1a',
    },
  },
  {
    id: 'bloom',
    name: 'Princess Plasma of the Blood',
    ability: 'glide',
    abilityName: 'Glide',
    abilityDescription: 'Hold jump in mid-air to float down slowly.',
    colors: {
      crown: '#ffd23f',
      skin: '#f0c090',
      hair: '#7a4a2a',
      body: '#e75480',
      bodyDark: '#c23d68',
      shoe: '#7a4a2a',
    },
  },
  {
    id: 'rex',
    name: 'Bowtox of the Toxins',
    ability: 'groundPound',
    abilityName: 'Ground Pound',
    abilityDescription: 'Press Down in mid-air to slam and wipe out nearby enemies.',
    colors: {
      hair: '#c0392b',
      horn: '#ececec',
      skin: '#dba86a',
      body: '#2ecc71',
      bodyDark: '#22a35a',
      shoe: '#3a2a1a',
    },
  },
];

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
