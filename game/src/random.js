// A tiny seeded random number generator (mulberry32).
//
// The world is generated from a seed so a run — and every screenshot scene
// in shots.js — is the same each time it is built from the same seed.

export function makeRng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** Float in [min, max). */
    range: (min, max) => min + next() * (max - min),
    /** Integer in [min, max], both ends included. */
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    /** True with probability p. */
    chance: (p) => next() < p,
    /** One element of the array. */
    pick: (items) => items[Math.floor(next() * items.length)],
  };
}
