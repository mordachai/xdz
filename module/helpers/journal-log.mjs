/** Finds or creates the "Mission Objectives" JournalEntry that MissionGenerator/escalation-roll log into. */
export async function getMissionJournal() {
  return game.journal.getName('Mission Objectives') ?? JournalEntry.create({ name: 'Mission Objectives' });
}

/** Appends a new text page (pre-built inner HTML) to `journal`, sorted after every existing page. */
export async function appendJournalPage(journal, name, bodyHtml) {
  const lastSort = journal.pages.contents.reduce((max, p) => Math.max(max, p.sort), 0);
  const [page] = await journal.createEmbeddedDocuments('JournalEntryPage', [
    {
      name,
      type: 'text',
      text: { format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML, content: bodyHtml },
      sort: lastSort + 100,
    },
  ]);
  return page;
}
