import { isResponsibleClient } from './gm-election.mjs';

// Lets a player resolve a consequence (injury, ambush damage) landing on a
// teammate's PC, not just their own — e.g. clicking a xeno-action chat
// card's resistance button for an AFK player. The clicking user usually
// won't own that actor, so a direct Actor#update would be rejected by the
// server; relay the already-computed `changes` to the responsible client
// (the GM, or gm-election.mjs's elected stand-in) instead, same pattern
// already used for autoKillXenos in xdz.mjs.
const RELAY_EVENT = 'system.xdz.relayActorUpdate';

Hooks.once('ready', () => {
  game.socket.on(RELAY_EVENT, async ({ uuid, changes } = {}) => {
    if (!isResponsibleClient()) return;
    const actor = await fromUuid(uuid);
    if (actor) await actor.update(changes);
  });
});

/** Applies `changes` to `actor`: directly if the current user owns it, otherwise relayed to the responsible client. */
export async function updateActorAsOwner(actor, changes) {
  if (actor.isOwner) return actor.update(changes);
  game.socket.emit(RELAY_EVENT, { uuid: actor.uuid, changes });
}
