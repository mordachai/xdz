import { attachHudDrag, getHudPosition, clearHudPosition } from './hud-drag.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ApplicationV2 } = foundry.applications.api;

const DEFAULT_STATE = {
  mode: 'rounds', // 'rounds' ("Timer") | 'clock' ("Realtimer")
  name: '',
  rounds: 4,
  clockDurationMs: 5 * 60 * 1000,
  clockRemainingMs: 5 * 60 * 1000,
  clockEndTime: null,
  running: false,
};

const GAP = 10;

/** mm:ss, clamped at 0. */
function formatMs(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function parseMmSs(text) {
  const [m, s] = String(text).split(':').map((n) => Number(n) || 0);
  return Math.max(0, m * 60 + s) * 1000;
}

/**
 * A round-counter / real-time-countdown HUD badge. Spawned on demand (via
 * the TN tracker's right-click "Timer" entry) rather than always-on — any
 * number of timers can run at once, each tracked by id in the `xdz.timers`
 * world setting so every client sees the same set and the same state.
 * Screen position, like the other HUD badges, is per-client.
 */
export default class RoundTimer extends HandlebarsApplicationMixin(ApplicationV2) {
  static SETTING = 'timers';

  static DEFAULT_OPTIONS = {
    classes: ['xdz', 'hud-app', 'round-timer'],
    window: { frame: false, positioned: true },
    position: { width: 96, height: 108 },
    actions: {
      adjustRounds: RoundTimer._onAdjustRounds,
      start: RoundTimer._onStart,
      pause: RoundTimer._onPause,
    },
  };

  static PARTS = {
    hud: { template: 'systems/xdz/templates/apps/round-timer.hbs' },
  };

  constructor(timerId, { stackIndex = 0, ...options } = {}) {
    super({ ...options, id: `xdz-round-timer-${timerId}` });
    this.timerId = timerId;
    this._stackIndex = stackIndex;
  }

  /** @type {number|null} */
  _tickHandle = null;

  /** Guards against re-writing running:false to the setting more than once per expiry. @private */
  _alarmFired = false;

  static getAll() {
    return game.settings.get('xdz', RoundTimer.SETTING);
  }

  static getState(id) {
    const state = RoundTimer.getAll().find((t) => t.id === id);
    return foundry.utils.mergeObject(DEFAULT_STATE, state ?? {}, { inplace: false });
  }

  static async _updateState(id, changes) {
    const all = RoundTimer.getAll().map((t) => (t.id === id ? foundry.utils.mergeObject(t, changes, { inplace: false }) : t));
    await game.settings.set('xdz', RoundTimer.SETTING, all);
  }

  /** Create a new timer entry; every client picks it up via the settings hook. */
  static async create() {
    const id = foundry.utils.randomID();
    const all = [...RoundTimer.getAll(), { id, ...DEFAULT_STATE }];
    await game.settings.set('xdz', RoundTimer.SETTING, all);
    return id;
  }

  static async delete(id) {
    const all = RoundTimer.getAll().filter((t) => t.id !== id);
    await game.settings.set('xdz', RoundTimer.SETTING, all);
  }

  /** Default spawn spot for a newly-seen timer: stacked to the left of the TN badge. */
  static computeDefaultPosition(stackIndex) {
    const tn = xdz.apps.tnTracker?.element?.getBoundingClientRect();
    const width = 96;
    const left = (tn?.left ?? window.innerWidth - 20 - width) - GAP - width - stackIndex * (width + GAP);
    const top = tn?.top ?? 46;
    return { left, top };
  }

  /** @override */
  async _prepareContext(options) {
    const state = RoundTimer.getState(this.timerId);
    const remainingMs = state.running ? state.clockEndTime - Date.now() : state.clockRemainingMs;
    const modeLabel = game.i18n.localize(state.mode === 'rounds' ? 'XDZ.Hud.Rounds' : 'XDZ.Hud.Clock');
    return {
      isGM: game.user.isGM,
      mode: state.mode,
      rounds: state.rounds,
      label: state.name || modeLabel,
      clock: {
        running: state.running,
        durationText: formatMs(state.clockDurationMs),
        remainingText: formatMs(remainingMs),
      },
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector('.xdz-hud-input[name="rounds"]')?.addEventListener('change', RoundTimer._onSetRounds.bind(this));
    this.element.querySelector('.xdz-timer-duration-input')?.addEventListener('change', RoundTimer._onSetDuration.bind(this));
    this.element.querySelector('.xdz-hud-label-input')?.addEventListener('change', RoundTimer._onRename.bind(this));

    if (!this.position.left && !this.position.top) this._applyDefaultPosition();
    attachHudDrag(this, this.element.querySelector('.xdz-hud-root'), `timers.${this.timerId}`);

    if (game.user.isGM) {
      this._contextMenu ??= new foundry.applications.ux.ContextMenu(
        this.element,
        '.xdz-hud-badge',
        [
          { label: 'XDZ.Hud.ToggleMode', icon: 'fa-solid fa-arrow-right-arrow-left', onClick: () => RoundTimer._onToggleMode(this.timerId) },
          { label: 'XDZ.Delete', icon: 'fa-solid fa-trash', onClick: () => RoundTimer._onDelete(this.timerId) },
          { label: 'XDZ.Hud.ResetRealtimer', icon: 'fa-solid fa-arrow-rotate-left', onClick: () => RoundTimer._onReset(this.timerId) },
        ],
        { jQuery: false, fixed: true },
      );
    }

    this._startTicking(context.mode === 'clock' && context.clock.running);
  }

  _applyDefaultPosition() {
    const saved = getHudPosition(`timers.${this.timerId}`);
    this.setPosition(saved ?? RoundTimer.computeDefaultPosition(this._stackIndex));
  }

  /** @override */
  _onClose(options) {
    super._onClose(options);
    this._stopTicking();
  }

  _stopTicking() {
    if (this._tickHandle) clearInterval(this._tickHandle);
    this._tickHandle = null;
  }

  _startTicking(active) {
    this._stopTicking();
    this.element.classList.remove('xdz-hud-alarm');
    if (!active) return;
    this._alarmFired = false;
    const digits = this.element.querySelector('.xdz-timer-digits');
    this._tickHandle = setInterval(() => {
      const state = RoundTimer.getState(this.timerId);
      const remaining = state.clockEndTime - Date.now();
      if (digits) digits.textContent = formatMs(remaining);
      this.element.classList.toggle('xdz-hud-alarm', remaining <= 0);
      if (remaining <= 0 && !this._alarmFired) {
        this._alarmFired = true;
        this._stopTicking();
        if (game.user.isGM) RoundTimer._updateState(this.timerId, { running: false, clockEndTime: null, clockRemainingMs: 0 });
      }
    }, 250);
  }

  static async _onSetRounds(event) {
    const rounds = Math.max(0, Number(event.target.value) || 0);
    await RoundTimer._updateState(this.timerId, { rounds });
  }

  static async _onAdjustRounds(event, target) {
    const delta = Number(target.dataset.delta);
    const rounds = Math.max(0, RoundTimer.getState(this.timerId).rounds + delta);
    await RoundTimer._updateState(this.timerId, { rounds });
  }

  static async _onSetDuration(event) {
    const clockDurationMs = parseMmSs(event.target.value);
    await RoundTimer._updateState(this.timerId, { clockDurationMs, clockRemainingMs: clockDurationMs });
  }

  static async _onToggleMode(id) {
    const state = RoundTimer.getState(id);
    const mode = state.mode === 'rounds' ? 'clock' : 'rounds';
    await RoundTimer._updateState(id, { mode, running: false, clockEndTime: null });
  }

  static async _onRename(event) {
    await RoundTimer._updateState(this.timerId, { name: event.target.value.trim() });
  }

  static async _onStart(event, target) {
    const state = RoundTimer.getState(this.timerId);
    if (state.running) return;
    await RoundTimer._updateState(this.timerId, { running: true, clockEndTime: Date.now() + state.clockRemainingMs });
  }

  static async _onPause(event, target) {
    const state = RoundTimer.getState(this.timerId);
    if (!state.running) return;
    const clockRemainingMs = Math.max(0, state.clockEndTime - Date.now());
    await RoundTimer._updateState(this.timerId, { running: false, clockEndTime: null, clockRemainingMs });
  }

  static async _onReset(id) {
    const state = RoundTimer.getState(id);
    if (state.mode === 'rounds') return RoundTimer._updateState(id, { rounds: 0 });
    return RoundTimer._updateState(id, { running: false, clockEndTime: null, clockRemainingMs: state.clockDurationMs });
  }

  static async _onDelete(id) {
    await clearHudPosition(`timers.${id}`);
    await RoundTimer.delete(id);
  }
}
