import XDZActor from './documents/actor.mjs';
import XDZItem from './documents/item.mjs';
import { CommandoSheet, CharacterSheet, XenoSheet, NpcSheet, VehicleSheet, WeaponSheet, GearSheet } from './sheets/_module.mjs';
import { TnTracker, RoundTimer, MapGenerator } from './apps/_module.mjs';
import { rollEscalation, rollLocation, spawnXenos, spawnBreeder, spawnRogueCommandos, spawnWicked, spawnSwarm } from './macros/_module.mjs';
import { rollMission } from './helpers/mission-roll.mjs';
import { XDZ } from './helpers/config.mjs';
import * as models from './data/_module.mjs';

globalThis.xdz = {
  documents: { XDZActor, XDZItem },
  applications: { CommandoSheet, CharacterSheet, XenoSheet, NpcSheet, VehicleSheet, WeaponSheet, GearSheet },
  apps: { TnTracker, RoundTimer, MapGenerator, tnTracker: null, timers: new Map() },
  macros: { rollEscalation, rollLocation, rollMission, spawnXenos, spawnBreeder, spawnRogueCommandos, spawnWicked, spawnSwarm },
  models,
  config: XDZ,
};

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

  CONFIG.Item.documentClass = XDZItem;
  CONFIG.Item.dataModels = {
    weapon: models.WeaponData,
    gear: models.GearData,
  };
  CONFIG.Item.typeImages = XDZ.itemTypeImages;

  game.settings.register('xdz', TnTracker.SETTING, {
    scope: 'world',
    config: false,
    type: Number,
    default: XDZ.defaultTarget,
  });
  game.settings.register('xdz', TnTracker.MODIFIER_SETTING, {
    scope: 'world',
    config: false,
    type: Object,
    default: { type: null, delta: 0, baseValue: null },
  });
  // Any number of timers can run at once — an array of independent state
  // objects, each tagged with its own id (see RoundTimer).
  game.settings.register('xdz', RoundTimer.SETTING, {
    scope: 'world',
    config: false,
    type: Array,
    default: [],
  });
  // Last mission type rolled via rollMission() — read by the Escalation
  // roller so its own LOCATION-roll placeholders match the current mission
  // (ship vs colony) without needing an explicit picker on every call.
  game.settings.register('xdz', 'currentMissionType', {
    scope: 'world',
    config: false,
    type: String,
    default: 'colony',
  });
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
    'systems/xdz/templates/apps/map-generator.hbs',
    'systems/xdz/templates/journal/mission-objectives-page.hbs',
    'systems/xdz/templates/journal/escalation-page.hbs',
  ]);
});

/**
 * Reconcile the open timer badges against the `xdz.timers` world setting:
 * create apps for ids we haven't seen, close+drop apps for ids that were
 * removed, re-render the rest so their digits stay live.
 */
function syncTimers() {
  const states = game.settings.get('xdz', RoundTimer.SETTING);
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

Hooks.once('ready', function () {
  xdz.apps.tnTracker = new TnTracker();
  if (game.settings.get('xdz', 'hudVisible')) {
    xdz.apps.tnTracker.render(true);
    syncTimers();
  }
});

// TN/timer state lives in world settings (Setting documents), which already
// broadcast live to every connected client — re-render the HUD badges in
// place instead of wiring a bespoke socket.
Hooks.on('updateSetting', (setting) => {
  if (setting.key === 'xdz.tnValue' || setting.key === 'xdz.tnModifier') xdz.apps.tnTracker?.render();
  if (setting.key === 'xdz.timers') syncTimers();
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

// Map Generator entry point lives in the Scenes sidebar, not a scene-control
// tool: SceneControls' tool click handler bails out on `!canvas.ready`, which
// is exactly the state of a fresh world with zero scenes — the one moment
// this button is needed most. The sidebar directory renders regardless.
Hooks.on('renderSceneDirectory', (app, html) => {
  if (!game.user.isGM) return;
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
  if (!game.user.isGM) return;
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

// Damage-row buttons on a successful weapon attack chat card ("Roll Damage" /
// "Spray and Pray") aren't part of any Application, so they're wired here
// instead of an actions map — one delegated listener per rendered message.
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
      button.disabled = true;
      await item.rollDamage(dieMode);
      if (dieMode === 'ammo') button.disabled = item.system.ammo.value <= 0;
    });
  });

  // Spawn-card location names pan the GM's view to that point, center only —
  // zoom untouched, so it never fights a GM who's mid zoom-in on the fight.
  html.querySelectorAll('[data-action="xdzPanToLocation"]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const x = Number(button.dataset.x);
      const y = Number(button.dataset.y);
      if (Number.isNaN(x) || Number.isNaN(y)) return;
      canvas.animatePan({ x, y });
      pingLocation(x, y);
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

// Objective/escalation `<Location>` tags (see mission-rolls.mjs's locTag)
// only know a locationId, not a point — the map that had a matching tile
// may not even be the active scene by the time someone reads the journal
// page or scrolls back through chat, so resolution happens at click time
// against whatever scene is currently active. Shared by both the escalation
// chat card (wired above) and the mission-objectives/escalation journal
// pages (wired below).
function wireLocationIdLinks(root) {
  root.querySelectorAll('[data-action="xdzPanToLocationId"]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const id = button.dataset.locationId;
      const tile = canvas.scene?.tiles.find((t) => t.getFlag('xdz', 'locationId') === id);
      if (!tile) return ui.notifications.warn(game.i18n.localize('XDZ.Notifications.NoTileForLocation'));
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
  wireLocationIdLinks(html);
  applyJournalTheme(html);
  localizeLocationPlaceholders(html);
});
