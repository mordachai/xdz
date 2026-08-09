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
  ]);
});
