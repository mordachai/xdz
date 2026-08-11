const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ApplicationV2 } = foundry.applications.api;

// Native tile art is 2230x1611 (ratio ~1.3845) — cell height derived from
// this so tiles never letterbox/crop.
const CELL_WIDTH = 800;
const CELL_HEIGHT = Math.round((CELL_WIDTH * 1611) / 2230);

const LOCATION_COUNT = 16;

// Chance, per step, to branch off a random earlier cell instead of
// extending the newest one — see KB Maps diagram: "normal to connect to
// 1 or 2, sometimes only to 3 (~10% chance)".
const BRANCH_CHANCE = 0.1;

const DIRECTIONS = [
  { dc: 0, dr: -1 }, // N
  { dc: 1, dr: 0 }, // E
  { dc: 0, dr: 1 }, // S
  { dc: -1, dr: 0 }, // W
];

// KB's example diagram draws these as the 4-way junction piece of their
// AREA — whichever cell the grown layout gave the most neighbors gets one
// of these instead of a random pick.
const HUB_LOCATIONS = { ship: 'crawlspace', colony: 'substructure' };

// One outline color per AREA (1-4) — cycles if ever >4 areas.
const AREA_COLORS = ['#ff5555', '#55ff55', '#5599ff', '#ffdd55'];

// Compass order matching DIRECTIONS' index (N,E,S,W) — used to rotate a
// location's `sides` list by 90/180/270 (see fitsRotation below).
const CYCLE = ['N', 'E', 'S', 'W'];

/** Does `sides`, rotated `k` quarter-turns clockwise, cover every direction in `cellDirs`? */
function fitsRotation(cellDirs, sides, k) {
  const rotated = new Set(sides.map((s) => CYCLE[(CYCLE.indexOf(s) + k) % 4]));
  return cellDirs.every((d) => rotated.has(d));
}

export function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Growing-Tree walk: place LOCATION_COUNT cells on an unbounded grid, one
 * at a time, each attached to an existing cell's open N/E/S/W neighbor.
 * Mostly extends the most-recently-placed cell (long corridor-like runs —
 * the S/Z/L/I shapes in the KB's AREA diagram); occasionally (BRANCH_CHANCE)
 * extends a random earlier cell instead, creating a 3-way junction. This
 * reproduces the book's hand-drawn organic AREA shapes instead of a filled
 * square, where most locations touch only 1-2 neighbors.
 * @returns {{col: number, row: number}[]|null} Placement order, or null if
 *   the walk dead-ended (retried by the caller).
 */
function growLayout(count = LOCATION_COUNT, branchChance = BRANCH_CHANCE) {
  const occupied = new Set(['0,0']);
  const path = [{ col: 0, row: 0 }];
  const frontier = [{ col: 0, row: 0 }];

  while (path.length < count) {
    if (!frontier.length) return null;
    const useNewest = Math.random() >= branchChance;
    const index = useNewest ? frontier.length - 1 : Math.floor(Math.random() * frontier.length);
    const cell = frontier[index];

    const options = DIRECTIONS.map(({ dc, dr }) => ({ col: cell.col + dc, row: cell.row + dr })).filter(
      (n) => !occupied.has(`${n.col},${n.row}`),
    );

    if (!options.length) {
      frontier.splice(index, 1);
      continue;
    }

    const next = options[Math.floor(Math.random() * options.length)];
    occupied.add(`${next.col},${next.row}`);
    path.push(next);
    frontier.push(next);
  }

  return path;
}

/**
 * Builds one organic MAP scene (KB §8: 16 LOCATIONS grouped into 4 AREAS
 * of 4, each further split into 4 QUADRANTS) from the STARSHIP or COLONY
 * location set, in Color or B&W. Each LOCATION becomes its own Tile (not a
 * flattened background) so fog/vision/hide-mode stays workable per-cell,
 * and every pair of tiles that end up touching gets a closed door Wall,
 * matching "any two touching locations are connected by a DOOR." QUADRANT
 * (N/E/S/W) is not a separate tile — it's a sub-point inside a single
 * location's tile, stored on the tile's flags for a future Location Roll
 * macro to target.
 */
export default class MapGenerator extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'xdz-map-generator',
    classes: ['xdz', 'map-generator'],
    tag: 'form',
    window: { title: 'XDZ.MapGenerator.Title', icon: 'fa-solid fa-map' },
    position: { width: 360, height: 'auto' },
    form: { handler: MapGenerator._onSubmit, submitOnChange: false, closeOnSubmit: true },
    actions: {},
  };

  static PARTS = {
    form: { template: 'systems/xdz/templates/apps/map-generator.hbs' },
  };

  /** @override */
  async _prepareContext(options) {
    return {
      type: 'ship',
      style: 'color',
      name: MapGenerator.suggestName(),
    };
  }

  /** Next unused "Locations X" letter, scanning existing scene names A-Z. */
  static suggestName() {
    const used = new Set(
      game.scenes
        .filter((s) => /^Locations [A-Z]$/.test(s.name))
        .map((s) => s.name.slice(-1)),
    );
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i);
      if (!used.has(letter)) return `Locations ${letter}`;
    }
    return 'Locations';
  }

  static async _onSubmit(event, form, formData) {
    const { type, style, name } = formData.object;
    const scene = await MapGenerator.build({ type, style, name });
    scene.sheet.render(true);
  }

  /**
   * Grow an organic 16-cell layout (see growLayout) and assign each of
   * `type`'s 16 canonical locations to a cell: the hub location goes on
   * the highest-degree cell, side-restricted locations (config `sides`)
   * only on cells whose actual neighbor directions fit within `sides`
   * after some 90/180/270 rotation, everything else fills the remainder
   * at random. Returns null (retried by build()) if the layout dead-ended
   * or a side-restricted location couldn't find a fitting cell — unless
   * `forced`, which seats leftover restricted locations anywhere as a
   * last resort so build() never loops forever.
   */
  static #attemptLayout(type, forced) {
    const locations = CONFIG.XDZ.locations[type];
    const hubId = HUB_LOCATIONS[type];
    const hubLoc = locations.find((l) => l.id === hubId);
    const rest = locations.filter((l) => l.id !== hubId);
    const restricted = shuffleArray(rest.filter((l) => l.sides));
    const open = shuffleArray(rest.filter((l) => !l.sides));

    const layout = growLayout();
    if (!layout) return null;

    const minCol = Math.min(...layout.map((c) => c.col));
    const minRow = Math.min(...layout.map((c) => c.row));
    const maxCol = Math.max(...layout.map((c) => c.col));
    const maxRow = Math.max(...layout.map((c) => c.row));

    const normalized = layout.map((c) => ({ col: c.col - minCol, row: c.row - minRow }));
    const occupied = new Set(normalized.map((c) => `${c.col},${c.row}`));
    const neighborDirs = normalized.map((cell) =>
      DIRECTIONS.reduce((dirs, { dc, dr }, i) => {
        if (occupied.has(`${cell.col + dc},${cell.row + dr}`)) dirs.push(CYCLE[i]);
        return dirs;
      }, []),
    );

    // Seat the hub location on whichever cell the walk actually gave the
    // most neighbors to (ties keep the first one found).
    let hubIndex = 0;
    let bestDegree = -1;
    neighborDirs.forEach((dirs, i) => {
      if (dirs.length > bestDegree) {
        bestDegree = dirs.length;
        hubIndex = i;
      }
    });

    const slot = new Array(normalized.length).fill(null);
    slot[hubIndex] = { loc: hubLoc, rotation: 0 };
    let pool = shuffleArray(normalized.map((_, i) => i).filter((i) => i !== hubIndex));

    for (const loc of restricted) {
      const candidates = [];
      for (const idx of pool) {
        for (let k = 0; k < 4; k++) {
          if (fitsRotation(neighborDirs[idx], loc.sides, k)) candidates.push({ idx, k });
        }
      }
      if (!candidates.length) {
        if (!forced) return null;
        const idx = pool[0];
        slot[idx] = { loc, rotation: 0 };
        pool = pool.filter((i) => i !== idx);
        continue;
      }
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      slot[pick.idx] = { loc, rotation: pick.k * 90 };
      pool = pool.filter((i) => i !== pick.idx);
    }

    pool.forEach((idx, i) => {
      slot[idx] = { loc: open[i], rotation: 0 };
    });

    const cells = normalized.map((c, index) => ({
      col: c.col,
      row: c.row,
      area: Math.floor(index / 4) + 1,
      location: (index % 4) + 1,
      loc: slot[index].loc,
      rotation: slot[index].rotation,
    }));

    return { cells, occupied, minCol, minRow, maxCol, maxRow };
  }

  /**
   * Build a full layout (retrying up to 40 times so side-restricted
   * locations get a fitting cell), then create the Scene, its 16 location
   * Tiles (each tagged with AREA/LOCATION/QUADRANT metadata and rotated
   * to match its assigned cell), and a closed door Wall for every touching
   * pair of tiles.
   */
  static async build({ type, style, name }) {
    let result = null;
    for (let attempt = 0; attempt < 40 && !result; attempt++) result = MapGenerator.#attemptLayout(type, false);
    if (!result) result = MapGenerator.#attemptLayout(type, true);
    if (!result) throw new Error('XDZ | MapGenerator: failed to build a 16-cell layout.');

    const { cells, occupied, minCol, minRow, maxCol, maxRow } = result;

    const scene = await Scene.create({
      name,
      width: (maxCol - minCol + 1) * CELL_WIDTH,
      height: (maxRow - minRow + 1) * CELL_HEIGHT,
      grid: { type: CONST.GRID_TYPES.SQUARE, size: 75 },
      levels: [{ name: 'Level', background: { color: '#0f0f0f' } }],
      padding: 0,
      tokenVision: false,
      fogExploration: false,
    });

    const tiles = cells.map((cell) => {
      const x0 = cell.col * CELL_WIDTH;
      const y0 = cell.row * CELL_HEIGHT;
      const quadrants = Object.fromEntries(
        Object.entries(CONFIG.XDZ.tileQuadrants).map(([compass, frac]) => [
          compass,
          { x: x0 + frac.x * CELL_WIDTH, y: y0 + frac.y * CELL_HEIGHT },
        ]),
      );
      return {
        // Tile x/y is the texture anchor point (default center, 0.5/0.5),
        // not the top-left corner — center it on the cell so `rotation`
        // spins the art in place instead of swinging it off the cell.
        x: x0 + CELL_WIDTH / 2,
        y: y0 + CELL_HEIGHT / 2,
        width: CELL_WIDTH,
        height: CELL_HEIGHT,
        rotation: cell.rotation,
        texture: { src: `systems/xdz/assets/locations/${style}/${cell.loc[style]}` },
        flags: {
          xdz: {
            locationId: cell.loc.id,
            label: cell.loc.label,
            area: cell.area,
            location: cell.location,
            quadrants,
          },
        },
      };
    });
    await scene.createEmbeddedDocuments('Tile', tiles);

    // A door wherever two placed cells actually touch — including
    // "accidental" adjacency from the walk looping near itself, per KB's
    // "any two touching locations are connected by a DOOR."
    const walls = [];
    for (const cell of cells) {
      const eastKey = `${cell.col + 1},${cell.row}`;
      if (occupied.has(eastKey)) {
        const x = (cell.col + 1) * CELL_WIDTH;
        walls.push({
          c: [x, cell.row * CELL_HEIGHT, x, (cell.row + 1) * CELL_HEIGHT],
          door: CONST.WALL_DOOR_TYPES.DOOR,
          ds: CONST.WALL_DOOR_STATES.CLOSED,
        });
      }
      const southKey = `${cell.col},${cell.row + 1}`;
      if (occupied.has(southKey)) {
        const y = (cell.row + 1) * CELL_HEIGHT;
        walls.push({
          c: [cell.col * CELL_WIDTH, y, (cell.col + 1) * CELL_WIDTH, y],
          door: CONST.WALL_DOOR_TYPES.DOOR,
          ds: CONST.WALL_DOOR_STATES.CLOSED,
        });
      }
    }
    await scene.createEmbeddedDocuments('Wall', walls);

    // Rectangle Drawing around each AREA's bounding box (its 4 LOCATION
    // cells), per KB §8 nesting — organic layout means the box can include
    // gaps not owned by that AREA, but it still frames where the cluster is.
    const byArea = new Map();
    for (const cell of cells) {
      if (!byArea.has(cell.area)) byArea.set(cell.area, []);
      byArea.get(cell.area).push(cell);
    }
    const drawings = Array.from(byArea.entries()).map(([area, areaCells]) => {
      const aMinCol = Math.min(...areaCells.map((c) => c.col));
      const aMinRow = Math.min(...areaCells.map((c) => c.row));
      const aMaxCol = Math.max(...areaCells.map((c) => c.col));
      const aMaxRow = Math.max(...areaCells.map((c) => c.row));
      return {
        shape: {
          type: foundry.data.ShapeData.TYPES.RECTANGLE,
          width: (aMaxCol - aMinCol + 1) * CELL_WIDTH,
          height: (aMaxRow - aMinRow + 1) * CELL_HEIGHT,
        },
        x: aMinCol * CELL_WIDTH,
        y: aMinRow * CELL_HEIGHT,
        strokeColor: AREA_COLORS[(area - 1) % AREA_COLORS.length],
        strokeWidth: 8,
        strokeAlpha: 0.15,
        text: `Area ${area}`,
        textColor: AREA_COLORS[(area - 1) % AREA_COLORS.length],
      };
    });
    await scene.createEmbeddedDocuments('Drawing', drawings);

    return scene;
  }

  /**
   * One-off convenience: build the 4 demo scenes "Locations A-D", one per
   * type/style combo, so all 4 asset sets get exercised without any image
   * reused across scenes. Run once from the console (world loaded, as GM):
   *   await xdz.apps.MapGenerator.buildDemoSet()
   */
  static async buildDemoSet() {
    const combos = [
      { letter: 'A', type: 'ship', style: 'color' },
      { letter: 'B', type: 'ship', style: 'bw' },
      { letter: 'C', type: 'colony', style: 'color' },
      { letter: 'D', type: 'colony', style: 'bw' },
    ];
    const scenes = [];
    for (const { letter, type, style } of combos) {
      scenes.push(await MapGenerator.build({ type, style, name: `Locations ${letter}` }));
    }
    return scenes;
  }
}
