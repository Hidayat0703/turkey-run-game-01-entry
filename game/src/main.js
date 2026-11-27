// Boot: size the canvas, wire the input, and run the loop.
//
// Two modes. Play mode is a fixed-step simulation (120 steps a second,
// at most a few per frame) under requestAnimationFrame. Shot mode —
// ?shot=<scene>&seed=<n> — stages one deterministic scene from shots.js,
// renders a single frame, and says so on window.__SHOT_DONE__ so the
// screenshot tooling knows the frame is final.

import { VIEW } from './config.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? 7) || 7;

if (shotName) {
  const game = stageShot(shotName, seed);
  const input = new Input(canvas);
  game.render(ctx, input, 1.25);
  document.title = `Gobble Run — shot: ${shotName}`;
  window.__SHOT_DONE__ = true;
} else {
  const game = new Game(seed);
  const input = new Input(canvas);
  const status = document.getElementById('status');
  const STEP = 1 / 120;
  let last = performance.now();
  let accumulator = 0;
  let statusAt = 0;

  const frame = (now) => {
    const elapsed = Math.min(0.1, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= STEP && steps < 12) {
      game.update(STEP, input);
      accumulator -= STEP;
      steps += 1;
    }
    if (steps === 12) accumulator = 0;
    game.render(ctx, input, now / 1000);
    input.endFrame();
    if (status && now - statusAt > 500) {
      statusAt = now;
      status.textContent = `Gobble Run: ${game.state}, score ${game.score}`;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
