import { COMMANDO_LOADOUT } from '../helpers/commando-loadout.mjs';
import TnTracker from '../apps/tn-tracker.mjs';
import { show3d, createRolledMessage } from '../macros/location-roll.mjs';

/**
 * Extend the base Actor document for XDZ-specific roll behavior.
 */
export default class XDZActor extends Actor {
  /** @override */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    if (data.type === 'commando' || data.type === 'character') {
      this.updateSource({ prototypeToken: { actorLink: true } });
    }
    if (data.type === 'commando' && !data.items?.length) {
      this.updateSource({ items: COMMANDO_LOADOUT });
    }
  }

  /**
   * Roll a Training check: 1d20 + training value vs target.
   * @param {string} key - training key (pilot, systems, mechanic, weapons, medical)
   * @param {object} [options]
   * @param {number} [options.target] - override the target number (else the shared TN tracker, else actor override, else default 12)
   * @returns {Promise<{roll: Roll, success: boolean, total: number, tn: number}|undefined>}
   */
  async rollTraining(key, { target } = {}) {
    if (this.type !== 'commando' && this.type !== 'character') return;
    const label = game.i18n.localize(CONFIG.XDZ.trainings[key] ?? key);
    const value = this.system.training[key] ?? 0;
    const tn = target ?? TnTracker.getCurrentTN() ?? this.system.target ?? CONFIG.XDZ.defaultTarget;
    return this._rollCheck({ label, tag: game.i18n.localize('XDZ.Roll.TypeTraining'), bonusLabel: 'T', bonus: value, target: tn });
  }

  /**
   * Roll a Resistance check: 1d20 + resistance value vs target.
   * @param {string} key - resistance key (fear, dodge, death)
   * @param {object} [options]
   * @param {number} [options.target] - override the target number (else the shared TN tracker, else actor override, else default 12)
   * @returns {Promise<{roll: Roll, success: boolean, total: number, tn: number}|undefined>}
   */
  async rollResistance(key, { target } = {}) {
    if (this.type !== 'commando' && this.type !== 'character') return;
    const label = game.i18n.localize(CONFIG.XDZ.resistances[key] ?? key);
    const value = this.system.resistances[key] ?? 0;
    const tn = target ?? TnTracker.getCurrentTN() ?? this.system.target ?? CONFIG.XDZ.defaultTarget;
    return this._rollCheck({ label, tag: game.i18n.localize('XDZ.Roll.TypeResistance'), bonusLabel: 'R', bonus: value, target: tn });
  }

  /**
   * Shared d20 + bonus vs target resolver, posted as a chat message.
   * Returns `{ roll, success, total, tn }` so callers (e.g. the xeno-attack
   * macros in module/macros/xeno-attacks.mjs) can branch on pass/fail
   * without re-deriving the target number themselves.
   * @private
   */
  async _rollCheck({ label, tag, bonusLabel, bonus, target }) {
    const roll = await new Roll('1d20 + @bonus', { bonus }).evaluate();
    await show3d(roll);
    const die = roll.dice[0]?.results?.[0]?.result;
    const isNat20 = die === 20;
    const success = isNat20 || roll.total >= target;

    const content = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/check-card.hbs', {
      theme: game.settings.get('xdz', 'sheetTheme'),
      label,
      tag,
      die,
      bonusLabel,
      bonus,
      tn: target,
      total: roll.total,
      success,
    });

    await createRolledMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content,
      rolls: [roll],
    });
    return { roll, success, total: roll.total, tn: target };
  }
}
