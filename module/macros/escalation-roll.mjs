import { resolveEntry } from '../helpers/mission-rolls.mjs';
import { getMissionJournal, appendJournalPage } from '../helpers/journal-log.mjs';
import { spawnBreeder, spawnRogueCommandos, spawnSwarm } from './spawn-xenos.mjs';

// Escalations that spawn actors on the scene, keyed by CONFIG.XDZ.escalations entry id.
const SPAWN_HANDLERS = {
  theBreeder: spawnBreeder,
  rogueCommandos: spawnRogueCommandos,
  swarm: spawnSwarm,
};

/**
 * Rolls 1D20 on XDZ.escalations (KB "mission ESCALATIONS", rolled once per
 * XENO turn) and posts a CRT-styled chat card. Exposed as `xdz.macros.
 * rollEscalation()` for a GM hotbar macro. Any LOCATION-roll placeholder in
 * the result resolves against the last mission type rolled by
 * MissionGenerator (world setting xdz.currentMissionType), defaulting to
 * 'colony' if no mission has been rolled yet this world.
 *
 * Also logs the roll as its own page in the "Mission Objectives" journal,
 * appended after the mission briefing page (not nested inside it) — a
 * running record of the mission's complications. Unlike MissionGenerator,
 * this does not pop the journal open every time — it's called once per
 * XENO turn and shouldn't interrupt play.
 */
export async function rollEscalation() {
  if (!game.user.isGM) return;

  const roll = await new Roll('1d20').evaluate();
  const entry = CONFIG.XDZ.escalations.find((e) => e.num === roll.total);
  const type = game.settings.get('xdz', 'currentMissionType');
  const resolved = resolveEntry(entry, type);
  const timestamp = new Date().toLocaleString();

  const chatContent = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/chat/escalation-card.hbs', {
    num: resolved.num,
    label: resolved.label,
    desc: resolved.desc,
  });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker(),
    content: chatContent,
    rolls: [roll],
  });

  const pageBody = await foundry.applications.handlebars.renderTemplate('systems/xdz/templates/journal/escalation-page.hbs', {
    num: resolved.num,
    label: resolved.label,
    desc: resolved.desc,
    timestamp,
  });
  const journal = await getMissionJournal();
  await appendJournalPage(
    journal,
    `${game.i18n.localize('XDZ.Escalation.Title')} ${resolved.num} — ${resolved.label.toUpperCase()} — ${timestamp}`,
    `<div class="xdz xdz-journal-sheet xdz-journal-escalation">${pageBody}</div>`,
  );

  await SPAWN_HANDLERS[entry.id]?.();
}
