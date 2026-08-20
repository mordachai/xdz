// Bounding rectangles per AREA/LOCATION rely on each Tile's `quadrants` flag
// (see CONFIG.XDZ.tileQuadrants) rather than the Tile document's own x/y —
// quadrants are baked from the cell's *unrotated*, display-scaled footprint
// (MapGenerator#buildTiles), so reversing the N/E/S/W fractions (0.2 / 0.8)
// back out the cell's axis-aligned rect regardless of how the location art
// itself got rotated (or scaled to its real size) to fit its cell.
function tileRect(quadrants) {
  const width = (quadrants.E.x - quadrants.W.x) / 0.6;
  const height = (quadrants.S.y - quadrants.N.y) / 0.6;
  return { x: quadrants.W.x - 0.2 * width, y: quadrants.N.y - 0.2 * height, width, height };
}

function unionRect(rects) {
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.width));
  const y1 = Math.max(...rects.map((r) => r.y + r.height));
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

// One fixed color per AREA (1-4) — legend text and its AREA's rectangle
// always share this color, so a location's label immediately reads as
// "belongs to that outline" without a separate key.
const AREA_COLORS = { 1: 0x00e5ff, 2: 0xffb300, 3: 0x7cff00, 4: 0xff3b6b };

let legendContainer = null;

/** Removes the current scene's overlay, if any — safe to call with nothing drawn. */
export function clearAreaLegends() {
  if (!legendContainer) return;
  legendContainer.destroy({ children: true });
  legendContainer = null;
}

// The overlay is per-scene and purely visual (never saved to any Document),
// so it's dropped on every scene swap rather than left dangling on a canvas
// it no longer describes.
Hooks.on('canvasReady', clearAreaLegends);

/**
 * Draws a per-client overlay on the current scene (purely visual, never
 * saved to any Document — see the canvasReady hook below): one outlined
 * rectangle per AREA (1-4, each its own fixed color) labeled "Area N", plus
 * every LOCATION tile's name in its bottom-right corner, colored to match
 * its AREA. Re-running replaces any overlay already drawn.
 */
export async function drawAreaLegends() {
  if (!canvas.scene) return ui.notifications.warn(game.i18n.localize('XDZ.Notifications.NoActiveScene'));

  const tiles = canvas.scene.tiles.filter((t) => t.getFlag('xdz', 'area') && t.getFlag('xdz', 'quadrants'));
  if (!tiles.length) return ui.notifications.warn(game.i18n.localize('XDZ.Notifications.NoLocationTiles'));

  clearAreaLegends();

  await document.fonts.load('40px "Bruno Ace"');
  await document.fonts.ready;

  legendContainer = new PIXI.Container();
  legendContainer.eventMode = 'none';
  canvas.interface.addChild(legendContainer);

  const byArea = new Map();
  for (const tile of tiles) {
    const area = tile.getFlag('xdz', 'area');
    const rect = tileRect(tile.getFlag('xdz', 'quadrants'));
    if (!byArea.has(area)) byArea.set(area, []);
    byArea.get(area).push({ tile, rect });
  }

  for (const [area, entries] of byArea) {
    const color = AREA_COLORS[area] ?? 0xffffff;
    const bounds = unionRect(entries.map((e) => e.rect));

    const outline = new PIXI.Graphics();
    outline.lineStyle(8, color, 0.9);
    outline.drawRect(bounds.x + 4, bounds.y + 4, bounds.width - 8, bounds.height - 8);
    legendContainer.addChild(outline);

    const areaText = new PIXI.Text(game.i18n.format('XDZ.MapGenerator.Area', { area }), {
      fontFamily: 'Bruno Ace',
      fontSize: 52,
      fill: color,
      stroke: 0x000000,
      strokeThickness: 6,
    });
    areaText.anchor.set(0, 0);
    areaText.position.set(bounds.x + 20, bounds.y + 14);
    legendContainer.addChild(areaText);

    for (const { tile, rect } of entries) {
      const label = game.i18n.localize(tile.getFlag('xdz', 'label') ?? tile.getFlag('xdz', 'locationId'));
      const locText = new PIXI.Text(label, {
        fontFamily: 'Bruno Ace',
        fontSize: 32,
        fill: color,
        stroke: 0x000000,
        strokeThickness: 5,
      });
      locText.anchor.set(1, 1);
      locText.position.set(rect.x + rect.width - 16, rect.y + rect.height - 12);
      legendContainer.addChild(locText);
    }
  }
}

/**
 * Flips the overlay on/off — the "Highlight Areas" hotbar macro calls this,
 * so clicking it once shows the overlay and clicking again hides it.
 */
export async function toggleAreaLegends() {
  if (legendContainer) return clearAreaLegends();
  return drawAreaLegends();
}

export const areaLegends = { draw: drawAreaLegends, clear: clearAreaLegends, toggle: toggleAreaLegends };
