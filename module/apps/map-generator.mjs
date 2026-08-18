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

// Compass order matching DIRECTIONS' index (N,E,S,W) — used to rotate a
// location's `sides` list by 90/180/270 (see fitsRotation below).
const CYCLE = ['N', 'E', 'S', 'W'];

/** Does `sides`, rotated `k` quarter-turns clockwise, cover every direction in `cellDirs`? */
function fitsRotation(cellDirs, sides, k) {
  const rotated = new Set(sides.map((s) => CYCLE[(CYCLE.indexOf(s) + k) % 4]));
  return cellDirs.every((d) => rotated.has(d));
}

/**
 * Per-compass-direction geometry for a door between `(col, row)` and its
 * neighbor, in a scene's local cell coordinates: the Wall segment on the
 * shared edge, and a half-cell Region rectangle just outside that edge (used
 * only for AREA scenes, to teleport a token that walks through a door
 * leading to a LOCATION that isn't in this scene).
 */
const EDGE = {
  E: {
    opposite: 'W',
    wall: (col, row) => [(col + 1) * CELL_WIDTH, row * CELL_HEIGHT, (col + 1) * CELL_WIDTH, (row + 1) * CELL_HEIGHT],
    region: (col, row) => ({ x: (col + 1) * CELL_WIDTH, y: row * CELL_HEIGHT, width: CELL_WIDTH / 2, height: CELL_HEIGHT }),
  },
  W: {
    opposite: 'E',
    wall: (col, row) => [col * CELL_WIDTH, row * CELL_HEIGHT, col * CELL_WIDTH, (row + 1) * CELL_HEIGHT],
    region: (col, row) => ({ x: col * CELL_WIDTH - CELL_WIDTH / 2, y: row * CELL_HEIGHT, width: CELL_WIDTH / 2, height: CELL_HEIGHT }),
  },
  S: {
    opposite: 'N',
    wall: (col, row) => [col * CELL_WIDTH, (row + 1) * CELL_HEIGHT, (col + 1) * CELL_WIDTH, (row + 1) * CELL_HEIGHT],
    region: (col, row) => ({ x: col * CELL_WIDTH, y: (row + 1) * CELL_HEIGHT, width: CELL_WIDTH, height: CELL_HEIGHT / 2 }),
  },
  N: {
    opposite: 'S',
    wall: (col, row) => [col * CELL_WIDTH, row * CELL_HEIGHT, (col + 1) * CELL_WIDTH, row * CELL_HEIGHT],
    region: (col, row) => ({ x: col * CELL_WIDTH, y: row * CELL_HEIGHT - CELL_HEIGHT / 2, width: CELL_WIDTH, height: CELL_HEIGHT / 2 }),
  },
};

/** A closed door Wall from a `c` coordinate array (see EDGE[dir].wall). */
function doorWall(c) {
  return { c, door: CONST.WALL_DOOR_TYPES.DOOR, ds: CONST.WALL_DOOR_STATES.CLOSED, doorSound: 'futuristicHydraulic', animation: { type: '' } };
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
      artStyle: 'color',
      name: MapGenerator.suggestName('ship'),
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelectorAll('input[name="type"]').forEach((el) =>
      el.addEventListener('change', () => {
        this.element.querySelector('#xdz-map-generator-name').value = MapGenerator.suggestName(el.value);
      }),
    );
  }

  /** Next unused "Starship X"/"Colony X" number, scanning existing scene names. */
  static suggestName(type) {
    const base = game.i18n.localize(type === 'colony' ? 'XDZ.MapGenerator.Colony' : 'XDZ.MapGenerator.Starship');
    const used = new Set(
      game.scenes
        .filter((s) => new RegExp(`^${base} \\d+$`).test(s.name))
        .map((s) => Number(s.name.slice(base.length + 1))),
    );
    let n = 1;
    while (used.has(n)) n++;
    return `${base} ${n}`;
  }

  static async _onSubmit(event, form, formData) {
    const { type, artStyle, name, splitAreas } = formData.object;
    const scene = await MapGenerator.build({ type, style: artStyle, name, splitAreas });
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

  /** Tile-creation data for `cellsList`, positioned relative to `origin` (a {originCol, originRow} local offset). */
  static #buildTiles(cellsList, origin, style) {
    return cellsList.map((cell) => {
      const x0 = (cell.col - origin.originCol) * CELL_WIDTH;
      const y0 = (cell.row - origin.originRow) * CELL_HEIGHT;
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
  }

  /** Create a Scene with the standard XDZ map settings (dark background, no fog/vision). */
  static async #createSceneDoc({ name, widthCells, heightCells, folderId, flags }) {
    return Scene.create({
      name,
      folder: folderId ?? null,
      width: widthCells * CELL_WIDTH,
      height: heightCells * CELL_HEIGHT,
      grid: { type: CONST.GRID_TYPES.SQUARE, size: 75 },
      levels: [{ name: 'Level', background: { color: '#0f0f0f' } }],
      padding: 0,
      tokenVision: false,
      fogExploration: false,
      flags: flags ?? {},
    });
  }

  /**
   * Groups `cells` by AREA and computes each AREA scene's local coordinate
   * space: a 1-cell margin around the AREA's own cell bounding box, room
   * enough for a Region rectangle to sit just outside a cross-AREA door.
   */
  static #buildAreaGeometry(cells) {
    const areas = {};
    for (const cell of cells) {
      const area = (areas[cell.area] ??= { cells: [], minCol: Infinity, minRow: Infinity, maxCol: -Infinity, maxRow: -Infinity });
      area.cells.push(cell);
      area.minCol = Math.min(area.minCol, cell.col);
      area.minRow = Math.min(area.minRow, cell.row);
      area.maxCol = Math.max(area.maxCol, cell.col);
      area.maxRow = Math.max(area.maxRow, cell.row);
    }
    for (const area of Object.values(areas)) {
      area.originCol = area.minCol - 1;
      area.originRow = area.minRow - 1;
      area.widthCells = area.maxCol - area.minCol + 3;
      area.heightCells = area.maxRow - area.minRow + 3;
    }
    return areas;
  }

  /**
   * Single sweep (east/south, like the full-map door pass) over every
   * touching cell pair, sorting each door into its owning AREA scene(s):
   * same-AREA pairs get one Wall in that AREA's own scene; cross-AREA pairs
   * get a mirrored door Wall in *each* AREA's scene (the far side of the
   * physical door doesn't exist in either scene) plus a Region rectangle
   * just outside it, tagged with a shared `edgeId` so build() can link the
   * two Regions' teleportToken behaviors to each other afterward.
   */
  static #buildAreaDoors(cells, areas) {
    const cellByKey = new Map(cells.map((c) => [`${c.col},${c.row}`, c]));
    const areaWalls = { 1: [], 2: [], 3: [], 4: [] };
    const areaRegions = { 1: [], 2: [], 3: [], 4: [] };

    for (const cell of cells) {
      for (const dir of ['E', 'S']) {
        const { dc, dr } = DIRECTIONS[CYCLE.indexOf(dir)];
        const neighbor = cellByKey.get(`${cell.col + dc},${cell.row + dr}`);
        if (!neighbor) continue;

        const originA = areas[cell.area];
        if (cell.area === neighbor.area) {
          areaWalls[cell.area].push(doorWall(EDGE[dir].wall(cell.col - originA.originCol, cell.row - originA.originRow)));
          continue;
        }

        const originB = areas[neighbor.area];
        const oppDir = EDGE[dir].opposite;
        areaWalls[cell.area].push(doorWall(EDGE[dir].wall(cell.col - originA.originCol, cell.row - originA.originRow)));
        areaWalls[neighbor.area].push(doorWall(EDGE[oppDir].wall(neighbor.col - originB.originCol, neighbor.row - originB.originRow)));

        const edgeId = `${cell.col},${cell.row}:${dir}`;
        areaRegions[cell.area].push({ edgeId, ...EDGE[dir].region(cell.col - originA.originCol, cell.row - originA.originRow) });
        areaRegions[neighbor.area].push({ edgeId, ...EDGE[oppDir].region(neighbor.col - originB.originCol, neighbor.row - originB.originRow) });
      }
    }
    return { areaWalls, areaRegions };
  }

  /**
   * Build a full layout (retrying up to 40 times so side-restricted
   * locations get a fitting cell), then create the full-map Scene, its 16
   * location Tiles (each tagged with AREA/LOCATION/QUADRANT metadata and
   * rotated to match its assigned cell), and a closed door Wall for every
   * touching pair of tiles.
   *
   * When `splitAreas` is set, also creates one Scene per AREA (4 Locations
   * each) with the same Tiles/doors, all placed in a Folder together with
   * the full map. Doors that lead to a Location outside that AREA's own
   * scene get a Region rectangle just past the door instead — a
   * teleportToken behavior pointing at the mirrored Region on the
   * neighboring AREA's scene, so walking through the door moves the token
   * across scenes.
   */
  static async build({ type, style, name, splitAreas }) {
    let result = null;
    for (let attempt = 0; attempt < 40 && !result; attempt++) result = MapGenerator.#attemptLayout(type, false);
    if (!result) result = MapGenerator.#attemptLayout(type, true);
    if (!result) throw new Error('XDZ | MapGenerator: failed to build a 16-cell layout.');

    const { cells, occupied, minCol, minRow, maxCol, maxRow } = result;
    const mainOrigin = { originCol: 0, originRow: 0 };

    const folder = splitAreas ? await Folder.create({ name, type: 'Scene' }) : null;

    const mainScene = await MapGenerator.#createSceneDoc({
      name,
      widthCells: maxCol - minCol + 1,
      heightCells: maxRow - minRow + 1,
      folderId: folder?.id,
    });
    await mainScene.createEmbeddedDocuments('Tile', MapGenerator.#buildTiles(cells, mainOrigin, style));

    // A door wherever two placed cells actually touch — including
    // "accidental" adjacency from the walk looping near itself, per KB's
    // "any two touching locations are connected by a DOOR."
    const mainWalls = [];
    for (const cell of cells) {
      if (occupied.has(`${cell.col + 1},${cell.row}`)) mainWalls.push(doorWall(EDGE.E.wall(cell.col, cell.row)));
      if (occupied.has(`${cell.col},${cell.row + 1}`)) mainWalls.push(doorWall(EDGE.S.wall(cell.col, cell.row)));
    }
    await mainScene.createEmbeddedDocuments('Wall', mainWalls);

    if (!splitAreas) return mainScene;

    const areas = MapGenerator.#buildAreaGeometry(cells);
    const { areaWalls, areaRegions } = MapGenerator.#buildAreaDoors(cells, areas);

    // areaNum -> [{ edgeId, doc: Region }], for the cross-linking pass below.
    const regionsByArea = {};

    for (let areaNum = 1; areaNum <= 4; areaNum++) {
      const origin = areas[areaNum];
      const scene = await MapGenerator.#createSceneDoc({
        name: game.i18n.format('XDZ.MapGenerator.AreaSceneName', { name, area: areaNum }),
        widthCells: origin.widthCells,
        heightCells: origin.heightCells,
        folderId: folder.id,
        // Centroid in the shared build-time grid space (see #buildAreaGeometry),
        // not this scene's own local space — lets xdz.mjs compare two AREA
        // scenes' positions to work out a compass direction between them.
        flags: { xdz: { areaCentroid: { col: (origin.minCol + origin.maxCol) / 2, row: (origin.minRow + origin.maxRow) / 2 } } },
      });

      await scene.createEmbeddedDocuments('Tile', MapGenerator.#buildTiles(origin.cells, origin, style));
      if (areaWalls[areaNum].length) await scene.createEmbeddedDocuments('Wall', areaWalls[areaNum]);

      regionsByArea[areaNum] = [];
      if (areaRegions[areaNum].length) {
        const regionData = areaRegions[areaNum].map(({ x, y, width, height }, i) => ({
          name: game.i18n.format('XDZ.MapGenerator.RegionExit', { n: i + 1 }),
          shapes: [{ type: 'rectangle', x, y, width, height, rotation: 0 }],
        }));
        const created = await scene.createEmbeddedDocuments('Region', regionData);
        created.forEach((doc, i) => regionsByArea[areaNum].push({ edgeId: areaRegions[areaNum][i].edgeId, doc }));
      }
    }

    // Link each cross-AREA door's two Regions to teleport into each other.
    const seenEdges = new Map();
    for (let areaNum = 1; areaNum <= 4; areaNum++) {
      for (const { edgeId, doc } of regionsByArea[areaNum]) {
        const other = seenEdges.get(edgeId);
        if (!other) {
          seenEdges.set(edgeId, doc);
          continue;
        }
        const teleportName = game.i18n.localize('XDZ.MapGenerator.RegionTeleport');
        await doc.createEmbeddedDocuments('RegionBehavior', [
          { name: teleportName, type: 'teleportToken', system: { destinations: [other.uuid], placement: 'center', snap: true } },
        ]);
        await other.createEmbeddedDocuments('RegionBehavior', [
          { name: teleportName, type: 'teleportToken', system: { destinations: [doc.uuid], placement: 'center', snap: true } },
        ]);
      }
    }

    return mainScene;
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
      scenes.push(await MapGenerator.build({ type, style, name: game.i18n.format('XDZ.MapGenerator.LocationsSceneNameLetter', { letter }) }));
    }
    return scenes;
  }
}
