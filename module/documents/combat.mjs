import { groupOf, GROUP_RANK } from '../helpers/combat-groups.mjs';

/**
 * Keeps `combat.turns` (and so `combat.turn`/Next-Turn) clustered
 * Marines -> Others -> named Xenos -> Drone swarm every round, so the
 * stock sidebar tracker stays sensible even without the Combat Carousel
 * open. Marines, Others, and named Xenos order by their own manual
 * `flags.xdz.order` (drag-set in the carousel); the Drone swarm's order is
 * irrelevant since the carousel collapses it to one card.
 */
export default class XDZCombat extends Combat {
  /** @override */
  _sortCombatants(a, b) {
    const ra = GROUP_RANK[groupOf(a)];
    const rb = GROUP_RANK[groupOf(b)];
    if (ra !== rb) return ra - rb;
    if (ra === GROUP_RANK['xenos-drone']) return (a.initiative ?? 0) - (b.initiative ?? 0);
    return (a.getFlag('xdz', 'order') ?? 0) - (b.getFlag('xdz', 'order') ?? 0);
  }
}
