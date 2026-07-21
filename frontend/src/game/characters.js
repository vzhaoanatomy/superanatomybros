export const CHARACTERS = [
  {
    id: 'doc',
    name: 'Dr. Marrow',
    ability: 'coinCombo',
    abilityName: 'Coin Combo',
    abilityDescription: 'Every 5th coin collected is worth 2x points.',
    colors: {
      cap: '#fbfbf8',
      brim: '#e0ddd4',
      skin: '#f0c090',
      mustache: '#3a2a1a',
      // Red shirt, blue pants under the white coat.
      shirt: '#c0392b',
      shirtDark: '#8e2a1f',
      pants: '#2255cc',
      pantsDark: '#173c8f',
      shoe: '#3a2a1a',
    },
  },
  {
    id: 'vee',
    name: 'Nurse Liggy',
    ability: 'superJump',
    abilityName: 'Super Jump',
    abilityDescription: 'Jumps 20% higher than the others.',
    colors: {
      cap: '#fbfbf8',
      brim: '#e0ddd4',
      skin: '#f0c090',
      // Green shirt, blue pants.
      shirt: '#27ae60',
      shirtDark: '#1e8449',
      pants: '#2255cc',
      pantsDark: '#173c8f',
      shoe: '#3a2a1a',
    },
  },
  {
    id: 'bloom',
    name: 'Chief Madam Plasma',
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
    name: 'Dr. Bowtox',
    ability: 'groundPound',
    abilityName: 'Ground Pound',
    abilityDescription: 'Press Down in mid-air to slam and wipe out nearby enemies.',
    colors: {
      // Half man, half turtle — a green shell on his back, a
      // yellow-green shirt, keeping the wild grey hair and evil-scientist
      // glasses (see drawRex) which already landed well.
      hair: '#a8a8ac',
      horn: '#ececec',
      skin: '#c9a877',
      shirt: '#a8c93f',
      shirtDark: '#7a9c2e',
      pants: '#4a3a2a',
      pantsDark: '#332a1e',
      shell: '#4c8a3f',
      shellDark: '#356024',
      shoe: '#1a1a1a',
    },
  },
];

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
