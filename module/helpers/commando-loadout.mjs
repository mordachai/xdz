/**
 * The Commando's fixed 3-weapon loadout, baked to match the printed sheet
 * exactly (art, dice, and pip tracks). Commandos don't add/remove weapons —
 * these three are always present.
 */
export const COMMANDO_LOADOUT = [
  {
    name: 'Pulse Rifle',
    type: 'weapon',
    img: 'systems/xdz/assets/ui/Pulse.webp',
    system: {
      equipped: false,
      discardOthersOnEquip: false,
      destroyDie: '1d4',
      description: '',
      upgradeDie: '1d6',
      ammoLabel: '',
      ammoDescription: 'Spend 1 ammo to upgrade the destroy die.',
      rules: '<p>Standard issue rifle.</p>',
      ammo: { value: 3, max: 3 },
      secondary: { label: 'Grenade', die: '1d6', description: 'Throw a grenade, destroying targets in the blast.', value: 4, max: 4 },
      damaged: { value: 0, max: 6 },
    },
  },
  {
    name: 'Flame Unit',
    type: 'weapon',
    img: 'systems/xdz/assets/ui/Flamer.webp',
    system: {
      equipped: false,
      discardOthersOnEquip: false,
      destroyDie: '1d4',
      description: 'Ignite targets.',
      upgradeDie: '1d4',
      ammoLabel: 'Fuel',
      ammoDescription: 'Spend 1 fuel to repel targets, pushing them back.',
      rules: '<p>Volatile — explodes if destroyed.</p>',
      ammo: { value: 3, max: 3 },
      secondary: { label: '', die: '', description: '', value: 0, max: 0 },
      damaged: { value: 0, max: 3 },
    },
  },
  {
    name: 'Heavy Gun',
    type: 'weapon',
    img: 'systems/xdz/assets/ui/Heavy.webp',
    system: {
      equipped: false,
      discardOthersOnEquip: true,
      destroyDie: '1d8',
      description: '',
      upgradeDie: '1d12',
      ammoLabel: '',
      ammoDescription: 'Spend 1 ammo to upgrade the destroy die.',
      rules: '<p>Heavy support weapon.</p>',
      ammo: { value: 3, max: 3 },
      secondary: { label: 'Gyro', die: '', description: 'Expend 1 gyro charge to move Far.', value: 3, max: 3 },
      damaged: { value: 0, max: 4 },
    },
  },
  {
    name: 'T11 Sidearm',
    type: 'weapon',
    img: 'systems/xdz/assets/ui/Sidearm.webp',
    system: {
      equipped: false,
      discardOthersOnEquip: false,
      destroyDie: '1d4',
      description: 'Standard-issue Commando sidearm. Compact, reliable, 20-round mag.',
      upgradeDie: '1d4',
      ammoLabel: 'Rounds',
      ammoDescription: '',
      rules: '<p>Backup weapon — always on hand even when a primary is destroyed.</p>',
      ammo: { value: 3, max: 3 },
      secondary: { label: '', die: '', description: '', value: 0, max: 0 },
      damaged: { value: 0, max: 6 },
    },
  },
];
