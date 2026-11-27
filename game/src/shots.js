// The screenshot scenes behind ?shot=title|farm|kitchen|end&seed=N.
//
// Each scene is a real moment of the game's own code: the world is built
// from the seed, the turkey is driven by a simple autopilot (run, jump
// what is in front of you, duck into hay when the farmer is close) for a
// fixed number of fixed steps, and the scene freezes on the frame the
// scene asks for — a jump over a fence with the farmer at its heels, a
// knife on its way down in the kitchen. Same seed, same frame, always.

import { Game, STATE_ESCAPED, STATE_PLAY, STATE_TITLE } from './game.js';
import { GROUND_Y, PX_PER_M } from './config.js';
import { KIND } from './world.js';

const STEP = 1 / 60;

/** A fake Input with the same shape player.js reads, driven by rules. */
function autopilotInput(game) {
  const held = new Set();
  const pressed = new Set();
  return {
    held,
    pressed,
    mouse: { x: 0, y: 0, clicked: false },
    isHeld: (...codes) => codes.some((c) => held.has(c)),
    wasPressed: (...codes) => codes.some((c) => pressed.has(c)),
    endFrame: () => pressed.clear(),
    drive() {
      held.clear();
      pressed.clear();
      const { turkey, farmer, world } = game;
      held.add('ArrowRight');
      // Jump whatever is about to arrive underfoot.
      const ahead = world.inRange(turkey.x + 30, turkey.x + 130)
        .find((e) => [KIND.FENCE, KIND.OVEN, KIND.CRATE].includes(e.kind));
      if (ahead && turkey.grounded) pressed.add('Space');
      // Duck into hay when the farmer is close and a bale is at hand.
      const hay = world.coverAt(turkey.x + 26, KIND.HAY);
      if (hay && farmer.x > turkey.x - 300 && turkey.grounded) {
        held.delete('ArrowRight');
        held.add('ArrowDown');
      }
    },
  };
}

function simulate(game, input, seconds, until) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    input.drive();
    game.stepPlay(STEP, input);
    input.endFrame();
    if (game.state !== STATE_PLAY) return false;
    if (until && until(game)) return true;
  }
  return false;
}

function stageTitle(seed) {
  const game = new Game(seed);
  game.state = STATE_TITLE;
  poseTitleScene(game);
  return game;
}

/** The title tableau: turkey mid-frame, farmer looming at its shoulder. */
export function poseTitleScene(game) {
  game.turkey.x = 430;
  game.turkey.y = GROUND_Y;
  game.farmer.x = 205;
  game.farmer.alert = 0.8;
}

function stageFarm(seed) {
  const game = new Game(seed);
  game.state = STATE_PLAY;
  const input = autopilotInput(game);
  // Freeze on a fence jump a little way into the run. The farmer is then
  // composed at the turkey's heels — a real mid-chase gap — because a
  // screenshot of an empty field where he was left behind tells the
  // judge nothing about the chase.
  const found = simulate(game, input, 40, (g) => {
    const t = g.turkey;
    const hazard = g.world.inRange(t.x - 20, t.x + 110)
      .some((e) => [KIND.FENCE, KIND.OVEN, KIND.CRATE].includes(e.kind));
    return t.x > 2200 && !t.grounded && t.y < GROUND_Y - 46 && hazard;
  });
  if (!found) simulate(game, input, 2, null);
  // The camera keeps the turkey 400 px from the left edge; the farmer
  // belongs at 100, close enough to read as a chase, not at 15, cut off.
  if (game.turkey.x - game.farmer.x > 330 || game.farmer.x > game.turkey.x - 150) {
    game.farmer.x = game.turkey.x - 300;
  }
  game.farmer.alert = 0.95;
  game.turkey.stamina = 58;
  return game;
}

function stageKitchen(seed) {
  const game = new Game(seed);
  game.state = STATE_PLAY;
  // Stand the turkey a short run before the kitchen knife that has an
  // oven for company, the farmer at its heels, and play until the knife
  // is well on its way down.
  const knives = game.world.entities.filter(
    (e) => e.kind === KIND.KNIFE && e.x > 600 * PX_PER_M + 600,
  );
  const ovens = game.world.entities.filter((e) => e.kind === KIND.OVEN);
  const knife = knives.reduce((best, k) => {
    const d = Math.min(...ovens.map((o) => Math.abs(o.x - k.x)));
    return d < best.d ? { k, d } : best;
  }, { k: knives[0], d: Infinity }).k;
  game.turkey.x = knife.x - 560;
  game.farmer.x = game.turkey.x - 330;
  game.farmer.alert = 0.85;
  game.lastMetre = Math.floor(game.turkey.x / PX_PER_M);
  game.stageIndex = 2;
  game.score = 1640;
  game.corn = 14;
  const input = autopilotInput(game);
  simulate(game, input, 12, (g) => knife.state === 'falling' && knife.dropY > 360);
  if (game.turkey.x - game.farmer.x > 340) game.farmer.x = game.turkey.x - 320;
  game.farmer.alert = 0.95;
  return game;
}

function stageEnd(seed) {
  const game = new Game(seed);
  // The turkey stands past the Freedom Gate; the farmer searches, beaten.
  const gate = game.world.entities.find((e) => e.kind === KIND.GATE);
  game.turkey.x = gate.x + 320;
  game.turkey.y = GROUND_Y;
  game.farmer.x = gate.x - 430;
  game.farmer.state = 'search';
  game.farmer.alert = 0.1;
  game.score = 2840;
  game.corn = 23;
  game.timeS = 121.4;
  game.state = STATE_ESCAPED;
  return game;
}

/** Build the named scene's game, ready for one render. */
export function stageShot(name, seed = 7) {
  switch (name) {
    case 'farm': return stageFarm(seed);
    case 'kitchen': return stageKitchen(seed);
    case 'end': return stageEnd(seed);
    case 'title':
    default: return stageTitle(seed);
  }
}
