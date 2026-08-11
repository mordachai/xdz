// Shared pointer-drag + per-client position persistence for the always-on
// HUD badges (TN tracker, timers). Positions are stored client-side (scope
// "client") so each player can arrange their own screen without affecting
// anyone else's — only the underlying game state (TN value, timer state) is
// world-synced.

const SETTING = 'hudPositions';

export function getHudPosition(key) {
  return foundry.utils.getProperty(game.settings.get('xdz', SETTING), key) ?? null;
}

export async function setHudPosition(key, pos) {
  const all = foundry.utils.deepClone(game.settings.get('xdz', SETTING));
  foundry.utils.setProperty(all, key, { left: pos.left, top: pos.top });
  await game.settings.set('xdz', SETTING, all);
}

export async function clearHudPosition(key) {
  const all = foundry.utils.deepClone(game.settings.get('xdz', SETTING));
  foundry.utils.deleteProperty(all, key);
  await game.settings.set('xdz', SETTING, all);
}

/**
 * Make `handleEl` a drag handle that moves `app` (an ApplicationV2 with
 * `window.positioned: true`) and persists the dropped position under
 * `positionKey` in the `xdz.hudPositions` client setting.
 */
export function attachHudDrag(app, handleEl, positionKey) {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;

  handleEl.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('input, button, .xdz-hud-controls')) return;
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    const rect = app.element.getBoundingClientRect();
    originLeft = rect.left;
    originTop = rect.top;
    handleEl.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  handleEl.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const left = originLeft + (event.clientX - startX);
    const top = originTop + (event.clientY - startY);
    app.setPosition({ left, top });
  });

  const endDrag = async (event) => {
    if (!dragging) return;
    dragging = false;
    try { handleEl.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    const rect = app.element.getBoundingClientRect();
    await setHudPosition(positionKey, { left: rect.left, top: rect.top });
  };
  handleEl.addEventListener('pointerup', endDrag);
  handleEl.addEventListener('pointercancel', endDrag);
}
