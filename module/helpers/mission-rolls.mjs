import { shuffleArray } from '../apps/map-generator.mjs';

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

/** Styled `<Name>` tag matching the rulebook's own LOCATION-roll shorthand. */
function locTag(label) {
  return `<span class="xdz-journal-loc">&lt;${label}&gt;</span>`;
}

/**
 * Resolves an XDZ.objectives/XDZ.escalations entry's `%LOC1%`/`%LOC2%`/
 * `%LOC3%`/`%LOCLIST%` placeholders against CONFIG.XDZ.locations[type],
 * swapping each for a rolled `<LocationName>` tag. `entry.locationRolls` is
 * either a fixed count or the string '1d4' for a variable-count roll
 * (resolved against `%LOCLIST%`, a single comma-joined tag list).
 */
export function resolveEntry(entry, type) {
  let desc = entry.desc;
  const pool = shuffleArray(CONFIG.XDZ.locations[type]);

  if (entry.locationRolls === '1d4') {
    const count = rollDie(4);
    const picked = pool.slice(0, count).map((l) => locTag(l.label));
    desc = desc.replace('%LOCLIST%', picked.join(', '));
  } else if (entry.locationRolls > 0) {
    pool.slice(0, entry.locationRolls).forEach((loc, i) => {
      desc = desc.replace(`%LOC${i + 1}%`, locTag(loc.label));
    });
  }

  return { num: entry.num, label: entry.label, desc: desc.replace(/\n/g, '<br>') };
}

/** EVAC's fixed anchor location for `type`, as the same styled `<Name>` tag. */
export function evacTag(type) {
  const id = CONFIG.XDZ.evacLocations[type];
  const label = CONFIG.XDZ.locations[type].find((l) => l.id === id)?.label ?? id;
  return locTag(label);
}
