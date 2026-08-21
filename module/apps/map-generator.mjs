const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ApplicationV2 } = foundry.applications.api;

const GRID_SIZE = 75; // must match the Scene's own grid size, see #createSceneDoc

// Rooms are NOT all the same shape — every location's real art has its own
// aspect ratio (measured off the actual .webp pixel dimensions, ranging
// ~0.63 to ~0.87 across the roster), stored per-location as `aspect` in
// config.mjs. This constant is only a last-resort fallback for an entry
// that somehow has no `aspect` set, and for the AREA-scene margin default
// (DEFAULT_CELL_H) — never assume every room shares one ratio.
const NATIVE_ASPECT = 1611 / 2230;

// The B&W LOCATION tile set (the 16-per-type roster, not the connector
// pieces) is a shared template: every B&W location .webp is rendered on the
// same 2100x1500 canvas regardless of what room it is (only the painted
// content and `bwCrop` differ), so unlike `aspect` (color, real
// per-location variation) there's no per-location B&W aspect to measure for
// those — this single ratio is correct for all of them. A piece with its
// own genuinely separate B&W art (the connectors) overrides it via its own
// `bwAspect` — see aspectFor.
const BW_ASPECT = 1500 / 2100;

// Default nominal room footprint, in grid squares — "a 12x9 grid is an ok
// size for the average room" per design call. A location can override via
// its own `sizeCells` (e.g. Obs Deck / Escape Pod are intentionally
// smaller) — see nominalSize().
const DEFAULT_SIZE_CELLS = 12;

/** A location's own `aspect` (height/width) for `style`: color uses its real per-location `aspect` (measured off its actual art, see config.mjs); bw uses `loc.bwAspect` when the piece has genuinely separate B&W art (the connectors) measured to its own real proportions, else falls back to the shared B&W template ratio `BW_ASPECT`. `NATIVE_ASPECT` only if somehow neither `aspect` nor a style match is set. */
function aspectFor(loc, style) {
  return style === 'bw' ? (loc.bwAspect ?? BW_ASPECT) : (loc.aspect ?? NATIVE_ASPECT);
}

/** Nominal pre-crop pixel box for a location: width from its own (or the default) `sizeCells`, height derived to match the source art's own real aspect ratio for `style` (see aspectFor) — never a single shared ratio, rooms are not uniformly proportioned. */
function nominalSize(loc, style) {
  const w = (loc.sizeCells ?? DEFAULT_SIZE_CELLS) * GRID_SIZE;
  return { w, h: Math.round(w * aspectFor(loc, style)) };
}

const DEFAULT_CELL_W = DEFAULT_SIZE_CELLS * GRID_SIZE;
const DEFAULT_CELL_H = Math.round(DEFAULT_CELL_W * NATIVE_ASPECT);

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
// location's `sides` keys by 90/180/270 (see fitsRotation below).
const CYCLE = ['N', 'E', 'S', 'W'];

/** Does `sides` (a { side: doorFraction } map), rotated `k` quarter-turns clockwise, cover every direction in `cellDirs`? */
function fitsRotation(cellDirs, sides, k) {
  const rotated = new Set(Object.keys(sides).map((s) => CYCLE[(CYCLE.indexOf(s) + k) % 4]));
  return cellDirs.every((d) => rotated.has(d));
}

/** A location's `sides`/`bwSides` map for `style` — bw falls back to `sides` when it has no override. */
function sidesFor(loc, style) {
  return (style === 'bw' ? loc.bwSides : null) ?? loc.sides;
}

/** Pre-rotation local side whose fraction feeds absolute compass `dir` after `k` quarter-turns clockwise. */
function localSideFor(dir, k) {
  return CYCLE[(CYCLE.indexOf(dir) - k + 4) % 4];
}

/** Rotate a `(side, fraction)` door mark by `k` quarter-turns clockwise; returns the fraction along the resulting absolute edge (same W→E / N→S convention `sides` uses). */
function rotateDoorFraction(side, f, k) {
  let x, y;
  if (side === 'N') [x, y] = [f, 0];
  else if (side === 'S') [x, y] = [f, 1];
  else if (side === 'E') [x, y] = [1, f];
  else [x, y] = [0, f]; // W
  for (let i = 0; i < k; i++) [x, y] = [1 - y, x];
  return y === 0 || y === 1 ? x : y;
}

/** Door position (0-1) along the absolute-compass `dir` edge of a cell rotated `k` quarter-turns, from its style-appropriate `sides` map. Falls back to center if the (forced-seat) rotation left that local side without a mark. */
function doorFraction(loc, style, dir, k) {
  const side = localSideFor(dir, k);
  const f = sidesFor(loc, style)[side];
  return f === undefined ? 0.5 : rotateDoorFraction(side, f, k);
}

/** A location's `crop`/`bwCrop` box for `style` (fractions 0-1, art's own unrotated frame) — bw falls back to `crop`, default full canvas (no trim) when neither is set. */
function cropFor(loc, style) {
  return (style === 'bw' ? loc.bwCrop : null) ?? loc.crop ?? { x0: 0, y0: 0, x1: 1, y1: 1 };
}

/** How far (0-1 of that edge's own axis) the location's real content is inset from the cell's absolute-compass `dir` edge after `k` quarter-turns — same local-side lookup as doorFraction, applied to the crop box's own bound on that side instead of a door mark. */
function cropInset(loc, style, dir, k) {
  const crop = cropFor(loc, style);
  const side = localSideFor(dir, k);
  if (side === 'N') return crop.y0;
  if (side === 'S') return 1 - crop.y1;
  if (side === 'E') return 1 - crop.x1;
  return crop.x0; // W
}

/**
 * A cell's real on-screen footprint after crop-trimming: the pixel
 * width/height it actually needs (this location's own `nominalSize` minus
 * both edges' crop inset) once rotated `rotation` degrees. A 90/270
 * rotation swaps which of the nominal box's width/height is the
 * width-basis vs height-basis — the same swap Foundry's own Tile
 * `rotation` performs on the rendered art, mirrored here so the
 * column/row this cell sits in gets sized to match what actually ends up
 * on screen, not the pre-rotation box.
 */
function cellFootprint(loc, style, rotation) {
  const k = ((rotation / 90) % 4 + 4) % 4;
  const nominal = nominalSize(loc, style);
  const [baseW, baseH] = k % 2 === 0 ? [nominal.w, nominal.h] : [nominal.h, nominal.w];
  return {
    width: baseW * (1 - cropInset(loc, style, 'E', k) - cropInset(loc, style, 'W', k)),
    height: baseH * (1 - cropInset(loc, style, 'N', k) - cropInset(loc, style, 'S', k)),
  };
}

/**
 * Per-column width / per-row height (px) for `cellsList` (already in a
 * scene's own local, 0-based col/row space): each column/row is sized to
 * the largest `cellFootprint` among the cells occupying it, so a bigger
 * piece (bigger `sizeCells`, or just less crop-trimmed) genuinely grows
 * its column/row instead of being squished to match smaller neighbors —
 * anything smaller than that just renders at its own true size, centered
 * inside the same box (see #buildTiles' contain-fit), never stretched or
 * clipped. Columns/rows nothing occupies (e.g. an AREA scene's 1-cell
 * margin) default to DEFAULT_CELL_W/DEFAULT_CELL_H. Only used by the AREA
 * split-scene path now — the main scene is placed by chainPlace instead
 * (real edge-to-edge, door-coincident placement, no shared grid box; see
 * build()). Returns prefix-sum boundary lookups `colX`/`rowY` (length
 * `widthCells+1`/`heightCells+1`, so `colX[c]` is the pixel x of column
 * `c`'s left edge) and a scene-local `edge` (see makeEdge) built on them.
 */
function buildPitch(cellsList, widthCells, heightCells, style) {
  const colWidth = new Array(widthCells).fill(null);
  const rowHeight = new Array(heightCells).fill(null);
  for (const cell of cellsList) {
    const fp = cellFootprint(cell.loc, style, cell.rotation);
    colWidth[cell.col] = Math.max(colWidth[cell.col] ?? 0, fp.width);
    rowHeight[cell.row] = Math.max(rowHeight[cell.row] ?? 0, fp.height);
  }
  const colX = [0];
  for (let c = 0; c < widthCells; c++) colX.push(colX[c] + (colWidth[c] ?? DEFAULT_CELL_W));
  const rowY = [0];
  for (let r = 0; r < heightCells; r++) rowY.push(rowY[r] + (rowHeight[r] ?? DEFAULT_CELL_H));
  return { colX, rowY, edge: makeEdge(colX, rowY) };
}

// Door opening width, in scene pixels, cut into the generated wall at the
// real door position — the rest of the shared edge stays a solid wall.
const DOOR_WIDTH = 120;

// Door leaf swapped in for the slide animation, and the static frame Tile
// laid over the gap (see tools/door-mapper); the frame Tile is rotated 90°
// for E/W edges. Both re-texture per the Wall's own `ds` (door state) —
// see DOOR_LEAF_TEXTURES/DOOR_FRAME_TEXTURES and onUpdateWallDoorState.
const DOOR_LEAF_TEXTURES = {
  [CONST.WALL_DOOR_STATES.CLOSED]: 'systems/xdz/assets/images/sliding_door_double-closed.webp',
  [CONST.WALL_DOOR_STATES.LOCKED]: 'systems/xdz/assets/images/sliding_door_double_locked.webp',
  [CONST.WALL_DOOR_STATES.OPEN]: 'systems/xdz/assets/images/sliding_door_double_open.webp',
};
const DOOR_FRAME_TEXTURES = {
  [CONST.WALL_DOOR_STATES.CLOSED]: 'systems/xdz/assets/images/sliding_door_frame-closed.webp',
  [CONST.WALL_DOOR_STATES.LOCKED]: 'systems/xdz/assets/images/sliding_door_frame-locked.webp',
  [CONST.WALL_DOOR_STATES.OPEN]: 'systems/xdz/assets/images/sliding_door_frame-open.webp',
};
// Frame Tile height is fixed; width is derived from the asset's own native
// pixel size (836x55) so it renders at its real aspect ratio instead of
// being squeezed/stretched to fit the DOOR_WIDTH gap — the frame can
// legitimately run wider than the gap itself (a door casing overlapping
// the wall on either side is normal).
const DOOR_FRAME_HEIGHT = 17;
const DOOR_FRAME_WIDTH = DOOR_FRAME_HEIGHT * (836 / 55);

/** Wall+frame-Tile docs for the shared edge between a cell (at `col,row`, already offset into the target scene's local space) and its `dir` neighbor: solid wall on either side of a `DOOR_WIDTH`-wide door gap at the location's real door position, plus a frame Tile centered on that gap. `edge` is the scene's own pitch-built EDGE (see buildPitch/makeEdge). The wall and its frame Tile share a `flags.xdz.doorId` (random, this pair's only) so onUpdateWallDoorState can find the Tile back from the Wall once both exist as real embedded documents with their own (unrelated) ids. */
function buildEdgeDoor(edge, dir, col, row, loc, rotation, style) {
  const k = ((rotation / 90) % 4 + 4) % 4;
  const f = doorFraction(loc, style, dir, k);
  const [x1, y1, x2, y2] = edge[dir].wall(col, row);
  const len = Math.hypot(x2 - x1, y2 - y1);
  const half = Math.min(DOOR_WIDTH / 2, len / 2) / len;
  const dStart = Math.max(f - half, 0);
  const dEnd = Math.min(f + half, 1);
  const lerp = (t) => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
  const [sx, sy] = lerp(dStart);
  const [ex, ey] = lerp(dEnd);
  const doorId = foundry.utils.randomID();
  const walls = [];
  if (dStart > 0) walls.push({ c: [x1, y1, sx, sy] });
  walls.push(doorWall([sx, sy, ex, ey], doorId));
  if (dEnd < 1) walls.push({ c: [ex, ey, x2, y2] });
  const tile = doorFrameTile((sx + ex) / 2, (sy + ey) / 2, dir, doorId);
  return { walls, tile };
}

/** Static frame Tile centered on a door gap. Frame art is drawn for a horizontal (N/S-edge) opening by default; E/W edges (vertical walls) get it rotated 90°. Sits above the location art (`sort: 1` vs the art's default 0). Starts on the CLOSED frame texture, matching doorWall's default `ds`; onUpdateWallDoorState re-textures it when the paired Wall's `ds` later changes. */
function doorFrameTile(x, y, dir, doorId) {
  return {
    x,
    y,
    width: DOOR_FRAME_WIDTH,
    height: DOOR_FRAME_HEIGHT,
    rotation: dir === 'E' || dir === 'W' ? 90 : 0,
    sort: 1,
    texture: { src: DOOR_FRAME_TEXTURES[CONST.WALL_DOOR_STATES.CLOSED] },
    flags: { xdz: { doorId } },
  };
}

/** Solid (doorless) wall along a cell's `dir` edge — used to close off the outer hull where there's no neighboring cell to connect to. */
function perimeterWall(edge, dir, col, row) {
  return { c: edge[dir].wall(col, row) };
}

/**
 * Per-compass-direction geometry for a door between `(col, row)` and its
 * neighbor, in a scene's local cell coordinates, built on that scene's own
 * `colX`/`rowY` pitch (see buildPitch): the Wall segment on the shared
 * edge, and a half-cell Region rectangle just outside that edge (used only
 * for AREA scenes, to teleport a token that walks through a door leading
 * to a LOCATION that isn't in this scene). Reduces to the old fixed-grid
 * formulas exactly when colX[c] === c * DEFAULT_CELL_W (i.e. every
 * column/row is the default size).
 */
function makeEdge(colX, rowY) {
  return {
    E: {
      opposite: 'W',
      wall: (col, row) => [colX[col + 1], rowY[row], colX[col + 1], rowY[row + 1]],
      region: (col, row) => {
        const w = colX[col + 2] - colX[col + 1];
        return { x: colX[col + 1], y: rowY[row], width: w / 2, height: rowY[row + 1] - rowY[row] };
      },
    },
    W: {
      opposite: 'E',
      wall: (col, row) => [colX[col], rowY[row], colX[col], rowY[row + 1]],
      region: (col, row) => {
        const w = colX[col] - colX[col - 1];
        return { x: colX[col - 1] + w / 2, y: rowY[row], width: w / 2, height: rowY[row + 1] - rowY[row] };
      },
    },
    S: {
      opposite: 'N',
      wall: (col, row) => [colX[col], rowY[row + 1], colX[col + 1], rowY[row + 1]],
      region: (col, row) => {
        const h = rowY[row + 2] - rowY[row + 1];
        return { x: colX[col], y: rowY[row + 1], width: colX[col + 1] - colX[col], height: h / 2 };
      },
    },
    N: {
      opposite: 'S',
      wall: (col, row) => [colX[col], rowY[row], colX[col + 1], rowY[row]],
      region: (col, row) => {
        const h = rowY[row] - rowY[row - 1];
        return { x: colX[col], y: rowY[row - 1] + h / 2, width: colX[col + 1] - colX[col], height: h / 2 };
      },
    },
  };
}

/** A closed door Wall from a `c` coordinate array (see makeEdge's `wall` builders), tagged with `doorId` so onUpdateWallDoorState can find its paired frame Tile. */
function doorWall(c, doorId) {
  return {
    c,
    door: CONST.WALL_DOOR_TYPES.DOOR,
    ds: CONST.WALL_DOOR_STATES.CLOSED,
    doorSound: 'futuristicHydraulic',
    animation: { type: 'slide', texture: DOOR_LEAF_TEXTURES[CONST.WALL_DOOR_STATES.CLOSED], double: true, direction: 1, duration: 750, strength: 1, flip: false },
    flags: { xdz: { doorId } },
  };
}

// Below this real edge-to-edge gap (px), two chained cells count as flush —
// draw one shared wall+door on the west/north cell's own edge, matching
// buildEdgeDoor's old dedup convention.
const FLUSH_EPS_PX = 4;

// Above FLUSH_EPS_PX but up to this (px), the gap gets closed by growing
// the east/south box back to meet its neighbor (see chainPlace's
// loose-edge closing pass below) instead of spawning a whole connector
// piece — "if gap is just one grid, scale up the tile to connect; two
// grids or more, use the connector" (user call). Safe to grow into: that
// space was empty (that's what made it a gap, not an overlap), so nothing
// is ever displaced. Set to one grid square — the same 141px void that
// used to slip through at the old 150px threshold (Starship 3,
// bridge<->obsDeck) now gets a real connector instead.
const CONNECTOR_GAP_PX = GRID_SIZE;

// Tried capping how far chainPlace's overlap-avoidance push escalates,
// after a live-tested layout produced a connector 2874px long (a crowded
// local cluster forcing an escape past several stacked rooms in a row).
// Reverted: capping the push just traded that for real ROOM tiles
// overlapping each other once the cap cut a push short of actually
// clearing anything — visually worse (overlapping art, not just an
// oversized-but-coherent corridor). An occasional very long connector is
// the lesser evil; don't reintroduce a push cap without solving the
// "capped push still overlaps" case first.

/** Opposite compass direction. */
const OPPOSITE_DIR = { N: 'S', S: 'N', E: 'W', W: 'E' };

/** Positive overlap depth (px) between two `{x0,y0,w,h}` boxes along `axis` ('x' or 'y'), or 0 if they don't overlap on both axes. */
function overlapAmount(a, b, axis) {
  const ox = Math.min(a.x0 + a.w, b.x0 + b.w) - Math.max(a.x0, b.x0);
  const oy = Math.min(a.y0 + a.h, b.y0 + b.h) - Math.max(a.y0, b.y0);
  if (ox <= 0 || oy <= 0) return 0;
  return axis === 'x' ? ox : oy;
}

/**
 * Places every cell in `cells` (abstract col/row grid + rotation already
 * chosen by #attemptLayout/#refineRotations) at an absolute scene-pixel box
 * — real art size (`cellFootprint`), never stretched or box-fitted — by
 * chaining outward from an arbitrary root along the grid's own adjacency
 * (BFS spanning tree, see DIRECTIONS/CYCLE): each child is placed flush
 * against its parent along their shared (primary) axis, then slid along the
 * cross axis so its own door (`doorFraction`) lands exactly on the parent's
 * door — real art-edge-to-art-edge contact, "align rooms by moving the
 * entire room" per the door position each piece's own art actually draws,
 * not a shared grid box centerline.
 *
 * If that placement would overlap an already-placed cell, the child is
 * pushed just far enough out along the primary axis to clear it. A push
 * under CONNECTOR_GAP_PX (one grid square) doesn't get a whole connector
 * piece — the east/south box just grows backward to close the gap outright
 * (see the loose-edge closing pass below), same as any other flush pair,
 * UNLESS a third box (from a completely unrelated, non-grid-adjacent
 * branch) already occupies that space, in which case the growth is
 * clamped and the edge stays a genuine `looseEdges` entry — two
 * independent doors, a small bare gap between, rather than manufacturing
 * an overlap or leaving one side's whole edge unwalled. Anything bigger —
 * a push that needed real distance, or a genuinely large "accidental"
 * mismatch — gets a connector piece — "if you're gonna overlap, open
 * distance and use the connector," not "connector on every door." Every
 * edge not touched by the spanning tree ("accidental" adjacency from the
 * walk looping near itself, per KB's "any two touching locations are
 * connected by a DOOR") is resolved afterward from whatever positions the
 * tree already fixed; a genuine overlap between two unrelated branches'
 * independent cross-offsets (rare) is left unconnected rather than
 * corrupting placed geometry.
 *
 * Returns `{ boxes, doorEdges, looseEdges, connectorEdges }`: `boxes` maps
 * `col,row` -> `{x0,y0,w,h}`; the edge lists are `{aKey, bKey, dir}` with
 * `dir` always canonicalized to 'E' or 'S' (aKey's cell is west/north of
 * bKey's) so downstream wall/door building never needs to handle all 4
 * compass directions for a shared edge, only the two canonical ones.
 */
function chainPlace(cells, occupied, style) {
  const cellByKey = new Map(cells.map((c) => [`${c.col},${c.row}`, c]));
  const boxes = new Map();
  const visited = new Set();
  const resolved = new Set(); // canonical "aKey:bKey" edges already classified
  const childrenOf = new Map(); // parent key -> [child keys], for accidental-overlap subtree moves
  const doorEdges = [];
  const looseEdges = [];
  const connectorEdges = [];

  const subtreeOf = (rootKey) => {
    const result = new Set([rootKey]);
    const stack = [rootKey];
    while (stack.length) {
      const k = stack.pop();
      for (const c of childrenOf.get(k) ?? []) {
        if (!result.has(c)) {
          result.add(c);
          stack.push(c);
        }
      }
    }
    return result;
  };

  const canonicalize = (fromKey, dir, toKey) =>
    dir === 'E' || dir === 'S' ? { aKey: fromKey, bKey: toKey, dir } : { aKey: toKey, bKey: fromKey, dir: OPPOSITE_DIR[dir] };

  const classify = (aKey, bKey, dir, gap) => {
    resolved.add(`${aKey}:${bKey}`);
    if (gap < -1) return; // genuine overlap between unrelated branches — leave unconnected
    const bucket = gap > CONNECTOR_GAP_PX ? connectorEdges : gap > FLUSH_EPS_PX ? looseEdges : doorEdges;
    bucket.push({ aKey, bKey, dir });
  };

  const rootKey = `${cells[0].col},${cells[0].row}`;
  const rootCell = cellByKey.get(rootKey);
  const rootSize = cellFootprint(rootCell.loc, style, rootCell.rotation);
  boxes.set(rootKey, { x0: 0, y0: 0, w: rootSize.width, h: rootSize.height });
  visited.add(rootKey);

  const queue = [rootKey];
  while (queue.length) {
    const key = queue.shift();
    const cell = cellByKey.get(key);
    const box = boxes.get(key);
    const k = ((cell.rotation / 90) % 4 + 4) % 4;
    for (let i = 0; i < DIRECTIONS.length; i++) {
      const dir = CYCLE[i];
      const { dc, dr } = DIRECTIONS[i];
      const nKey = `${cell.col + dc},${cell.row + dr}`;
      if (!occupied.has(nKey) || visited.has(nKey)) continue;
      visited.add(nKey);
      queue.push(nKey);
      (childrenOf.get(key) ?? childrenOf.set(key, []).get(key)).push(nKey);
      const neighbor = cellByKey.get(nKey);
      const nSize = cellFootprint(neighbor.loc, style, neighbor.rotation);
      const nk = ((neighbor.rotation / 90) % 4 + 4) % 4;
      const fParent = doorFraction(cell.loc, style, dir, k);
      const fChild = doorFraction(neighbor.loc, style, OPPOSITE_DIR[dir], nk);

      let nBox;
      if (dir === 'E' || dir === 'W') {
        const parentDoorY = box.y0 + fParent * box.h;
        nBox = { x0: dir === 'E' ? box.x0 + box.w : box.x0 - nSize.width, y0: parentDoorY - fChild * nSize.height, w: nSize.width, h: nSize.height };
      } else {
        const parentDoorX = box.x0 + fParent * box.w;
        nBox = { x0: parentDoorX - fChild * nSize.width, y0: dir === 'S' ? box.y0 + box.h : box.y0 - nSize.height, w: nSize.width, h: nSize.height };
      }

      // Push nBox further from its parent (same direction, more distance)
      // until it clears every already-placed box — one pass isn't enough:
      // clearing the worst offender can still leave (or even create, if the
      // step lands nBox on top of a box it wasn't touching before) another
      // overlap, so re-measure after every step instead of trusting a
      // single computed push amount. The step itself is the exact distance
      // to clear each overlapping box's relevant edge, not the raw overlap
      // depth — a small nBox starting fully *contained* inside a much
      // bigger box would otherwise creep out in undersized steps (its own
      // width, not the real escape distance) and could stall before the
      // iteration cap.
      const axis = dir === 'E' || dir === 'W' ? 'x' : 'y';
      const sign = dir === 'E' || dir === 'S' ? 1 : -1;
      for (let iter = 0; iter < 20; iter++) {
        let bestStep = 0;
        for (const [oKey, oBox] of boxes) {
          if (oKey === key || overlapAmount(nBox, oBox, axis) <= 0) continue;
          const [nLo, nHi, oLo, oHi] =
            axis === 'x' ? [nBox.x0, nBox.x0 + nBox.w, oBox.x0, oBox.x0 + oBox.w] : [nBox.y0, nBox.y0 + nBox.h, oBox.y0, oBox.y0 + oBox.h];
          const step = sign === 1 ? oHi - nLo + 1 : nHi - oLo + 1;
          if (step > bestStep) bestStep = step;
        }
        if (bestStep <= 0) break;
        if (axis === 'x') nBox.x0 += sign * bestStep;
        else nBox.y0 += sign * bestStep;
      }
      boxes.set(nKey, nBox);

      const { aKey, bKey, dir: cDir } = canonicalize(key, dir, nKey);
      const a = boxes.get(aKey);
      const b = boxes.get(bKey);
      const gap = cDir === 'E' ? b.x0 - (a.x0 + a.w) : b.y0 - (a.y0 + a.h);
      classify(aKey, bKey, cDir, gap);
    }
  }

  // Non-tree ("accidental") adjacent pairs — positions already fixed by the
  // tree, from two cells that got there down unrelated branches. If they
  // genuinely overlap, push whichever side's subtree is smaller (less to
  // drag along) further away until it clears — not just the other side of
  // this one edge, but everything else too, since moving a subtree can
  // introduce an overlap it didn't have before — then classify the
  // resulting (now real) gap instead of leaving the overlap unresolved.
  for (const cell of cells) {
    for (const dir of ['E', 'S']) {
      const { dc, dr } = DIRECTIONS[CYCLE.indexOf(dir)];
      const nKey = `${cell.col + dc},${cell.row + dr}`;
      if (!occupied.has(nKey)) continue;
      const aKey = `${cell.col},${cell.row}`;
      if (resolved.has(`${aKey}:${nKey}`)) continue;
      let a = boxes.get(aKey);
      let b = boxes.get(nKey);
      let gap = dir === 'E' ? b.x0 - (a.x0 + a.w) : b.y0 - (a.y0 + a.h);
      if (gap < -1) {
        const subtreeA = subtreeOf(aKey);
        const subtreeB = subtreeOf(nKey);
        const [moveKeys, sign] = subtreeB.size <= subtreeA.size ? [subtreeB, 1] : [subtreeA, -1];
        const axis = dir === 'E' ? 'x' : 'y';
        for (let iter = 0; iter < 20; iter++) {
          let bestStep = 0;
          for (const mk of moveKeys) {
            const mb = boxes.get(mk);
            for (const [ok, ob] of boxes) {
              if (moveKeys.has(ok) || overlapAmount(mb, ob, axis) <= 0) continue;
              const [mLo, mHi, oLo, oHi] =
                axis === 'x' ? [mb.x0, mb.x0 + mb.w, ob.x0, ob.x0 + ob.w] : [mb.y0, mb.y0 + mb.h, ob.y0, ob.y0 + ob.h];
              const step = sign === 1 ? oHi - mLo + 1 : mHi - oLo + 1;
              if (step > bestStep) bestStep = step;
            }
          }
          if (bestStep <= 0) break;
          for (const mk of moveKeys) {
            const mb = boxes.get(mk);
            if (axis === 'x') mb.x0 += sign * bestStep;
            else mb.y0 += sign * bestStep;
          }
        }
        a = boxes.get(aKey);
        b = boxes.get(nKey);
        gap = dir === 'E' ? b.x0 - (a.x0 + a.w) : b.y0 - (a.y0 + a.h);
      }
      classify(aKey, nKey, dir, gap);
    }
  }

  // Close every loose (small-gap) edge outright rather than leaving it as
  // two independent doors with bare, unwalled scene background between
  // them (that background was the actual "light spills between rooms"
  // bug) — grow the east/south box backward so it touches its neighbor
  // exactly, and fold the edge into doorEdges (same single-wall build as
  // any other flush pair, which only ever builds ONE wall from A's own
  // box — see build()'s doorEdges branch). Only the box's own far edge
  // stays fixed (the one a push may have set to clear a third box).
  //
  // The gap is only guaranteed empty relative to A and B themselves — a
  // cell from a completely unrelated branch (not grid-adjacent to either,
  // so never checked against this specific edge by any push loop above)
  // can still be sitting in that space in absolute pixels. Growing blindly
  // into it created new small overlaps (found live, 2026-08-21: 5-130px
  // overlaps that vanished when growth was disabled). So clamp the growth
  // to whatever's actually clear against every OTHER placed box first.
  //
  // Critically: an edge only gets folded into doorEdges if the clamp let it
  // close COMPLETELY. A partially- or un-closed edge must NOT go through
  // the single-wall doorEdges path — doorEdges only ever builds A's own
  // wall, so a residual gap there means B's entire edge (not just a small
  // sliver) ends up completely unwalled, since nothing else ever builds a
  // wall from B's side. Also found live the same day: 200-400px "holes"
  // reappeared on B's whole edge once a clamp landed short. A
  // partially/un-closed edge keeps whatever partial growth was safe (still
  // shrinks the gap as much as possible) but stays in `looseEdges`, so
  // build()'s two-independent-doors path (each side gets its own full-box
  // wall) still fully seals both rooms.
  const stillLoose = [];
  for (const edge of looseEdges) {
    const { aKey, bKey, dir } = edge;
    const a = boxes.get(aKey);
    const b = boxes.get(bKey);
    const gap = dir === 'E' ? b.x0 - (a.x0 + a.w) : b.y0 - (a.y0 + a.h);
    let grow = gap;
    for (const [oKey, ob] of boxes) {
      if (oKey === aKey || oKey === bKey || grow <= 0) continue;
      if (dir === 'E') {
        const yOverlap = Math.min(b.y0 + b.h, ob.y0 + ob.h) - Math.max(b.y0, ob.y0);
        if (yOverlap <= 0 || ob.x0 >= b.x0) continue; // irrelevant, or not on the side growth extends into
        grow = Math.min(grow, Math.max(0, b.x0 - (ob.x0 + ob.w)));
      } else {
        const xOverlap = Math.min(b.x0 + b.w, ob.x0 + ob.w) - Math.max(b.x0, ob.x0);
        if (xOverlap <= 0 || ob.y0 >= b.y0) continue;
        grow = Math.min(grow, Math.max(0, b.y0 - (ob.y0 + ob.h)));
      }
    }
    if (dir === 'E') {
      b.x0 -= grow;
      b.w += grow;
    } else {
      b.y0 -= grow;
      b.h += grow;
    }
    if (grow >= gap - 0.5) doorEdges.push(edge);
    else stillLoose.push(edge);
  }
  looseEdges.length = 0;
  looseEdges.push(...stillLoose);

  return { boxes, doorEdges, looseEdges, connectorEdges };
}

/** Line segment (`c` coords) for a box's own `dir` edge — real art edge, not a shared grid line. */
function boxEdgeLine(box, dir) {
  if (dir === 'E') return [box.x0 + box.w, box.y0, box.x0 + box.w, box.y0 + box.h];
  if (dir === 'W') return [box.x0, box.y0, box.x0, box.y0 + box.h];
  if (dir === 'S') return [box.x0, box.y0 + box.h, box.x0 + box.w, box.y0 + box.h];
  return [box.x0, box.y0, box.x0 + box.w, box.y0]; // N
}

/** Solid (doorless) wall along a box's own `dir` edge — hull perimeter, or the safety-net wall for a skipped (overlapping) accidental edge. */
function perimeterWallFromBox(box, dir) {
  return { c: boxEdgeLine(box, dir) };
}

/** Wall+frame-Tile docs for a door cut into `box`'s own `dir` edge at fraction `f` (0-1 along that edge, same convention `doorFraction` returns) — the shared core `buildCellDoor` and the connector's far-side cut (which needs an explicit, precomputed fraction rather than a config lookup) both build on. */
function cutDoorAt(box, dir, f) {
  const [x1, y1, x2, y2] = boxEdgeLine(box, dir);
  const len = Math.hypot(x2 - x1, y2 - y1);
  const half = Math.min(DOOR_WIDTH / 2, len / 2) / len;
  const dStart = Math.max(f - half, 0);
  const dEnd = Math.min(f + half, 1);
  const lerp = (t) => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
  const [sx, sy] = lerp(dStart);
  const [ex, ey] = lerp(dEnd);
  const doorId = foundry.utils.randomID();
  const walls = [];
  if (dStart > 0) walls.push({ c: [x1, y1, sx, sy] });
  walls.push(doorWall([sx, sy, ex, ey], doorId));
  if (dEnd < 1) walls.push({ c: [ex, ey, x2, y2] });
  const tile = doorFrameTile((sx + ex) / 2, (sy + ey) / 2, dir, doorId);
  return { walls, tile };
}

/** Wall+frame-Tile docs for a door cut into `box`'s own `dir` edge at `loc`'s real door mark (see doorFraction) — built from the cell's own real box instead of a shared grid line, so the opening lands exactly where this piece's art actually draws it. */
function buildCellDoor(box, dir, loc, rotation, style) {
  const k = ((rotation / 90) % 4 + 4) % 4;
  return cutDoorAt(box, dir, doorFraction(loc, style, dir, k));
}

/**
 * Extra doorless wall segment(s) for the part of `boxB`'s own edge that
 * falls outside `boxA`'s cross-axis extent. A flush (doorEdges) pair's
 * wall is built from `boxA` alone — one wall per shared edge, matching the
 * old shared-pitch dedup convention — and spans exactly boxA's own
 * cross-axis size. chainPlace no longer guarantees the two boxes share
 * that size (each is its own real per-location footprint, see
 * cellFootprint), so whenever boxB reaches further along the shared edge
 * than boxA does, that excess strip of boxB's boundary never got a wall
 * at all: an open gap straight from boxB's room into whatever's beyond
 * boxA. `dir` is the canonical direction from boxA to boxB (E or S).
 */
function excessWalls(boxA, boxB, dir) {
  const oppDir = OPPOSITE_DIR[dir];
  const [bx1, by1, bx2, by2] = boxEdgeLine(boxB, oppDir);
  const axis = dir === 'E' || dir === 'W' ? 'y' : 'x';
  const [aLo, aHi] = axis === 'y' ? [boxA.y0, boxA.y0 + boxA.h] : [boxA.x0, boxA.x0 + boxA.w];
  const [bLo, bHi] = axis === 'y' ? [Math.min(by1, by2), Math.max(by1, by2)] : [Math.min(bx1, bx2), Math.max(bx1, bx2)];
  const walls = [];
  if (bLo < aLo) walls.push({ c: axis === 'y' ? [bx1, bLo, bx1, aLo] : [bLo, by1, aLo, by1] });
  if (bHi > aHi) walls.push({ c: axis === 'y' ? [bx1, aHi, bx1, bHi] : [aHi, by1, bHi, by1] });
  return walls;
}

/**
 * Picks whichever connector variant — the square `CONFIG.XDZ.connector` or
 * the more elongated `CONFIG.XDZ.connectorLong` (when defined) — needs the
 * LESS extreme length-axis stretch to bridge a `length`-px gap, instead of
 * a guessed fixed threshold: compares each candidate's own natural
 * (unstretched) length against `length` on a log scale (symmetric — a 2x
 * stretch and a 2x squash count the same), and keeps whichever is closer to
 * its own natural size. Same comparison for both styles now that both have
 * real, separately-measured B&W art (`bwAspect` on each — see
 * config.mjs/aspectFor) instead of `connectorLong` needing a bw fallback.
 */
function pickConnector(length, style) {
  const long = CONFIG.XDZ.connectorLong;
  if (!long) return CONFIG.XDZ.connector;
  const distortion = (loc) => Math.abs(Math.log(length / nominalSize(loc, style).w));
  return distortion(long) < distortion(CONFIG.XDZ.connector) ? long : CONFIG.XDZ.connector;
}

/**
 * A connector's own box bridging the real gap between `aCell` (west/north)
 * and `bCell` (east/south) along canonical `dir` — each `{box, loc,
 * rotation}`. Length axis is sized to exactly close the gap (flush against
 * both real edges, no residual slack, no overlap). The cross axis centers
 * on the midpoint between the two rooms' own REAL DOOR positions, not their
 * box centerlines — "align rooms by moving the entire room" applies to the
 * connector too, it belongs between the actual doors, not an average of
 * two room shapes that may have nothing to do with where either door is.
 * If the two doors are more than half the chosen asset's own natural
 * cross-section apart, the cross axis doubles (same asset, same technique
 * already used for length-axis stretching) so both doors comfortably land
 * inside its rendered width instead of one sitting near — or past — the
 * edge. Which asset (`loc`) bridges it is chosen by `pickConnector` from
 * the gap's real length, not by rotation.
 */
function buildConnectorBox(aCell, bCell, dir, style) {
  const rotation = dir === 'E' ? 0 : 90;
  const kA = ((aCell.rotation / 90) % 4 + 4) % 4;
  const kB = ((bCell.rotation / 90) % 4 + 4) % 4;
  const aBox = aCell.box;
  const bBox = bCell.box;
  if (dir === 'E') {
    const x0 = aBox.x0 + aBox.w;
    const length = bBox.x0 - x0;
    const loc = pickConnector(length, style);
    const natural = cellFootprint(loc, style, rotation).height;
    const doorA = aBox.y0 + doorFraction(aCell.loc, style, 'E', kA) * aBox.h;
    const doorB = bBox.y0 + doorFraction(bCell.loc, style, 'W', kB) * bBox.h;
    const h = Math.abs(doorA - doorB) > natural / 2 ? natural * 2 : natural;
    const y0 = (doorA + doorB) / 2 - h / 2;
    return { x0, y0, w: length, h, rotation, loc };
  }
  const y0 = aBox.y0 + aBox.h;
  const length = bBox.y0 - y0;
  const loc = pickConnector(length, style);
  const natural = cellFootprint(loc, style, rotation).width;
  const doorA = aBox.x0 + doorFraction(aCell.loc, style, 'S', kA) * aBox.w;
  const doorB = bBox.x0 + doorFraction(bCell.loc, style, 'N', kB) * bBox.w;
  const w = Math.abs(doorA - doorB) > natural / 2 ? natural * 2 : natural;
  const x0 = (doorA + doorB) / 2 - w / 2;
  return { x0, y0, w, h: length, rotation, loc };
}

/**
 * `updateWall` hook body: when a generated door's `ds` (open/closed/locked)
 * changes, re-texture its leaf (the Wall's own `animation.texture`) and its
 * static frame Tile to match — see DOOR_LEAF_TEXTURES/DOOR_FRAME_TEXTURES.
 * No-ops for any wall this generator didn't build (no `doorId` flag) and
 * re-entrantly for the leaf-texture update this itself issues (that update's
 * `changes` never contains `ds`).
 *
 * The leaf write is deliberately DELAYED until after the slide finishes,
 * not fired alongside `ds`. Core's Wall#_onUpdate (wall.mjs) forces a full
 * DoorMesh destroy+recreate whenever `changed.animation?.texture` is set —
 * recreation reads the Wall's *current* open/closed state with no tween, so
 * a same-write (or immediate follow-up) texture swap always shows as an
 * instant snap-to-final-position instead of a slide, regardless of the
 * animation's `duration`. Delaying past the tween means the door is already
 * resting at that final position when the mesh gets rebuilt, so only the
 * texture pops — no position jump. Frame Tile isn't part of the DoorMesh
 * chain, so it re-textures immediately with no such constraint.
 */
export function onUpdateWallDoorState(wall, changes) {
  if (!('ds' in changes)) return;
  const doorId = wall.getFlag('xdz', 'doorId');
  if (!doorId) return;
  const frameSrc = DOOR_FRAME_TEXTURES[wall.ds];
  const tile = wall.parent?.tiles.find((t) => t.getFlag('xdz', 'doorId') === doorId);
  if (frameSrc && tile && frameSrc !== tile.texture.src) tile.update({ 'texture.src': frameSrc });
  const leafSrc = DOOR_LEAF_TEXTURES[wall.ds];
  if (leafSrc && leafSrc !== wall.animation?.texture) {
    setTimeout(() => wall.update({ 'animation.texture': leafSrc }), wall.animation?.duration ?? 750);
  }
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
 * flattened background) so fog/vision/hide-mode stays workable per-cell, at
 * its own real size (see cellFootprint) — never stretched or box-fitted.
 * The main scene is laid out by chaining each piece off its already-placed
 * neighbor (see chainPlace): flush against its real edge, slid so its own
 * door lines up exactly with the neighbor's, matching "any two touching
 * locations are connected by a DOOR" with the door actually landing where
 * each piece's art draws it. When that alignment would overlap a third,
 * already-placed piece, the two are pushed apart instead and bridged by a
 * small non-LOCATION connector (corridor) Tile — two doors instead of one
 * (see buildConnectorBox). A connector is never a LOCATION: it's excluded
 * from the 16-entry roster, so it never seats during layout and never has
 * flags a Location Roll could match. QUADRANT (N/E/S/W) is not a separate
 * tile — it's a sub-point inside a single location's tile, stored on the
 * tile's flags for a future Location Roll macro to target.
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
   * the highest-degree cell, side-restricted locations (config `sides`
   * with fewer than 4 keys, i.e. a door on less than every side) only on
   * cells whose actual neighbor directions fit within `sides` after some
   * 90/180/270 rotation, everything else (all 4 sides open) fills the
   * remainder at random. Returns null (retried by build()) if the layout
   * dead-ended or a side-restricted location couldn't find a fitting cell
   * — unless `forced`, which seats leftover restricted locations anywhere
   * as a last resort so build() never loops forever.
   */
  static #attemptLayout(type, style, forced) {
    const locations = CONFIG.XDZ.locations[type];
    const hubId = HUB_LOCATIONS[type];
    const hubLoc = locations.find((l) => l.id === hubId);
    const rest = locations.filter((l) => l.id !== hubId);
    const restricted = shuffleArray(rest.filter((l) => Object.keys(sidesFor(l, style)).length < 4));
    const open = shuffleArray(rest.filter((l) => Object.keys(sidesFor(l, style)).length === 4));

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
          if (fitsRotation(neighborDirs[idx], sidesFor(loc, style), k)) candidates.push({ idx, k });
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
   * Tile-creation data for `cellsList` (already local, 0-based col/row —
   * see build()/buildPitch), positioned on the scene's own `colX`/`rowY`
   * pitch. The box a cell's column/row give it (`finalW`/`finalH`) can be
   * bigger than what this particular location actually needs — e.g. it
   * shares a column with a bigger neighbor, or its own `sizeCells` is
   * smaller (Obs Deck, Escape Pod) — so we never stretch the Tile to fill
   * that box outright. Instead the piece's own `cellFootprint` is scaled
   * up uniformly (`scale`, preserving its real aspect ratio) until it
   * touches the box on its tighter axis, then centered: a bigger piece
   * ends up genuinely bigger, a smaller one just sits centered with a bit
   * of margin, and nothing is ever squished non-uniformly to fit.
   * `width`/`height` below is the PRE-rotation box — Foundry rotates it in
   * place around `x`/`y`, so a 90/270-rotated cell needs the final
   * (post-rotation) display box's axes swapped back to get the box that
   * rotates *into* it. `anchorX`/`anchorY` sit on the location's own crop
   * box center (not the raw canvas center, default 0.5/0.5 when uncropped)
   * so a trimmed location's real content — not empty canvas padding — ends
   * up centered on the cell.
   */
  static #buildTiles(cellsList, colX, rowY, style) {
    return cellsList.map((cell) => {
      const [x0, x1] = [colX[cell.col], colX[cell.col + 1]];
      const [y0, y1] = [rowY[cell.row], rowY[cell.row + 1]];
      const [finalW, finalH] = [x1 - x0, y1 - y0];
      const k = ((cell.rotation / 90) % 4 + 4) % 4;
      const footprint = cellFootprint(cell.loc, style, cell.rotation);
      const scale = Math.min(finalW / footprint.width, finalH / footprint.height);
      const [dispW, dispH] = [footprint.width * scale, footprint.height * scale];
      const [localW, localH] = k % 2 === 0 ? [dispW, dispH] : [dispH, dispW];
      const crop = cropFor(cell.loc, style);
      const [dispX0, dispY0] = [(x0 + x1) / 2 - dispW / 2, (y0 + y1) / 2 - dispH / 2];
      const quadrants = Object.fromEntries(
        Object.entries(CONFIG.XDZ.tileQuadrants).map(([compass, frac]) => [
          compass,
          { x: dispX0 + frac.x * dispW, y: dispY0 + frac.y * dispH },
        ]),
      );
      return {
        // Tile x/y is the texture anchor point, not the top-left corner —
        // center it on the cell box so `rotation` spins the art in place.
        x: (x0 + x1) / 2,
        y: (y0 + y1) / 2,
        width: localW,
        height: localH,
        rotation: cell.rotation,
        texture: {
          src: `systems/xdz/assets/locations/${style}/${cell.loc[style]}`,
          anchorX: (crop.x0 + crop.x1) / 2,
          anchorY: (crop.y0 + crop.y1) / 2,
        },
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

  /**
   * Tile-creation data for the main (chain-placed) scene: `entries` are
   * `{loc, rotation, box, area, location}` with `box` an absolute
   * `{x0,y0,w,h}` from chainPlace (real cells) or buildConnectorBox
   * (connector pieces) — always rendered at exactly that size, no
   * contain-fit/scale, since every box IS the piece's own true size (a
   * connector's box is real-length x natural-cross-section, see
   * buildConnectorBox). `area`/`location` are undefined for connector
   * entries, same as the old connector cells — no LOCATION ROLL flags.
   */
  static #buildTilesFromBoxes(entries, style) {
    return entries.map(({ loc, rotation, box, area, location }) => {
      const k = ((rotation / 90) % 4 + 4) % 4;
      const [localW, localH] = k % 2 === 0 ? [box.w, box.h] : [box.h, box.w];
      const crop = cropFor(loc, style);
      const quadrants = Object.fromEntries(
        Object.entries(CONFIG.XDZ.tileQuadrants).map(([compass, frac]) => [
          compass,
          { x: box.x0 + frac.x * box.w, y: box.y0 + frac.y * box.h },
        ]),
      );
      return {
        x: box.x0 + box.w / 2,
        y: box.y0 + box.h / 2,
        width: localW,
        height: localH,
        rotation,
        texture: {
          src: `systems/xdz/assets/locations/${style}/${loc[style]}`,
          anchorX: (crop.x0 + crop.x1) / 2,
          anchorY: (crop.y0 + crop.y1) / 2,
        },
        flags: { xdz: { locationId: loc.id, label: loc.label, area, location, quadrants } },
      };
    });
  }

  /** Create a Scene with the standard XDZ map settings (dark background, token vision on, no fog). `width`/`height` are already in pixels (see buildPitch). */
  static async #createSceneDoc({ name, width, height, folderId, flags }) {
    return Scene.create({
      name,
      folder: folderId ?? null,
      width,
      height,
      grid: { type: CONST.GRID_TYPES.SQUARE, size: GRID_SIZE },
      levels: [{ name: 'Level', background: { color: '#0f0f0f' } }],
      padding: 0,
      tokenVision: true,
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
  static #buildAreaDoors(cells, areas, style, pitches) {
    const cellByKey = new Map(cells.map((c) => [`${c.col},${c.row}`, c]));
    const areaWalls = { 1: [], 2: [], 3: [], 4: [] };
    const areaTiles = { 1: [], 2: [], 3: [], 4: [] };
    const areaRegions = { 1: [], 2: [], 3: [], 4: [] };

    for (const cell of cells) {
      const originA = areas[cell.area];
      const edgeA = pitches[cell.area].edge;
      for (const dir of CYCLE) {
        const { dc, dr } = DIRECTIONS[CYCLE.indexOf(dir)];
        const neighbor = cellByKey.get(`${cell.col + dc},${cell.row + dr}`);
        if (!neighbor) {
          areaWalls[cell.area].push(perimeterWall(edgeA, dir, cell.col - originA.originCol, cell.row - originA.originRow));
          continue;
        }
        if (dir !== 'E' && dir !== 'S') continue; // dedup: the N/W half of each pair is handled from the neighbor's own E/S pass

        if (cell.area === neighbor.area) {
          const { walls, tile } = buildEdgeDoor(edgeA, dir, cell.col - originA.originCol, cell.row - originA.originRow, cell.loc, cell.rotation, style);
          areaWalls[cell.area].push(...walls);
          areaTiles[cell.area].push(tile);
          continue;
        }

        const originB = areas[neighbor.area];
        const edgeB = pitches[neighbor.area].edge;
        const oppDir = edgeA[dir].opposite;
        const a = buildEdgeDoor(edgeA, dir, cell.col - originA.originCol, cell.row - originA.originRow, cell.loc, cell.rotation, style);
        const b = buildEdgeDoor(edgeB, oppDir, neighbor.col - originB.originCol, neighbor.row - originB.originRow, neighbor.loc, neighbor.rotation, style);
        areaWalls[cell.area].push(...a.walls);
        areaTiles[cell.area].push(a.tile);
        areaWalls[neighbor.area].push(...b.walls);
        areaTiles[neighbor.area].push(b.tile);

        const edgeId = `${cell.col},${cell.row}:${dir}`;
        areaRegions[cell.area].push({ edgeId, ...edgeA[dir].region(cell.col - originA.originCol, cell.row - originA.originRow) });
        areaRegions[neighbor.area].push({ edgeId, ...edgeB[oppDir].region(neighbor.col - originB.originCol, neighbor.row - originB.originRow) });
      }
    }
    return { areaWalls, areaTiles, areaRegions };
  }

  /**
   * Second pass over `cells` after their rotations were locked in purely
   * for door alignment (see #attemptLayout): now that every column/row's
   * real size is knowable (an initial `buildPitch`), revisit each cell's
   * rotation and, among every rotation that still keeps its doors lined up
   * with its actual neighbors (`fitsRotation` again), pick whichever one
   * covers the most of the box that cell's first pass ended up with. A
   * piece that would otherwise render small and centered in a box shaped
   * for a differently-oriented neighbor gets to turn instead and actually
   * fill the space. Mutates `cells[].rotation` in place; the caller must
   * rebuild the pitch afterward so the final columns/rows reflect the
   * winning rotations (a cell that turns out better-fitting after turning
   * can end up sizing its column/row differently than this first pass did).
   */
  static #refineRotations(cells, occupied, style, widthCells, heightCells) {
    const pitch = buildPitch(cells, widthCells, heightCells, style);
    for (const cell of cells) {
      const dirs = DIRECTIONS.reduce((acc, { dc, dr }, i) => {
        if (occupied.has(`${cell.col + dc},${cell.row + dr}`)) acc.push(CYCLE[i]);
        return acc;
      }, []);
      const sides = sidesFor(cell.loc, style);
      const finalW = pitch.colX[cell.col + 1] - pitch.colX[cell.col];
      const finalH = pitch.rowY[cell.row + 1] - pitch.rowY[cell.row];
      let best = { rotation: cell.rotation, coverage: -1 };
      for (let k = 0; k < 4; k++) {
        if (!fitsRotation(dirs, sides, k)) continue;
        const fp = cellFootprint(cell.loc, style, k * 90);
        const scale = Math.min(finalW / fp.width, finalH / fp.height);
        const coverage = (fp.width * scale * (fp.height * scale)) / (finalW * finalH);
        if (coverage > best.coverage) best = { rotation: k * 90, coverage };
      }
      cell.rotation = best.rotation;
    }
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
    for (let attempt = 0; attempt < 40 && !result; attempt++) result = MapGenerator.#attemptLayout(type, style, false);
    if (!result) result = MapGenerator.#attemptLayout(type, style, true);
    if (!result) throw new Error('XDZ | MapGenerator: failed to build a 16-cell layout.');

    const { cells, occupied, minCol, minRow, maxCol, maxRow } = result;
    const widthCells = maxCol - minCol + 1;
    const heightCells = maxRow - minRow + 1;
    MapGenerator.#refineRotations(cells, occupied, style, widthCells, heightCells);

    // Chain-place every cell by real door coincidence, not a shared grid box
    // — see chainPlace. `boxes` maps col,row -> {x0,y0,w,h} in absolute
    // (not-yet-offset) scene pixels; doorEdges/connectorEdges are canonical
    // E/S edges (aKey's cell is west/north of bKey's).
    const { boxes, doorEdges, looseEdges, connectorEdges } = chainPlace(cells, occupied, style);
    const cellByKey = new Map(cells.map((c) => [`${c.col},${c.row}`, c]));

    // Connector pieces bridge each connectorEdges gap exactly (real edge to
    // real edge, cross axis centered on the two real doors — see
    // buildConnectorBox).
    const cellFor = (key) => {
      const c = cellByKey.get(key);
      return { box: boxes.get(key), loc: c.loc, rotation: c.rotation };
    };
    const connectorBoxes = new Map();
    for (const { aKey, bKey, dir } of connectorEdges) {
      connectorBoxes.set(`${aKey}:${bKey}`, buildConnectorBox(cellFor(aKey), cellFor(bKey), dir, style));
    }

    // Connector boxes are positioned from their two bridged rooms' real
    // doors alone — chainPlace's overlap avoidance never sees them, so a
    // connector can still land on top of an unrelated third room or another
    // connector. Its length axis must stay put (flush against both rooms it
    // bridges), but the cross axis is free to slide clear of anything else.
    // Push by the exact distance needed to clear the worst-overlapping
    // obstacle's near edge, not by the raw overlap depth — a connector that
    // starts fully *contained* inside a much bigger room (its own width is
    // the overlap depth in that case, not the real escape distance) would
    // otherwise creep out in tiny, wrong-sized steps and could stall inside
    // it well before the iteration cap.
    for (const [edgeKey, connBox] of connectorBoxes) {
      const [aKey, bKey] = edgeKey.split(':');
      const axis = connBox.rotation === 0 ? 'y' : 'x';
      const others = [...boxes.entries()].filter(([k]) => k !== aKey && k !== bKey).map(([, b]) => b);
      const otherConns = [...connectorBoxes.entries()].filter(([k]) => k !== edgeKey).map(([, b]) => b);
      for (let iter = 0; iter < 20; iter++) {
        let bestStep = 0;
        let bestSign = 1;
        for (const ob of [...others, ...otherConns]) {
          if (overlapAmount(connBox, ob, axis) <= 0) continue;
          const [connLo, connHi, obLo, obHi] =
            axis === 'x'
              ? [connBox.x0, connBox.x0 + connBox.w, ob.x0, ob.x0 + ob.w]
              : [connBox.y0, connBox.y0 + connBox.h, ob.y0, ob.y0 + ob.h];
          const pushRight = obHi - connLo + 1; // clear ob via its far (right/bottom) edge
          const pushLeft = connHi - obLo + 1; // clear ob via its near (left/top) edge
          const step = Math.min(pushRight, pushLeft);
          if (step > bestStep) {
            bestStep = step;
            bestSign = pushRight <= pushLeft ? 1 : -1;
          }
        }
        if (bestStep <= 0) break;
        if (axis === 'x') connBox.x0 += bestSign * bestStep;
        else connBox.y0 += bestSign * bestStep;
      }
    }

    // Absolute placement can (and typically does) go negative — re-normalize
    // the whole hull to a small margin from 0,0 and size the Scene to fit.
    const allBoxes = [...boxes.values(), ...connectorBoxes.values()];
    const minX = Math.min(...allBoxes.map((b) => b.x0));
    const minY = Math.min(...allBoxes.map((b) => b.y0));
    const maxX = Math.max(...allBoxes.map((b) => b.x0 + b.w));
    const maxY = Math.max(...allBoxes.map((b) => b.y0 + b.h));
    const margin = GRID_SIZE;
    const [dx, dy] = [margin - minX, margin - minY];
    for (const box of allBoxes) {
      box.x0 += dx;
      box.y0 += dy;
    }

    const folder = splitAreas ? await Folder.create({ name, type: 'Scene' }) : null;

    const mainScene = await MapGenerator.#createSceneDoc({
      name,
      width: maxX - minX + margin * 2,
      height: maxY - minY + margin * 2,
      folderId: folder?.id,
    });

    const realEntries = cells.map((c) => ({ loc: c.loc, rotation: c.rotation, box: boxes.get(`${c.col},${c.row}`), area: c.area, location: c.location }));
    const connectorEntries = connectorEdges.map(({ aKey, bKey }) => {
      const box = connectorBoxes.get(`${aKey}:${bKey}`);
      return { loc: box.loc, rotation: box.rotation, box };
    });
    await mainScene.createEmbeddedDocuments('Tile', [
      ...MapGenerator.#buildTilesFromBoxes(realEntries, style),
      ...MapGenerator.#buildTilesFromBoxes(connectorEntries, style),
    ]);

    // Walls: perimeter along every side with no neighbor, one shared-edge
    // door for each flush touching pair (doorEdges — chainPlace already
    // folds any small "loose" gap into this bucket by growing the
    // east/south box to close it, see chainPlace), two doors bridging an
    // actual connector piece for a real separation (connectorEdges) —
    // "if you're gonna overlap, open distance and use the connector
    // piece," not on every door. A leftover `looseEdges` entry (chainPlace
    // couldn't safely close the gap — a third, non-grid-adjacent box was
    // already sitting in that space) gets two independent doors, one from
    // each side's own full box, with a small bare gap between — better
    // than doorEdges' single-wall convention, which would leave the whole
    // of one room's edge completely unwalled if the gap isn't actually 0.
    // A genuinely overlapping accidental pair (none of the above) gets a
    // solid safety-net wall on each side independently, no door.
    const doorEdgeKeys = new Set(doorEdges.map((e) => `${e.aKey}:${e.bKey}`));
    const looseEdgeKeys = new Set(looseEdges.map((e) => `${e.aKey}:${e.bKey}`));
    const connectorEdgeKeys = new Set(connectorEdges.map((e) => `${e.aKey}:${e.bKey}`));
    const mainWalls = [];
    const mainDoorTiles = [];
    for (const cell of cells) {
      const key = `${cell.col},${cell.row}`;
      const box = boxes.get(key);
      for (const dir of CYCLE) {
        const { dc, dr } = DIRECTIONS[CYCLE.indexOf(dir)];
        const nKey = `${cell.col + dc},${cell.row + dr}`;
        if (!occupied.has(nKey)) {
          mainWalls.push(perimeterWallFromBox(box, dir));
          continue;
        }
        const canonDir = dir === 'E' || dir === 'S' ? dir : OPPOSITE_DIR[dir];
        const [aKey, bKey] = dir === 'E' || dir === 'S' ? [key, nKey] : [nKey, key];
        const edgeKey = `${aKey}:${bKey}`;
        if (aKey !== key) continue; // built once, from the west/north cell's own pass
        if (doorEdgeKeys.has(edgeKey)) {
          const { walls, tile } = buildCellDoor(box, canonDir, cell.loc, cell.rotation, style);
          mainWalls.push(...walls, ...excessWalls(box, boxes.get(bKey), canonDir));
          mainDoorTiles.push(tile);
        } else if (looseEdgeKeys.has(edgeKey)) {
          const neighborCell = cellByKey.get(bKey);
          const near = buildCellDoor(box, canonDir, cell.loc, cell.rotation, style);
          const far = buildCellDoor(boxes.get(bKey), OPPOSITE_DIR[canonDir], neighborCell.loc, neighborCell.rotation, style);
          mainWalls.push(...near.walls, ...far.walls);
          mainDoorTiles.push(near.tile, far.tile);
        } else if (connectorEdgeKeys.has(edgeKey)) {
          // Each junction (A<->connector, connector<->B) is flush by
          // construction (buildConnectorBox closes the gap exactly) — one
          // door per junction, same convention as the flush doorEdges case,
          // not one from each side (that put two doors on the same
          // coincident wall line). Both doors are cut from the ROOM's own
          // box (`buildCellDoor`, same as `near`/A), not the connector's —
          // the connector's cross-section is usually much narrower than the
          // room's own edge (that's the whole point of it bridging a real
          // gap), so cutting B's door into the connector's own box instead
          // of B's left the rest of B's edge completely unwalled, a real
          // hole straight into B's room (found via a live wall-coverage
          // audit, 2026-08-21 — the room's own edge fraction is identical
          // either way since it's the same underlying doorFraction/box math
          // buildConnectorBox itself used to place the connector, this just
          // spans B's FULL extent instead of the connector's narrow one).
          const connBox = connectorBoxes.get(edgeKey);
          const neighborCell = cellByKey.get(bKey);
          const near = buildCellDoor(box, canonDir, cell.loc, cell.rotation, style);
          const far = buildCellDoor(boxes.get(bKey), OPPOSITE_DIR[canonDir], neighborCell.loc, neighborCell.rotation, style);
          mainWalls.push(...near.walls, ...far.walls);
          mainDoorTiles.push(near.tile, far.tile);
          // The connector's own two long (non-door) sides never touch A or
          // B's walls at all — they float between the rooms with nothing
          // sealing them, another real hole the audit found. Close them
          // with plain perimeter walls (its short, room-facing ends are
          // already sealed by near/far above, flush by construction).
          const [crossA, crossB] = canonDir === 'E' ? ['N', 'S'] : ['W', 'E'];
          mainWalls.push(perimeterWallFromBox(connBox, crossA), perimeterWallFromBox(connBox, crossB));
          // "Flush by construction" only closes the part of the connector's
          // near/far edge that the room's own wall actually reaches — the
          // connector's cross-section can be WIDER than the room it
          // attaches to (that's exactly what triggers the misalignment
          // doubling in buildConnectorBox), so the overhanging portion has
          // no wall on either end either. Same excessWalls helper as the
          // doorEdges case, just applied connector<->room instead of
          // room<->room (found live, same audit, 2026-08-21).
          mainWalls.push(...excessWalls(box, connBox, canonDir));
          mainWalls.push(...excessWalls(boxes.get(bKey), connBox, OPPOSITE_DIR[canonDir]));
        } else {
          mainWalls.push(perimeterWallFromBox(box, canonDir));
          mainWalls.push(perimeterWallFromBox(boxes.get(bKey), OPPOSITE_DIR[canonDir]));
        }
      }
    }
    await mainScene.createEmbeddedDocuments('Wall', mainWalls);
    if (mainDoorTiles.length) await mainScene.createEmbeddedDocuments('Tile', mainDoorTiles);

    if (!splitAreas) return mainScene;

    const areas = MapGenerator.#buildAreaGeometry(cells);
    // Each AREA scene gets its own colX/rowY pitch, built from its own
    // cells in its own local (0-based) col/row space — computed upfront so
    // #buildAreaDoors (cross-AREA pairs need both sides' pitch at once) and
    // the per-scene loop below can both use it.
    const pitches = {};
    for (let areaNum = 1; areaNum <= 4; areaNum++) {
      const origin = areas[areaNum];
      origin.localCells = origin.cells.map((c) => ({ ...c, col: c.col - origin.originCol, row: c.row - origin.originRow }));
      pitches[areaNum] = buildPitch(origin.localCells, origin.widthCells, origin.heightCells, style);
    }
    const { areaWalls, areaTiles, areaRegions } = MapGenerator.#buildAreaDoors(cells, areas, style, pitches);

    // areaNum -> [{ edgeId, doc: Region }], for the cross-linking pass below.
    const regionsByArea = {};

    for (let areaNum = 1; areaNum <= 4; areaNum++) {
      const origin = areas[areaNum];
      const pitch = pitches[areaNum];
      const scene = await MapGenerator.#createSceneDoc({
        name: game.i18n.format('XDZ.MapGenerator.AreaSceneName', { name, area: areaNum }),
        width: pitch.colX[origin.widthCells],
        height: pitch.rowY[origin.heightCells],
        folderId: folder.id,
        // Centroid in the shared build-time grid space (see #buildAreaGeometry),
        // not this scene's own local space — lets xdz.mjs compare two AREA
        // scenes' positions to work out a compass direction between them.
        flags: { xdz: { areaCentroid: { col: (origin.minCol + origin.maxCol) / 2, row: (origin.minRow + origin.maxRow) / 2 } } },
      });

      await scene.createEmbeddedDocuments('Tile', MapGenerator.#buildTiles(origin.localCells, pitch.colX, pitch.rowY, style));
      if (areaTiles[areaNum].length) await scene.createEmbeddedDocuments('Tile', areaTiles[areaNum]);
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
