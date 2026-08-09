const fields = foundry.data.fields;

/**
 * Data model for the Commando actor type.
 */
export default class CommandoData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const trainingField = () => new fields.NumberField({ required: true, integer: true, min: 0, max: 4, initial: 0 });
    const resistanceField = () => new fields.NumberField({ required: true, integer: true, min: 0, max: 4, initial: 0 });

    return {
      rank: new fields.StringField({ required: true, blank: true, initial: '' }),
      story: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      quirk: new fields.StringField({ required: true, blank: true, initial: '' }),
      training: new fields.SchemaField({
        pilot: trainingField(),
        systems: trainingField(),
        mechanic: trainingField(),
        weapons: trainingField(),
        medical: trainingField(),
      }),
      resistances: new fields.SchemaField({
        fear: resistanceField(),
        dodge: resistanceField(),
        death: resistanceField(),
      }),
      injuries: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, min: 0, max: 6, initial: 0 }),
      }),
      target: new fields.NumberField({ required: true, integer: true, min: 1, initial: 12 }),
    };
  }

  /** @override */
  prepareDerivedData() {
    const XDZ = CONFIG.XDZ;

    this.training.spent = Object.values(this.training).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
    this.training.budget = XDZ.trainingBudget;
    this.training.remaining = XDZ.trainingBudget - this.training.spent;

    this.resistances.spent = Object.values(this.resistances).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
    this.resistances.budget = XDZ.resistanceBudget;
    this.resistances.remaining = XDZ.resistanceBudget - this.resistances.spent;

    this.injuries.down = this.injuries.value >= XDZ.injuryDown;
    this.injuries.dead = this.injuries.value >= XDZ.injuryDeath;
    this.injuries.max = XDZ.injuryDeath;
  }
}
