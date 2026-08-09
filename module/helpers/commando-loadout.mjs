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
      upgradeDie: '1d6',
      ammoLabel: '',
      rules: '<p>Destroy D4 targets</p><p>Use ammo to destroy D6</p>',
      ammo: { value: 3, max: 3 },
      secondary: { label: 'Grenade', value: 4, max: 4 },
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
      upgradeDie: '1d4',
      ammoLabel: 'Fuel',
      rules: '<p>Ignite D4 targets</p><p>Repel D4 targets</p><p>Volatile</p>',
      ammo: { value: 3, max: 3 },
      secondary: { label: '', value: 0, max: 0 },
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
      upgradeDie: '1d12',
      ammoLabel: '',
      rules: '<p>Destroy D8 targets</p><p>Use ammo to destroy D12</p><p>Expend 1 Gyro to move Far</p>',
      ammo: { value: 3, max: 3 },
      secondary: { label: 'Gyro', value: 3, max: 3 },
      damaged: { value: 0, max: 4 },
    },
  },
];
