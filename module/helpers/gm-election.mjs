/**
 * True on the one client that should perform privileged one-shot writes
 * (Combatant order append, destroy-die auto-kill): the GM, whenever the
 * table's in secretive/GM mode (`xdz.playWithGM`) or a GM happens to be
 * connected; otherwise (no dedicated GM, nobody currently GM) the active
 * non-GM user with the lowest id — deterministic on every client, so no two
 * clients ever both think they're responsible and duplicate the write.
 */
export function isResponsibleClient() {
  if (game.user.isGM) return true;
  if (game.settings.get('xdz', 'playWithGM')) return false;
  const candidates = game.users.filter((u) => u.active && !u.isGM).sort((a, b) => a.id.localeCompare(b.id));
  return candidates[0]?.id === game.user.id;
}
