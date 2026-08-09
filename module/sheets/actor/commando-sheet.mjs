import XDZActorSheet from './base-actor-sheet.mjs';
import { COMMANDO_LOADOUT } from '../../helpers/commando-loadout.mjs';

/**
 * The Commando (player character) sheet — mirrors the printed XDZ character sheet.
 */
export default class CommandoSheet extends XDZActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['xdz', 'sheet', 'actor', 'commando'],
    position: { width: 765, height: 'auto' },
    actions: {
      setPip: this._onSetPip,
      weaponRoll: this._onWeaponRoll,
      weaponUnleash: this._onWeaponUnleash,
      toggleEquip: this._onToggleEquip,
    },
  };

  static PARTS = {
    sheet: { template: 'systems/xdz/templates/actor/commando-sheet.hbs', scrollable: [''] },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;

    if (this.isEditable) await this._syncLoadout();

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

  /**
   * Keep the Commando's 3 baked weapons in lockstep with COMMANDO_LOADOUT
   * (name/img/dice/rules/pip maxes). Only the player-editable state — pip
   * value and equipped — survives a spec change; value is clamped to the
   * new max. Creates any missing weapon and deletes anything that doesn't
   * belong to the fixed loadout. @private
   */
  async _syncLoadout() {
    const weapons = this.actor.itemTypes.weapon;
    const toCreate = [];
    const toUpdate = [];
    const toDelete = weapons.filter((w) => !COMMANDO_LOADOUT.some((spec) => spec.name === w.name)).map((w) => w.id);

    for (const spec of COMMANDO_LOADOUT) {
      const existing = weapons.find((w) => w.name === spec.name);
      if (!existing) {
        toCreate.push(spec);
        continue;
      }
      const system = foundry.utils.mergeObject(spec.system, {
        equipped: existing.system.equipped,
        ammo: { value: Math.clamp(existing.system.ammo.value, 0, spec.system.ammo.max) },
        secondary: { value: Math.clamp(existing.system.secondary.value, 0, spec.system.secondary.max) },
        damaged: { value: Math.clamp(existing.system.damaged.value, 0, spec.system.damaged.max) },
      }, { inplace: false });

      if (existing.img !== spec.img || !foundry.utils.objectsEqual(existing.system.toObject(), system)) {
        toUpdate.push({ _id: existing.id, img: spec.img, system });
      }
    }

    if (toDelete.length) await this.actor.deleteEmbeddedDocuments('Item', toDelete);
    if (toCreate.length) await this.actor.createEmbeddedDocuments('Item', toCreate);
    if (toUpdate.length) await this.actor.updateEmbeddedDocuments('Item', toUpdate);
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
