import XDZActorSheet from './base-actor-sheet.mjs';

/**
 * The Vehicle sheet — name/type/description plus a table of chunks (ICRPG
 * chunk-damage convention, since XDZ has no vehicle rules of its own). Each
 * chunk has its own HP pool. Chunks view as plain text with a clickable
 * title (rolls the damage die) until Edit mode is toggled on, which swaps
 * every field for an input — a per-session UI flag, not persisted data.
 */
export default class VehicleSheet extends XDZActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['xdz', 'sheet', 'actor', 'xeno', 'vehicle'],
    position: { width: 640, height: 'auto' },
    actions: {
      toggleChunkEdit: this._onToggleChunkEdit,
      chunkCreate: this._onChunkCreate,
      chunkDelete: this._onChunkDelete,
      rollChunkDamage: this._onRollChunkDamage,
    },
  };

  static PARTS = {
    sheet: { template: 'systems/xdz/templates/actor/vehicle-sheet.hbs', scrollable: [] },
  };

  #chunkEditMode = false;

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.theme = game.settings.get('xdz', 'sheetTheme');
    context.chunkEditMode = this.#chunkEditMode;
    return context;
  }

  static async _onToggleChunkEdit() {
    this.#chunkEditMode = !this.#chunkEditMode;
    this.render();
  }

  /**
   * Left-click the "HP" label to knock the chunk's HP down by 1, right-click
   * to bump it back up — quick in-combat adjustment that works whether or
   * not Edit mode is on. The label is the click target, not the number, so
   * the readout itself stays plain text. No data-action entry: ApplicationV2's
   * action delegation doesn't cover contextmenu.
   */
  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelectorAll('.xdz-chunk-hp-label').forEach((el) => {
      el.addEventListener('click', (event) => {
        const index = Number(event.currentTarget.closest('[data-chunk-index]')?.dataset.chunkIndex);
        if (!Number.isNaN(index)) this._onChunkHpAdjust(index, -1);
      });
      el.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const index = Number(event.currentTarget.closest('[data-chunk-index]')?.dataset.chunkIndex);
        if (!Number.isNaN(index)) this._onChunkHpAdjust(index, 1);
      });
    });
  }

  async _onChunkHpAdjust(index, delta) {
    const chunks = foundry.utils.deepClone(this.actor.system.chunks);
    const chunk = chunks[index];
    if (!chunk) return;
    // Full-array replace, not a "system.chunks.N.hp.value" dot-path update:
    // ArrayField rebuilds a partially-updated element from schema defaults
    // instead of merging it against the existing item, which silently wipes
    // title/description/damage/max back to blank on every other field.
    chunk.hp.value = Math.clamp(chunk.hp.value + delta, 0, chunk.hp.max);
    return this.actor.update({ 'system.chunks': chunks });
  }

  static async _onChunkCreate() {
    const chunks = foundry.utils.deepClone(this.actor.system.chunks);
    chunks.push({ title: '', description: '', hp: { value: 6, max: 6 }, damage: '1d6' });
    return this.actor.update({ 'system.chunks': chunks });
  }

  static async _onChunkDelete(event, target) {
    const index = Number(target.closest('[data-chunk-index]')?.dataset.chunkIndex);
    if (Number.isNaN(index)) return;
    const chunks = foundry.utils.deepClone(this.actor.system.chunks);
    chunks.splice(index, 1);
    return this.actor.update({ 'system.chunks': chunks });
  }

  static async _onRollChunkDamage(event, target) {
    const index = Number(target.closest('[data-chunk-index]')?.dataset.chunkIndex);
    if (Number.isNaN(index)) return;
    const chunk = this.actor.system.chunks[index];
    if (!chunk) return;

    const roll = await new Roll(chunk.damage || '0').evaluate();

    const content = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/chunk-damage-card.hbs', {
      chunk,
      vehicle: this.actor,
      theme: game.settings.get('xdz', 'sheetTheme'),
      total: roll.total,
    });

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
    });
  }
}
