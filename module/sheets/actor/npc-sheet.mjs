import XDZActorSheet from './base-actor-sheet.mjs';

/**
 * The NPC sheet — same layout as the Xeno sheet's Hide/Seek stat block,
 * minus the Field Briefing section, for non-Xeno hostiles.
 */
export default class NpcSheet extends XDZActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['xdz', 'sheet', 'actor', 'xeno', 'npc'],
    position: { width: 560, height: 'auto' },
    actions: {
      toggleMode: this._onToggleMode,
    },
  };

  static PARTS = {
    sheet: { template: 'systems/xdz/templates/actor/npc-sheet.hbs', scrollable: [] },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;

    context.modeLabel = CONFIG.XDZ.xenoModes[system.mode];
    context.theme = game.settings.get('xdz', 'sheetTheme');

    return context;
  }

  static async _onToggleMode() {
    const mode = this.actor.system.mode === 'hide' ? 'seek' : 'hide';
    await this.actor.update({ 'system.mode': mode });
    const token = this.actor.getActiveTokens()[0];
    if (token) await token.document.update({ hidden: mode === 'hide' });
  }
}
