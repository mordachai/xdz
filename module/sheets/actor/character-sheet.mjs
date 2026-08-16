import XDZActorSheet from './base-actor-sheet.mjs';

/**
 * The Character (player character) sheet — duplicate of the Commando sheet,
 * but weapons are freely added/removed instead of a fixed baked loadout.
 */
export default class CharacterSheet extends XDZActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['xdz', 'sheet', 'actor', 'character'],
    position: { width: 340, height: 'auto' },
    actions: {
      setPip: this._onSetPip,
      weaponRoll: this._onWeaponRoll,
      weaponSecondary: this._onWeaponSecondary,
      toggleEquip: this._onToggleEquip,
      loadoutPrev: this._onLoadoutPrev,
      loadoutNext: this._onLoadoutNext,
      themePrev: this._onThemePrev,
      themeNext: this._onThemeNext,
    },
  };

  static PARTS = {
    sheet: { template: 'systems/xdz/templates/actor/character-sheet.hbs', scrollable: [''] },
  };

  /** Available compact-sheet color themes, in cycling order. */
  static THEMES = ['green', 'blue', 'orange', 'white'];

  /** Index of the visible weapon-card page in the loadout pager. @private */
  _loadoutPage = 0;

  /** Weapon cards shown per loadout page. @private */
  _loadoutPageSize = 2;

  /** Total loadout pages for a given weapon count (always >= 1). @private */
  _loadoutPages(weaponCount) {
    return Math.max(1, Math.ceil(weaponCount / this._loadoutPageSize));
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;

    context.weapons = this.actor.items.filter((i) => i.type === 'weapon').map((item) => this._prepareWeapon(item));
    context.gear = this.actor.items.filter((i) => i.type === 'gear');

    const totalPages = this._loadoutPages(context.weapons.length);
    this._loadoutPage = this._loadoutPage % totalPages;
    context.loadoutWeapons = context.weapons.slice(this._loadoutPage * this._loadoutPageSize, this._loadoutPage * this._loadoutPageSize + this._loadoutPageSize);
    context.loadoutMultiPage = totalPages > 1;

    context.theme = this.actor.getFlag('xdz', 'sheetTheme') ?? CharacterSheet.THEMES[0];

    context.injuryPips = Array.fromRange(CONFIG.XDZ.injuryDeath).map((i) => ({
      index: i,
      filled: i < system.injuries.value,
    }));

    // Full-width ECG strip swaps wholesale per injury level (1 = healthy, 6 = flatline).
    context.injuryLevel = Math.max(1, Math.min(system.injuries.value, CONFIG.XDZ.injuryDeath));

    // Sweep speeds up as injuries pile on — 6s healthy down to 1.0s near death.
    const injuryRatio = Math.min(system.injuries.value / CONFIG.XDZ.injuryDeath, 1);
    context.ecgSpeed = `${(6.0 - injuryRatio * 1.0).toFixed(2)}s`;

    context.trainingRows = Object.entries(CONFIG.XDZ.trainings).map(([key, label], i) => ({
      key,
      label,
      path: `training.${key}`,
      rollAction: 'rollTraining',
      value: system.training[key],
      reverse: i % 2 === 1,
      pips: this._buildPips(system.training[key], CONFIG.XDZ.statPipMax),
    }));

    context.resistanceRows = Object.entries(CONFIG.XDZ.resistances).map(([key, label], i) => ({
      key,
      label,
      path: `resistances.${key}`,
      rollAction: 'rollResistance',
      value: system.resistances[key],
      reverse: i % 2 === 1,
      stacked: true,
      pips: this._buildPips(system.resistances[key], CONFIG.XDZ.statPipMax),
    }));

    return context;
  }

  /** Build a filled/empty pip row of `max` length for a stat display. @private */
  _buildPips(value, max) {
    return Array.fromRange(max).map((i) => ({ filled: i < value }));
  }

  /** Attach derived display data to a weapon item for the sheet. @private */
  _prepareWeapon(item) {
    return {
      item,
      system: item.system,
      removable: true,
      ammoPips: this._buildPips(item.system.ammo.value, item.system.ammo.max),
      secondaryPips: this._buildPips(item.system.secondary.value, item.system.secondary.max),
      damagedPips: this._buildPips(item.system.damaged.value, item.system.damaged.max),
    };
  }

  /* -------------------------------------------- */
  /*  Actions                                      */
  /* -------------------------------------------- */

  /**
   * Click-to-set pip tracker shared by injuries, training, resistances, and
   * per-weapon resource tracks (ammo/secondary/damaged). Clicking a pip sets
   * the value to that pip's rank; clicking the currently-filled top pip
   * clears it back by one (toggle-off), matching physical sheet bookkeeping.
   */
  static async _onSetPip(event, target) {
    const path = target.dataset.path;
    const index = Number(target.dataset.index);

    if (target.dataset.scope === 'item') {
      const li = target.closest('[data-item-id]');
      const item = this.actor.items.get(li?.dataset.itemId);
      if (!item) return;
      const current = foundry.utils.getProperty(item.system, path) ?? 0;
      const max = foundry.utils.getProperty(item.system, path.replace('.value', '.max')) ?? Infinity;
      const value = Math.clamp(current === index + 1 ? index : index + 1, 0, max);
      return item.update({ [`system.${path}`]: value });
    }

    const isStatPath = path.startsWith('training.') || path.startsWith('resistances.');
    const cap = isStatPath ? CONFIG.XDZ.statPipMax : CONFIG.XDZ.injuryDeath;
    const current = foundry.utils.getProperty(this.actor.system, path) ?? 0;
    const value = Math.clamp(current === index + 1 ? index : index + 1, 0, cap);
    return this.actor.update({ [`system.${path}`]: value });
  }

  static async _onWeaponRoll(event, target) {
    const li = target.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    return item?.rollAttack('normal');
  }

  static async _onWeaponSecondary(event, target) {
    const li = target.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    return item?.rollSecondary();
  }

  static _onLoadoutPrev(event, target) {
    const totalPages = this._loadoutPages(this.actor.itemTypes.weapon.length);
    this._loadoutPage = (this._loadoutPage - 1 + totalPages) % totalPages;
    this.render();
  }

  static _onLoadoutNext(event, target) {
    const totalPages = this._loadoutPages(this.actor.itemTypes.weapon.length);
    this._loadoutPage = (this._loadoutPage + 1) % totalPages;
    this.render();
  }

  /** Cycle the compact sheet's color theme back/forward and persist it on the actor. @private */
  static async _onThemePrev(event, target) {
    return this._cycleTheme(-1);
  }

  static async _onThemeNext(event, target) {
    return this._cycleTheme(1);
  }

  _cycleTheme(step) {
    const themes = CharacterSheet.THEMES;
    const current = this.actor.getFlag('xdz', 'sheetTheme') ?? themes[0];
    const index = (themes.indexOf(current) + step + themes.length) % themes.length;
    return this.actor.setFlag('xdz', 'sheetTheme', themes[index]);
  }

  static async _onToggleEquip(event, target) {
    const li = target.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    if (!item) return;
    const equipped = !item.system.equipped;
    if (equipped && item.system.discardOthersOnEquip) {
      const others = this.actor.items.filter((i) => i.type === 'weapon' && i.id !== item.id && i.system.equipped);
      if (others.length) await this.actor.updateEmbeddedDocuments('Item', others.map((i) => ({ _id: i.id, 'system.equipped': false })));
    }
    return item.update({ 'system.equipped': equipped });
  }
}
