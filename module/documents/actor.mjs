import { COMMANDO_LOADOUT } from '../helpers/commando-loadout.mjs';

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
   * Roll a Training check: 1d20 + training value vs target (default 12).
   * @param {string} key - training key (pilot, systems, mechanic, weapons, medical)
   * @param {object} [options]
   * @param {number} [options.target] - override the target number
   */
  async rollTraining(key, { target } = {}) {
    if (this.type !== 'commando' && this.type !== 'character') return;
    const label = game.i18n.localize(CONFIG.XDZ.trainings[key] ?? key);
    const value = this.system.training[key] ?? 0;
    const tn = target ?? this.system.target ?? CONFIG.XDZ.defaultTarget;
    return this._rollCheck({ label: `${label} (Training)`, bonus: value, target: tn });
  }

  /**
   * Roll a Resistance check: 1d20 + resistance value vs target (default 12).
   * @param {string} key - resistance key (fear, dodge, death)
   * @param {object} [options]
   * @param {number} [options.target] - override the target number
   */
  async rollResistance(key, { target } = {}) {
    if (this.type !== 'commando' && this.type !== 'character') return;
    const label = game.i18n.localize(CONFIG.XDZ.resistances[key] ?? key);
    const value = this.system.resistances[key] ?? 0;
    const tn = target ?? this.system.target ?? CONFIG.XDZ.defaultTarget;
    return this._rollCheck({ label: `${label} (Resistance)`, bonus: value, target: tn });
  }

  /**
   * Shared d20 + bonus vs target resolver, posted as a chat message.
   * @private
   */
  async _rollCheck({ label, bonus, target }) {
    const roll = await new Roll('1d20 + @bonus', { bonus }).evaluate();
    const die = roll.dice[0]?.results?.[0]?.result;
    const isNat20 = die === 20;
    const success = isNat20 || roll.total >= target;

    const flavor = `
      <div class="xdz-roll-flavor">
        <strong>${label}</strong> vs TN ${target}
        <div class="xdz-roll-result ${success ? 'xdz-success' : 'xdz-failure'}">
          ${success ? game.i18n.localize('XDZ.Roll.Success') : game.i18n.localize('XDZ.Roll.Failure')}
        </div>
      </div>`;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor,
    });
    return roll;
  }
}
