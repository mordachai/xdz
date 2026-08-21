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
   * @param {"normal"|"ammo"|"grenade"} mode
   */
  async rollAttack(mode) {
    if (this.type !== 'weapon') return;

    if (mode === 'normal') {
      if (this.system.destroyed) {
        ui.notifications.warn(game.i18n.format('XDZ.Weapon.Destroyed', { name: this.name }));
        return;
      }
    } else if (mode === 'ammo') {
      if (this.system.ammo.value <= 0) {
        ui.notifications.warn(game.i18n.localize('XDZ.Weapon.NoAmmo'));
        return;
      }
      // Ammo itself is spent on the damage roll (rollDamage's 'ammo' branch),
      // not here — same spend point as the chained Spray and Pray button.
    } else if (mode === 'grenade') {
      if (this.system.secondary.value <= 0) {
        ui.notifications.warn(game.i18n.format('XDZ.Weapon.NoSecondary', { label: this.system.secondary.label }));
        return;
      }
      await this.update({ 'system.secondary.value': this.system.secondary.value - 1 });
    }

    const label = mode === 'grenade' ? this.system.secondary.label
      : mode === 'ammo' ? (this.system.ammoLabel || game.i18n.localize('XDZ.Weapon.Ammo'))
      : game.i18n.localize('XDZ.Weapon.Attack');
    const bonus = this.actor?.system?.training?.weapons ?? 0;
    const tn = TnTracker.getCurrentTN() ?? this.actor?.system?.target ?? CONFIG.XDZ.defaultTarget;

    const roll = await new Roll('1d20 + @bonus', { bonus }).evaluate();
    const die = roll.dice[0]?.results?.[0]?.result;
    const success = die === 20 || roll.total >= tn;

    // A miss on an ammo shot still burns the round — rollDamage() (which
    // normally spends it) never runs on a miss, so spend it here instead.
    if (mode === 'ammo' && !success) {
      await this.update({ 'system.ammo.value': this.system.ammo.value - 1 });
    }

    // Roll Damage Automatically skips this button (damage rolls itself right
    // below instead) — see rollDamage()'s own buttons for where Spray and
    // Pray ends up living in that mode.
    const autoRollDamage = game.settings.get('xdz', 'rollDamageAutomatically');
    const buttons = [];
    if (success && !autoRollDamage) {
      buttons.push({
        dieMode: mode === 'grenade' ? 'grenade' : mode === 'ammo' ? 'ammo' : 'normal',
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

    const attackMessage = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
    });

    if (success && autoRollDamage) {
      // Let the to-hit die finish its Dice So Nice animation before the
      // damage roll (and its own card/animation, and any auto-kill off the
      // back of it) fires — otherwise they'd all land on top of each other.
      await game.dice3d?.waitFor3DAnimationByMessageID(attackMessage.id);
      await this.rollDamage(mode === 'grenade' ? 'grenade' : mode === 'ammo' ? 'ammo' : 'normal', targetIds, targetPoints);
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

    // Spray and Pray is a one-shot follow-up on the primary "normal" damage
    // roll for this attack — offered here so it's reachable under Roll
    // Damage Automatically too (no attack-card button row in that mode).
    // Never offered off a grenade roll, and never off its own "ammo" damage
    // card either: you can't chain a Spray and Pray onto a Spray and Pray.
    const buttons = [];
    if (dieMode === 'normal' && this.system.ammo.max > 0) {
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
      dieMode,
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

  /**
   * Post a read-only summary card to chat so the table can see what this
   * item does, from either sheet type. Weapons get the same Attack/Ammo/
   * Secondary breakdown as the loadout card's hover tooltip.
   */
  async postToChat() {
    const isWeapon = this.type === 'weapon';
    const s = this.system;

    const content = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/item-summary-card.hbs', {
      item: this,
      theme: game.settings.get('xdz', 'sheetTheme'),
      typeLabel: game.i18n.localize(`TYPES.Item.${this.type}`),
      description: isWeapon ? null : s.description,
      rules: isWeapon ? s.rules : null,
      attack: isWeapon ? { die: s.destroyDie, description: s.description } : null,
      ammo: isWeapon ? { label: s.ammoLabel || game.i18n.localize('XDZ.Weapon.Ammo'), die: s.upgradeDie, description: s.ammoDescription } : null,
      secondary: isWeapon && s.secondary.max ? { label: s.secondary.label || game.i18n.localize('XDZ.Weapon.SecondaryTrack'), die: s.secondary.die, description: s.secondary.description } : null,
    });
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content });
  }
}
