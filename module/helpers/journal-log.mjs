/** Finds or creates the "Mission Objectives" JournalEntry that MissionGenerator/escalation-roll log into. Owned by everyone so players can follow the mission log as it's written. */
export async function getMissionJournal() {
  const name = game.i18n.localize('XDZ.MissionGenerator.JournalName');
  return (
    game.journal.getName(name) ??
    JournalEntry.create({ name, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } })
  );
}

/** Appends a new text page (pre-built inner HTML) to `journal`, sorted after every existing page. */
export async function appendJournalPage(journal, name, bodyHtml) {
  const lastSort = journal.pages.contents.reduce((max, p) => Math.max(max, p.sort), 0);
  const [page] = await journal.createEmbeddedDocuments('JournalEntryPage', [
    {
      name,
      type: 'text',
      title: { show: false },
      text: { format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML, content: bodyHtml },
      sort: lastSort + 100,
    },
  ]);
  return page;
}
