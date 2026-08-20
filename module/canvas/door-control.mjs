const { DoorControl } = foundry.canvas.containers;

/**
 * Stock DoorControl hardcodes its resting icon alpha to 0.6 in both draw()
 * and _onMouseOut() — there's no hook or config knob for it. Reading the
 * xdz.doorIconOpacity client setting in both spots (instead of a fixed
 * 0.6) is what lets the "Door Icon Opacity" setting actually take effect,
 * including on doors already drawn when the setting changes (see the
 * onChange handler in xdz.mjs). Hover always snaps to full opacity so a
 * discreet icon is still easy to find and click.
 */
export default class XdzDoorControl extends DoorControl {
  async draw() {
    await super.draw();
    this.icon.alpha = game.settings.get('xdz', 'doorIconOpacity');
    return this;
  }

  _onMouseOut(event) {
    super._onMouseOut(event);
    this.icon.alpha = game.settings.get('xdz', 'doorIconOpacity');
  }
}
