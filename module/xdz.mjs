import XDZActor from './documents/actor.mjs';
import XDZItem from './documents/item.mjs';
import { CommandoSheet, CharacterSheet, XenoSheet, WeaponSheet, GearSheet } from './sheets/_module.mjs';
import { TnTracker, RoundTimer, MapGenerator } from './apps/_module.mjs';
import { rollEscalation } from './macros/_module.mjs';
import { rollMission } from './helpers/mission-roll.mjs';
import { XDZ } from './helpers/config.mjs';
import * as models from './data/_module.mjs';

globalThis.xdz = {
  documents: { XDZActor, XDZItem },
  applications: { CommandoSheet, CharacterSheet, XenoSheet, WeaponSheet, GearSheet },
  apps: { TnTracker, RoundTimer, MapGenerator, tnTracker: null, timers: new Map() },
  macros: { rollEscalation, rollMission },
  models,
  config: XDZ,
};

Hooks.once('init', function () {
  CONFIG.XDZ = XDZ;

  CONFIG.Actor.documentClass = XDZActor;
  CONFIG.Actor.dataModels = {
    commando: models.CommandoData,
    character: models.CharacterData,
    xeno: models.XenoData,
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
    'systems/xdz/templates/chat/secondary-card.hbs',
    'systems/xdz/templates/chat/check-card.hbs',
    'systems/xdz/templates/chat/escalation-card.hbs',
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
Hooks.on('renderChatMessageHTML', (message, html) => {
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
});
