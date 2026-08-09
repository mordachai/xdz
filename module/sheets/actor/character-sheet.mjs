import XDZActorSheet from './base-actor-sheet.mjs';

/**
 * The Character (generic player character) sheet — duplicate of the Commando sheet as a base to customize later.
 */
export default class CharacterSheet extends XDZActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['xdz', 'sheet', 'actor', 'character'],
    position: { width: 765, height: 500 },
    actions: {
      setPip: this._onSetPip,
      weaponRoll: this._onWeaponRoll,
      weaponUnleash: this._onWeaponUnleash,
      toggleEquip: this._onToggleEquip,
    },
  };

  static PARTS = {
    sheet: { template: 'systems/xdz/templates/actor/character-sheet.hbs', scrollable: [''] },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;

    context.weapons = this.actor.items.filter((i) => i.type === 'weapon').map((item) => this._prepareWeapon(item));
    context.gear = this.actor.items.filter((i) => i.type === 'gear');

    context.injuryGauge = Array.fromRange(CONFIG.XDZ.injuryDown).map((i) => ({
      index: i,
      filled: i < system.injuries.value,
    }));

    context.injurySkulls = Array.fromRange(CONFIG.XDZ.injuryDeath - CONFIG.XDZ.injuryDown).map((i) => {
      const index = CONFIG.XDZ.injuryDown + i;
      return { index, filled: index < system.injuries.value };
    });

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
    return item?.rollDestroy();
  }

  static async _onWeaponUnleash(event, target) {
    const li = target.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    return item?.rollDestroy({ unleashHell: true });
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
