const fields = foundry.data.fields;

/**
 * Data model for the Vehicle actor type. XDZ has no vehicle rules of its
 * own — chunks follow ICRPG's chunk-damage convention (each chunk has its
 * own HP pool and dies independently of the others).
 */
export default class VehicleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      vehicleType: new fields.StringField({ required: true, blank: true, initial: '' }),
      description: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      chunks: new fields.ArrayField(
        new fields.SchemaField({
          title: new fields.StringField({ required: true, blank: true, initial: '' }),
          description: new fields.StringField({ required: true, blank: true, initial: '' }),
          hp: new fields.SchemaField({
            value: new fields.NumberField({ required: true, integer: true, initial: 6 }),
            max: new fields.NumberField({ required: true, integer: true, initial: 6 }),
          }),
          damage: new fields.StringField({ required: true, blank: true, initial: '1d6' }),
        }),
        { required: true, initial: [] },
      ),
    };
  }
}
