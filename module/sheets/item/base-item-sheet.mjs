const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * Shared behavior for all XDZ item sheets (Weapon, Gear).
 */
export default class XDZItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ['xdz', 'sheet', 'item'],
    position: { width: 480, height: 420 },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      onEditImage: this._onEditImage,
    },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.item;
    context.system = this.item.system;
    context.XDZ = CONFIG.XDZ;
    context.editable = this.isEditable;
    return context;
  }

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
}
