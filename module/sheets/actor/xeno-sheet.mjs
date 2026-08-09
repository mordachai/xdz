import XDZActorSheet from './base-actor-sheet.mjs';

/**
 * The Xeno (enemy) sheet — a lean stat block with a Hide/Seek mode toggle
 * that also drives token visibility on the canvas.
 */
export default class XenoSheet extends XDZActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['xdz', 'sheet', 'actor', 'xeno'],
    position: { width: 480, height: 420 },
    actions: {
      toggleMode: this._onToggleMode,
    },
  };

  static PARTS = {
    sheet: { template: 'systems/xdz/templates/actor/xeno-sheet.hbs', scrollable: [''] },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.modeLabel = CONFIG.XDZ.xenoModes[this.actor.system.mode];
    return context;
  }

  static async _onToggleMode() {
    const mode = this.actor.system.mode === 'hide' ? 'seek' : 'hide';
    await this.actor.update({ 'system.mode': mode });
    const token = this.actor.getActiveTokens()[0];
    if (token) await token.document.update({ hidden: mode === 'hide' });
  }
}
