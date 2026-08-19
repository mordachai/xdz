import { resolveEntry, evacTag } from './mission-rolls.mjs';
import { getMissionJournal, appendJournalPage } from './journal-log.mjs';
import { shuffleArray } from '../apps/map-generator.mjs';

const TYPE_LABEL_KEYS = { ship: 'XDZ.MissionGenerator.Starship', colony: 'XDZ.MissionGenerator.Colony' };

/**
 * Rolls one mission of `type` ('ship' | 'colony') — 3 unique OBJECTIVES from
 * KB §"mission objectives" + the fixed EVAC anchor, each LOCATION-rolled
 * against the matching STARSHIP/COLONY list — and appends it as a new page
 * to the "Mission Objectives" journal, styled as an old green-screen
 * terminal readout. Wired to the Colony/Ship Objectives buttons in the
 * Journal directory header, and exposed as `xdz.macros.rollMission(type)`
 * for a hotbar macro. Callable by players too, for gmless play.
 */
export async function rollMission(type) {
  const objectives = shuffleArray(CONFIG.XDZ.objectives)
    .slice(0, 3)
    .sort((a, b) => a.num - b.num)
    .map((objective) => resolveEntry(objective, type));

  const typeLabel = game.i18n.localize(TYPE_LABEL_KEYS[type]);
  const data = {
    type,
    typeLabel,
    typeLabelUpper: typeLabel.toUpperCase(),
    timestamp: new Date().toLocaleString(),
    objectives,
    evacTag: evacTag(type),
  };

  const bodyHtml = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/journal/mission-objectives-page.hbs', data);
  const journal = await getMissionJournal();
  const page = await appendJournalPage(
    journal,
    `${data.typeLabelUpper} ${game.i18n.localize('XDZ.MissionGenerator.Mission')} — ${data.timestamp}`,
    `<div class="xdz xdz-journal-sheet">${bodyHtml}</div>`,
  );
  journal.sheet.render(true, { pageId: page.id });

  await game.settings.set('xdz', 'currentMissionType', type);
}
