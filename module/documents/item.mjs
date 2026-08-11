import TnTracker from '../apps/tn-tracker.mjs';

/**
 * Extend the base Item document for XDZ-specific roll behavior.
 */
export default class XDZItem extends Item {
  /**
   * Roll a weapon's to-hit check: 1d20 + Weapons Training vs Target. On a
   * success, posts a damage-row of follow-up buttons instead of rolling
   * damage (enemies destroyed) automatically — see rollDamage().
   * @param {"normal"|"grenade"} mode
   */
  async rollAttack(mode) {
    if (this.type !== 'weapon') return;

    if (mode === 'normal') {
      if (this.system.destroyed) {
        ui.notifications.warn(game.i18n.format('XDZ.Weapon.Destroyed', { name: this.name }));
        return;
      }
    } else if (mode === 'grenade') {
      if (this.system.secondary.value <= 0) {
        ui.notifications.warn(game.i18n.format('XDZ.Weapon.NoSecondary', { label: this.system.secondary.label }));
        return;
      }
      await this.update({ 'system.secondary.value': this.system.secondary.value - 1 });
    }

    const label = mode === 'grenade' ? this.system.secondary.label : game.i18n.localize('XDZ.Weapon.Attack');
    const bonus = this.actor?.system?.training?.weapons ?? 0;
    const tn = TnTracker.getCurrentTN() ?? this.actor?.system?.target ?? CONFIG.XDZ.defaultTarget;

    const roll = await new Roll('1d20 + @bonus', { bonus }).evaluate();
    const die = roll.dice[0]?.results?.[0]?.result;
    const success = die === 20 || roll.total >= tn;

    const buttons = [];
    if (success) {
      buttons.push({
        dieMode: mode === 'grenade' ? 'grenade' : 'normal',
        label: game.i18n.localize('XDZ.Weapon.RollDamage'),
      });
      if (mode === 'normal' && this.system.ammo.max > 0) {
        buttons.push({
          dieMode: 'ammo',
          label: game.i18n.localize('XDZ.Weapon.SprayAndPray'),
          variant: 'xdz-spray-btn',
          disabled: this.system.ammo.value <= 0,
        });
      }
    }

    const content = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/attack-card.hbs', {
      weapon: this,
      theme: game.settings.get('xdz', 'sheetTheme'),
      label,
      die,
      bonusLabel: 'W',
      bonus,
      tn,
      total: roll.total,
      success,
      buttons,
      itemUuid: this.uuid,
      spend: mode === 'grenade',
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
    });
    return roll;
  }

  /**
   * Roll the "damage" die (how many xenos are destroyed) for a prior
   * successful attack, triggered by the damage-row chat button.
   * @param {"normal"|"ammo"|"grenade"} dieMode
   */
  async rollDamage(dieMode) {
    if (this.type !== 'weapon') return;

    let formula;
    let description;
    let tag = '';
    if (dieMode === 'ammo') {
      if (this.system.ammo.value <= 0) {
        ui.notifications.warn(game.i18n.localize('XDZ.Weapon.NoAmmo'));
        return;
      }
      formula = this.system.upgradeDie;
      description = this.system.ammoDescription;
      tag = this.system.ammoLabel || game.i18n.localize('XDZ.Weapon.Ammo');
      await this.update({ 'system.ammo.value': this.system.ammo.value - 1 });
    } else if (dieMode === 'grenade') {
      formula = this.system.secondary.die;
      description = this.system.secondary.description;
      tag = this.system.secondary.label;
    } else {
      formula = this.system.destroyDie;
      description = this.system.description;
    }

    const roll = await new Roll(formula).evaluate();

    const content = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/damage-card.hbs', {
      weapon: this,
      theme: game.settings.get('xdz', 'sheetTheme'),
      total: roll.total,
      tag,
      description,
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
    });
    return roll;
  }

  /**
   * Weapon secondary ability. Abilities with a damage die (Grenade) go
   * through the to-hit/damage-button flow via rollAttack; pure-utility
   * abilities with no die (Gyro) resolve immediately, no roll.
   */
  async rollSecondary() {
    if (this.type !== 'weapon') return;
    if (this.system.secondary.die) return this.rollAttack('grenade');

    const secondary = this.system.secondary;
    if (secondary.value <= 0) {
      ui.notifications.warn(game.i18n.format('XDZ.Weapon.NoSecondary', { label: secondary.label }));
      return;
    }

    await this.update({ 'system.secondary.value': secondary.value - 1 });

    const content = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/secondary-card.hbs', {
      weapon: this,
      theme: game.settings.get('xdz', 'sheetTheme'),
      label: secondary.label,
      description: secondary.description,
    });
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content });
  }
}
