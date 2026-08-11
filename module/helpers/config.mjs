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

XDZ.destroyDieSteps = ['1d4', '1d6', '1d8', '1d10', '1d12'];

// Placeholder art from Foundry's core icon set — swap for custom XDZ art later.
XDZ.actorTypeImages = {
  commando: 'icons/svg/mystery-man.svg',
  character: 'icons/svg/mystery-man.svg',
  xeno: 'icons/svg/skull.svg',
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
    { id: 'escapePod', label: 'Escape Pod', color: 'ship escape pod.webp', bw: 'ship escape pod.webp', sides: ['E'] },
    { id: 'bridge', label: 'Bridge', color: 'ship command deck.webp', bw: 'ship bridge.webp' },
    { id: 'engineRoom', label: 'Engine Room', color: 'ship engine room.webp', bw: 'ship engine room.webp' },
    { id: 'airlock', label: 'Airlock', color: 'ship airlock.webp', bw: 'ship airlock.webp', sides: ['W', 'S', 'E'] },
    { id: 'medBay', label: 'Med Bay', color: 'ship med bay.webp', bw: 'ship med bay.webp' },
    { id: 'quarters', label: 'Quarters', color: 'ship quarters.webp', bw: 'ship quarters.webp' },
    { id: 'galley', label: 'Galley', color: 'ship galley.webp', bw: 'ship galley.webp' },
    { id: 'refinery', label: 'Refinery', color: 'ship refinery.webp', bw: 'ship refinery.webp' },
    { id: 'hydroponics', label: 'Hydroponics', color: 'ship hydroponics.webp', bw: 'ship hydroponics.webp' },
    { id: 'garage', label: 'Garage', color: 'ship garage.webp', bw: 'ship garage.webp' },
    { id: 'loadingBay', label: 'Loading Bay', color: 'ship loading bay.webp', bw: 'ship loading bay.webp', sides: ['E'] },
    { id: 'corridor', label: 'M Corridor', color: 'ship corridor.webp', bw: 'ship m corridor.webp', sides: ['W', 'E'] },
    { id: 'crawlspace', label: 'Crawlspace', color: 'ship crawlspace.webp', bw: 'ship crawlspace.webp' },
    { id: 'sump', label: 'Sump', color: 'ship sump.webp', bw: 'ship sump.webp' },
    { id: 'obsDeck', label: 'Obs Deck', color: 'ship obs deck.webp', bw: 'ship obs deck.webp', sides: ['W', 'S', 'E'] },
    { id: 'lifeSupport', label: 'Life Support', color: 'ship life support.webp', bw: 'ship life support.webp' },
  ],
  colony: [
    { id: 'landingPad', label: 'Landing Pad', color: 'colony landing pad.webp', bw: 'colony landing pad.webp' },
    { id: 'radioDish', label: 'Radio Dish', color: 'colony uplink dish.webp', bw: 'colony radio dish.webp' },
    { id: 'command', label: 'Command', color: 'colony command.webp', bw: 'colony command.webp' },
    { id: 'medBay', label: 'Med Bay', color: 'colony med bay.webp', bw: 'colony med bay.webp' },
    { id: 'armory', label: 'Armory', color: 'colony armory.webp', bw: 'colony armory.webp' },
    { id: 'refinery', label: 'Refinery', color: 'colony refinery.webp', bw: 'colony refinery.webp' },
    { id: 'reactor', label: 'Reactor', color: 'colony reactor.webp', bw: 'colony reactor.webp' },
    { id: 'cafeteria', label: 'Cafeteria', color: 'colony cafeteria.webp', bw: 'colony cafeteria.webp' },
    { id: 'causeway', label: 'Causeway', color: 'colony causeway.webp', bw: 'colony causeway.webp', sides: ['W', 'E'] },
    { id: 'surface', label: 'Surface', color: 'colony surface.webp', bw: 'colony surface.webp' },
    { id: 'residential', label: 'Residential', color: 'colony residential.webp', bw: 'colony residential.webp' },
    { id: 'dump', label: 'Dump', color: 'colony dump.webp', bw: 'colony dump.webp' },
    { id: 'substructure', label: 'Substructure', color: 'colony substructure.webp', bw: 'colony substructure.webp' },
    { id: 'motorPool', label: 'Motor Pool', color: 'colony motor pool.webp', bw: 'colony motor pool.webp' },
    { id: 'potatoFarm', label: 'Potato Farm', color: 'colony potato farm.webp', bw: 'colony potato farm.webp' },
    { id: 'astrophysics', label: 'Astrophysics', color: 'colony astrophysics.webp', bw: 'colony astrophysics.webp' },
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
 *   QUADRANT (N/E/S/W) - a sub-zone *inside* a single LOCATION tile (same
 *                        TL/TR/BR/BL positions, compass-named — not a
 *                        separate tile/image).
 * A LOCATION ROLL is 3D4 read in sequence as AREA -> LOCATION -> QUADRANT.
 */

// QUADRANT (N/E/S/W) fractional center within a single LOCATION tile's
// bounding box — for pinpointing a spot inside one location (spawn point,
// Location Roll narration), not a separate tile/image.
XDZ.tileQuadrants = {
  N: { x: 0.25, y: 0.25 },
  E: { x: 0.75, y: 0.25 },
  S: { x: 0.75, y: 0.75 },
  W: { x: 0.25, y: 0.75 },
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
    label: 'Sweep and Clear',
    locationRolls: 3,
    desc: "Go room by room through the current area and eliminate any XENO threats. Kill 'em all! Make 3 LOCATION ROLLS %LOC1% %LOC2% %LOC3% to determine 3 LOCATIONS. COMMANDOS must kill all XENOS in these areas.",
  },
  {
    num: 2,
    id: 'restorePower',
    label: 'Restore Power',
    locationRolls: 1,
    desc: 'Restore power to a critical system or area. Find the generator, splice a cable, or locate the right terminal or switch. Make a LOCATION ROLL %LOC1% to determine where the generator, cable, or terminal is located. COMMANDOS must reach this LOCATION and spend 1D4 rounds defending it while the system is activated.',
  },
  {
    num: 3,
    id: 'anomalyRecon',
    label: 'Anomaly Recon',
    locationRolls: 1,
    desc: 'The "Brass" want a certain odd location investigated. What could be causing the anomaly? Moreover, what could be lurking there? Go check it out. Make a LOCATION ROLL %LOC1% to place the anomaly. COMMANDOS must reach this LOCATION and roll an extra ESCALATION to determine its nature. Get the data and get out.',
  },
  {
    num: 4,
    id: 'fallBack',
    label: 'Fall Back!',
    locationRolls: 1,
    desc: 'The Xenos have overwhelming numbers! Retreat "by the numbers" and fall back to a rally point before proceeding any further. Make a LOCATION roll %LOC1% to determine the rally point. COMMANDOS must reach this location and spend 1D4 rounds defending it.',
  },
  {
    num: 5,
    id: 'rescueTheColonists',
    label: 'Rescue the Colonists',
    locationRolls: 1,
    desc: 'Proceed to the next location and rescue at least 50% of 4D20 cocooned colonists. Make a LOCATION roll %LOC1% to place them. Rescue as many colonists per ROUND as there are COMMANDOS in your squad.',
  },
  {
    num: 6,
    id: 'exterminateTheAlpha',
    label: 'Exterminate the Alpha',
    locationRolls: 1,
    desc: 'This is a seek and destroy mission. Find the swarm-leader and terminate it with extreme prejudice. Make a LOCATION ROLL to determine the LOCATION %LOC1%.',
  },
  {
    num: 7,
    id: 'destroyTheHive',
    label: 'Destroy the Hive',
    locationRolls: 1,
    desc: 'Find the egg chamber and make sure every nasty crawling thing in there is dead. Make a LOCATION ROLL %LOC1% to determine the LOCATION of the egg chamber. Once there, destroy 1D20 eggs to complete the OBJECTIVE.',
  },
  {
    num: 8,
    id: 'repairTheMachinery',
    label: 'Repair the Machinery',
    locationRolls: 1,
    desc: 'Proceed to the right location and repair or activate a large piece of machinery: a generator, the entire power grid, or a life support system. Make a LOCATION ROLL %LOC1% to determine where the generator, power grid, or system is located. COMMANDOS must reach this LOCATION and spend 1D4 rounds defending it while repairs are conducted.',
  },
  {
    num: 9,
    id: 'stronghold',
    label: 'Stronghold',
    locationRolls: 1,
    desc: 'The Xenos are advancing in large waves! Repel four direct assaults on your party in ever increasing waves of enemies. You have 1D4 rounds to erect defenses before they arrive. Make a LOCATION ROLL %LOC1% to determine the LOCATION where the COMMANDOS must defend. Reach this location and then spawn XENOS ...',
  },
  {
    num: 10,
    id: 'escortACivi',
    label: 'Escort a Civi',
    locationRolls: 1,
    desc: 'The Brass has brought in a civilian contractor, scientist, or other VIP. Escort this person to the right location and make sure nothing happens to him/her. Make a LOCATION ROLL %LOC1% to determine the LOCATION the VIP needs to reach.',
  },
  {
    num: 11,
    id: 'specimenCollection',
    label: 'Specimen Collection',
    locationRolls: 1,
    desc: 'Someone in the Bio-Weapons Division wants a live specimen. Roll its LOCATION %LOC1%. Take an Electro-Net Gun and secure one of the creatures for transport. For an added ESCALATION, make the XENO unique or the first of its kind.',
  },
  {
    num: 12,
    id: 'demolitions',
    label: 'Demolitions',
    locationRolls: 1,
    desc: "It's time to blow this joint. Take a mini-nuke to a rolled LOCATION %LOC1% and set it to blow. Just be clear when the blast is set to go off -- hopefully when you are far from it.",
  },
  {
    num: 13,
    id: 'dataRetrieval',
    label: 'Data Retrieval',
    locationRolls: 1,
    desc: 'Somewhere in the facility (roll it! %LOC1%) or ship is a computer with important data. Someone has to go there, hack in manually, and save the data to portable media.',
  },
  {
    num: 14,
    id: 'rescueOp',
    label: 'Rescue Op',
    locationRolls: 1,
    desc: 'You just got an urgent communication from another fire team. Delta is trapped and running low on ammo at a rolled LOCATION %LOC1%. Will you make it in time to save them?',
  },
  {
    num: 15,
    id: 'alignTheUplinkDish',
    label: 'Align the Uplink Dish',
    locationRolls: 0,
    desc: "Before you can Evac, you're gonna have to align the satellite uplink dish and transmit your coordinates. Good luck reaching it in time.",
  },
  {
    num: 16,
    id: 'aidASurvivor',
    label: 'Aid a Survivor',
    locationRolls: 2,
    desc: "You didn't plan on it, but darned if there wasn't a Survivor living here in the ducts. Roll LOCATION %LOC1% and get to this person, escort them to a safe location (roll it) %LOC2%, and render aid.",
  },
  {
    num: 17,
    id: 'getTheTech',
    label: 'Get the Tech',
    locationRolls: 1,
    desc: 'The Company lost a valuable piece of tech here, and they want it. Get in, find it in a rolled LOCATION %LOC1%, and bring it with you. The trouble is, it might be heavy, bulky, volatile, or dan-',
  },
  {
    num: 18,
    id: 'wayPoints',
    label: 'Way Points',
    locationRolls: 3,
    desc: 'Reach three LOCATIONS %LOC1% %LOC2% %LOC3% in a sequence and clear each area. The trouble is, some of the terrain might be treacherous or difficult to reach.',
  },
  {
    num: 19,
    id: 'findTheirOrigin',
    label: 'Find Their Origin',
    locationRolls: 3,
    desc: 'The XENOS got in, and the Brass want answers how they ended up here. Search for 3 clues, in rolled LOCATIONS %LOC1% %LOC2% %LOC3%, piece them together, and get out with the secret.',
  },
  {
    num: 20,
    id: 'hostileAgents',
    label: 'Hostile Agents',
    locationRolls: '1d4',
    desc: "Rogue agents or Company Mercenaries are up to some scumbaggery. Find these opposing forces in 1D4 LOCATIONS %LOCLIST% and eliminate them. It's best not to ask too many questions.",
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
    label: 'Kill Me!',
    locationRolls: 0,
    desc: "A member of your unit is infected, and a XENO bursts from their chest! This person makes a DEATH roll or dies instantly! Roll 1D4 on the 'Who's Infected?' table below to choose the victim. COMMANDOS that see the emerging XENO must make FEAR rolls.\n1: Randomly choose a COMMANDO\n2: Choose a survivor, colonist, or civilian in your group\n3: The highest ranking COMMANDO\n4: The lowest ranking COMMANDO",
  },
  {
    num: 2,
    id: 'theyCutThePower',
    label: 'They Cut the Power!',
    locationRolls: 0,
    desc: 'Everything goes dark. Add the Objective Restore Power. The Target is increased by 3 until the end of the current OBJECTIVE, and all XENOS are now in SEEK mode. Negate this effect with the Night Vision or Floodlight tag on equipment.',
  },
  {
    num: 3,
    id: 'blocked',
    label: 'Blocked!',
    locationRolls: 0,
    desc: 'A critical junction is blocked, either with debris, a barricade, or a locked door with a broken mechanism. The COMMANDOS work with plasma cutters to get through, but they are stopped for 1D4 ROUNDS.',
  },
  {
    num: 4,
    id: 'flameUnitsOnly',
    label: 'Flame Units Only',
    locationRolls: 0,
    desc: "For whatever reason, the brass doesn't want anyone using projectile weapons. Complete the current OBJECTIVE using only flame units.",
  },
  {
    num: 5,
    id: 'theBreeder',
    label: 'The Breeder',
    locationRolls: 0,
    desc: 'This battle is a battle to the death and must be resolved before any further progress on the current OBJECTIVE. For this encounter only, the Target is increased by 3. If the current OBJECTIVE is Kill the Breeder, there are now two giant Breeder XENOS.',
  },
  {
    num: 6,
    id: 'praetorianGuards',
    label: 'Praetorian Guards',
    locationRolls: 0,
    desc: 'The XENOS in this section are much tougher than the drones and warriors you have encountered. Until the current OBJECTIVE is complete, all XENO attacks require DEATH RESISTANCES to survive.',
  },
  {
    num: 7,
    id: 'rogueCommandos',
    label: 'Rogue Commandos',
    locationRolls: 1,
    desc: "Just when you thought things couldn't get worse, there are rogue commandos or company agents tracking you, bent on your elimination. 1D12 of them arrive via a LOCATION ROLL %LOC1%, SEEKING, and using XENO BEHAVIOR to move and attack.",
  },
  {
    num: 8,
    id: 'usedUp',
    label: 'Used Up!',
    locationRolls: 0,
    desc: 'All medical equipment has been used up, the squad is in bad shape, and now COMMANDOS must improvise tourniquets and bandages. Increase the Target by 3 for all Medical rolls until the end of the current OBJECTIVE. This ESCALATION can also be nullified by getting 1 or more COMMANDOS into a medical LOCATION or a Supply Drop ESCALATION.',
  },
  {
    num: 9,
    id: 'manDown',
    label: 'Man Down!',
    locationRolls: 0,
    desc: "One random COMMANDO has fallen critically ill. You don't look so good, man. This COMMANDO must be taken to a med bay within 1 TURN. Every TURN beyond that, the ill COMMANDO makes a DEATH roll or dies. If the ill COMMANDO dies CLOSE to any other COMMANDO, they become ill as well.",
  },
  {
    num: 10,
    id: 'somethingWicked',
    label: 'Something Wicked',
    locationRolls: 1,
    desc: "There's something moving in the darkness (roll LOCATION as normal) %LOC1%. It's terrifying and wicked fast. All of its attacks contact all NEAR COMMANDOS at once! Any COMMANDO rolls to kill the damn thing are HARD.",
  },
  {
    num: 11,
    id: 'fubard',
    label: "FUBAR'D",
    locationRolls: 1,
    desc: "Your dropship crashed on the pad. The escape pods have scrambled telemetry. Make the Align the Dish OBJECTIVE the current OBJECTIVE. Use a LOCATION ROLL %LOC1% to add the new dropship or pod to the map.",
  },
  {
    num: 12,
    id: 'supplyDrop',
    label: 'Supply Drop',
    locationRolls: 0,
    desc: 'The COMMANDOS find a crate of weapons, ammo, and medical equipment. Decrease the Target by 3 until the end of the current OBJECTIVE for Weapon and Medical rolls.',
  },
  {
    num: 13,
    id: 'outOfAmmo',
    label: 'Out of Ammo',
    locationRolls: 0,
    desc: 'All COMMANDOS run out of ammunition for their main weapons and are using sidearms only. Increase the Target by 3 until the end of the current OBJECTIVE.',
  },
  {
    num: 14,
    id: 'combatFatigue',
    label: 'Combat Fatigue',
    locationRolls: 0,
    desc: 'All COMMANDOS are exhausted and are stopped for 1D4 rounds. In addition, the Target is increased by 3 until the end of the current OBJECTIVE.',
  },
  {
    num: 15,
    id: 'swarm',
    label: 'Swarm!',
    locationRolls: 0,
    desc: "The XENOS are suddenly coming from everywhere! 1D12 of them arrive immediately at the COMMANDOS' LOCATION. All COMMANDOS roll DEATH RESISTANCE or die.",
  },
  {
    num: 16,
    id: 'snatched',
    label: 'Snatched!',
    locationRolls: 0,
    desc: 'Randomly choose one COMMANDO. He vanishes. Victims taken in such a way are cocooned for gestation. If your squad chooses, they can add a Rescue Op OBJECTIVE.',
  },
  {
    num: 17,
    id: 'explosion',
    label: 'Explosion',
    locationRolls: '1d4',
    desc: "Without warning, 1D4 explosions suddenly occur throughout the map. Make a LOCATION ROLL %LOCLIST% for the location of each explosion. If an explosion occurs within the COMMANDOS' Area, all COMMANDOS make a DODGE RESISTANCE roll or take 4 injuries immediately. All XENOS caught in an explosion are killed instantly.",
  },
  {
    num: 18,
    id: 'gameOverMan',
    label: 'Game Over, Man!',
    locationRolls: 0,
    desc: "The XENOS were just too deadly, the colonists are all dead, the VIP has vanished, and maybe the critical system can't be fixed. Regardless, the current OBJECTIVE is an immediate failure, and lots of good COMMANDOS died as a result. Decrease the number of COMMANDOS by half and proceed to the next OBJECTIVE.",
  },
  {
    num: 19,
    id: 'scentOfBlood',
    label: 'Scent of Blood',
    locationRolls: 0,
    desc: "All XENOS at any location on the map immediately run to the COMMANDOS' area, and the Target is increased by 3 until the end of the current OBJECTIVE.",
  },
  {
    num: 20,
    id: 'tooQuiet',
    label: 'Too Quiet',
    locationRolls: 0,
    desc: 'Stay frosty, watch those corners. No escalation this turn.',
  },
];

// EVAC's fixed anchor location per map type (not rolled) — the obvious
// escape-pod/landing-pad entries already present in XDZ.locations[type].
XDZ.evacLocations = { ship: 'escapePod', colony: 'landingPad' };
