// Perpendicular tolerance for a piercing beam to still count as "in the
// line" — same 0.75-grid-unit spacing convention spawn-xenos.mjs uses for
// its spiral offsets, reused here for "close enough to the beeline."
const BEAM_WIDTH_FACTOR = 0.75;

// Give death-reactive VFX modules (Splatter, Monk's Blood Splatter, etc.) a
// beat to react to the "dead" status before the token vanishes from canvas.
const DEATH_VFX_DELAY_MS = 700;

/**
 * Center of a token in scene coordinates, using the Scene document's own
 * grid size (not `canvas.grid`) so this works even if the GM isn't currently
 * viewing the scene the roll happened on.
 */
function tokenCenter(scene, token) {
  const size = scene.grid.size;
  return { x: token.x + (token.width * size) / 2, y: token.y + (token.height * size) / 2 };
}

/**
 * Flag a token's actor as defeated (skull overlay + "dead" status effect)
 * via the standard Foundry v11+ API, so third-party death VFX modules
 * (Splatter, Monk's Blood Splatter) that hook the defeated status pick up
 * the kill instead of the token just silently vanishing.
 */
async function markDead(token) {
  const actor = token.actor;
  const statusId = CONFIG.specialStatusEffects.DEFEATED;
  if (!actor || actor.statuses?.has(statusId)) return;
  await actor.toggleStatusEffect(statusId, { active: true, overlay: true });
  // Splatter doesn't hook the defeated status itself, only hp-based
  // updateActor diffs — xdz has no hp field, so trigger it directly here.
  // Socket-broadcast, so every connected client sees the splat.
  if (game.modules.get('splatter')?.active) CONFIG.Splatter.splat(token);
}

function centroid(points) {
  if (!points.length) return null;
  const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  return { x, y };
}

/** Candidates ranked closest-first (radial) from `origin`, ties shuffled. */
function rankByRadius(candidates, scene, origin) {
  return candidates
    .map((token) => {
      const center = tokenCenter(scene, token);
      const distance = Math.hypot(center.x - origin.x, center.y - origin.y);
      return { token, distance, jitter: Math.random() };
    })
    .sort((a, b) => a.distance - b.distance || a.jitter - b.jitter);
}

/**
 * Candidates ranked closest-first (radial) from `origin`, but restricted to
 * the half-plane facing `aim` — same shooter, but no longer killing
 * something standing behind the marine just because it happens to be as
 * close as something actually downrange. Falls back to a plain radial rank
 * when there's no aim point (no target selected for this shot).
 */
function rankByRadiusForward(candidates, scene, origin, aim) {
  if (!aim) return rankByRadius(candidates, scene, origin);
  const dx = aim.x - origin.x;
  const dy = aim.y - origin.y;
  const length = Math.hypot(dx, dy);
  if (!length) return rankByRadius(candidates, scene, origin);
  const dirX = dx / length;
  const dirY = dy / length;

  return candidates
    .map((token) => {
      const center = tokenCenter(scene, token);
      const vx = center.x - origin.x;
      const vy = center.y - origin.y;
      const along = vx * dirX + vy * dirY;
      const distance = Math.hypot(vx, vy);
      return { token, distance, along, jitter: Math.random() };
    })
    .filter(({ along }) => along >= 0)
    .sort((a, b) => a.distance - b.distance || a.jitter - b.jitter);
}

/**
 * Candidates within `BEAM_WIDTH_FACTOR` grid units of the ray from `origin`
 * through `aim` and beyond, ranked by how far along that ray they sit —
 * the beeline "pierces" `origin` -> `aim` -> whatever's standing behind it.
 * Anything behind `origin` (the wrong side of the muzzle) or off to the side
 * of the ray is excluded entirely, not just deprioritized.
 */
function rankByBeam(candidates, scene, origin, aim) {
  const dx = aim.x - origin.x;
  const dy = aim.y - origin.y;
  const length = Math.hypot(dx, dy);
  if (!length) return [];
  const dirX = dx / length;
  const dirY = dy / length;
  const beamWidth = scene.grid.size * BEAM_WIDTH_FACTOR;

  return candidates
    .map((token) => {
      const center = tokenCenter(scene, token);
      const vx = center.x - origin.x;
      const vy = center.y - origin.y;
      const along = vx * dirX + vy * dirY;
      const perp = Math.abs(vx * dirY - vy * dirX);
      return { token, along, perp, jitter: Math.random() };
    })
    .filter(({ along, perp }) => along >= 0 && perp <= beamWidth)
    .sort((a, b) => a.along - b.along || a.jitter - b.jitter);
}

/**
 * Kill `total` points' worth of xenos on `sceneId`, spending the pool
 * closest-first per the weapon's Kill Mode — see rollDamage() in
 * documents/item.mjs, which snapshots this payload into the damage roll's
 * ChatMessage as `flags.xdz.autoKill`. GM-only: called from the
 * `createChatMessage` hook in xdz.mjs, gated on `game.user.isGM`.
 *   - normal:    closest to the attacker's own token, restricted to the half
 *                facing the target(s) — no killing something behind the
 *                marine's back just because it's as close as the real threat.
 *   - explosive: closest to the target(s) (blast radius centered on target).
 *   - piercing:  closest along the beeline from attacker through target and
 *                out the other side (hits whoever's standing behind it too).
 * `targetPoints` (rollAttack()-time position snapshot, same index order as
 * `targetIds`) is the aim fallback once a targeted token has already been
 * killed and deleted by an earlier roll on the same attack (Roll Damage,
 * then Spray and Pray) — keeps the follow-up shot aimed the same direction
 * instead of losing it once the token it was id-linked to is gone.
 */
export async function autoKillXenos({ total, sceneId, actorTokenId, dieMode, targetIds, targetPoints }) {
  if (!game.settings.get('xdz', 'autoKillOnDamage')) return;
  if (!(total > 0)) return;

  const scene = game.scenes.get(sceneId);
  if (!scene) return;

  const candidates = scene.tokens.filter((t) => t.actor?.type === 'xeno');
  if (!candidates.length) return;

  const attacker = actorTokenId ? scene.tokens.get(actorTokenId) : null;
  const attackerCenter = attacker ? tokenCenter(scene, attacker) : null;
  const targetTokens = (targetIds ?? []).map((id) => scene.tokens.get(id)).filter(Boolean);
  // Aim points, preferring each target's live position but falling back to
  // its rollAttack()-time snapshot (targetPoints, same index order as
  // targetIds) once a follow-up roll (e.g. Spray and Pray after Roll Damage)
  // finds the token already dead and deleted by an earlier roll on this same
  // attack — otherwise the shot loses its direction entirely instead of
  // still landing where it was aimed.
  const aimPoints = (targetIds ?? [])
    .map((id, i) => {
      const token = scene.tokens.get(id);
      if (token) return tokenCenter(scene, token);
      return targetPoints?.[i] ?? null;
    })
    .filter(Boolean);

  let ranked;
  if (dieMode === 'explosive') {
    const origin = centroid(aimPoints);
    if (!origin) return;
    ranked = rankByRadius(candidates, scene, origin);
  } else if (dieMode === 'piercing') {
    if (!attackerCenter || !aimPoints.length) return;
    ranked = rankByBeam(candidates, scene, attackerCenter, aimPoints[0]);
  } else {
    if (!attackerCenter) return;
    const aim = aimPoints.length ? aimPoints[0] : null;
    ranked = rankByRadiusForward(candidates, scene, attackerCenter, aim);
  }
  if (!ranked.length) return;

  // A hit landed on the targeted token(s) — guarantee they're first in line
  // for the budget, ahead of any incidental xeno that just happens to sit
  // closer to the attacker/blast-origin/beam. Stable sort preserves each
  // group's existing spatial order.
  const targetedIds = new Set(targetTokens.filter((t) => t.actor?.type === 'xeno').map((t) => t.id));
  if (targetedIds.size) {
    ranked.sort((a, b) => {
      const aTargeted = targetedIds.has(a.token.id);
      const bTargeted = targetedIds.has(b.token.id);
      return aTargeted === bTargeted ? 0 : aTargeted ? -1 : 1;
    });
  }

  const killedIds = [];
  let budget = total;
  for (const { token } of ranked) {
    const cost = Math.max(1, token.actor?.system?.threat ?? 1);
    if (cost > budget) break;
    killedIds.push(token.id);
    budget -= cost;
  }

  if (killedIds.length) {
    const killedTokens = killedIds.map((id) => scene.tokens.get(id)).filter(Boolean);
    await Promise.all(killedTokens.map((token) => markDead(token)));
    // Beat for blood-splatter-style modules to react to the death status
    // before the token (and its splatter anchor) is removed from canvas.
    await new Promise((resolve) => setTimeout(resolve, DEATH_VFX_DELAY_MS));
    await scene.deleteEmbeddedDocuments('Token', killedIds);
  }
}
