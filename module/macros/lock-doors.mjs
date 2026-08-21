import { rollLocationPoint, applyGmSecrecy, show3d, createRolledMessage } from './location-roll.mjs';

// Quadrant points sit inset from the room's actual edge, not on it (cross
// layout, 20%/80% of the tile box — see CONFIG.XDZ.tileQuadrants). Rooms
// default to a 12x~16.6-cell nominal box (DEFAULT_SIZE_CELLS in
// map-generator.mjs), so that 20% inset alone is already ~2.4-3.3 cells
// before counting any extra gap between the box and a smaller/differently-
// proportioned piece of art centered inside it (see #buildTiles' contain-
// fit) — 3 cells of search radius was routinely short of the real door,
// producing false NO DOOR misses even on rooms that do have one. This is
// generous enough to clear that inset with room to spare, still well short
// of reaching into a neighboring room's own doors on a default-size map.
const DOOR_SEARCH_RADIUS_CELLS = 8;

const STATUS_LABELS = {
  locked: 'XDZ.Chat.LockedTag',
  duplicate: 'XDZ.Chat.AlreadyLockedTag',
  noDoor: 'XDZ.Chat.NoDoorTag',
  noTile: 'XDZ.Chat.NoTileTag',
};

/** Closest door Wall (any `door` type) to a LOCATION ROLL's quadrant point, within DOOR_SEARCH_RADIUS_CELLS grid cells — or null if that side has no door (map edge, dead end). */
function nearestDoorWall(point) {
  const radius = canvas.grid.size * DOOR_SEARCH_RADIUS_CELLS;
  let best = null;
  let bestDist = Infinity;
  for (const wall of canvas.scene.walls) {
    if (!wall.door) continue;
    const [x1, y1, x2, y2] = wall.c;
    const dist = Math.hypot((x1 + x2) / 2 - point.x, (y1 + y2) / 2 - point.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = wall;
    }
  }
  return bestDist <= radius ? best : null;
}

/**
 * Homebrew "SECURITY LOCKDOWN": 2D4 doors start LOCKED. Each is picked by a
 * full LOCATION ROLL (KB §5, AREA/LOCATION/QUADRANT), the QUADRANT die
 * reused as the compass side of that LOCATION whose door gets locked — the
 * nearest generated door Wall to that roll's quadrant point (see
 * rollLocationPoint / CONFIG.XDZ.tileQuadrants). A roll that lands on a
 * side with no door, or re-picks a Wall already locked this call (which
 * also naturally catches "the south of one location is the north of the
 * other" — same shared Wall from either side), is not re-rolled: it's
 * already locked, so it just counts toward the 2D4 and moves to the next.
 * Exposed as `xdz.macros.lockDoors()` for a hotbar macro.
 */
export async function lockDoors() {
  if (!canvas.scene) return ui.notifications.warn(game.i18n.localize('XDZ.Notifications.NoActiveScene'));

  const countRoll = await new Roll('2d4').evaluate();
  await show3d(countRoll);

  const locationRolls = [];
  const attempts = [];
  const lockedWallIds = new Set();
  const updates = [];

  for (let i = 0; i < countRoll.total; i++) {
    const { roll: locRoll, point, area, location, quadrantDie, quadrant, label, locationId } = await rollLocationPoint();
    locationRolls.push(locRoll);

    const wall = point ? nearestDoorWall(point) : null;
    const status = !point ? 'noTile' : !wall ? 'noDoor' : lockedWallIds.has(wall.id) ? 'duplicate' : 'locked';

    if (status === 'locked') {
      lockedWallIds.add(wall.id);
      if (wall.ds !== CONST.WALL_DOOR_STATES.LOCKED) updates.push({ _id: wall.id, ds: CONST.WALL_DOOR_STATES.LOCKED });
    }

    attempts.push({
      hasLocation: !!point,
      area,
      location,
      quadrantDie,
      areaLabel: point ? game.i18n.format('XDZ.MapGenerator.Area', { area }) : null,
      label: point ? game.i18n.localize(label) : null,
      quadrantWord: point ? game.i18n.localize(`XDZ.Direction.${quadrant}`) : null,
      locationId,
      spend: status === 'locked',
      statusLabel: game.i18n.localize(STATUS_LABELS[status]),
    });
  }

  if (updates.length) await canvas.scene.updateEmbeddedDocuments('Wall', updates);

  const content = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/lock-doors-card.hbs', {
    theme: game.settings.get('xdz', 'sheetTheme'),
    total: countRoll.total,
    lockedCount: lockedWallIds.size,
    attempts,
  });

  await createRolledMessage(applyGmSecrecy({
    speaker: ChatMessage.getSpeaker(),
    content,
    rolls: [countRoll, ...locationRolls],
  }));
}
