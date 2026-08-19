import XDZItemSheet from './base-item-sheet.mjs';

export default class WeaponSheet extends XDZItemSheet {
  static DEFAULT_OPTIONS = {
    classes: ['xdz', 'sheet', 'item', 'weapon'],
    position: { width: 480, height: 520 },
  };

  static PARTS = {
    sheet: { template: 'systems/xdz/templates/item/weapon-sheet.hbs' },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.item.system;
    const killModeOptions = (value) =>
      Object.entries(CONFIG.XDZ.weaponKillModes).map(([key, label]) => ({
        key,
        label: game.i18n.localize(label),
        selected: key === value,
      }));
    context.killModeOptions = killModeOptions(system.killMode);
    context.ammoKillModeOptions = killModeOptions(system.ammo.killMode);
    context.secondaryKillModeOptions = killModeOptions(system.secondary.killMode);
    return context;
  }
}
