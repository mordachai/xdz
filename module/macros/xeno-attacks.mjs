import { show3d, createRolledMessage } from './location-roll.mjs';

// Each xeno action posts a card naming exactly one targeted PC and a button
// that rolls the matching resistance. No multi-target support yet — the
// book's Wicked xeno (multi-target attack) will need its own macro later.
const ACTIONS = {
  attack: {
    titleKey: 'XDZ.Chat.XenoAttackTitle',
    tagKey: 'XDZ.Chat.XenoAttackTag',
    descKey: 'XDZ.Chat.XenoAttackDesc',
    resistance: 'dodge',
    buttonKey: 'XDZ.Chat.XenoAttackButton',
  },
  ambush: {
    titleKey: 'XDZ.Chat.XenoAmbushTitle',
    tagKey: 'XDZ.Chat.XenoAmbushTag',
    descKey: 'XDZ.Chat.XenoAmbushDesc',
    resistance: 'death',
    buttonKey: 'XDZ.Chat.XenoAmbushButton',
  },
  panic: {
    titleKey: 'XDZ.Chat.XenoPanicTitle',
    tagKey: 'XDZ.Chat.XenoPanicTag',
    descKey: 'XDZ.Chat.XenoPanicDesc',
    resistance: 'fear',
    buttonKey: 'XDZ.Chat.XenoPanicButton',
  },
};

async function renderXenoCard(data) {
  return foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/xeno-card.hbs', {
    theme: game.settings.get('xdz', 'sheetTheme'),
    ...data,
  });
}

async function postXenoCard(data) {
  const content = await renderXenoCard(data);
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker(), content });
}

/** Adds `amount` injury points, clamped to the death threshold. Commando/character only. */
async function applyInjury(actor, amount) {
  const next = Math.min((actor.system.injuries?.value ?? 0) + amount, CONFIG.XDZ.injuryDeath);
  await actor.update({ 'system.injuries.value': next });
}

/**
 * Resolves the single PC token an xeno-action macro should act on. Normally
 * that's Foundry's `game.user.targets` (T key); with the
 * `xenoActionsUseSelection` world setting on, the controlled/selected token
 * is used instead so the GM doesn't have to target on top of selecting.
 */
function getActionTokens() {
  if (game.settings.get('xdz', 'xenoActionsUseSelection')) return canvas.tokens?.controlled ?? [];
  return Array.from(game.user.targets);
}

/**
 * Shared entry point for the three hotbar macros below. Requires exactly one
 * resolved token (see `getActionTokens`) pointing at a commando/character;
 * anything else warns and does nothing.
 */
async function postXenoAction(kind) {
  const def = ACTIONS[kind];

  const tokens = getActionTokens();
  if (tokens.length !== 1) {
    return ui.notifications.warn(game.i18n.localize('XDZ.Notifications.TargetOnePC'));
  }
  const [token] = tokens;
  const actor = token.actor;
  if (!actor || (actor.type !== 'commando' && actor.type !== 'character')) {
    return ui.notifications.warn(game.i18n.localize('XDZ.Notifications.TargetNotPC'));
  }

  await postXenoCard({
    title: game.i18n.localize(def.titleKey),
    tag: game.i18n.localize(def.tagKey),
    targetImg: actor.img,
    targetName: actor.name,
    description: game.i18n.format(def.descKey, { name: actor.name }),
    button: {
      action: 'xdzRollXenoResistance',
      label: game.i18n.localize(def.buttonKey),
      actorUuid: actor.uuid,
      key: def.resistance,
      kind,
    },
  });
}

export const xenoAttack = () => postXenoAction('attack');
export const xenoAmbush = () => postXenoAction('ambush');
export const xenoPanic = () => postXenoAction('panic');

/**
 * Click handler for the "Roll Dodge/Death/Fear" button on a xeno-action
 * card (wired in module/xdz.mjs). Rolls the named resistance on `actorUuid`
 * (posts the normal check-card via XDZActor#rollResistance) then, only on a
 * failed roll, applies that action's consequence:
 * - attack: 1 flat injury, applied immediately.
 * - ambush: posts a follow-up card with a "Roll Damage (1d4)" button.
 * - panic: posts a flavor-only note (no automated damage/ammo spend — spending
 *   the ammo happens through the player's normal attack roll this turn).
 */
export async function resolveXenoResistance(actorUuid, key, kind) {
  const actor = await fromUuid(actorUuid);
  if (!actor) return;

  const result = await actor.rollResistance(key);
  if (!result || result.success) return;

  if (kind === 'attack') {
    await applyInjury(actor, 1);
    await postXenoCard({
      title: game.i18n.localize('XDZ.Chat.XenoDamageTitle'),
      tag: game.i18n.localize('XDZ.Chat.XenoDamageTag'),
      targetImg: actor.img,
      targetName: actor.name,
      description: game.i18n.format('XDZ.Chat.XenoDamageDesc', { name: actor.name, amount: 1 }),
    });
  } else if (kind === 'ambush') {
    await postXenoCard({
      title: game.i18n.localize('XDZ.Chat.XenoAmbushDamageTitle'),
      tag: game.i18n.localize('XDZ.Chat.XenoAmbushDamageTag'),
      targetImg: actor.img,
      targetName: actor.name,
      description: game.i18n.format('XDZ.Chat.XenoAmbushDamageDesc', { name: actor.name }),
      button: {
        action: 'xdzRollXenoAmbushDamage',
        label: game.i18n.localize('XDZ.Chat.XenoAmbushDamageButton'),
        actorUuid: actor.uuid,
      },
    });
  } else if (kind === 'panic') {
    await postXenoCard({
      title: game.i18n.localize('XDZ.Chat.XenoPanicFailTitle'),
      tag: game.i18n.localize('XDZ.Chat.XenoPanicFailTag'),
      targetImg: actor.img,
      targetName: actor.name,
      description: game.i18n.format('XDZ.Chat.XenoPanicFailDesc', { name: actor.name }),
    });
  }
}

/** Click handler for the Ambush follow-up's "Roll Damage (1d4)" button. */
export async function resolveXenoAmbushDamage(actorUuid) {
  const actor = await fromUuid(actorUuid);
  if (!actor) return;

  const roll = await new Roll('1d4').evaluate();
  await show3d(roll);
  await applyInjury(actor, roll.total);

  const content = await renderXenoCard({
    title: game.i18n.localize('XDZ.Chat.XenoDamageTitle'),
    tag: game.i18n.localize('XDZ.Chat.XenoDamageTag'),
    targetImg: actor.img,
    targetName: actor.name,
    description: game.i18n.format('XDZ.Chat.XenoDamageDesc', { name: actor.name, amount: roll.total }),
  });
  await createRolledMessage({ speaker: ChatMessage.getSpeaker({ actor }), content, rolls: [roll] });
}
