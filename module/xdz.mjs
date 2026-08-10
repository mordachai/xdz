import XDZActor from './documents/actor.mjs';
import XDZItem from './documents/item.mjs';
import { CommandoSheet, CharacterSheet, XenoSheet, WeaponSheet, GearSheet } from './sheets/_module.mjs';
import { XDZ } from './helpers/config.mjs';
import * as models from './data/_module.mjs';

globalThis.xdz = {
  documents: { XDZActor, XDZItem },
  applications: { CommandoSheet, CharacterSheet, XenoSheet, WeaponSheet, GearSheet },
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
  ]);
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
