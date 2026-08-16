import XDZActorSheet from './base-actor-sheet.mjs';

/**
 * The Xeno (enemy) sheet — a lean stat block with a Hide/Seek mode toggle
 * that also drives token visibility on the canvas.
 */
export default class XenoSheet extends XDZActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['xdz', 'sheet', 'actor', 'xeno'],
    position: { width: 560, height: 'auto' },
    actions: {
      toggleMode: this._onToggleMode,
    },
  };

  static PARTS = {
    sheet: { template: 'systems/xdz/templates/actor/xeno-sheet.hbs', scrollable: [] },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;

    context.modeLabel = CONFIG.XDZ.xenoModes[system.mode];
    context.xenoTypeOptions = Object.entries(CONFIG.XDZ.xenoTypes).map(([key, label]) => ({
      key,
      label: game.i18n.localize(label),
      selected: key === system.xenoType,
    }));
    context.isCustomType = system.xenoType === 'custom';
    context.briefing = CONFIG.XDZ.xenoBriefing;
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
