import { applyGmSecrecy } from './location-roll.mjs';
import { getMissionJournal, appendJournalPage } from '../helpers/journal-log.mjs';
import { locTag } from '../helpers/mission-rolls.mjs';
import { shuffleArray } from '../apps/map-generator.mjs';

const ASSETS_TABLE_UUID = 'Compendium.xdz.tables.RollTable.izGbcWp05MyNI4dc';

/**
 * KB p19 "The Good Stuff": every MISSION has 1D8 ASSETS, rolled (how many,
 * and where they are) when the MISSION starts. Draws that many results off
 * the ASSETS RollTable (1D12, with replacement — duplicates are expected)
 * and pairs each with a narrative LOCATION, the same soft `<Name>` tag
 * resolveEntry() puts on OBJECTIVE/ESCALATION text (CONFIG.XDZ.locations
 * pool), not a physical rollLocationPoint() tile roll — assets don't spawn
 * anything on the canvas, they're just a line in the mission log to reach.
 *
 * Posts a chat card and appends a "Deployed Assets" page to the Mission
 * Objectives journal. Per KB ("if playing with a GM, these can be kept
 * secret"), under the "Play with a GM" world setting the chat card is
 * GM-only (applyGmSecrecy, matching every other roll) and the journal page
 * itself is set GM-only ownership — the only journal page in the system that
 * needs per-page ownership, since escalation/objective pages stay visible to
 * players even under Play with a GM.
 */
export async function rollAssets() {
  if (!game.user.isGM) return;

  const table = await fromUuid(ASSETS_TABLE_UUID);
  if (!table) return ui.notifications.error(game.i18n.format('XDZ.Notifications.CouldNotLoadTable', { uuid: ASSETS_TABLE_UUID }));

  const countRoll = await new Roll('1d8').evaluate();
  const type = game.settings.get('xdz', 'currentMissionType');
  const pool = shuffleArray(CONFIG.XDZ.locations[type]);

  const enrichHTML = foundry.applications.ux.TextEditor.implementation.enrichHTML;
  const assetRolls = [];
  const assets = [];
  for (let i = 0; i < countRoll.total; i++) {
    const { roll, results } = await table.roll();
    assetRolls.push(roll);
    const result = results[0];
    const loc = pool[i % pool.length];
    const locationLabel = game.i18n.localize(loc.label);
    assets.push({
      name: result.name,
      img: result.img,
      description: result.description ? await enrichHTML(result.description, { relativeTo: table }) : '',
      locationLabel,
      locationId: loc.id,
      locationTag: locTag(locationLabel, loc.id),
    });
  }

  const timestamp = new Date().toLocaleString();

  const chatContent = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/assets-card.hbs', {
    theme: game.settings.get('xdz', 'sheetTheme'),
    total: countRoll.total,
    assets,
  });
  await ChatMessage.create(applyGmSecrecy({
    speaker: ChatMessage.getSpeaker(),
    content: chatContent,
    rolls: [countRoll, ...assetRolls],
  }));

  const pageBody = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/journal/assets-page.hbs', {
    total: countRoll.total,
    assets,
    timestamp,
  });
  const journal = await getMissionJournal();
  const page = await appendJournalPage(
    journal,
    `${game.i18n.localize('XDZ.Assets.Title')} — ${timestamp}`,
    `<div class="xdz xdz-journal-sheet">${pageBody}</div>`,
  );
  if (game.settings.get('xdz', 'playWithGM')) {
    await page.update({ ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE } });
  }
}
