import TnTracker from '../apps/tn-tracker.mjs';

/**
 * Extend the base Item document for XDZ-specific roll behavior.
 */
export default class XDZItem extends Item {
  /**
   * Roll a weapon's to-hit check: 1d20 + Weapons Training vs Target. On a
   * success, either posts damage-row follow-up buttons or immediately rolls
   * damage (enemies destroyed) too, per the "Roll Damage Automatically"
   * setting — see rollDamage().
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

    // Roll Damage Automatically skips this button (damage rolls itself right
    // below instead) — see rollDamage()'s own buttons for where Spray and
    // Pray ends up living in that mode.
    const autoRollDamage = game.settings.get('xdz', 'rollDamageAutomatically');
    const buttons = [];
    if (success && !autoRollDamage) {
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

    // Snapshot targets once, at the attack roll, not per damage-button click.
    // Multiple damage rolls (Roll Damage, then Spray and Pray) can follow the
    // same successful attack, and the first one may kill/delete the target —
    // which clears it from game.user.targets AND from the scene — before the
    // second is clicked. Reusing this snapshot keeps every damage roll off
    // this attack aimed at what was actually targeted when the shot was
    // declared. targetPoints (canvas-space centers, same index order as
    // targetIds) is the fallback aim for auto-kill once a targeted token has
    // already been deleted by an earlier roll on this same attack — see
    // auto-kill.mjs.
    const targetIds = [...game.user.targets].map((t) => t.id);
    const targetPoints = [...game.user.targets].map((t) => ({ x: t.center.x, y: t.center.y }));

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
      targetIds: JSON.stringify(targetIds),
      targetPoints: JSON.stringify(targetPoints),
      spend: mode === 'grenade',
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
    });

    if (success && autoRollDamage) {
      await this.rollDamage(mode === 'grenade' ? 'grenade' : 'normal', targetIds, targetPoints);
    }
    return roll;
  }

  /**
   * Roll the "damage" die (how many xenos are destroyed) for a prior
   * successful attack, triggered by the damage-row chat button.
   * @param {"normal"|"ammo"|"grenade"} dieMode
   * @param {string[]} [targetIds] Target snapshot from rollAttack() — see the
   *   comment there for why this isn't re-read from game.user.targets here.
   * @param {{x: number, y: number}[]} [targetPoints] Position snapshot from
   *   rollAttack(), same index order as targetIds — fallback aim for
   *   auto-kill.mjs once a targeted token has already been deleted.
   */
  async rollDamage(dieMode, targetIds = [], targetPoints = []) {
    if (this.type !== 'weapon') return;

    let formula;
    let description;
    let tag = '';
    let killMode;
    if (dieMode === 'ammo') {
      if (this.system.ammo.value <= 0) {
        ui.notifications.warn(game.i18n.localize('XDZ.Weapon.NoAmmo'));
        return;
      }
      formula = this.system.upgradeDie;
      description = this.system.ammoDescription;
      tag = this.system.ammoLabel || game.i18n.localize('XDZ.Weapon.Ammo');
      killMode = this.system.ammo.killMode;
      await this.update({ 'system.ammo.value': this.system.ammo.value - 1 });
    } else if (dieMode === 'grenade') {
      formula = this.system.secondary.die;
      description = this.system.secondary.description;
      tag = this.system.secondary.label;
      killMode = this.system.secondary.killMode;
    } else {
      formula = this.system.destroyDie;
      description = this.system.description;
      // Primary fire has its own Kill Mode too (e.g. a rocket launcher is
      // Explosive), independent of the ammo/secondary tracks above.
      killMode = this.system.killMode;
    }

    const roll = await new Roll(formula).evaluate();

    // Spray and Pray chains onto every "normal"-track damage card (the
    // initial destroy-die roll and each subsequent ammo roll) so it stays
    // reachable however that first roll got here — manual button click or
    // Roll Damage Automatically. Never offered off a grenade roll.
    const buttons = [];
    if (dieMode !== 'grenade' && this.system.ammo.max > 0) {
      buttons.push({
        dieMode: 'ammo',
        label: game.i18n.localize('XDZ.Weapon.SprayAndPray'),
        variant: 'xdz-spray-btn',
        disabled: this.system.ammo.value <= 0,
      });
    }

    const content = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/damage-card.hbs', {
      weapon: this,
      theme: game.settings.get('xdz', 'sheetTheme'),
      total: roll.total,
      tag,
      description,
      buttons,
      itemUuid: this.uuid,
      targetIds: JSON.stringify(targetIds),
      targetPoints: JSON.stringify(targetPoints),
    });

    // Snapshot targeting now (roller's client) rather than reading
    // game.user.targets later from the GM's client, which could have drifted
    // by the time the createChatMessage hook runs — see auto-kill.mjs.
    const actorTokenId = this.actor?.getActiveTokens(true)[0]?.id ?? null;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
      flags: {
        xdz: {
          // dieMode here is the auto-kill targeting mode (normal/explosive/
          // piercing), a separate axis from rollDamage()'s own dieMode arg
          // above (which resource/formula was rolled).
          autoKill: { total: roll.total, sceneId: canvas.scene?.id ?? null, actorTokenId, dieMode: killMode, targetIds, targetPoints },
        },
      },
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
