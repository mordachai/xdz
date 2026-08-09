const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Shared behavior for all XDZ actor sheets (Commando, Xeno).
 */
export default class XDZActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ['xdz', 'sheet', 'actor'],
    position: { width: 900, height: 700 },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      onEditImage: this._onEditImage,
      itemCreate: this._onItemCreate,
      itemEdit: this._onItemEdit,
      itemDelete: this._onItemDelete,
      rollTraining: this._onRollTraining,
      rollResistance: this._onRollResistance,
    },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.actor;
    context.system = this.actor.system;
    context.items = this.actor.items;
    context.XDZ = CONFIG.XDZ;
    context.editable = this.isEditable;
    return context;
  }

  /* -------------------------------------------- */
  /*  Actions                                      */
  /* -------------------------------------------- */

  static async _onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const fp = new foundry.applications.apps.FilePicker.implementation({
      current,
      type: 'image',
      callback: (path) => this.document.update({ [attr]: path }),
    });
    return fp.browse();
  }

  static async _onItemCreate(event, target) {
    const type = target.dataset.type ?? 'gear';
    const name = game.i18n.format('DOCUMENT.New', { type: game.i18n.localize(`TYPES.Item.${type}`) });
    return this.actor.createEmbeddedDocuments('Item', [{ name, type }]);
  }

  static async _onItemEdit(event, target) {
    const li = target.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    return item?.sheet.render(true);
  }

  static async _onItemDelete(event, target) {
    const li = target.closest('[data-item-id]');
    const item = this.actor.items.get(li?.dataset.itemId);
    return item?.delete();
  }

  static async _onRollTraining(event, target) {
    return this.actor.rollTraining(target.dataset.key);
  }

  static async _onRollResistance(event, target) {
    return this.actor.rollResistance(target.dataset.key);
  }
}
