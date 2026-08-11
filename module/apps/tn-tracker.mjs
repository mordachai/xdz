import { attachHudDrag, getHudPosition } from './hud-drag.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ApplicationV2 } = foundry.applications.api;

const MODIFIER_LABELS = { hard: 'XDZ.Hud.HardPlate', easy: 'XDZ.Hud.EasyPlate' };

/**
 * Always-on HUD badge showing the room's shared Target Number (ICRPG-style:
 * every action in a scene rolls against the same TN until the GM changes
 * it). GM can adjust it via direct edit or the right-click menu; everyone
 * else sees a read-only readout that updates live via the `xdz.tnValue`
 * world setting. Pinned beside the sidebar by default; draggable per-client.
 */
export default class TnTracker extends HandlebarsApplicationMixin(ApplicationV2) {
  static SETTING = 'tnValue';
  static MODIFIER_SETTING = 'tnModifier';
  static POSITION_KEY = 'tn';

  static DEFAULT_OPTIONS = {
    id: 'xdz-tn-tracker',
    classes: ['xdz', 'hud-app', 'tn-tracker'],
    window: { frame: false, positioned: true },
    position: { width: 96, height: 108 },
  };

  static PARTS = {
    hud: { template: 'systems/xdz/templates/apps/tn-tracker.hbs' },
  };

  /** Current shared TN, for the rest of the system to read (rolls, etc). */
  static getCurrentTN() {
    return game.settings.get('xdz', TnTracker.SETTING);
  }

  static getModifier() {
    return game.settings.get('xdz', TnTracker.MODIFIER_SETTING);
  }

  /** @override */
  async _prepareContext(options) {
    const modifier = TnTracker.getModifier();
    return {
      value: TnTracker.getCurrentTN(),
      isGM: game.user.isGM,
      modifier: { type: modifier.type, label: modifier.type ? game.i18n.localize(MODIFIER_LABELS[modifier.type]) : null },
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector('.xdz-hud-input')?.addEventListener('change', TnTracker._onDirectSet.bind(this));

    if (!this.position.left && !this.position.top) this._applyDefaultPosition();
    attachHudDrag(this, this.element.querySelector('.xdz-hud-root'), TnTracker.POSITION_KEY);

    if (game.user.isGM) {
      this._contextMenu ??= new foundry.applications.ux.ContextMenu(
        this.element,
        '.xdz-hud-badge',
        [
          { label: 'XDZ.Hud.Hard', icon: 'fa-solid fa-plus', onClick: () => TnTracker._onApplyModifier('hard', 3) },
          { label: 'XDZ.Hud.Easy', icon: 'fa-solid fa-minus', onClick: () => TnTracker._onApplyModifier('easy', -3) },
          { label: 'XDZ.Hud.Timer', icon: 'fa-solid fa-hourglass-half', onClick: () => TnTracker._onCreateTimer(this) },
        ],
        { jQuery: false, fixed: true },
      );
    }
  }

  /** Default spawn spot: 20px left of the sidebar, near its top tab row. */
  _applyDefaultPosition() {
    const saved = getHudPosition(TnTracker.POSITION_KEY);
    if (saved) return this.setPosition(saved);
    const sidebar = document.getElementById('sidebar');
    const width = this.position.width ?? 96;
    const left = (sidebar?.getBoundingClientRect().left ?? window.innerWidth) - 20 - width;
    this.setPosition({ left, top: 46 });
  }

  static async _onDirectSet(event) {
    const value = Math.max(1, Number(event.target.value) || CONFIG.XDZ.defaultTarget);
    await game.settings.set('xdz', TnTracker.SETTING, value);
    await game.settings.set('xdz', TnTracker.MODIFIER_SETTING, { type: null, delta: 0, baseValue: null });
  }

  /** Hard/Easy are toggles — clicking the active one again restores the pre-modifier value. */
  static async _onApplyModifier(type, delta) {
    const modifier = TnTracker.getModifier();
    if (modifier.type === type) {
      await game.settings.set('xdz', TnTracker.SETTING, modifier.baseValue);
      await game.settings.set('xdz', TnTracker.MODIFIER_SETTING, { type: null, delta: 0, baseValue: null });
      return;
    }
    const baseValue = modifier.type ? modifier.baseValue : TnTracker.getCurrentTN();
    const value = Math.max(1, baseValue + delta);
    await game.settings.set('xdz', TnTracker.SETTING, value);
    await game.settings.set('xdz', TnTracker.MODIFIER_SETTING, { type, delta, baseValue });
  }

  static async _onCreateTimer() {
    await xdz.apps.RoundTimer.create();
  }
}
