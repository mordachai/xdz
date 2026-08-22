import { attachHudDrag, getHudPosition } from './hud-drag.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ApplicationV2 } = foundry.applications.api;

const MODIFIER_LABELS = { hard: 'XDZ.Hud.HardPlate', easy: 'XDZ.Hud.EasyPlate' };

/**
 * Always-on HUD badge showing the room's shared Target Number (ICRPG-style:
 * every action in a scene rolls against the same TN until it's changed).
 * Editable by the GM, or by anyone when the table's playing without a
 * dedicated GM (`xdz.playWithGM` off) — see `canEdit` below; everyone else
 * sees a read-only readout. Value/modifier live as flags on the shared
 * table-state JournalEntry (see table-state.mjs) rather than a world
 * Setting, since a world Setting can only ever be written by a GM. Pinned
 * beside the sidebar by default; draggable per-client.
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
    return xdz.state?.getFlag('xdz', TnTracker.SETTING) ?? CONFIG.XDZ.defaultTarget;
  }

  static getModifier() {
    return xdz.state?.getFlag('xdz', TnTracker.MODIFIER_SETTING) ?? { type: null, delta: 0, baseValue: null };
  }

  /** True when this client is allowed to edit the TN: the GM, or anyone at all once the table's playing without a dedicated GM. */
  static canEdit() {
    return game.user.isGM || !game.settings.get('xdz', 'playWithGM');
  }

  /** @override */
  async _prepareContext(options) {
    const modifier = TnTracker.getModifier();
    return {
      value: TnTracker.getCurrentTN(),
      canEdit: TnTracker.canEdit(),
      modifier: { type: modifier.type, label: modifier.type ? game.i18n.localize(MODIFIER_LABELS[modifier.type]) : null },
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector('.xdz-hud-input')?.addEventListener('change', TnTracker._onDirectSet.bind(this));

    if (!this.position.left && !this.position.top) this._applyDefaultPosition();
    attachHudDrag(this, this.element.querySelector('.xdz-hud-root'), TnTracker.POSITION_KEY);
    this._observeSidebar();
    this._avoidSidebar();

    if (TnTracker.canEdit()) {
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

  /** Watch the sidebar's own width so the badge tracks its collapsed/expanded state (and collapse animation) live, same pattern as CombatCarousel's `right`-position anchoring. */
  _observeSidebar() {
    if (this._sidebarObserver) return;
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    this._sidebarObserver = new ResizeObserver(() => this._avoidSidebar());
    this._sidebarObserver.observe(sidebar);
  }

  /**
   * Keep the badge clear of the sidebar's left edge. "Home" is wherever it'd
   * sit without the sidebar in play — the saved drag position if the user
   * has moved it, otherwise the same formula _applyDefaultPosition() uses.
   * Only nudged left when home would actually overlap the sidebar's current
   * (expanded) width; snaps back to home on its own once the sidebar
   * collapses again, since the clamp is recomputed from the live sidebar
   * rect every time, not stored as a one-off offset.
   */
  _avoidSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const width = this.position.width ?? 96;
    const sidebarLeft = sidebar.getBoundingClientRect().left;
    const saved = getHudPosition(TnTracker.POSITION_KEY);
    const homeLeft = saved ? saved.left : sidebarLeft - 20 - width;
    const clampedLeft = Math.min(homeLeft, sidebarLeft - 20 - width);
    if (Math.round(clampedLeft) !== Math.round(this.position.left)) this.setPosition({ left: clampedLeft });
  }

  /** @override */
  async close(options) {
    this._sidebarObserver?.disconnect();
    this._sidebarObserver = null;
    return super.close(options);
  }

  static async _onDirectSet(event) {
    const value = Math.max(1, Number(event.target.value) || CONFIG.XDZ.defaultTarget);
    await xdz.state.setFlag('xdz', TnTracker.SETTING, value);
    await xdz.state.setFlag('xdz', TnTracker.MODIFIER_SETTING, { type: null, delta: 0, baseValue: null });
  }

  /** Hard/Easy are toggles — clicking the active one again restores the pre-modifier value. */
  static async _onApplyModifier(type, delta) {
    const modifier = TnTracker.getModifier();
    if (modifier.type === type) {
      await xdz.state.setFlag('xdz', TnTracker.SETTING, modifier.baseValue);
      await xdz.state.setFlag('xdz', TnTracker.MODIFIER_SETTING, { type: null, delta: 0, baseValue: null });
      return;
    }
    const baseValue = modifier.type ? modifier.baseValue : TnTracker.getCurrentTN();
    const value = Math.max(1, baseValue + delta);
    await xdz.state.setFlag('xdz', TnTracker.SETTING, value);
    await xdz.state.setFlag('xdz', TnTracker.MODIFIER_SETTING, { type, delta, baseValue });
  }

  static async _onCreateTimer() {
    await xdz.apps.RoundTimer.create();
  }
}
