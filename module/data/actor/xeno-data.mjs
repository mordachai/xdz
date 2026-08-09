const fields = foundry.data.fields;

/**
 * Data model for the Xeno actor type. Runs GM-less: mode drives token
 * visibility (HIDE = undiscovered, SEEK = actively hunting commandos).
 */
export default class XenoData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      mode: new fields.StringField({ required: true, initial: 'hide', choices: ['hide', 'seek'] }),
      xenoType: new fields.StringField({ required: true, blank: true, initial: '' }),
      threat: new fields.NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      notes: new fields.HTMLField({ required: true, blank: true, initial: '' }),
    };
  }

  /** @override */
  prepareDerivedData() {
    this.isHidden = this.mode === 'hide';
  }
}
