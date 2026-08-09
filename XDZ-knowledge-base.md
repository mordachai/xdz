# XENO DEAD ZONE (XDZ) — Knowledge Base

*A micro-setting, adventure toolkit, rules mod, and enemy-behavior system. Playable solo, GM-less, or GM-led. 1–4 players. Aliens/Colonial-Marines bug-hunt tone. As this system is a brother system of ICRPG and some terms are related, there is a rules reference to Movement and Target Number in the end*

---

## 1. Core Concept

- Corporate spacefarers have colonized 20+ worlds; hundreds more surveyed.
- The **XENOS**: a hyper-lethal predatory species that infests every world it reaches. Silicate skin, composite bone, molecular acid blood, decentralized organs — no pity, no fear, can't be reasoned with.
- Players are **COMMANDOS** — special forces sent in to complete a **MISSION**.
- Can be run as free-form RP or nearly board-game-like.

---

## 2. Key Terms

| Term | Definition |
|---|---|
| **COMMANDOS** | Squad of marines; create 3 per player at mission start |
| **MISSION** | A set of Objectives, Locations, Threats, Treats — built from the Mission Sheet |
| **OBJECTIVES** | 3 per mission; complete all to unlock EVAC (the 4th objective) |
| **EVAC** | Reach an escape pod/dropship; mission succeeds if ≥1 commando survives |
| **ESCALATIONS** | Rolled every XENO turn; complicate the mission |
| **MAPS** | Built from 16 AREAS, either STARSHIP or COLONY type |
| **XENOS** | The enemy — advance, hide, and multiply every turn |

---

## 3. Core Resolution

- Roll **D20 + TRAINING**, meet or beat the **TARGET** (default 12, modified by HARD/EASY meaning +3/-3 on the difficulty).
- Declare intent, then roll the relevant TRAINING stat.

### Common Rolls table
| Intent | Training | Success | Failure |
|---|---|---|---|
| Shoot a Xeno | Weapons | Destroy enemies | Miss |
| Cut through bulkhead | Mechanic | Create opening | Damage systems, INJURED |
| Seal an airlock | Mechanic | Lock door shut | Waste time, door flimsy |
| Pilot a ship | Pilot | Keep flying | Crash, delay arrival |
| Repair a machine | Mechanic | Resume function | INJURED, explosion, delay |
| Help fallen commando | Medical | Heal an INJURY | Inflict an INJURY |
| Throw a grenade | Weapons | Destroy enemies | Botched throw, randomized |
| Reboot ship's computer | Systems | Make progress | Damage systems, delay |

---

## 4. Building a COMMANDO

Each commando needs: **NAME, RANK, TRAINING, RESISTANCES**.

**TRAINING** — distribute **10 points** across:
- **Pilot**: operate APC, land dropship, open bay doors in orbit, run a loader
- **Systems**: bypass, hack a map computer, align transmit dish
- **Mechanic**: repair weapons/vehicles, operate auto-guns
- **Weapons**: shoot straight, controlled bursts, operate heavy gun gyro
- **Medical**: patch up squad in combat

**RESISTANCES** — distribute **6 points** across:
- **Fear**: stand your ground when Xenos appear
- **Dodge**: evade explosions/attacks
- **Death**: avoid instant death from massive trauma

### Injuries & Death
- Harmful effects deal **1 INJURY**, **1D4 INJURIES**, or force a **DEATH roll**.
- A claw/tail attack = 1 injury. A surprise crushing bite = 1D4 injuries. Fuel cell explosion = DEATH roll.
- A commando can absorb **4 INJURIES** before falling incapacitated.
- Downed: lose 1 INJURY per turn; at **6 INJURIES** total, they bleed out (KIA). Xenos will finish off downed soldiers faster.
- A successful MEDICAL roll (reach an ally) heals 1 INJURY.

### Weapons / Loadout
- **Roll Weapons Training**: beat target → destroy the rolled number of enemies (no separate damage roll — you roll "enemies destroyed").
- **Expend Ammo to Unleash Hell**: spend 1 AMMO to upgrade your DESTROY die one step (D4→D6→D8), applied after the initial roll (additive "spray and pray").
- **Damaged Weapons**: once all DAMAGE boxes on a weapon are filled, it's useless. REPAIR (Mechanic roll) needs ≥1 damaged box remaining; success clears 1 box.
- Other items (pistols, decks of cards, keepsakes) — improvise rules with the table.

### Taking Objectives / End Game
- Take all 3 OBJECTIVES + EVAC to win.
- Any time a commando takes an objective, all NEAR commandos heal 1 INJURY.
- If all commandos die, the mission fails (some objectives, if failed, auto-fail the mission).

### Commando Quirks (1D20 flavor table)
Chicken, Sell Out, Gettin' Paid, Two Weeks (about to retire), Scrappy, Country, Specs, Old School, Street, Comics, Sunny Side Up, Pyro, Vet, Juicer, Washout, Black Ops, Hybrid, Tech, Native, Sarge.

---

## 5. XENO Behavior (runs without a GM)

**Each XENO turn**, follow in order:
1. **Roll to SPAWN** xenos.
2. **Move & resolve** all xenos in SEEK mode.
3. **Contact = attack.** Any commando contacted by a xeno is attacked; roll a RESISTANCE to survive, determined by context:
   - **FEAR** — when xenos flip from HIDE to SEEK (revealed)
   - **DODGE** — when xenos are actively attacking
   - **DEATH** — when xenos SPAWN directly in contact with a commando ("AMBUSH")

### Spawning
- Roll **1D20** = number of xenos entering the mission.
- Roll **1D4** = number of locations to split that total across (evenly).
- Roll LOCATIONS to place them.

### Modes
- **HIDE**: silent, hidden; xeno stays hidden if it spawns where there are no commandos. Doesn't move until it flips to SEEK. (With a GM using secret rolls, this can be genuinely hidden from players.)
- **SEEK**: triggered when commandos enter a xeno's location. Once in SEEK, a xeno is always either fighting, moving toward commandos, or dead — no retreat. Xenos always take the shortest path to commandos and always move **FAR** *and* take an action on their turn (vs. commandos who move NEAR if carrying a HEAVY gun, or normal ICRPG move otherwise).

### Combat
- All xenos CLOSE to commandos attack — whether by spawning there, moving there, or otherwise making contact.
- **Death of a Xeno**: if killed while CLOSE, 1-in-4 chance its acid blood inflicts 1 INJURY on nearby commandos.

---

## 6. Mission Objectives (roll 1D20 or choose)

Each objective requires a **LOCATION ROLL** to place it. All 20:

1. **Sweep and Clear** — 3 location rolls; kill all xenos in those areas
2. **Restore Power** — reach + defend generator/terminal 1D4 rounds
3. **Anomaly Recon** — investigate a rolled location, extra escalation roll
4. **Fall Back!** — retreat to rally point, defend 1D4 rounds
5. **Rescue the Colonists** — rescue ≥50% of 4D20 cocooned colonists
6. **Exterminate the Alpha** — seek-and-destroy the swarm-leader
7. **Destroy the Hive** — destroy 1D20 eggs at the egg chamber
8. **Repair the Machinery** — reach + defend repair site 1D4 rounds
9. **Stronghold** — repel 4 waves; 1D4 rounds to erect defenses first
10. **Escort a Civi** — protect a VIP/contractor to a location
11. **Specimen Collection** — capture a live xeno w/ Electro-Net Gun
12. **Demolitions** — plant and detonate a mini-nuke
13. **Data Retrieval** — hack a computer, save data to portable media
14. **Rescue Op** — save a trapped, low-ammo fire team
15. **Align the Uplink Dish** — align dish before EVAC is possible
16. **Aid a Survivor** — escort a survivor to safety, render aid
17. **Get the Tech** — retrieve valuable (heavy/volatile/dangerous) tech
18. **Way Points** — clear 3 locations in sequence
19. **Find Their Origin** — gather 3 clues, piece together the secret
20. **Hostile Agents** — eliminate rogue agents/mercs in 1D4 locations

---

## 7. Escalations (roll 1D20 every XENO turn)

1. **Kill Me!** — a commando is infected; chest-burster. DEATH roll or instant death. (1D4 table: random / survivor/civilian / highest rank / lowest rank victim). Witnesses roll FEAR.
2. **They Cut the Power!** — add "Restore Power" objective; Target +3 until objective ends; all xenos flip to SEEK. Negated by Night Vision/Floodlight equipment tag.
3. **Blocked!** — critical path blocked; plasma cutters needed, 1D4 rounds delay.
4. **Flame Units Only** — must complete current objective using only flame weapons.
5. **The Breeder** — must-resolve battle; Target +3; if current objective is "Kill the Breeder," two giant Breeder xenos appear.
6. **Praetorian Guards** — tougher xenos; all attacks require DEATH resistance until objective complete.
7. **Rogue Commandos** — 1D12 hostile rogue commandos/company agents arrive via location roll, using xeno movement/attack behavior.
8. **Used Up!** — medical supplies gone; Medical Target +3 until objective ends (negated by med location or Supply Drop).
9. **Man Down!** — random commando critically ill; must reach med bay within 1 turn or DEATH roll each turn after; can spread to nearby commandos.
10. **Something Wicked** — a fast, terrifying threat hits all NEAR commandos at once; kill rolls are HARD.
11. **FUBAR'd** — dropship crashed, escape pods scrambled; "Align the Dish" becomes current objective; location roll adds new dropship/pod.
12. **Supply Drop** — crate found; Weapon/Medical Target −3 until objective ends.
13. **Out of Ammo** — main weapons dry, sidearms only; Target +3 until objective ends.
14. **Combat Fatigue** — squad stopped 1D4 rounds; Target +3 until objective ends.
15. **Swarm!** — 1D12 xenos arrive immediately at commandos' location; all roll DEATH resistance or die.
16. **Snatched!** — random commando vanishes (cocooned for gestation); squad may add "Rescue Op" objective.
17. **Explosion** — 1D4 explosions at rolled locations; those in blast radius roll DODGE or take 4 injuries; xenos in blast die instantly.
18. **Game Over, Man!** — current objective auto-fails; commando count halved; proceed to next objective.
19. **Scent of Blood** — all map xenos rush the commandos' location; Target +3 until objective ends.
20. **Too Quiet** — no escalation this turn.

---

## 8. Maps

- Every mission = **16 LOCATIONS**, divided into **4 AREAS** × **4 QUADRANTS** each (North/South/East/West).
- **LOCATION ROLL** = roll **3D4** in sequence: AREA → LOCATION → QUADRANT.
- Mark areas 1–4, note North.
- Any two touching locations are connected by a **DOOR** (open/closed state matters for containing xenos).

### STARSHIP locations
Escape Pod, Bridge, Engine Room, Airlock, Med Bay, Quarters, Galley, Refinery, Hydroponics, Garage, Loading Bay, M Corridor, Crawlspace, Sump, Obs Deck, Life Support.

### COLONY locations
Landing Pad, Radio Dish, Command, Med Bay, Armory, Refinery, Reactor, Cafeteria, Causeway, Surface, Residential, Dump, Substructure, Motor Pool, Potato Farm, Astrophysics.

---

## 9. Assets (1D8 rolled at mission start — "commandos catch a break")

| Roll (1D12) | Asset | Effect |
|---|---|---|
| 1 | Autoguns | Auto-kills 1D8 xenos there for 1D8 rounds |
| 2 | Barricade | Permanently blocks a door between 2 locations |
| 3 | Drop Crate | Replenish squad ammo & medical supplies |
| 4 | Med Kits | All commandos heal 2 injuries |
| 5 | Arms Cache | All commandos get a weapon of choice (Pulse Rifle/Flamer/Heavy) |
| 6 | Cutter | Removes a Barricade |
| 7 | Pneumatics | Excavate a tunnel between any 2 locations |
| 8 | Explosives | 1D4-round fuse; destroys a location + contents |
| 9 | Cover | Xenos cannot ambush in this location |
| 10 | Hold | Brief rest; replenish all ammo, heal all injuries |
| 11 | Loader | Cargo machine, usable creatively/destructively |
| 12 | APC | Move 8 commandos to any location instantly, then it's too damaged to reuse |

---

## Notes for Foundry VTT Adaptation (dev angle)

Given the rules structure, this maps cleanly onto Foundry building blocks:
- **Actor type: Commando** — Training (5 fields), Resistances (3 fields), Injuries (0–4 active/6 to bleed-out), Rank, Quirk.
- **Actor type: Xeno** — Mode flag (Hide/Seek), simple stat block. Hide/Seelk mode with simple control in token, to make it invisible/visible.
- **Item type: Weapon** — Destroy die, Ammo count, Damage boxes.
- **Macro candidates**: Location Roll (3d4 sequence + lookup table), Escalation Roll (1d20 table w/ automation hooks), Spawn Roll (1d20 count + 1d4 split), Xeno turn resolver (auto-move to nearest commando + attack).
- **Journal/Compendium**: Objectives table (20), Escalations table (20), Location info tables (Starship/Colony), Assets table (12), Quirks table (20) — all natural fits for Foundry RollTables.


## ICRPG Reference section

### MOVEMENT

- There are 3 general bands of movement: CLOSE, NEAR, and FAR. There might also be DOUBLE FAR or something equivalent. These range bands are all relative, and represent more what you could reasonably do in a ROUND, cinematically, than any metric of distance.

- CLOSE generally denotes things within melee range, or reasonably reachable in melee range with little movement.

- NEAR means you have to take action to move to reach it, but a ranged attack could hit.

- FAR means you have to sprint to reach it, it might be in range of a remarkably long range weapon. You cannot move FAR and still take an action in combat under normal circumstances.

---

### TARGET NUMBER (EASY & HARD)

- ICRPG splits its adventures into "rooms", or "scenes". For the sake of expediency, every action in a room shares a TARGET NUMBER, or TN.

- Players (And sometimes, NPCs) must roll equal to or over the TN to succeed an action.

- Nat 20 always succeeds.

- Sometimes, a task may be made EASY or HARD by circumstance, knowledge, planning, skill, or teamwork. EASY rolls treat the TN as 3 lower. HARD rolls treat the TN as 3 higher.

- Example: a TN of 12 becomes 9 when rolling EASY, and 15 when rolling HARD.

- Taking the exact same action twice in a row results in it being EASY the second time if you failed the first time, or potentially negating the need for a roll if it succeeded and is a routine task.

---