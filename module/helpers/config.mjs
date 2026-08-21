export const XDZ = {};

/**
 * Training stats a Commando distributes 10 points across.
 */
XDZ.trainings = {
  pilot: 'XDZ.Training.Pilot',
  systems: 'XDZ.Training.Systems',
  mechanic: 'XDZ.Training.Mechanic',
  weapons: 'XDZ.Training.Weapons',
  medical: 'XDZ.Training.Medical',
};

XDZ.trainingBudget = 10;
XDZ.statPipMax = 4;

/**
 * Resistance stats a Commando distributes 6 points across.
 */
XDZ.resistances = {
  fear: 'XDZ.Resistance.Fear',
  dodge: 'XDZ.Resistance.Dodge',
  death: 'XDZ.Resistance.Death',
};

XDZ.resistanceBudget = 6;

XDZ.injuryDown = 5;
XDZ.injuryDeath = 6;

XDZ.defaultTarget = 12;

XDZ.xenoModes = {
  hide: 'XDZ.Xeno.Hide',
  seek: 'XDZ.Xeno.Seek',
};

XDZ.xenoTypes = {
  drone: 'XDZ.Xeno.TypeDrone',
  warrior: 'XDZ.Xeno.TypeWarrior',
  pretorian: 'XDZ.Xeno.TypePretorian',
  breeder: 'XDZ.Xeno.TypeBreeder',
  alpha: 'XDZ.Xeno.TypeAlpha',
  custom: 'XDZ.Xeno.TypeCustom',
};

/**
 * Field-manual style rules reminder shown on the Xeno sheet, below Notes.
 * Localization keys, resolved via {{{localize}}} (triple-stash) since the
 * strings embed <strong> tags.
 */
XDZ.xenoBriefing = {
  steps: [
    { num: 1, key: 'XDZ.Xeno.BriefingStep1' },
    { num: 2, key: 'XDZ.Xeno.BriefingStep2' },
    { num: 3, key: 'XDZ.Xeno.BriefingStep3' },
  ],
  ruleKeys: ['XDZ.Xeno.BriefingRule1', 'XDZ.Xeno.BriefingRule2', 'XDZ.Xeno.BriefingRule3'],
};

XDZ.destroyDieSteps = ['1d4', '1d6', '1d8', '1d10', '1d12'];

/**
 * How a destroy-die roll's auto-kill (see helpers/auto-kill.mjs) spends its
 * total against xenos on the canvas: `normal` spends closest-first around
 * the attacker, `explosive` closest-first around the target (blast radius),
 * `piercing` closest-first along the beeline from attacker through target
 * and out the other side (line pierces through everyone in the way).
 */
XDZ.weaponKillModes = {
  normal: 'XDZ.Weapon.KillModeNormal',
  explosive: 'XDZ.Weapon.KillModeExplosive',
  piercing: 'XDZ.Weapon.KillModePiercing',
};

// Placeholder art from Foundry's core icon set — swap for custom XDZ art later.
XDZ.actorTypeImages = {
  commando: 'icons/svg/mystery-man.svg',
  character: 'icons/svg/mystery-man.svg',
  xeno: 'icons/svg/skull.svg',
  npc: 'icons/svg/mystery-man.svg',
  vehicle: 'icons/svg/mystery-man.svg',
};

XDZ.itemTypeImages = {
  weapon: 'icons/svg/sword.svg',
  gear: 'icons/svg/chest.svg',
};

/**
 * The 16 LOCATIONS of a STARSHIP or COLONY map (see KB §8), each available
 * as a color or B&W tile. `color`/`bw` are filenames only (no dir) since
 * some assets drifted from the KB naming across the two styles.
 *
 * `sides`: { side: fraction } — compass sides (N/E/S/W, in the art's
 * unrotated orientation) where the location's art actually draws a
 * door/opening, each mapped to where along that edge (0-1, corner-to-corner
 * going clockwise from N — N/S run W-corner->E-corner, E/W run
 * N-corner->S-corner) the door is actually drawn. A side missing from this
 * object has no door there at all — e.g. an Airlock or Escape Pod is an
 * exterior piece, only breachable from specific sides, not all 4. All 4
 * sides present = an interior piece that connects freely on any side.
 * MapGenerator seats side-restricted locations (fewer than 4 keys) on
 * layout cells whose actual neighbor directions fit within `sides` after
 * some 90/180/270 rotation, and rotates the placed Tile to match. Every
 * fraction below was measured off the color art (door-adjacent hazard
 * striping / silhouette break); most aren't 0.5 — a future door-Wall
 * placement can use these to land on the exact point each piece's art
 * draws its door instead of spanning the whole shared edge, so two
 * touching pieces' doors line up flush.
 *
 * `exterior` (optional): compass sides (same unrotated orientation) whose
 * art faces outside the structure (open space / planet surface) rather
 * than another LOCATION, e.g. the Escape Pod's hull on every side but its
 * one door. MapGenerator can use this to prefer seating the piece on the
 * outer boundary of the grown layout on that side, so it ends up on the
 * periphery of the map instead of walled in by neighbors. Omitted = no
 * side of this piece is exterior.
 *
 * `bwSides`/`bwExterior` (optional): the B&W tile's own `sides`/`exterior`,
 * when its art actually differs from the color tile's (measured
 * separately) — e.g. Colony Command's B&W art has no N door where the
 * color art does, so it's side-restricted in B&W but freely-connecting in
 * color. Falls back to `sides`/`exterior` when omitted (the two styles'
 * door layout matched closely enough to share one reading). MapGenerator
 * must pick `bwSides`/`bwExterior` over `sides`/`exterior` whenever it's
 * building the `bw` style, since the two can disagree on which sides even
 * have a door.
 *
 * `crop`/`bwCrop` (optional): { x0, y0, x1, y1 }, fractions (0-1, art's own
 * unrotated frame) of the raw canvas that's the location's real footprint —
 * where its painted room actually stops, not the raw image edge. `sides`
 * fractions are measured against this box, not the raw canvas (see
 * tools/door-mapper). Most pieces paint edge-to-edge (full canvas = no
 * crop, the default when omitted); a few have real padding baked into the
 * asset, measured via tools/door-mapper's crop tool. MapGenerator sizes
 * each cell's actual on-screen footprint from this box so two touching
 * pieces' real edges land closer together instead of leaving a void gap
 * behind a correctly-placed door. `bwCrop` overrides for the B&W asset,
 * same fallback rule as `bwSides`.
 *
 * `aspect`: the color art's own real height/width ratio, measured directly
 * off its .webp pixel dimensions (rooms are NOT uniformly proportioned —
 * e.g. Colony Command is 0.87, Escape Pod is 0.63 — never assume one shared
 * ratio for all of them). Combined with `sizeCells` this sets the room's
 * real on-screen size (see map-generator.mjs's nominalSize/aspectFor); the
 * B&W tile set is a shared 2100x1500 template canvas across every location
 * (only the crop/paint differ), so there's no equivalent `bwAspect` to
 * measure — aspectFor uses that template's own ratio for bw regardless of
 * `aspect`.
 *
 * `sizeCells` (optional): nominal room footprint width, in 75px grid
 * squares — defaults to 12 ("a 12x9 grid is an ok size for the average
 * room") when omitted; height is derived from `aspect`, so this is a single
 * knob, not a separate w/h pair. Smaller pieces (Obs Deck, Escape Pod)
 * override it down. MapGenerator never stretches or box-fits a location —
 * every piece renders at its own true size (see map-generator.mjs's
 * cellFootprint/chainPlace).
 */
XDZ.defaultDoorAt = 0.5;

XDZ.locations = {
  ship: [
    { id: 'escapePod', label: 'XDZ.Locations.Ship.EscapePod', color: 'ship escape pod.webp', bw: 'ship escape pod.webp', aspect: 0.6284, sides: { E: 0.5, N: 0.5, S: 0.5 }, exterior: ['W'], bwSides: { E: 0.5, S: 0.5, N: 0.55 }, bwExterior: ['W'], sizeCells: 9 },
    { id: 'bridge', label: 'XDZ.Locations.Ship.Bridge', color: 'ship command deck.webp', bw: 'ship bridge.webp', aspect: 0.7232, sides: { S: 0.51, E: 0.5, W: 0.5 }, bwSides: { S: 0.51, E: 0.55, W: 0.57 } },
    { id: 'engineRoom', label: 'XDZ.Locations.Ship.EngineRoom', color: 'ship engine room.webp', bw: 'ship engine room.webp', aspect: 0.6513, sides: { N: 0.5, E: 0.52, W: 0.53, S: 0.5 }, bwSides: { N: 0.53, E: 0.52, W: 0.53, S: 0.49 } },
    { id: 'airlock', label: 'XDZ.Locations.Ship.Airlock', color: 'ship airlock.webp', bw: 'ship airlock.webp', aspect: 0.6876, sides: { S: 0.5, E: 0.54, W: 0.58 }, exterior: ['N'] },
    { id: 'medBay', label: 'XDZ.Locations.Ship.MedBay', color: 'ship med bay.webp', bw: 'ship med bay.webp', aspect: 0.7081, sides: { W: 0.5, E: 0.68, S: 0.57, N: 0.51 }, bwSides: { W: 0.47, E: 0.68, S: 0.57, N: 0.53 } },
    { id: 'quarters', label: 'XDZ.Locations.Ship.Quarters', color: 'ship quarters.webp', bw: 'ship quarters.webp', aspect: 0.7477, sides: { W: 0.48, E: 0.49, S: 0.49, N: 0.55 } },
    { id: 'galley', label: 'XDZ.Locations.Ship.Galley', color: 'ship galley.webp', bw: 'ship galley.webp', aspect: 0.7197, sides: { E: 0.5, W: 0.7, N: 0.48, S: 0.49 }, bwSides: { E: 0.5, W: 0.74, N: 0.48, S: 0.49 } },
    { id: 'refinery', label: 'XDZ.Locations.Ship.Refinery', color: 'ship refinery.webp', bw: 'ship refinery.webp', aspect: 0.7232, sides: { N: 0.51, E: 0.48, S: 0.39, W: 0.42 }, bwSides: { N: 0.51, E: 0.48, S: 0.39, W: 0.43 } },
    { id: 'hydroponics', label: 'XDZ.Locations.Ship.Hydroponics', color: 'ship hydroponics.webp', bw: 'ship hydroponics.webp', aspect: 0.6713, sides: { W: 0.5, S: 0.51, E: 0.56, N: 0.49 }, bwSides: { W: 0.5, S: 0.51, E: 0.56, N: 0.48 } },
    { id: 'garage', label: 'XDZ.Locations.Ship.Garage', color: 'ship garage.webp', bw: 'ship garage.webp', aspect: 0.6937, sides: { W: 0.33, N: 0.33, E: 0.35, S: 0.79 }, bwSides: { W: 0.47, N: 0.52, E: 0.49, S: 0.51 } },
    { id: 'loadingBay', label: 'XDZ.Locations.Ship.LoadingBay', color: 'ship loading bay.webp', bw: 'ship loading bay.webp', aspect: 0.6686, sides: { E: 0.5 }, exterior: ['W'] },
    { id: 'corridor', label: 'XDZ.Locations.Ship.Corridor', color: 'ship corridor.webp', bw: 'ship m corridor.webp', aspect: 0.7159, sides: { W: 0.28, E: 0.72 }, bwSides: { W: 0.29, E: 0.74 } },
    { id: 'crawlspace', label: 'XDZ.Locations.Ship.Crawlspace', color: 'ship crawlspace.webp', bw: 'ship crawlspace.webp', aspect: 0.7127, sides: { N: 0.54, E: 0.5, S: 0.48, W: 0.4 }, bwSides: { N: 0.53, E: 0.51, S: 0.47, W: 0.4 } },
    { id: 'sump', label: 'XDZ.Locations.Ship.Sump', color: 'ship sump.webp', bw: 'ship sump.webp', aspect: 0.7391, sides: { N: 0.53, E: 0.54, S: 0.48, W: 0.48 }, bwSides: { N: 0.53, E: 0.54, S: 0.48, W: 0.45 } },
    { id: 'obsDeck', label: 'XDZ.Locations.Ship.ObsDeck', color: 'ship obs deck.webp', bw: 'ship obs deck.webp', aspect: 0.6946, sides: { S: 0.5, W: 0.71, E: 0.7 }, exterior: ['N'], bwSides: { S: 0.5, W: 0.76, E: 0.74 }, sizeCells: 9 },
    { id: 'lifeSupport', label: 'XDZ.Locations.Ship.LifeSupport', color: 'ship life support.webp', bw: 'ship life support.webp', aspect: 0.7116, sides: { W: 0.5, N: 0.5, S: 0.5, E: 0.51 } },
  ],
  colony: [
    { id: 'landingPad', label: 'XDZ.Locations.Colony.LandingPad', color: 'colony landing pad.webp', bw: 'colony landing pad.webp', aspect: 0.7496, sides: { W: 0.47, S: 0.59, N: 0.53 }, exterior: ['E'], bwSides: { W: 0.47, S: 0.59, E: 0.54 }, bwExterior: ['N'], crop: { x0: 0.0517, y0: 0.0315, x1: 0.9669, y1: 0.9814 } },
    { id: 'radioDish', label: 'XDZ.Locations.Colony.RadioDish', color: 'colony uplink dish.webp', bw: 'colony radio dish.webp', aspect: 0.7012, sides: { N: 0.31, W: 0.34, S: 0.55, E: 0.6 }, bwSides: { N: 0.32, S: 0.23, W: 0.35, E: 0.61 } },
    { id: 'command', label: 'XDZ.Locations.Colony.Command', color: 'colony command.webp', bw: 'colony command.webp', aspect: 0.8725, sides: { W: 0.49, S: 0.48, E: 0.5, N: 0.52 }, bwSides: { S: 0.5, E: 0.56, W: 0.57 } },
    { id: 'medBay', label: 'XDZ.Locations.Colony.MedBay', color: 'colony med bay.webp', bw: 'colony med bay.webp', aspect: 0.7141, sides: { N: 0.59, W: 0.47, E: 0.67, S: 0.61 }, bwSides: { N: 0.57, E: 0.67, W: 0.48, S: 0.56 } },
    { id: 'armory', label: 'XDZ.Locations.Colony.Armory', color: 'colony armory.webp', bw: 'colony armory.webp', aspect: 0.7275, sides: { N: 0.6, E: 0.52, S: 0.6, W: 0.38 }, bwSides: { N: 0.44, W: 0.59, S: 0.59, E: 0.53 } },
    { id: 'refinery', label: 'XDZ.Locations.Colony.Refinery', color: 'colony refinery.webp', bw: 'colony refinery.webp', aspect: 0.7123, sides: { W: 0.54, E: 0.58, N: 0.61, S: 0.5 }, bwSides: { W: 0.56, S: 0.59, E: 0.35, N: 0.48 } },
    { id: 'reactor', label: 'XDZ.Locations.Colony.Reactor', color: 'colony reactor.webp', bw: 'colony reactor.webp', aspect: 0.6971, sides: { W: 0.5, E: 0.5, S: 0.5, N: 0.29 }, bwSides: { W: 0.5, E: 0.5, S: 0.5, N: 0.28 } },
    { id: 'cafeteria', label: 'XDZ.Locations.Colony.Cafeteria', color: 'colony cafeteria.webp', bw: 'colony cafeteria.webp', aspect: 0.7159, sides: { W: 0.5, E: 0.5, S: 0.51, N: 0.51 } },
    { id: 'causeway', label: 'XDZ.Locations.Colony.Causeway', color: 'colony causeway.webp', bw: 'colony causeway.webp', aspect: 0.7007, sides: { W: 0.5, E: 0.5 }, bwSides: { W: 0.5, E: 0.5, S: 0.49, N: 0.5 } },
    { id: 'surface', label: 'XDZ.Locations.Colony.Surface', color: 'colony surface.webp', bw: 'colony surface.webp', aspect: 0.7313, sides: { W: 0.61, E: 0.6, S: 0.5, N: 0.56 }, bwSides: { N: 0.56, W: 0.62, E: 0.63, S: 0.49 } },
    { id: 'residential', label: 'XDZ.Locations.Colony.Residential', color: 'colony residential.webp', bw: 'colony residential.webp', aspect: 0.7169, sides: { W: 0.38, N: 0.31, E: 0.61, S: 0.39 } },
    { id: 'dump', label: 'XDZ.Locations.Colony.Dump', color: 'colony dump.webp', bw: 'colony dump.webp', aspect: 0.7221, sides: { E: 0.61, S: 0.48, W: 0.47, N: 0.53 }, bwSides: { E: 0.61, W: 0.47, N: 0.53, S: 0.46 }, crop: { x0: 0, y0: 0.0072, x1: 1, y1: 1 } },
    { id: 'substructure', label: 'XDZ.Locations.Colony.Substructure', color: 'colony substructure.webp', bw: 'colony substructure.webp', aspect: 0.7203, sides: { W: 0.7, N: 0.41, E: 0.4, S: 0.54 }, bwSides: { N: 0.41, E: 0.4, S: 0.54, W: 0.69 } },
    { id: 'motorPool', label: 'XDZ.Locations.Colony.MotorPool', color: 'colony motor pool.webp', bw: 'colony motor pool.webp', aspect: 0.7027, sides: { W: 0.43, N: 0.52, E: 0.46, S: 0.5 }, bwSides: { S: 0.48, E: 0.5, N: 0.51, W: 0.49 } },
    { id: 'potatoFarm', label: 'XDZ.Locations.Colony.PotatoFarm', color: 'colony potato farm.webp', bw: 'colony potato farm.webp', aspect: 0.7205, sides: { N: 0.48, S: 0.49, E: 0.46, W: 0.44 }, bwSides: { S: 0.49, W: 0.47, N: 0.5, E: 0.5 }, crop: { x0: 0, y0: 0, x1: 0.9968, y1: 0.9628 } },
    { id: 'astrophysics', label: 'XDZ.Locations.Colony.Astrophysics', color: 'colony astrophysics.webp', bw: 'colony astrophysics.webp', aspect: 0.7097, sides: { E: 0.51, W: 0.48, N: 0.74, S: 0.4 }, bwSides: { E: 0.51, S: 0.39, W: 0.46, N: 0.74 }, crop: { x0: 0.0424, y0: 0.0501, x1: 0.9597, y1: 0.9514 } },
  ],
};

/**
 * A location-shaped object, but deliberately NOT inside `XDZ.locations` —
 * MapGenerator's `#attemptLayout` only ever assigns roll slots to entries in
 * that array, so this can never be seated as one of the 16 LOCATIONs. Used
 * only as a thin bridging piece MapGenerator's chainPlace inserts between
 * two touching LOCATIONs whose door-coincident alignment would otherwise
 * overlap a third, already-placed piece — see map-generator.mjs's
 * buildConnectorBox. `sides: {W,E}` is its canonical (unrotated)
 * orientation; MapGenerator rotates it 90° for a N/S bridge the same way it
 * rotates any LOCATION tile. One asset per style, reused for both
 * orientations. `aspect` (height/width) matches the real 907x907 square
 * art — `sizeCells` sets its natural cross-section only; its rendered
 * *length* is whatever real gap it's bridging (buildConnectorBox sizes that
 * axis directly from the two doors it connects, not from `sizeCells`).
 */
XDZ.connector = {
  id: 'connector',
  label: 'Connector',
  color: 'connector.webp',
  bw: 'connector bw.webp',
  sides: { W: 0.5, E: 0.5 },
  sizeCells: 2,
  aspect: 1,
  // Both the color and B&W connector art are real, separately-measured
  // assets (not the shared 2100x1500 template every other B&W location
  // uses) — `bwAspect` overrides `aspectFor`'s default BW_ASPECT fallback
  // so B&W renders at this piece's own true 907x907 ratio instead.
  bwAspect: 1,
};

/**
 * A second connector asset, more elongated (real art 1777x502 vs the square
 * connector's 907x907) — for bridging a much bigger gap than the square
 * piece can reach without looking absurdly stretched. Never picked
 * directly by `#attemptLayout`/`chainPlace`'s edge classification the way
 * `XDZ.connector` is (same "not one of the 16 LOCATIONs" exclusion
 * applies) — `buildConnectorBox`'s `pickConnector` chooses between the two
 * per-bridge, by comparing how far each one's own natural (rest) length is
 * from the actual gap being bridged, so a short gap still gets the square
 * piece and only a genuinely long one reaches for this. `sizeCells: 6`
 * (vs the square's 2) sets its natural rest length so that comparison
 * means something — tune together if either art gets remeasured.
 * `bwAspect` — same reasoning as `XDZ.connector`'s: `connector_long_bw.webp`
 * is a real, separately-measured asset matching the color art's own real
 * proportions, not the generic B&W template.
 */
XDZ.connectorLong = {
  id: 'connectorLong',
  label: 'Connector (Long)',
  color: 'connector_long.webp',
  bw: 'connector_long_bw.webp',
  sides: { W: 0.5, E: 0.5 },
  sizeCells: 6,
  bwAspect: 502 / 1777,
  aspect: 502 / 1777,
};

/**
 * KB §8's MAPS diagram nests 3 levels:
 *   AREA (1-4)         - a cluster of 4 LOCATIONS on the map. Per the book's
 *                        example diagram this is an organic tetromino-like
 *                        shape (S/Z/L/T/I/O), not a filled square — most
 *                        LOCATIONS touch only 1-2 neighbors, a 3-way
 *                        junction is a rare (~10%) branch. See
 *                        MapGenerator's growing-tree layout walk, which
 *                        produces this shape procedurally instead of a
 *                        fixed grid.
 *   LOCATION (1-4)     - one tile within that AREA.
 *   QUADRANT (N/E/S/W) - a sub-zone *inside* a single LOCATION tile, at that
 *                        edge's midpoint (cross layout) — not a separate
 *                        tile/image.
 * A LOCATION ROLL is 3D4 read in sequence as AREA -> LOCATION -> QUADRANT.
 */

// QUADRANT (N/E/S/W) fractional center within a single LOCATION tile's
// bounding box — for pinpointing a spot inside one location (spawn point,
// Location Roll narration), not a separate tile/image. Cross/edge-midpoint
// layout (N=top-center, E=right-center, S=bottom-center, W=left-center),
// confirmed against the book's diagram via a proof-of-concept script drawing
// both candidate layouts on generated tiles.
XDZ.tileQuadrants = {
  N: { x: 0.5, y: 0.2 },
  E: { x: 0.8, y: 0.5 },
  S: { x: 0.5, y: 0.8 },
  W: { x: 0.2, y: 0.5 },
};

/**
 * The 20-entry "mission objectives" table, transcribed verbatim from the
 * rulebook (incl. its own printing artifacts, e.g. #17's dangling "dan-").
 * `desc` carries `%LOC1%`/`%LOC2%`/`%LOC3%`/`%LOCLIST%` placeholders exactly
 * where the book calls for a LOCATION ROLL — MissionGenerator swaps each for
 * a rolled `<LocationName>` tag. `locationRolls` is how many rolls that
 * entry needs: a fixed count, or the string '1d4' for a variable count
 * (resolved with `%LOCLIST%`, a single comma-joined tag list).
 */
XDZ.objectives = [
  {
    num: 1,
    id: 'sweepAndClear',
    label: 'XDZ.Objectives.SweepAndClear.Label',
    locationRolls: 3,
    desc: 'XDZ.Objectives.SweepAndClear.Desc',
  },
  {
    num: 2,
    id: 'restorePower',
    label: 'XDZ.Objectives.RestorePower.Label',
    locationRolls: 1,
    desc: 'XDZ.Objectives.RestorePower.Desc',
  },
  {
    num: 3,
    id: 'anomalyRecon',
    label: 'XDZ.Objectives.AnomalyRecon.Label',
    locationRolls: 1,
    desc: 'XDZ.Objectives.AnomalyRecon.Desc',
  },
  {
    num: 4,
    id: 'fallBack',
    label: 'XDZ.Objectives.FallBack.Label',
    locationRolls: 1,
    desc: 'XDZ.Objectives.FallBack.Desc',
  },
  {
    num: 5,
    id: 'rescueTheColonists',
    label: 'XDZ.Objectives.RescueTheColonists.Label',
    locationRolls: 1,
    desc: 'XDZ.Objectives.RescueTheColonists.Desc',
  },
  {
    num: 6,
    id: 'exterminateTheAlpha',
    label: 'XDZ.Objectives.ExterminateTheAlpha.Label',
    locationRolls: 1,
    desc: 'XDZ.Objectives.ExterminateTheAlpha.Desc',
  },
  {
    num: 7,
    id: 'destroyTheHive',
    label: 'XDZ.Objectives.DestroyTheHive.Label',
    locationRolls: 1,
    desc: 'XDZ.Objectives.DestroyTheHive.Desc',
  },
  {
    num: 8,
    id: 'repairTheMachinery',
    label: 'XDZ.Objectives.RepairTheMachinery.Label',
    locationRolls: 1,
    desc: 'XDZ.Objectives.RepairTheMachinery.Desc',
  },
  {
    num: 9,
    id: 'stronghold',
    label: 'XDZ.Objectives.Stronghold.Label',
    locationRolls: 1,
    desc: 'XDZ.Objectives.Stronghold.Desc',
  },
  {
    num: 10,
    id: 'escortACivi',
    label: 'XDZ.Objectives.EscortACivi.Label',
    locationRolls: 1,
    desc: 'XDZ.Objectives.EscortACivi.Desc',
  },
  {
    num: 11,
    id: 'specimenCollection',
    label: 'XDZ.Objectives.SpecimenCollection.Label',
    locationRolls: 1,
    desc: 'XDZ.Objectives.SpecimenCollection.Desc',
  },
  {
    num: 12,
    id: 'demolitions',
    label: 'XDZ.Objectives.Demolitions.Label',
    locationRolls: 1,
    desc: 'XDZ.Objectives.Demolitions.Desc',
  },
  {
    num: 13,
    id: 'dataRetrieval',
    label: 'XDZ.Objectives.DataRetrieval.Label',
    locationRolls: 1,
    desc: 'XDZ.Objectives.DataRetrieval.Desc',
  },
  {
    num: 14,
    id: 'rescueOp',
    label: 'XDZ.Objectives.RescueOp.Label',
    locationRolls: 1,
    desc: 'XDZ.Objectives.RescueOp.Desc',
  },
  {
    num: 15,
    id: 'alignTheUplinkDish',
    label: 'XDZ.Objectives.AlignTheUplinkDish.Label',
    locationRolls: 0,
    desc: 'XDZ.Objectives.AlignTheUplinkDish.Desc',
  },
  {
    num: 16,
    id: 'aidASurvivor',
    label: 'XDZ.Objectives.AidASurvivor.Label',
    locationRolls: 2,
    desc: 'XDZ.Objectives.AidASurvivor.Desc',
  },
  {
    num: 17,
    id: 'getTheTech',
    label: 'XDZ.Objectives.GetTheTech.Label',
    locationRolls: 1,
    desc: 'XDZ.Objectives.GetTheTech.Desc',
  },
  {
    num: 18,
    id: 'wayPoints',
    label: 'XDZ.Objectives.WayPoints.Label',
    locationRolls: 3,
    desc: 'XDZ.Objectives.WayPoints.Desc',
  },
  {
    num: 19,
    id: 'findTheirOrigin',
    label: 'XDZ.Objectives.FindTheirOrigin.Label',
    locationRolls: 3,
    desc: 'XDZ.Objectives.FindTheirOrigin.Desc',
  },
  {
    num: 20,
    id: 'hostileAgents',
    label: 'XDZ.Objectives.HostileAgents.Label',
    locationRolls: '1d4',
    desc: 'XDZ.Objectives.HostileAgents.Desc',
  },
];

/**
 * The 20-entry "mission escalations" table, transcribed verbatim from the
 * rulebook. Same `%LOC%`/`locationRolls` convention as XDZ.objectives —
 * see that block's doc comment.
 */
XDZ.escalations = [
  {
    num: 1,
    id: 'killMe',
    label: 'XDZ.Escalations.KillMe.Label',
    locationRolls: 0,
    desc: 'XDZ.Escalations.KillMe.Desc',
  },
  {
    num: 2,
    id: 'theyCutThePower',
    label: 'XDZ.Escalations.TheyCutThePower.Label',
    locationRolls: 0,
    desc: 'XDZ.Escalations.TheyCutThePower.Desc',
  },
  {
    num: 3,
    id: 'blocked',
    label: 'XDZ.Escalations.Blocked.Label',
    locationRolls: 0,
    desc: 'XDZ.Escalations.Blocked.Desc',
  },
  {
    num: 4,
    id: 'flameUnitsOnly',
    label: 'XDZ.Escalations.FlameUnitsOnly.Label',
    locationRolls: 0,
    desc: 'XDZ.Escalations.FlameUnitsOnly.Desc',
  },
  {
    num: 5,
    id: 'theBreeder',
    label: 'XDZ.Escalations.TheBreeder.Label',
    locationRolls: 0,
    desc: 'XDZ.Escalations.TheBreeder.Desc',
  },
  {
    num: 6,
    id: 'praetorianGuards',
    label: 'XDZ.Escalations.PraetorianGuards.Label',
    locationRolls: 0,
    desc: 'XDZ.Escalations.PraetorianGuards.Desc',
  },
  {
    num: 7,
    id: 'rogueCommandos',
    label: 'XDZ.Escalations.RogueCommandos.Label',
    locationRolls: 1,
    desc: 'XDZ.Escalations.RogueCommandos.Desc',
  },
  {
    num: 8,
    id: 'usedUp',
    label: 'XDZ.Escalations.UsedUp.Label',
    locationRolls: 0,
    desc: 'XDZ.Escalations.UsedUp.Desc',
  },
  {
    num: 9,
    id: 'manDown',
    label: 'XDZ.Escalations.ManDown.Label',
    locationRolls: 0,
    desc: 'XDZ.Escalations.ManDown.Desc',
  },
  {
    num: 10,
    id: 'somethingWicked',
    label: 'XDZ.Escalations.SomethingWicked.Label',
    locationRolls: 1,
    desc: 'XDZ.Escalations.SomethingWicked.Desc',
  },
  {
    num: 11,
    id: 'fubard',
    label: "XDZ.Escalations.Fubard.Label",
    locationRolls: 1,
    desc: 'XDZ.Escalations.Fubard.Desc',
  },
  {
    num: 12,
    id: 'supplyDrop',
    label: 'XDZ.Escalations.SupplyDrop.Label',
    locationRolls: 0,
    desc: 'XDZ.Escalations.SupplyDrop.Desc',
  },
  {
    num: 13,
    id: 'outOfAmmo',
    label: 'XDZ.Escalations.OutOfAmmo.Label',
    locationRolls: 0,
    desc: 'XDZ.Escalations.OutOfAmmo.Desc',
  },
  {
    num: 14,
    id: 'combatFatigue',
    label: 'XDZ.Escalations.CombatFatigue.Label',
    locationRolls: 0,
    desc: 'XDZ.Escalations.CombatFatigue.Desc',
  },
  {
    num: 15,
    id: 'swarm',
    label: 'XDZ.Escalations.Swarm.Label',
    locationRolls: 0,
    desc: 'XDZ.Escalations.Swarm.Desc',
  },
  {
    num: 16,
    id: 'snatched',
    label: 'XDZ.Escalations.Snatched.Label',
    locationRolls: 0,
    desc: 'XDZ.Escalations.Snatched.Desc',
  },
  {
    num: 17,
    id: 'explosion',
    label: 'XDZ.Escalations.Explosion.Label',
    locationRolls: '1d4',
    desc: 'XDZ.Escalations.Explosion.Desc',
  },
  {
    num: 18,
    id: 'gameOverMan',
    label: 'XDZ.Escalations.GameOverMan.Label',
    locationRolls: 0,
    desc: 'XDZ.Escalations.GameOverMan.Desc',
  },
  {
    num: 19,
    id: 'scentOfBlood',
    label: 'XDZ.Escalations.ScentOfBlood.Label',
    locationRolls: 0,
    desc: 'XDZ.Escalations.ScentOfBlood.Desc',
  },
  {
    num: 20,
    id: 'tooQuiet',
    label: 'XDZ.Escalations.TooQuiet.Label',
    locationRolls: 0,
    desc: 'XDZ.Escalations.TooQuiet.Desc',
  },
];

// EVAC's fixed anchor location per map type (not rolled) — the obvious
// escape-pod/landing-pad entries already present in XDZ.locations[type].
XDZ.evacLocations = { ship: 'escapePod', colony: 'landingPad' };
