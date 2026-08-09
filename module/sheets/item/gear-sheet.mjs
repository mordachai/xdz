import XDZItemSheet from './base-item-sheet.mjs';

export default class GearSheet extends XDZItemSheet {
  static DEFAULT_OPTIONS = {
    classes: ['xdz', 'sheet', 'item', 'gear'],
    position: { width: 420, height: 420 },
  };

  static PARTS = {
    sheet: { template: 'systems/xdz/templates/item/gear-sheet.hbs' },
  };
}
