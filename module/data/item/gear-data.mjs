const fields = foundry.data.fields;

/**
 * Data model for the Gear item type — pistols, decks of cards, keepsakes,
 * med kits, anything improvised at the table.
 */
export default class GearData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      quantity: new fields.NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      description: new fields.HTMLField({ required: true, blank: true, initial: '' }),
    };
  }
}
