const fields = foundry.data.fields;

/**
 * Data model for the NPC actor type — same blueprint as Xeno (mode-driven
 * token visibility, type/threat/notes), for non-Xeno hostiles like rogue
 * commandos or Company agents (see KB "ROGUE COMMANDOS" escalation). Unlike
 * Xeno, TYPE is free text rather than the Xeno taxonomy dropdown.
 */
export default class NpcData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      mode: new fields.StringField({ required: true, initial: 'hide', choices: ['hide', 'seek'] }),
      type: new fields.StringField({ required: true, blank: true, initial: '' }),
      threat: new fields.NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      notes: new fields.HTMLField({ required: true, blank: true, initial: '' }),
    };
  }

  /** @override */
  prepareDerivedData() {
    this.isHidden = this.mode === 'hide';
  }
}
