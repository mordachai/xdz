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
 * A LOCATION ROLL is 3D4 read in sequence: AREA, LOCATION, QUADRANT (see
 * CONFIG.XDZ comments), resolved against the tile flags baked on by
 * MapGenerator. Returns `point: null` (after warning) if no tile matches.
 * Shared by spawn-xenos.mjs (placing tokens) and `rollLocation` below (a
 * bare LOCATION ROLL with no spawn attached).
 */
export async function rollLocationPoint() {
  const roll = await new Roll('3d4').evaluate();
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
 * for a GM hotbar macro.
 */
export async function rollLocation() {
  if (!game.user.isGM) return;
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

  await ChatMessage.create(applyGmSecrecy({ speaker: ChatMessage.getSpeaker(), content, rolls: [roll] }));
}
