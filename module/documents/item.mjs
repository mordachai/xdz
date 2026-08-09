/**
 * Extend the base Item document for XDZ-specific roll behavior.
 */
export default class XDZItem extends Item {
  /**
   * Roll a weapon's destroy die: how many xenos are destroyed. Optionally
   * spend 1 ammo to "Unleash Hell" — upgrade the die one step for this roll.
   * @param {object} [options]
   * @param {boolean} [options.unleashHell] - spend 1 ammo to use the upgraded die
   */
  async rollDestroy({ unleashHell = false } = {}) {
    if (this.type !== 'weapon') return;
    if (this.system.destroyed) {
      ui.notifications.warn(game.i18n.format('XDZ.Weapon.Destroyed', { name: this.name }));
      return;
    }

    let formula = this.system.destroyDie;
    if (unleashHell) {
      if (this.system.ammo.value <= 0) {
        ui.notifications.warn(game.i18n.localize('XDZ.Weapon.NoAmmo'));
        return;
      }
      formula = this.system.upgradeDie;
      await this.update({ 'system.ammo.value': this.system.ammo.value - 1 });
    }

    const roll = await new Roll(formula).evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `
        <div class="xdz-roll-flavor">
          <strong>${this.name}</strong> — ${game.i18n.localize('XDZ.Weapon.Destroy')}
          ${unleashHell ? `<div class="xdz-unleash-hell">${game.i18n.localize('XDZ.Weapon.UnleashHell')}</div>` : ''}
        </div>`,
    });
    return roll;
  }
}
