// Quadrant roll order matches CONFIG.XDZ.tileQuadrants' key order (N,E,S,W)
// and MapGenerator's DIRECTIONS array — 1D4 maps 1:1 onto it.
const QUADRANTS = ['N', 'E', 'S', 'W'];

/**
 * GM-only whisper for chat data when "Play with a GM" is on. Drops `rolls`
 * rather than just whispering: a whispered message that still carries Roll
 * data gets Foundry's "X privately rolled some dice" / "???" stub rendered
 * for every excluded player regardless of rollMode (gmroll or blindroll
 * alike) — the only way to hide it completely is to not attach the rolls at
 * all. Safe here because chat-card content already bakes the resolved
 * numbers into plain text/HTML, not inline roll formulas.
 */
export function applyGmSecrecy(data) {
  if (!game.settings.get('xdz', 'playWithGM')) return data;
  data.whisper = ChatMessage.getWhisperRecipients('GM').map((u) => u.id);
  delete data.rolls;
  return data;
}

/**
 * Play Dice So Nice's animation for `roll` and wait for it to finish before
 * the caller renders a chat card. `Roll#evaluate` resolves the total
 * instantly — without this, the card's total (baked straight into template
 * HTML, not a native roll-formula element DsN can blur) shows well before
 * or during the animation instead of after it.
 */
export async function show3d(roll) {
  if (!game.dice3d) return;
  const whisper = game.settings.get('xdz', 'playWithGM') ? ChatMessage.getWhisperRecipients('GM').map((u) => u.id) : null;
  await game.dice3d.showForRoll(roll, game.user, true, whisper, false);
}

/**
 * Create `data` as a chat message without letting Dice So Nice animate the
 * rolls it carries a second time — every caller here has already played
 * each roll's animation once via `show3d()`, but DsN's own `createChatMessage`
 * hook doesn't know that and would otherwise fire a second, automatic 3D
 * roll for the same dice the moment the message posts.
 */
export async function createRolledMessage(data) {
  const dsn = game.dice3d;
  if (dsn) dsn.messageHookDisabled = true;
  try {
    // ChatMessage#_preCreate auto-assigns CONFIG.sounds.dice whenever `rolls`
    // is non-empty and `data` has no `sound` key; DsN's own hook (skipped
    // above) normally strips that before playing its own roll sound, so
    // without this it plays on top of show3d()'s sound.
    return await ChatMessage.create({ sound: null, ...data });
  } finally {
    if (dsn) dsn.messageHookDisabled = false;
  }
}

/**
 * A LOCATION ROLL is 3D4 read in sequence: AREA, LOCATION, QUADRANT (see
 * CONFIG.XDZ comments), resolved against the tile flags baked on by
 * MapGenerator. Returns `point: null` (after warning) if no tile matches.
 * Shared by spawn-xenos.mjs (placing tokens) and `rollLocation` below (a
 * bare LOCATION ROLL with no spawn attached).
 */
export async function rollLocationPoint({ animate = true } = {}) {
  const roll = await new Roll('3d4').evaluate();
  if (animate) await show3d(roll);
  const [area, location, quadrantDie] = roll.dice[0].results.map((r) => r.result);
  const quadrant = QUADRANTS[quadrantDie - 1];

  const tile = canvas.scene.tiles.find((t) => t.getFlag('xdz', 'area') === area && t.getFlag('xdz', 'location') === location);
  if (!tile) {
    ui.notifications.warn(game.i18n.format('XDZ.Notifications.NoTileForArea', { area, location }));
    return { roll, point: null };
  }
  const point = tile.getFlag('xdz', 'quadrants')?.[quadrant];
  const locationId = tile.getFlag('xdz', 'locationId');
  const label = tile.getFlag('xdz', 'label') ?? locationId;
  return { roll, point, area, location, quadrantDie, quadrant, label, locationId };
}

/**
 * Bare LOCATION ROLL (KB §5) with no spawn attached: posts the same
 * AREA/LOCATION/QUADRANT chat card as a XENO SPAWN group, whose location
 * name pans the GM's view when clicked. Exposed as `xdz.macros.rollLocation()`
 * for a hotbar macro.
 */
export async function rollLocation() {
  if (!canvas.scene) return ui.notifications.warn(game.i18n.localize('XDZ.Notifications.NoActiveScene'));

  const { roll, point, area, location, quadrantDie, quadrant, label, locationId } = await rollLocationPoint();
  if (!point) return;

  const content = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/location-card.hbs', {
    theme: game.settings.get('xdz', 'sheetTheme'),
    area,
    location,
    quadrantDie,
    areaLabel: game.i18n.format('XDZ.MapGenerator.Area', { area }),
    label: game.i18n.localize(label),
    quadrantWord: game.i18n.localize(`XDZ.Direction.${quadrant}`),
    locationId,
  });

  await createRolledMessage(applyGmSecrecy({ speaker: ChatMessage.getSpeaker(), content, rolls: [roll] }));
}
