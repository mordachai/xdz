/**
 * Combat Carousel grouping: Marines (COMMANDO/CHARACTER) act first and
 * order themselves freely; Others is any non-XENO NPC with its own unique
 * card. The Xenos faction covers every XENO actor but splits into two
 * buckets for display: named types (Warrior, Pretorian, Breeder, Alpha,
 * Custom) get their own ordered card like Others, while the anonymous
 * Drone swarm collapses into one symbolic card with a live headcount.
 */
export function groupOf(combatant) {
  const actor = combatant.actor;
  if (!actor) return 'others';
  if (actor.type === 'commando' || actor.type === 'character') return 'marines';
  if (actor.type === 'xeno') return actor.system.xenoType === 'drone' ? 'xenos-drone' : 'xenos-unique';
  return 'others';
}

export const GROUP_RANK = { marines: 0, others: 1, 'xenos-unique': 2, 'xenos-drone': 3 };

/** Hex color of the first non-GM user who owns this combatant's actor, or null. */
export function ownerColorOf(combatant) {
  const actor = combatant.actor;
  if (!actor) return null;
  const owner = game.users.find((u) => !u.isGM && actor.testUserPermission(u, 'OWNER'));
  return owner?.color ?? null;
}

/** Combatants still standing in the collapsed, anonymous Drone swarm. */
export function droneCount(combat) {
  return combat.combatants.filter((c) => groupOf(c) === 'xenos-drone' && !c.isDefeated).length;
}

/**
 * Marine injury-track readout (same 6-box scale as the actor sheet's ECG
 * panel, see commando-sheet.mjs) for a combatant, or null if its actor
 * carries no injury track (i.e. not a Marine). Sweep speed formula matches
 * the sheet: 6s healthy down to 5s at death's door.
 */
export function injuryOf(combatant) {
  const injuries = combatant.actor?.system?.injuries;
  if (!injuries) return null;
  const max = CONFIG.XDZ.injuryDeath;
  const value = injuries.value ?? 0;
  const ratio = Math.min(value / max, 1);
  return {
    pips: Array.fromRange(max).map((i) => ({ index: i, filled: i < value })),
    level: Math.max(1, Math.min(value, max)),
    dead: !!injuries.dead,
    ecgSpeed: `${(6.0 - ratio * 1.0).toFixed(2)}s`,
  };
}

/**
 * Append `combatant` to the end of its group's manual order (highest
 * existing `flags.xdz.order` in that group, +1). Marines, Others, and named
 * Xenos types only — the anonymous Drone swarm doesn't carry individual
 * order since it's collapsed to one card.
 */
export async function appendToOrder(combatant) {
  const group = groupOf(combatant);
  if (group === 'xenos-drone') return;
  const siblings = combatant.parent.combatants.filter((c) => c.id !== combatant.id && groupOf(c) === group);
  const max = siblings.reduce((m, c) => Math.max(m, c.getFlag('xdz', 'order') ?? 0), 0);
  await combatant.setFlag('xdz', 'order', max + 1);
}

/**
 * Reorder `combatantId` to sit just before/after `targetId` within their
 * shared group, by interpolating `flags.xdz.order` between its new
 * neighbors. No-ops across groups (drag is scoped per-row in the UI, this
 * is just the safety net).
 */
export async function reorderWithinGroup(combat, combatantId, targetId, placeAfter) {
  const moving = combat.combatants.get(combatantId);
  const target = combat.combatants.get(targetId);
  if (!moving || !target || moving.id === target.id) return;
  const group = groupOf(moving);
  if (groupOf(target) !== group) return;

  const ordered = combat.combatants
    .filter((c) => groupOf(c) === group && c.id !== moving.id)
    .sort((a, b) => (a.getFlag('xdz', 'order') ?? 0) - (b.getFlag('xdz', 'order') ?? 0));

  const targetIndex = ordered.findIndex((c) => c.id === target.id);
  const insertAt = placeAfter ? targetIndex + 1 : targetIndex;
  const before = ordered[insertAt - 1];
  const after = ordered[insertAt];

  const beforeOrder = before?.getFlag('xdz', 'order') ?? 0;
  const afterOrder = after?.getFlag('xdz', 'order') ?? beforeOrder + 2;
  const newOrder = (beforeOrder + afterOrder) / 2;

  await moving.setFlag('xdz', 'order', newOrder);
}
