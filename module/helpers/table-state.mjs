/**
 * Shared runtime state (TN value/modifier, round timers, current mission
 * type) that used to live in `scope: 'world'` Settings. World Settings can
 * only ever be written by a GM — a hard Foundry engine rule, no permission
 * override exists — which silently broke every one of these in a genuinely
 * GM-less session. Storing them as flags on a JournalEntry instead works
 * because per-document ownership CAN be handed to the Player role
 * (`ownership: { default: OWNER }`), the same trick getMissionJournal() uses
 * in journal-log.mjs and the createCombat handler uses in xdz.mjs.
 *
 * Found by a flag marker rather than by name, so renaming the journal in the
 * sidebar (or localizing it) can't break the lookup.
 */
export async function getStateDoc() {
  const existing = game.journal.find((j) => j.getFlag('xdz', 'tableState'));
  if (existing) return existing;
  return JournalEntry.create({
    name: 'XDZ Table State',
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
    flags: { xdz: { tableState: true } },
  });
}
