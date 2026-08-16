import { shuffleArray } from '../apps/map-generator.mjs';

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Styled `<Name>` tag matching the rulebook's own LOCATION-roll shorthand.
 * Also a pan-to-location button, same as the spawn-card location links
 * (xdz.mjs's `xdzPanToLocationId` handler) — resolved against the current
 * scene's tile by `locationId` at click time, not baked-in coordinates,
 * since these read out of journal pages long after the roll that made them.
 */
function locTag(label, id) {
  return `<button type="button" class="xdz-journal-loc" data-action="xdzPanToLocationId" data-location-id="${id}">&lt;${label}&gt;</button>`;
}

/**
 * Resolves an XDZ.objectives/XDZ.escalations entry's `%LOC1%`/`%LOC2%`/
 * `%LOC3%`/`%LOCLIST%` placeholders against CONFIG.XDZ.locations[type],
 * swapping each for a rolled `<LocationName>` tag. `entry.locationRolls` is
 * either a fixed count or the string '1d4' for a variable-count roll
 * (resolved against `%LOCLIST%`, a single comma-joined tag list).
 */
export function resolveEntry(entry, type) {
  let desc = game.i18n.localize(entry.desc);
  const pool = shuffleArray(CONFIG.XDZ.locations[type]);

  if (entry.locationRolls === '1d4') {
    const count = rollDie(4);
    const picked = pool.slice(0, count).map((l) => locTag(game.i18n.localize(l.label), l.id));
    desc = desc.replace('%LOCLIST%', picked.join(', '));
  } else if (entry.locationRolls > 0) {
    pool.slice(0, entry.locationRolls).forEach((loc, i) => {
      desc = desc.replace(`%LOC${i + 1}%`, locTag(game.i18n.localize(loc.label), loc.id));
    });
  }

  return { num: entry.num, label: game.i18n.localize(entry.label), desc: desc.replace(/\n/g, '<br>') };
}

/** EVAC's fixed anchor location for `type`, as the same styled `<Name>` tag. */
export function evacTag(type) {
  const id = CONFIG.XDZ.evacLocations[type];
  const label = CONFIG.XDZ.locations[type].find((l) => l.id === id)?.label ?? id;
  return locTag(game.i18n.localize(label), id);
}
