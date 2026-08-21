const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Ultra-compact, read-only HUD popup for a Commando/Character actor — a
 * quick-glance dashboard (identity, injury, training, resistance, weapons,
 * gear) opened from the normal sheet instead of replacing it. All field
 * editing (name/rank/quirk/gear add/remove) stays on the normal sheet; this
 * view only ever reads and left/right-click adjusts numbers, rolls, or ticks
 * the injury pips.
 *
 * Deliberately NOT registered via `Actors.registerSheet` — it's a secondary
 * view, instantiated ad hoc per actor by the normal sheet's HUD button (see
 * CommandoSheet/CharacterSheet's `openHud` action). Extending ActorSheetV2
 * (rather than a plain ApplicationV2) is what gets it auto-registered in
 * `actor.apps`, so it re-renders live on actor/item updates for free.
 */
export default class CommandoHudApp extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ['xdz', 'commando-hud'],
    position: { width: 420, height: 'auto' },
    window: { resizable: false, icon: 'fa-solid fa-tablet-screen-button' },
    actions: {
      setPip: this._onSetPip,
      bumpValue: this._onBumpValue,
      weaponRoll: this._onWeaponRoll,
      weaponAmmo: this._onWeaponAmmo,
      weaponSecondary: this._onWeaponSecondary,
      toggleEquip: this._onToggleEquip,
      rollTraining: this._onRollTraining,
      rollResistance: this._onRollResistance,
      loadoutPrev: this._onLoadoutPrev,
      loadoutNext: this._onLoadoutNext,
      itemEdit: this._onItemEdit,
      itemDelete: this._onItemDelete,
      backToSheet: this._onBackToSheet,
    },
  };

  /** @override */
  _getHeaderControls() {
    const controls = super._getHeaderControls();
    controls.unshift({
      icon: 'fa-solid fa-arrow-left',
      label: 'XDZ.Hud.BackToSheet',
      action: 'backToSheet',
    });
    return controls;
  }

  static PARTS = {
    hud: { template: 'systems/xdz/templates/apps/commando-hud.hbs', scrollable: [''] },
  };

  /** Index of the visible weapon-card page in the loadout pager. @private */
  _loadoutPage = 0;

  /** Weapon cards shown per loadout page — same pager the normal sheet uses. @private */
  _loadoutPageSize = 2;

  /** Total loadout pages for a given weapon count (always >= 1). @private */
  _loadoutPages(weaponCount) {
    return Math.max(1, Math.ceil(weaponCount / this._loadoutPageSize));
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;

    context.actor = this.actor;
    context.system = system;
    context.theme = this.actor.getFlag('xdz', 'sheetTheme') ?? 'green';

    context.weapons = this.actor.items.filter((i) => i.type === 'weapon').map((item) => ({ item, system: item.system }));
    context.gear = this.actor.items.filter((i) => i.type === 'gear');

    const totalPages = this._loadoutPages(context.weapons.length);
    this._loadoutPage = this._loadoutPage % totalPages;
    context.loadoutWeapons = context.weapons.slice(this._loadoutPage * this._loadoutPageSize, this._loadoutPage * this._loadoutPageSize + this._loadoutPageSize);
    context.loadoutMultiPage = totalPages > 1;

    context.injuryPips = Array.fromRange(CONFIG.XDZ.injuryDeath).map((i) => ({
      index: i,
      filled: i < system.injuries.value,
    }));

    // Full-width ECG strip swaps wholesale per injury level (1 = healthy, 6 = flatline).
    context.injuryLevel = Math.max(1, Math.min(system.injuries.value, CONFIG.XDZ.injuryDeath));

    // Sweep speeds up as injuries pile on — 6s healthy down to 1.0s near death.
    const injuryRatio = Math.min(system.injuries.value / CONFIG.XDZ.injuryDeath, 1);
    context.ecgSpeed = `${(6.0 - injuryRatio * 1.0).toFixed(2)}s`;

    context.trainingRows = Object.entries(CONFIG.XDZ.trainings).map(([key, label]) => ({
      key,
      label,
      path: `training.${key}`,
      value: system.training[key],
      max: CONFIG.XDZ.statPipMax,
    }));

    context.resistanceRows = Object.entries(CONFIG.XDZ.resistances).map(([key, label]) => ({
      key,
      label,
      path: `resistances.${key}`,
      value: system.resistances[key],
      max: CONFIG.XDZ.statPipMax,
    }));

    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    // Right-click decrements a bumpValue number — the declarative `actions`
    // map only ever wires left-click, so this one's bound by hand.
    for (const el of this.element.querySelectorAll('[data-action="bumpValue"]')) {
      el.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        this._adjustValue(el, -1);
      });
    }
  }

  /* -------------------------------------------- */
  /*  Actions                                      */
  /* -------------------------------------------- */

  /** Injury stays a click-to-set pip track (see CommandoSheet._onSetPip) — everything else is a bumpValue number. */
  static async _onSetPip(event, target) {
    const path = target.dataset.path;
    const index = Number(target.dataset.index);
    const current = foundry.utils.getProperty(this.actor.system, path) ?? 0;
    const value = Math.clamp(current === index + 1 ? index : index + 1, 0, CONFIG.XDZ.injuryDeath);
    return this.actor.update({ [`system.${path}`]: value });
  }

  static async _onBumpValue(event, target) {
    return this._adjustValue(target, 1);
  }

  /** Shared +/-1 stepper for Training, Resistance, and weapon Ammo/Secondary/Damaged. @private */
  _adjustValue(target, delta) {
    const path = target.dataset.path;
    const max = Number(target.dataset.max);

    if (target.dataset.scope === 'item') {
      const li = target.closest('[data-item-id]');
      const item = this.actor.items.get(li?.dataset.itemId);
      if (!item) return;
      const current = foundry.utils.getProperty(item.system, path) ?? 0;
      const value = Math.clamp(current + delta, 0, max);
      return item.update({ [`system.${path}`]: value });
    }

    const current = foundry.utils.getProperty(this.actor.system, path) ?? 0;
    const value = Math.clamp(current + delta, 0, max);
    return this.actor.update({ [`system.${path}`]: value });
  }

  /** Block firing an unequipped weapon, with a warning toast. @private */
  static _requireEquipped(item) {
    if (item && !item.system.equipped) {
      ui.notifications.warn(game.i18n.format('XDZ.Weapon.NotEquipped', { name: item.name }));
      return false;
    }
    return true;
  }

  static async _onWeaponRoll(event, target) {
    const li = target.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    if (!this._requireEquipped(item)) return;
    return item?.rollAttack('normal');
  }

  static async _onWeaponAmmo(event, target) {
    const li = target.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    if (!this._requireEquipped(item)) return;
    return item?.rollAttack('ammo');
  }

  static async _onWeaponSecondary(event, target) {
    const li = target.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    if (!this._requireEquipped(item)) return;
    return item?.rollSecondary();
  }

  static async _onToggleEquip(event, target) {
    const li = target.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    if (!item) return;
    const equipped = !item.system.equipped;
    if (equipped) {
      // Exclusivity cuts both ways: equipping this weapon kicks out any
      // other equipped weapon if EITHER side is marked exclusive — a
      // Heavy Gun (exclusive) already equipped must drop when you equip a
      // Flame/Pulse (non-exclusive), not just the other way around.
      const others = this.actor.items.filter((i) => i.type === 'weapon' && i.id !== item.id && i.system.equipped
        && (item.system.discardOthersOnEquip || i.system.discardOthersOnEquip));
      if (others.length) await this.actor.updateEmbeddedDocuments('Item', others.map((i) => ({ _id: i.id, 'system.equipped': false })));
    }
    return item.update({ 'system.equipped': equipped });
  }

  static async _onRollTraining(event, target) {
    return this.actor.rollTraining(target.dataset.key);
  }

  static async _onRollResistance(event, target) {
    return this.actor.rollResistance(target.dataset.key);
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

  static async _onItemEdit(event, target) {
    const li = target.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    return item?.sheet.render(true);
  }

  static async _onItemDelete(event, target) {
    const li = target.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    return item?.delete();
  }

  static async _onBackToSheet(event, target) {
    await this.actor.setFlag('xdz', 'sheetMode', 'sheet');
    await this.actor.sheet.render(true);
    return this.close();
  }
}
