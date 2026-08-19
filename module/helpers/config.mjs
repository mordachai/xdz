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

XDZ.injuryDown = 4;
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
 * `sides` (optional): compass sides (N/E/S/W, in the art's unrotated
 * orientation) where the location's art actually draws a door/opening —
 * e.g. an Airlock or Escape Pod is an exterior piece, only breachable from
 * specific sides, not all 4. Omitted = interior piece, connects freely on
 * any side. MapGenerator seats these on layout cells whose actual
 * neighbor directions fit within `sides` after some 90/180/270 rotation,
 * and rotates the placed Tile to match.
 */
XDZ.locations = {
  ship: [
    { id: 'escapePod', label: 'XDZ.Locations.Ship.EscapePod', color: 'ship escape pod.webp', bw: 'ship escape pod.webp', sides: ['E'] },
    { id: 'bridge', label: 'XDZ.Locations.Ship.Bridge', color: 'ship command deck.webp', bw: 'ship bridge.webp' },
    { id: 'engineRoom', label: 'XDZ.Locations.Ship.EngineRoom', color: 'ship engine room.webp', bw: 'ship engine room.webp' },
    { id: 'airlock', label: 'XDZ.Locations.Ship.Airlock', color: 'ship airlock.webp', bw: 'ship airlock.webp', sides: ['W', 'S', 'E'] },
    { id: 'medBay', label: 'XDZ.Locations.Ship.MedBay', color: 'ship med bay.webp', bw: 'ship med bay.webp' },
    { id: 'quarters', label: 'XDZ.Locations.Ship.Quarters', color: 'ship quarters.webp', bw: 'ship quarters.webp' },
    { id: 'galley', label: 'XDZ.Locations.Ship.Galley', color: 'ship galley.webp', bw: 'ship galley.webp' },
    { id: 'refinery', label: 'XDZ.Locations.Ship.Refinery', color: 'ship refinery.webp', bw: 'ship refinery.webp' },
    { id: 'hydroponics', label: 'XDZ.Locations.Ship.Hydroponics', color: 'ship hydroponics.webp', bw: 'ship hydroponics.webp' },
    { id: 'garage', label: 'XDZ.Locations.Ship.Garage', color: 'ship garage.webp', bw: 'ship garage.webp' },
    { id: 'loadingBay', label: 'XDZ.Locations.Ship.LoadingBay', color: 'ship loading bay.webp', bw: 'ship loading bay.webp', sides: ['E'] },
    { id: 'corridor', label: 'XDZ.Locations.Ship.Corridor', color: 'ship corridor.webp', bw: 'ship m corridor.webp', sides: ['W', 'E'] },
    { id: 'crawlspace', label: 'XDZ.Locations.Ship.Crawlspace', color: 'ship crawlspace.webp', bw: 'ship crawlspace.webp' },
    { id: 'sump', label: 'XDZ.Locations.Ship.Sump', color: 'ship sump.webp', bw: 'ship sump.webp' },
    { id: 'obsDeck', label: 'XDZ.Locations.Ship.ObsDeck', color: 'ship obs deck.webp', bw: 'ship obs deck.webp', sides: ['W', 'S', 'E'] },
    { id: 'lifeSupport', label: 'XDZ.Locations.Ship.LifeSupport', color: 'ship life support.webp', bw: 'ship life support.webp' },
  ],
  colony: [
    { id: 'landingPad', label: 'XDZ.Locations.Colony.LandingPad', color: 'colony landing pad.webp', bw: 'colony landing pad.webp' },
    { id: 'radioDish', label: 'XDZ.Locations.Colony.RadioDish', color: 'colony uplink dish.webp', bw: 'colony radio dish.webp' },
    { id: 'command', label: 'XDZ.Locations.Colony.Command', color: 'colony command.webp', bw: 'colony command.webp' },
    { id: 'medBay', label: 'XDZ.Locations.Colony.MedBay', color: 'colony med bay.webp', bw: 'colony med bay.webp' },
    { id: 'armory', label: 'XDZ.Locations.Colony.Armory', color: 'colony armory.webp', bw: 'colony armory.webp' },
    { id: 'refinery', label: 'XDZ.Locations.Colony.Refinery', color: 'colony refinery.webp', bw: 'colony refinery.webp' },
    { id: 'reactor', label: 'XDZ.Locations.Colony.Reactor', color: 'colony reactor.webp', bw: 'colony reactor.webp' },
    { id: 'cafeteria', label: 'XDZ.Locations.Colony.Cafeteria', color: 'colony cafeteria.webp', bw: 'colony cafeteria.webp' },
    { id: 'causeway', label: 'XDZ.Locations.Colony.Causeway', color: 'colony causeway.webp', bw: 'colony causeway.webp', sides: ['W', 'E'] },
    { id: 'surface', label: 'XDZ.Locations.Colony.Surface', color: 'colony surface.webp', bw: 'colony surface.webp' },
    { id: 'residential', label: 'XDZ.Locations.Colony.Residential', color: 'colony residential.webp', bw: 'colony residential.webp' },
    { id: 'dump', label: 'XDZ.Locations.Colony.Dump', color: 'colony dump.webp', bw: 'colony dump.webp' },
    { id: 'substructure', label: 'XDZ.Locations.Colony.Substructure', color: 'colony substructure.webp', bw: 'colony substructure.webp' },
    { id: 'motorPool', label: 'XDZ.Locations.Colony.MotorPool', color: 'colony motor pool.webp', bw: 'colony motor pool.webp' },
    { id: 'potatoFarm', label: 'XDZ.Locations.Colony.PotatoFarm', color: 'colony potato farm.webp', bw: 'colony potato farm.webp' },
    { id: 'astrophysics', label: 'XDZ.Locations.Colony.Astrophysics', color: 'colony astrophysics.webp', bw: 'colony astrophysics.webp' },
  ],
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
