import XDZItemSheet from './base-item-sheet.mjs';

export default class WeaponSheet extends XDZItemSheet {
  static DEFAULT_OPTIONS = {
    classes: ['xdz', 'sheet', 'item', 'weapon'],
    position: { width: 480, height: 520 },
  };

  static PARTS = {
    sheet: { template: 'systems/xdz/templates/item/weapon-sheet.hbs' },
  };
}
