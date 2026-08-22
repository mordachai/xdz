import XDZActor from './documents/actor.mjs';
import XDZItem from './documents/item.mjs';
import XDZCombat from './documents/combat.mjs';
import { CommandoSheet, CharacterSheet, XenoSheet, NpcSheet, VehicleSheet, WeaponSheet, GearSheet } from './sheets/_module.mjs';
import { TnTracker, RoundTimer, MapGenerator, CombatCarousel, CommandoHudApp, onUpdateWallDoorState } from './apps/_module.mjs';
import { appendToOrder } from './helpers/combat-groups.mjs';
import { autoKillXenos } from './helpers/auto-kill.mjs';
import { getStateDoc } from './helpers/table-state.mjs';
import { isResponsibleClient } from './helpers/gm-election.mjs';
import { rollEscalation, rollLocation, spawnXenos, spawnBreeder, spawnRogueCommandos, spawnWicked, spawnSwarm, areaLegends, rollAssets, lockDoors, xenoAttack, xenoAmbush, xenoPanic, hazardDeath, resolveXenoResistance, resolveXenoAmbushDamage } from './macros/_module.mjs';
import { rollMission } from './helpers/mission-roll.mjs';
import { XDZ } from './helpers/config.mjs';
import * as models from './data/_module.mjs';
import XdzDoorControl from './canvas/door-control.mjs';

globalThis.xdz = {
  documents: { XDZActor, XDZItem },
  applications: { CommandoSheet, CharacterSheet, XenoSheet, NpcSheet, VehicleSheet, WeaponSheet, GearSheet },
  apps: { TnTracker, RoundTimer, MapGenerator, CombatCarousel, CommandoHudApp, tnTracker: null, timers: new Map(), combatCarousel: null },
  macros: { rollEscalation, rollLocation, rollMission, spawnXenos, spawnBreeder, spawnRogueCommandos, spawnWicked, spawnSwarm, areaLegends, rollAssets, lockDoors, xenoAttack, xenoAmbush, xenoPanic, hazardDeath },
  models,
  config: XDZ,
  /** Shared table-state JournalEntry (TN, timers, current mission type) — see table-state.mjs. Resolved once in the 'ready' hook. */
  state: null,
};

// Babele (optional module) compendium translations, read from
// lang/babele/<language>/xdz.<pack>.json. Journal entries only translate
// their sidebar name — page content is already localized at render time via
// the @Localize enricher below, reading straight from lang/pt-BR.json.
Hooks.once('babele.init', (babele) => babele.setSystemTranslationsDir('lang/babele'));

Hooks.once('init', function () {
  CONFIG.XDZ = XDZ;

  // Custom @Localize[key] enricher — core has no built-in one. Used by the
  // static compendium reference journals (packs/_source/journals) so their
  // page content stays in the player's own language instead of baking in
  // English at pack-build time; TextEditor.enrichHTML resolves it against
  // game.i18n at render time, same lifecycle as @UUID/inline rolls. `\n` ->
  // `<br>` matches resolveEntry()'s convention for multiline Desc entries
  // (e.g. Escalation "Kill Me!"'s Who's-Infected sub-list).
  CONFIG.TextEditor.enrichers.push({
    id: 'xdzLocalize',
    pattern: /@Localize\[([\w.]+)\]/g,
    enricher: async (match) => {
      const span = document.createElement('span');
      span.innerHTML = game.i18n.localize(match[1]).replace(/\n/g, '<br>');
      return span;
    },
  });

  CONFIG.Actor.documentClass = XDZActor;
  CONFIG.Actor.dataModels = {
    commando: models.CommandoData,
    character: models.CharacterData,
    xeno: models.XenoData,
    npc: models.NpcData,
    vehicle: models.VehicleData,
  };
  CONFIG.Actor.typeImages = XDZ.actorTypeImages;

  CONFIG.Combat.documentClass = XDZCombat;

  // Swaps in the door open/close icon's resting alpha for the
  // doorIconOpacity setting below — see canvas/door-control.mjs.
  CONFIG.Canvas.doorControlClass = XdzDoorControl;

  CONFIG.Item.documentClass = XDZItem;
  CONFIG.Item.dataModels = {
    weapon: models.WeaponData,
    gear: models.GearData,
  };
  CONFIG.Item.typeImages = XDZ.itemTypeImages;

  // TN value/modifier, round timers, and current mission type used to live
  // here as world Settings — a hard Foundry engine rule makes those GM-only
  // to write, with no permission override, which silently broke them for a
  // GM-less table. They now live as flags on a shared JournalEntry instead
  // (see table-state.mjs / getStateDoc()), resolved once into `xdz.state`
  // in the 'ready' hook below.
  game.settings.register('xdz', 'sheetTheme', {
    name: 'XDZ.Settings.SheetTheme.Name',
    hint: 'XDZ.Settings.SheetTheme.Hint',
    scope: 'client',
    config: true,
    type: String,
    choices: {
      green: 'XDZ.Settings.SheetTheme.Green',
      blue: 'XDZ.Settings.SheetTheme.Blue',
      orange: 'XDZ.Settings.SheetTheme.Orange',
      white: 'XDZ.Settings.SheetTheme.White',
    },
    default: 'green',
    onChange: () => xdz.apps.combatCarousel?.render(),
  });
  // GM-only play mode: spawn chat rolls go GM-whisper only, spawned tokens
  // enter hidden, and ambush spawns are the exception that stays revealed —
  // read by spawn-xenos.mjs for both the chat-message rollMode and the
  // per-token `hidden` flag.
  game.settings.register('xdz', 'playWithGM', {
    name: 'XDZ.Settings.PlayWithGM.Name',
    hint: 'XDZ.Settings.PlayWithGM.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    // Combat Carousel's Next/Previous need every player to be able to write
    // to the active Combat when nobody's running the table — only the GM
    // can flip this world setting, so this always executes GM-side.
    onChange: (gmOnly) => game.combat?.update({ ownership: { default: gmOnly ? CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE : CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } }),
  });
  // Floating combat-order bar: Marines act first and reorder freely, unique
  // hostiles ("Others") get their own card, the Drone swarm collapses into
  // one symbolic "Xenos" card. See CombatCarousel.
  game.settings.register('xdz', 'combatCarouselEnabled', {
    name: 'XDZ.Settings.CombatCarousel.Name',
    hint: 'XDZ.Settings.CombatCarousel.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    onChange: (enabled) => xdz.apps.combatCarousel?.syncVisibility(enabled),
  });
  // Per-client screen edge for the carousel — left/right switch it to a
  // vertical column (see _combat-carousel.scss's [data-position] rules).
  game.settings.register('xdz', 'carouselPosition', {
    name: 'XDZ.Settings.CarouselPosition.Name',
    hint: 'XDZ.Settings.CarouselPosition.Hint',
    scope: 'client',
    config: true,
    type: String,
    choices: {
      top: 'XDZ.Settings.CarouselPosition.Top',
      bottom: 'XDZ.Settings.CarouselPosition.Bottom',
      left: 'XDZ.Settings.CarouselPosition.Left',
      right: 'XDZ.Settings.CarouselPosition.Right',
      sidebar: 'XDZ.Settings.CarouselPosition.Sidebar',
    },
    default: 'sidebar',
    onChange: () => xdz.apps.combatCarousel?.render(),
  });
  // Destroy-die rolls (rollDamage) auto-kill that many points of xeno threat
  // on the canvas, per the weapon's Kill Mode — closest to the attacker
  // (normal), around the target (explosive), or in a beeline through the
  // target (piercing) — see auto-kill.mjs. Table can turn this off and go
  // back to manual token bookkeeping.
  game.settings.register('xdz', 'autoKillOnDamage', {
    name: 'XDZ.Settings.AutoKillOnDamage.Name',
    hint: 'XDZ.Settings.AutoKillOnDamage.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });
  // Rolls the damage/destroy die immediately after a successful attack roll
  // instead of waiting on the "Roll Damage" chat button — see
  // XDZItem#rollAttack. "Spray and Pray" moves onto the resulting damage
  // card in this mode so it's still reachable; table can turn this off to
  // go back to the manual button-per-step flow.
  game.settings.register('xdz', 'rollDamageAutomatically', {
    name: 'XDZ.Settings.RollDamageAutomatically.Name',
    hint: 'XDZ.Settings.RollDamageAutomatically.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });
  // Resting alpha for the door open/close canvas icon — core hardcodes 0.6
  // with no knob for it. Redraws every door control already on the canvas
  // so the change is visible immediately, not just on next scene load.
  // Xeno-action macros (Attack/Ambush/Panic) normally require the GM to
  // actually target (T key) the PC token. With this on, they fall back to
  // the controlled/selected token instead — no explicit targeting needed.
  game.settings.register('xdz', 'xenoActionsUseSelection', {
    name: 'XDZ.Settings.XenoActionsUseSelection.Name',
    hint: 'XDZ.Settings.XenoActionsUseSelection.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
  });
  game.settings.register('xdz', 'doorIconOpacity', {
    name: 'XDZ.Settings.DoorIconOpacity.Name',
    hint: 'XDZ.Settings.DoorIconOpacity.Hint',
    scope: 'client',
    config: true,
    type: Number,
    range: { min: 0.1, max: 1, step: 0.05 },
    default: 0.1,
    onChange: (value) => canvas.controls?.doors.children.forEach((d) => (d.icon.alpha = value)),
  });
  game.settings.register('xdz', 'hudVisible', {
    scope: 'client',
    config: false,
    type: Boolean,
    default: true,
  });
  // Per-client screen position for every HUD badge (TN + each timer), keyed
  // by "tn" or "timers.<id>" — see hud-drag.mjs.
  game.settings.register('xdz', 'hudPositions', {
    scope: 'client',
    config: false,
    type: Object,
    default: {},
  });

  const collections = foundry.documents.collections;
  const sheets = foundry.applications.sheets;

  collections.Actors.unregisterSheet('core', sheets.ActorSheet);
  collections.Actors.registerSheet('xdz', CommandoSheet, {
    types: ['commando'],
    makeDefault: true,
    label: 'XDZ.SheetLabels.Commando',
  });
  collections.Actors.registerSheet('xdz', CharacterSheet, {
    types: ['character'],
    makeDefault: true,
    label: 'XDZ.SheetLabels.Character',
  });
  collections.Actors.registerSheet('xdz', XenoSheet, {
    types: ['xeno'],
    makeDefault: true,
    label: 'XDZ.SheetLabels.Xeno',
  });
  collections.Actors.registerSheet('xdz', NpcSheet, {
    types: ['npc'],
    makeDefault: true,
    label: 'XDZ.SheetLabels.Npc',
  });
  collections.Actors.registerSheet('xdz', VehicleSheet, {
    types: ['vehicle'],
    makeDefault: true,
    label: 'XDZ.SheetLabels.Vehicle',
  });

  collections.Items.unregisterSheet('core', sheets.ItemSheet);
  collections.Items.registerSheet('xdz', WeaponSheet, {
    types: ['weapon'],
    makeDefault: true,
    label: 'XDZ.SheetLabels.Weapon',
  });
  collections.Items.registerSheet('xdz', GearSheet, {
    types: ['gear'],
    makeDefault: true,
    label: 'XDZ.SheetLabels.Gear',
  });

  return foundry.applications.handlebars.loadTemplates([
    'systems/xdz/templates/actor/parts/stat-track.hbs',
    'systems/xdz/templates/actor/parts/weapon-card.hbs',
    'systems/xdz/templates/chat/attack-card.hbs',
    'systems/xdz/templates/chat/damage-card.hbs',
    'systems/xdz/templates/chat/chunk-damage-card.hbs',
    'systems/xdz/templates/chat/secondary-card.hbs',
    'systems/xdz/templates/chat/check-card.hbs',
    'systems/xdz/templates/chat/escalation-card.hbs',
    'systems/xdz/templates/chat/spawn-card.hbs',
    'systems/xdz/templates/chat/location-card.hbs',
    'systems/xdz/templates/chat/table-card.hbs',
    'systems/xdz/templates/chat/assets-card.hbs',
    'systems/xdz/templates/apps/map-generator.hbs',
    'systems/xdz/templates/apps/combat-carousel.hbs',
    'systems/xdz/templates/apps/commando-hud.hbs',
    'systems/xdz/templates/journal/mission-objectives-page.hbs',
    'systems/xdz/templates/journal/escalation-page.hbs',
    'systems/xdz/templates/journal/assets-page.hbs',
  ]);
});

/**
 * Reconcile the open timer badges against the `timers` flag on the shared
 * table-state doc: create apps for ids we haven't seen, close+drop apps for
 * ids that were removed, re-render the rest so their digits stay live.
 */
function syncTimers() {
  const states = RoundTimer.getAll();
  const seen = new Set();
  states.forEach((state) => {
    seen.add(state.id);
    const existing = xdz.apps.timers.get(state.id);
    if (existing) return existing.render();
    const app = new RoundTimer(state.id, { stackIndex: xdz.apps.timers.size });
    xdz.apps.timers.set(state.id, app);
    app.render(true);
  });
  for (const [id, app] of xdz.apps.timers) {
    if (seen.has(id)) continue;
    app.close();
    xdz.apps.timers.delete(id);
  }
}

Hooks.once('ready', async function () {
  xdz.state = await getStateDoc();

  xdz.apps.tnTracker = new TnTracker();
  if (game.settings.get('xdz', 'hudVisible')) {
    xdz.apps.tnTracker.render(true);
    syncTimers();
  }

  xdz.apps.combatCarousel = new CombatCarousel();
  xdz.apps.combatCarousel.syncVisibility();
});

// Acid-green xeno blood: Splatter's per-creature-type "bloodsheet" keys off
// actor.type when the system isn't one of its known game-system dataPaths
// (xdz isn't), so a single "xeno" entry is enough here — commando/character/
// npc/vehicle all fall through to Splatter's default red. GM-only, one-time:
// skipped once the key exists so a table can recolor it in Splatter's world
// settings without this stomping the change on next load.
Hooks.once('ready', function () {
  if (!game.user.isGM || !game.modules.get('splatter')?.active) return;
  const sheet = game.settings.get('splatter', 'BloodSheetData');
  if (sheet.xeno) return;
  game.settings.set('splatter', 'BloodSheetData', { ...sheet, xeno: '#39ff14d8' });
});

// TN/timer state lives as flags on the shared table-state JournalEntry (see
// table-state.mjs), which already broadcasts live to every connected client
// via the normal Document update flow — re-render the HUD badges in place
// instead of wiring a bespoke socket.
Hooks.on('updateJournalEntry', (doc, changes) => {
  if (doc.id !== xdz.state?.id) return;
  const flags = changes.flags?.xdz;
  if (!flags) return;
  if ('tnValue' in flags || 'tnModifier' in flags) xdz.apps.tnTracker?.render();
  if ('timers' in flags) syncTimers();
});

// Combat Carousel: open/close tracks whether a combat exists, re-render on
// anything that could change turn order, group membership, or headcount.
// A newly-created Marine/Other Combatant is appended to the end of its
// group's manual drag order (see combat-groups.mjs) so it has a defined
// position without requiring a roll.
Hooks.on('createCombat', (combat) => {
  if (isResponsibleClient() && !game.settings.get('xdz', 'playWithGM')) {
    combat.update({ ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } });
  }
  xdz.apps.combatCarousel?.syncVisibility();
});
Hooks.on('deleteCombat', () => xdz.apps.combatCarousel?.syncVisibility());
Hooks.on('updateCombat', () => xdz.apps.combatCarousel?.render());
Hooks.on('createCombatant', (combatant) => {
  // Every connected client sees this hook fire — only the responsible
  // client writes the append, avoiding duplicate/conflicting order values
  // from a race. See gm-election.mjs.
  if (isResponsibleClient()) appendToOrder(combatant);
  xdz.apps.combatCarousel?.render();
});
Hooks.on('updateCombatant', () => xdz.apps.combatCarousel?.render());
Hooks.on('deleteCombatant', () => xdz.apps.combatCarousel?.render());
// Destroy-die rolls stash their kill payload on the chat message (see
// rollDamage() in documents/item.mjs) instead of a bespoke socket — every
// connected client sees this hook fire, only the responsible client acts on
// it, same pattern as the createCombatant append above.
Hooks.on('createChatMessage', async (message) => {
  if (!isResponsibleClient()) return;
  const data = message.getFlag('xdz', 'autoKill');
  if (!data) return;
  // Wait out Dice So Nice's roll animation (if active) so the kill lands
  // after the player actually sees the destroy-die result, not before.
  await game.dice3d?.waitFor3DAnimationByMessageID(message.id);
  autoKillXenos(data);
});
// The carousel's injury pips/ECG read a Marine's system.injuries straight
// off the Actor — taking damage on the sheet doesn't touch the Combatant
// document at all, so without this the pips would only catch up next time
// something else (turn change, reorder) happened to trigger a render.
Hooks.on('updateActor', (actor) => {
  if (!game.combat?.combatants.some((c) => c.actor?.id === actor.id)) return;
  xdz.apps.combatCarousel?.render();
});

// Scene-control toggle to show/hide all HUD badges (per-client). Toggle
// tools fire onChange, not onClick.
Hooks.on('getSceneControlButtons', (controls) => {
  const group = controls.tokens;
  if (!group) return;
  group.tools.xdzHud = {
    name: 'xdzHud',
    title: 'XDZ.Hud.ToggleVisibility',
    icon: 'fa-solid fa-clock',
    toggle: true,
    active: game.settings.get('xdz', 'hudVisible'),
    onChange: async (event, active) => {
      await game.settings.set('xdz', 'hudVisible', active);
      if (active) {
        xdz.apps.tnTracker?.render(true);
        syncTimers();
      } else {
        xdz.apps.tnTracker?.close();
        for (const app of xdz.apps.timers.values()) app.close();
        xdz.apps.timers.clear();
      }
    },
  };
});

// Generated doors re-texture their leaf + frame Tile to match locked/closed/
// open — see onUpdateWallDoorState. The leaf write is intentionally delayed
// past the slide duration: core recreates the DoorMesh (no tween) the moment
// `animation.texture` changes, so swapping early turns the slide into an
// instant snap. Fires for every Wall update world-wide; the function itself
// no-ops on anything without a MapGenerator `doorId` flag.
Hooks.on('updateWall', onUpdateWallDoorState);

// Map Generator entry point lives in the Scenes sidebar, not a scene-control
// tool: SceneControls' tool click handler bails out on `!canvas.ready`, which
// is exactly the state of a fresh world with zero scenes — the one moment
// this button is needed most. The sidebar directory renders regardless.
Hooks.on('renderSceneDirectory', (app, html) => {
  if (!game.user.isGM && game.settings.get('xdz', 'playWithGM')) return;
  const actions = html.querySelector('.header-actions');
  if (!actions || actions.querySelector('.xdz-map-generator-btn')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('xdz-map-generator-btn');
  button.innerHTML = `<i class="fa-solid fa-map" inert></i><span>${game.i18n.localize('XDZ.MapGenerator.Title')}</span>`;
  button.addEventListener('click', () => new MapGenerator().render(true));
  actions.appendChild(button);
});

// Mission Objectives Generator entry point — same header-actions pattern as
// the Map Generator button above, but on the Journal sidebar: one button per
// mission type, each rolling and logging straight away (no picker dialog).
Hooks.on('renderJournalDirectory', (app, html) => {
  if (!game.user.isGM && game.settings.get('xdz', 'playWithGM')) return;
  const actions = html.querySelector('.header-actions');
  if (!actions || actions.querySelector('.xdz-mission-roll-btn')) return;
  const buttons = [
    { type: 'colony', icon: 'fa-solid fa-house-signal', labelKey: 'XDZ.MissionGenerator.ColonyObjectives' },
    { type: 'ship', icon: 'fa-solid fa-rocket', labelKey: 'XDZ.MissionGenerator.ShipObjectives' },
  ];
  for (const { type, icon, labelKey } of buttons) {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('xdz-mission-roll-btn');
    button.innerHTML = `<i class="${icon}" inert></i><span>${game.i18n.localize(labelKey)}</span>`;
    button.addEventListener('click', () => rollMission(type));
    actions.appendChild(button);
  }
});

// Damage-row buttons ("Roll Damage" / "Spray and Pray") aren't part of any
// Application, so they're wired here instead of an actions map — one
// delegated listener per rendered message. They can live on either an attack
// chat card (manual flow) or a damage chat card (Roll Damage Automatically —
// see XDZItem#rollAttack/#rollDamage), same markup either way.
// "Roll Damage" is a one-time base damage die and locks itself after use.
// "Spray and Pray" adds extra damage on top and stays rollable across
// multiple clicks, limited only by remaining ammo.
Hooks.on('renderChatMessageHTML', async (message, html) => {
  await reskinTableDraw(message, html);

  html.querySelectorAll('[data-action="xdzRollDamage"]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const row = button.closest('.xdz-damage-row');
      const item = fromUuidSync(row?.dataset.itemUuid);
      if (!item) return;
      const dieMode = button.dataset.dieMode;
      let targetIds = [];
      try {
        targetIds = JSON.parse(row.dataset.targetIds ?? '[]');
      } catch {
        targetIds = [];
      }
      let targetPoints = [];
      try {
        targetPoints = JSON.parse(row.dataset.targetPoints ?? '[]');
      } catch {
        targetPoints = [];
      }
      button.disabled = true;
      await item.rollDamage(dieMode, targetIds, targetPoints);
      if (dieMode === 'ammo') button.disabled = item.system.ammo.value <= 0;
    });
  });

  html.querySelectorAll('[data-action="xdzRollXenoResistance"]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      button.disabled = true;
      await resolveXenoResistance(button.dataset.actorUuid, button.dataset.key, button.dataset.kind);
    });
  });

  html.querySelectorAll('[data-action="xdzRollXenoAmbushDamage"]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      button.disabled = true;
      await resolveXenoAmbushDamage(button.dataset.actorUuid);
    });
  });

  wireLocationIdLinks(html);
});

// Native RollTable draws (GM clicking "Draw" on a table sheet, e.g. the
// ASSETS or COMMANDO QUIRK tables) render Foundry's default plain-text
// template. This reskins that message into the same CRT chat-card look as
// the rest of the system's rolls, once it's in the DOM — the flag core
// stores for the source table has switched between a bare id and a full
// UUID across Foundry versions, so both are tried. Silently no-ops for any
// chat message that isn't a table draw.
async function reskinTableDraw(message, html) {
  const flag = message.getFlag('core', 'RollTable');
  if (!flag) return;
  const table = (await fromUuid(flag).catch(() => null)) ?? game.tables.get(flag);
  if (!table) return;

  const total = message.rolls?.[0]?.total;
  const results = total === undefined ? [] : table.getResultsForRoll(total);
  if (!results.length) return;

  const enrichHTML = foundry.applications.ux.TextEditor.implementation.enrichHTML;
  const enriched = await Promise.all(
    results.map(async (result) => {
      const label = result.name ?? result.text;
      return {
        name: result.documentUuid
          ? await enrichHTML(`@UUID[${result.documentUuid}]{${label}}`, { relativeTo: table })
          : label,
        isLink: !!result.documentUuid,
        img: result.icon ?? result.img,
        description: result.description ? await enrichHTML(result.description, { relativeTo: table }) : '',
      };
    }),
  );
  const summary = table.description ? await enrichHTML(table.description, { relativeTo: table }) : '';

  const content = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/table-card.hbs', {
    tableName: table.name,
    total,
    summary,
    results: enriched,
  });
  const target = html.querySelector('.message-content') ?? html;
  target.innerHTML = content;
}

// Location-name buttons (spawn/location-roll chat cards, and objective/
// escalation `<Location>` tags — see mission-rolls.mjs's locTag) only know a
// locationId, not a point, and only pan/ping if that LOCATION's Tile is on
// the *currently active* scene — never auto-switching scenes to chase it.
// With the Map Generator's split-AREA scenes the GM is routinely viewing a
// different scene than the one the click's LOCATION lives on; the full map
// scene always has every LOCATION (so it always resolves here), while a
// single AREA scene only has its own 4. A miss posts a themed "not in this
// area" card with a compass hint instead of a UI notification.
function findLocationTileHere(id) {
  return canvas.scene?.tiles.find((t) => t.getFlag('xdz', 'locationId') === id) ?? null;
}

// Used only to work out *which direction* to report, never to pan/switch to.
// Restricted to the active scene's own Folder siblings (one Map Generator
// set) and to AREA scenes specifically (identified by the `areaCentroid`
// flag MapGenerator stamps on them, absent on the full map) — a locationId
// isn't unique world-wide, every generated map reuses the same canonical ids
// (e.g. 'medBay'), so searching wider could point at some unrelated map.
function findLocationTileInOtherArea(id) {
  if (!canvas.scene?.folder) return null;
  for (const scene of canvas.scene.folder.contents) {
    if (scene === canvas.scene || !scene.getFlag('xdz', 'areaCentroid')) continue;
    const tile = scene.tiles.find((t) => t.getFlag('xdz', 'locationId') === id);
    if (tile) return tile;
  }
  return null;
}

/** N/E/S/W from `from` to `to`, both {col, row} in MapGenerator's shared build-time grid space. */
function directionBetween(from, to) {
  const dx = to.col - from.col;
  const dy = to.row - from.row;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'E' : 'W';
  return dy >= 0 ? 'S' : 'N';
}

async function postOffMapCard(id) {
  const there = findLocationTileInOtherArea(id);
  const fromCentroid = canvas.scene?.getFlag('xdz', 'areaCentroid');
  const toCentroid = there?.parent.getFlag('xdz', 'areaCentroid');
  const dir = fromCentroid && toCentroid ? directionBetween(fromCentroid, toCentroid) : null;
  const message = dir
    ? game.i18n.format('XDZ.Chat.OffMapDesc', { direction: `<${game.i18n.localize(`XDZ.Direction.${dir}`)}>` })
    : game.i18n.localize('XDZ.Chat.OffMapUnknown');

  const content = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/off-map-card.hbs', {
    theme: game.settings.get('xdz', 'sheetTheme'),
    message,
  });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker(), content });
}

function wireLocationIdLinks(root) {
  root.querySelectorAll('[data-action="xdzPanToLocationId"]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const id = button.dataset.locationId;
      const tile = findLocationTileHere(id);
      if (!tile) return postOffMapCard(id);
      canvas.animatePan({ x: tile.x, y: tile.y });
      pingLocation(tile.x, tile.y);
    });
  });
}

// Big HUD-style pulse, player-colored (pulse's default color already falls
// back to game.user.color — left unset here so it does), fired alongside
// every pan-to-location click. size/rings/duration pushed well past
// CONFIG.Canvas.pings.styles.pulse's defaults so it reads as a deliberate
// target-lock rather than the stock ping-a-teammate blip; color2 swapped to
// cyan for the sci-fi flash-in instead of the default white.
function pingLocation(x, y) {
  canvas.ping({ x, y }, { style: 'pulse', size: 400, rings: 5, duration: 1600, color2: '#00faff' });
}

// CRT journal pages (mission log + the "Mission Objectives"/"Escalations"/
// "Location: Starship"/"Location: Colony" compendium reference journals) are
// baked once as static HTML with no data-theme, unlike chat cards which
// re-render per message. Stamping the current xdz.sheetTheme setting on
// every render (instead of baking it into the page content) is what makes
// them follow the Sheet Theme setting live.
function applyJournalTheme(root) {
  const theme = game.settings.get('xdz', 'sheetTheme');
  root.querySelectorAll('.xdz-journal-sheet').forEach((el) => (el.dataset.theme = theme));
}

// The compendium reference journals reuse XDZ.objectives/XDZ.escalations'
// %LOC1%/%LOC2%/%LOC3%/%LOCLIST% Desc placeholders via @Localize (see
// packs/_source/journals) since they're a static rules table, not an actual
// rolled mission — resolveEntry()'s tile-roll substitution doesn't apply
// here. Swapped for a localized generic placeholder post-enrichment instead.
function localizeLocationPlaceholders(root) {
  const placeholder = game.i18n.localize('XDZ.JournalCompendium.LocationRoll');
  root.querySelectorAll('.xdz-journal-objective-desc').forEach((el) => {
    el.innerHTML = el.innerHTML.replace(/%LOC\d%|%LOCLIST%/g, placeholder);
  });
}

// Journal Entry pages render each page as its own ApplicationV2 sheet
// (JournalEntryPageTextSheet), re-rendered every time the journal scrolls
// it into view — same delegated-listener approach as the chat hook above.
Hooks.on('renderJournalEntryPageTextSheet', (sheet, html) => {
  // Must run before wireLocationIdLinks: it reassigns innerHTML on
  // .xdz-journal-objective-desc (even a no-op replace re-parses the DOM),
  // which would wipe listeners already attached to any <button> inside it.
  localizeLocationPlaceholders(html);
  wireLocationIdLinks(html);
  applyJournalTheme(html);
});
