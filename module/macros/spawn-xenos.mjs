import { rollLocationPoint, applyGmSecrecy } from './location-roll.mjs';

const XENO_UUID = 'Compendium.xdz.npcs.Actor.oKmxj2SQr4elMOb6'; // Xeno (drone)
const BREEDER_UUID = 'Compendium.xdz.npcs.Actor.jR4cSGznMxeiLvfz'; // Queen
const ROGUE_COMMAND_UUID = 'Compendium.xdz.npcs.Actor.3Vkief3qvIJShqBK'; // Rogue Command
const WICKED_UUID = 'Compendium.xdz.npcs.Actor.nJilHxm4gmAhgoxS'; // Wicked

/**
 * Resolve a compendium actor UUID to a world Actor, importing (and
 * caching, keyed by `_stats.compendiumSource`) on first use. An unlinked
 * token's `actor` getter only resolves through `game.actors.get(actorId)`
 * (see TokenDocument#baseActor) — a token built straight off a compendium
 * actor via `getTokenDocument()` ends up with an `actorId` the world
 * collection can't find, so `combatant.actor` (and anything reading it,
 * e.g. Combat Carousel grouping) comes back null. Core's canvas drag-drop
 * handler imports the actor first for the same reason; spawns must too.
 */
async function worldActor(uuid) {
  const existing = game.actors.find((a) => a._stats?.compendiumSource === uuid);
  if (existing) return existing;
  const packActor = await fromUuid(uuid);
  if (!packActor) return null;
  const data = game.actors.fromCompendium(packActor);
  return Actor.implementation.create(data, { fromCompendium: true });
}

/** Half the grid-space footprint of a spawned token, for centering on a spawn point. */
function tokenOffset(tokenDoc) {
  const size = canvas.grid.size;
  return { dx: (tokenDoc.width * size) / 2, dy: (tokenDoc.height * size) / 2 };
}

/**
 * Layout points for a group of tokens: first token sits on the spawn point
 * itself, the rest spiral outward in rings of up to 6 evenly-spaced points
 * (like a hex ring), so a multi-token group clusters around the location
 * instead of lining up in a row.
 */
function spiralOffsets(count, spacing) {
  const offsets = [{ dx: 0, dy: 0 }];
  let ring = 1;
  while (offsets.length < count) {
    const capacity = 6 * ring;
    const radius = ring * spacing;
    for (let i = 0; i < capacity && offsets.length < count; i++) {
      const angle = (2 * Math.PI * i) / capacity;
      offsets.push({ dx: radius * Math.cos(angle), dy: radius * Math.sin(angle) });
    }
    ring++;
  }
  return offsets;
}

/** Centroid of current COMMANDO tokens, for escalations that spawn "at the COMMANDOS' LOCATION" with no LOCATION ROLL (KB: `locationRolls: 0`). */
function commandoPoint() {
  const tokens = canvas.scene.tokens.filter((t) => ['commando', 'character'].includes(t.actor?.type));
  if (!tokens.length) return null;
  const size = canvas.grid.size;
  const x = tokens.reduce((sum, t) => sum + t.x + (t.width * size) / 2, 0) / tokens.length;
  const y = tokens.reduce((sum, t) => sum + t.y + (t.height * size) / 2, 0) / tokens.length;
  return { x, y };
}

/**
 * Builds `count` unlinked token data for `actor`, spiraled around `point`.
 * Actor-data overrides go through the token's ActorDelta, not a top-level
 * 'system' path.
 *
 * Under the "Play with a GM" world setting, a spawn's `forceSeek` flag also
 * drives its Foundry visibility: forced-SEEK groups (ambushes, and the
 * always-revealed escalation spawns) enter unhidden, everything else enters
 * Hidden so players don't see it land.
 */
async function buildTokenGroup(actor, count, point, { forceSeek = false } = {}) {
  const hidden = game.settings.get('xdz', 'playWithGM') && !forceSeek;
  const spiral = spiralOffsets(count, canvas.grid.size * 0.75);
  const data = [];
  for (let i = 0; i < count; i++) {
    const tokenDoc = await actor.getTokenDocument();
    const { dx, dy } = tokenOffset(tokenDoc);
    const { dx: ox, dy: oy } = spiral[i];
    tokenDoc.updateSource({ x: point.x - dx + ox, y: point.y - dy + oy, hidden });
    if (forceSeek) tokenDoc.delta.updateSource({ system: { mode: 'seek' } });
    data.push(tokenDoc.toObject());
  }
  return data;
}

/**
 * KB §5 "Roll to SPAWN xenos": 1D20 xenos enter, split evenly across 1D4
 * LOCATIONS (each placed by a full LOCATION ROLL). A xeno that spawns CLOSE
 * to a commando is an AMBUSH (KB: DEATH roll instead of the normal FEAR
 * reveal) and starts in SEEK, not HIDE. Exposed as `xdz.macros.spawnXenos()`
 * for a hotbar macro, called once per XENO turn alongside `rollEscalation`.
 */
export async function spawnXenos() {
  if (!canvas.scene) return ui.notifications.warn(game.i18n.localize('XDZ.Notifications.NoActiveScene'));

  const totalRoll = await new Roll('1d20').evaluate();
  const groupsRoll = await new Roll('1d4').evaluate();
  const total = totalRoll.total;
  const groupCount = groupsRoll.total;

  const base = Math.floor(total / groupCount);
  const remainder = total % groupCount;
  const counts = Array.from({ length: groupCount }, (_, i) => base + (i < remainder ? 1 : 0)).filter((c) => c > 0);

  const actor = await worldActor(XENO_UUID);
  if (!actor) return ui.notifications.error(game.i18n.format('XDZ.Notifications.CouldNotLoadActor', { uuid: XENO_UUID }));

  const commandoTokens = canvas.scene.tokens.filter((t) => ['commando', 'character'].includes(t.actor?.type));
  const groups = [];
  const allTokenData = [];
  const locationRolls = [];

  for (const count of counts) {
    const { roll: locRoll, point, area, location, quadrantDie, quadrant, label, locationId } = await rollLocationPoint();
    locationRolls.push(locRoll);
    if (!point) continue;

    const ambush = commandoTokens.some((t) => {
      const dx = t.x + (t.width * canvas.grid.size) / 2 - point.x;
      const dy = t.y + (t.height * canvas.grid.size) / 2 - point.y;
      return Math.hypot(dx, dy) <= canvas.grid.size * 1.5;
    });

    groups.push({ count, area, location, quadrantDie, quadrant, label, ambush, point, locationId });
    allTokenData.push(...(await buildTokenGroup(actor, count, point, { forceSeek: ambush })));
  }

  if (allTokenData.length) await canvas.scene.createEmbeddedDocuments('Token', allTokenData);

  const cardGroups = groups.map((g) => ({
    count: g.count,
    area: g.area,
    location: g.location,
    quadrantDie: g.quadrantDie,
    areaLabel: game.i18n.format('XDZ.MapGenerator.Area', { area: g.area }),
    label: game.i18n.localize(g.label),
    quadrantWord: game.i18n.localize(`XDZ.Direction.${g.quadrant}`),
    ambush: g.ambush,
    locationId: g.locationId,
  }));

  const content = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/spawn-card.hbs', {
    theme: game.settings.get('xdz', 'sheetTheme'),
    total,
    groupCount,
    groups: cardGroups,
  });

  await ChatMessage.create(applyGmSecrecy({
    speaker: ChatMessage.getSpeaker(),
    content,
    rolls: [totalRoll, groupsRoll, ...locationRolls],
  }));
}

/**
 * ESCALATION 5 "The Breeder": a Queen joins the fight via a LOCATION ROLL —
 * never on the commandos themselves. Only if the current OBJECTIVE is Kill
 * the Breeder (no state tracks that — GM confirms) does this become a
 * *second* giant Breeder XENO already on the scene; otherwise it's the first.
 */
export async function spawnBreeder() {
  if (!canvas.scene) return ui.notifications.warn(game.i18n.localize('XDZ.Notifications.NoActiveScene'));

  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize('XDZ.Escalation.BreederDialogTitle') },
    content: game.i18n.localize('XDZ.Escalation.BreederDialogContent'),
  });
  if (!confirmed) return;

  const { roll: locRoll, point, area, location, quadrantDie, quadrant, label, locationId } = await rollLocationPoint();
  if (!point) return;

  const actor = await worldActor(BREEDER_UUID);
  if (!actor) return ui.notifications.error(game.i18n.format('XDZ.Notifications.CouldNotLoadActor', { uuid: BREEDER_UUID }));

  const tokenData = await buildTokenGroup(actor, 1, point, { forceSeek: true });
  await canvas.scene.createEmbeddedDocuments('Token', tokenData);

  const content = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/spawn-card.hbs', {
    theme: game.settings.get('xdz', 'sheetTheme'),
    total: 1,
    groupCount: 1,
    groups: [
      {
        count: 1,
        area,
        location,
        quadrantDie,
        areaLabel: game.i18n.format('XDZ.MapGenerator.Area', { area }),
        label: game.i18n.localize(label),
        quadrantWord: game.i18n.localize(`XDZ.Direction.${quadrant}`),
        locationId,
      },
    ],
  });
  await ChatMessage.create(applyGmSecrecy({ speaker: ChatMessage.getSpeaker(), content, rolls: [locRoll] }));
}

/**
 * ESCALATION 7 "Rogue Commandos": 1D12 Rogue Command NPCs arrive via a
 * LOCATION ROLL, SEEKING, using XENO BEHAVIOR to move and attack.
 */
export async function spawnRogueCommandos() {
  if (!canvas.scene) return ui.notifications.warn(game.i18n.localize('XDZ.Notifications.NoActiveScene'));

  const countRoll = await new Roll('1d12').evaluate();
  const { roll: locRoll, point, area, location, quadrantDie, quadrant, label, locationId } = await rollLocationPoint();
  if (!point) return;

  const actor = await worldActor(ROGUE_COMMAND_UUID);
  if (!actor) return ui.notifications.error(game.i18n.format('XDZ.Notifications.CouldNotLoadActor', { uuid: ROGUE_COMMAND_UUID }));

  const tokenData = await buildTokenGroup(actor, countRoll.total, point, { forceSeek: true });
  await canvas.scene.createEmbeddedDocuments('Token', tokenData);

  const content = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/spawn-card.hbs', {
    theme: game.settings.get('xdz', 'sheetTheme'),
    total: countRoll.total,
    groupCount: 1,
    groups: [
      {
        count: countRoll.total,
        area,
        location,
        quadrantDie,
        areaLabel: game.i18n.format('XDZ.MapGenerator.Area', { area }),
        label: game.i18n.localize(label),
        quadrantWord: game.i18n.localize(`XDZ.Direction.${quadrant}`),
        locationId,
      },
    ],
  });
  await ChatMessage.create(applyGmSecrecy({ speaker: ChatMessage.getSpeaker(), content, rolls: [countRoll, locRoll] }));
}

/**
 * ESCALATION 10 "Something Wicked": one Wicked XENO arrives via a LOCATION
 * ROLL, terrifying and wicked fast — its attacks hit all NEAR COMMANDOS at
 * once, so it starts SEEKING like an ambush.
 */
export async function spawnWicked() {
  if (!canvas.scene) return ui.notifications.warn(game.i18n.localize('XDZ.Notifications.NoActiveScene'));

  const { roll: locRoll, point, area, location, quadrantDie, quadrant, label, locationId } = await rollLocationPoint();
  if (!point) return;

  const actor = await worldActor(WICKED_UUID);
  if (!actor) return ui.notifications.error(game.i18n.format('XDZ.Notifications.CouldNotLoadActor', { uuid: WICKED_UUID }));

  const tokenData = await buildTokenGroup(actor, 1, point, { forceSeek: true });
  await canvas.scene.createEmbeddedDocuments('Token', tokenData);

  const content = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/spawn-card.hbs', {
    theme: game.settings.get('xdz', 'sheetTheme'),
    total: 1,
    groupCount: 1,
    groups: [
      {
        count: 1,
        area,
        location,
        quadrantDie,
        areaLabel: game.i18n.format('XDZ.MapGenerator.Area', { area }),
        label: game.i18n.localize(label),
        quadrantWord: game.i18n.localize(`XDZ.Direction.${quadrant}`),
        locationId,
      },
    ],
  });
  await ChatMessage.create(applyGmSecrecy({ speaker: ChatMessage.getSpeaker(), content, rolls: [locRoll] }));
}

/**
 * ESCALATION 15 "Swarm!": 1D12 XENOS arrive immediately at the COMMANDOS'
 * LOCATION — no LOCATION ROLL (KB: `locationRolls: 0`), forced SEEK/ambush.
 */
export async function spawnSwarm() {
  if (!canvas.scene) return ui.notifications.warn(game.i18n.localize('XDZ.Notifications.NoActiveScene'));

  const point = commandoPoint();
  if (!point) return ui.notifications.warn(game.i18n.localize('XDZ.Notifications.NoCommandoTokens'));

  const countRoll = await new Roll('1d12').evaluate();
  const actor = await worldActor(XENO_UUID);
  if (!actor) return ui.notifications.error(game.i18n.format('XDZ.Notifications.CouldNotLoadActor', { uuid: XENO_UUID }));

  const tokenData = await buildTokenGroup(actor, countRoll.total, point, { forceSeek: true });
  await canvas.scene.createEmbeddedDocuments('Token', tokenData);
  await ChatMessage.create(applyGmSecrecy({
    speaker: ChatMessage.getSpeaker(),
    content: `<p>${game.i18n.format('XDZ.Escalation.SwarmErupts', { count: countRoll.total })}</p>`,
    rolls: [countRoll],
  }));
}
