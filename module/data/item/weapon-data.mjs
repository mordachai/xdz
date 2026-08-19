const fields = foundry.data.fields;

/**
 * Data model for the Weapon item type. Covers rifles/heavy guns (ammo +
 * secondary resource like Grenade/Gyro) and flame units (fuel only) alike —
 * the secondary resource track is generic and just relabeled per weapon.
 */
export default class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      equipped: new fields.BooleanField({ required: true, initial: false }),
      discardOthersOnEquip: new fields.BooleanField({ required: true, initial: false }),
      destroyDie: new fields.StringField({ required: true, initial: '1d4' }),
      killMode: new fields.StringField({ required: true, initial: 'normal', choices: ['normal', 'explosive', 'piercing'] }),
      upgradeDie: new fields.StringField({ required: true, initial: '1d6' }),
      rules: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      description: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      ammoLabel: new fields.StringField({ required: true, blank: true, initial: '' }),
      ammoDescription: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      ammo: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, min: 0, initial: 3 }),
        max: new fields.NumberField({ required: true, integer: true, min: 0, initial: 3 }),
        killMode: new fields.StringField({ required: true, initial: 'normal', choices: ['normal', 'explosive', 'piercing'] }),
      }),
      secondary: new fields.SchemaField({
        label: new fields.StringField({ required: true, blank: true, initial: '' }),
        die: new fields.StringField({ required: true, blank: true, initial: '' }),
        description: new fields.HTMLField({ required: true, blank: true, initial: '' }),
        value: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        max: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        killMode: new fields.StringField({ required: true, initial: 'normal', choices: ['normal', 'explosive', 'piercing'] }),
      }),
      damaged: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        max: new fields.NumberField({ required: true, integer: true, min: 0, initial: 6 }),
      }),
    };
  }

  /** @override */
  prepareDerivedData() {
    this.destroyed = this.damaged.value >= this.damaged.max;
  }
}
