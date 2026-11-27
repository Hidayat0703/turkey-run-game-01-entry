// Every character and prop in Gobble Run is drawn here with canvas paths —
// no image files. One clear job per function, and every figure is drawn
// facing right with (x, y) at the ground under its feet, so the world can
// place them without knowing their insides.
//
// The look: warm autumn colours, thick outlines, squash-and-stretch run
// cycles driven by a phase value the callers advance as things move.

import { COLOURS } from './config.js';

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function circle(ctx, x, y, r, fill) {
  ellipse(ctx, x, y, r, r, fill);
}

function rect(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

function poly(ctx, points, fill) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** The turkey: a round brown body, a fan of tail feathers, a red wattle. */
export function drawTurkey(ctx, x, y, opts = {}) {
  const phase = opts.phase ?? 0;
  const ducking = opts.ducking ?? false;
  const hidden = opts.hidden ?? false;
  const flash = opts.flash ?? false; // invincibility flicker
  if (flash && Math.floor(phase * 14) % 2 === 0) return;
  const bob = ducking ? 0 : Math.abs(Math.sin(phase)) * 4;
  const bodyY = y - (ducking ? 26 : 34) - bob;
  const body = flash ? '#e9c46a' : '#8a5a33';
  const bodyDark = flash ? '#f4d58d' : '#6f4525';
  ctx.save();
  ctx.translate(x, 0);
  if (hidden) ctx.globalAlpha = 0.25;

  // Tail fan: five feathers fanned behind, tips banded cream and rust.
  for (let i = -2; i <= 2; i += 1) {
    const a = (-0.5 + i * 0.24) - (ducking ? 0.25 : 0);
    const fx = -26 + Math.sin(a) * 6;
    const fy = bodyY - 6 + Math.cos(a) * 2;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(a - 0.5);
    ellipse(ctx, -14, 0, 17, 6.5, i % 2 === 0 ? '#b08968' : '#a2673a');
    ellipse(ctx, -24, 0, 6, 5, '#e76f51');
    ctx.restore();
  }

  // Legs: two orange sticks cycling while running, tucked while ducking.
  ctx.strokeStyle = '#e36414';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  if (!ducking) {
    for (const side of [0, 1]) {
      const swing = Math.sin(phase + side * Math.PI) * 13;
      ctx.beginPath();
      ctx.moveTo(-4 + side * 10, bodyY + 16);
      ctx.lineTo(-4 + side * 10 + swing, y - 2);
      ctx.stroke();
    }
  }

  // Body and wing.
  ellipse(ctx, 0, bodyY, 30, ducking ? 17 : 21, body);
  ellipse(ctx, 2, bodyY + 3, 20, ducking ? 10 : 13, bodyDark);
  const wingFlap = ducking ? 0.15 : Math.sin(phase * 1.4) * 0.25;
  ctx.save();
  ctx.translate(-2, bodyY);
  ctx.rotate(wingFlap);
  ellipse(ctx, 0, 2, 15, 8, '#9c6644');
  ctx.restore();

  // Neck and head, stretched forward while running.
  const headX = ducking ? 30 : 27;
  const headY = bodyY - (ducking ? 4 : 15) - bob * 0.4;
  ctx.strokeStyle = body;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(18, bodyY - 4);
  ctx.lineTo(headX, headY + 4);
  ctx.stroke();
  circle(ctx, headX + 4, headY, 11, body);
  // Beak, wattle and a determined eye.
  poly(ctx, [[headX + 12, headY - 2], [headX + 24, headY + 1], [headX + 12, headY + 5]], COLOURS.gold);
  ellipse(ctx, headX + 9, headY + 8, 4, 7, COLOURS.danger);
  circle(ctx, headX + 7, headY - 2, 2.6, COLOURS.ink);
  // Snood over the beak.
  ctx.strokeStyle = COLOURS.danger;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(headX + 13, headY - 5);
  ctx.quadraticCurveTo(headX + 17, headY + 2, headX + 14, headY + 7);
  ctx.stroke();
  ctx.restore();
}

/** The farmer: overalls, a straw hat, and a butterfly net for catching. */
export function drawFarmer(ctx, x, y, opts = {}) {
  const phase = opts.phase ?? 0;
  const state = opts.state ?? 'chase'; // chase | search | grab
  ctx.save();
  ctx.translate(x, 0);
  const bob = state === 'search' ? 0 : Math.abs(Math.sin(phase)) * 5;
  const hipY = y - 52 - bob;

  // Legs in denim, boots below.
  ctx.strokeStyle = '#355070';
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  for (const side of [0, 1]) {
    const swing = state === 'search' ? 0 : Math.sin(phase + side * Math.PI) * 15;
    ctx.beginPath();
    ctx.moveTo(-6 + side * 12, hipY);
    ctx.lineTo(-6 + side * 12 + swing, y - 8 - bob * 0.3);
    ctx.stroke();
    rect(ctx, -13 + side * 12 + swing, y - 9 - bob * 0.3, 15, 7, '#4a3728');
  }

  // Torso: plaid shirt under overalls.
  rect(ctx, -17, hipY - 38, 34, 42, '#6a994e');
  rect(ctx, -17, hipY - 14, 34, 18, '#355070');
  rect(ctx, -13, hipY - 38, 7, 26, '#355070');
  rect(ctx, 6, hipY - 38, 7, 26, '#355070');
  // Head, beard and straw hat.
  const headY = hipY - 52;
  circle(ctx, 0, headY, 13, '#f2c29b');
  poly(ctx, [[-9, headY + 4], [9, headY + 4], [5, headY + 15], [-5, headY + 15]], '#e0e1dd');
  ellipse(ctx, 0, headY - 8, 21, 5, '#e9c46a');
  rect(ctx, -9, headY - 16, 18, 9, '#e9c46a');
  const look = state === 'search' ? Math.sin(phase * 0.7) * 3 : 3;
  circle(ctx, look + 3, headY - 1, 2.2, COLOURS.ink);
  circle(ctx, look - 4, headY - 1, 2.2, COLOURS.ink);

  // Arms and the net, raised when he is about to grab.
  ctx.strokeStyle = '#f2c29b';
  ctx.lineWidth = 8;
  const reach = state === 'grab' ? 30 : 16 + Math.sin(phase) * 5;
  ctx.beginPath();
  ctx.moveTo(12, hipY - 30);
  ctx.lineTo(12 + reach, hipY - 34);
  ctx.stroke();
  ctx.strokeStyle = COLOURS.woodDark;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(12 + reach, hipY - 34);
  ctx.lineTo(30 + reach, hipY - 52);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(38 + reach, hipY - 58, 15, 11, -0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Mood punctuation the whole scene can read at a glance.
  if (state === 'chase') drawBang(ctx, x + 6, y - 128 - bob);
  if (state === 'search') drawQuestion(ctx, x + 6, y - 128);
}

function drawBang(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = COLOURS.danger;
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('!', x, y);
  ctx.restore();
}

function drawQuestion(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = '#4361ee';
  ctx.font = '900 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('?', x, y);
  ctx.restore();
}

/** A round hay bale — the turkey's hiding place when it ducks inside. */
export function drawHayBale(ctx, x, y, w = 92, h = 64) {
  ctx.save();
  ctx.translate(x, y);
  ellipse(ctx, 0, -h / 2, w / 2, h / 2, '#e9c46a');
  ellipse(ctx, 0, -h / 2, w / 2 - 9, h / 2 - 8, '#dda448');
  ctx.strokeStyle = '#b07d2b';
  ctx.lineWidth = 2.5;
  for (const r of [10, 19, 28]) {
    ctx.beginPath();
    ctx.ellipse(0, -h / 2, r * (w / 64), r * (h / 64) * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** A split-rail farm fence the turkey must jump. */
export function drawFence(ctx, x, y, h = 56) {
  ctx.save();
  ctx.translate(x, y);
  rect(ctx, -26, -h, 8, h, COLOURS.woodDark);
  rect(ctx, 18, -h, 8, h, COLOURS.woodDark);
  rect(ctx, -32, -h + 8, 64, 9, COLOURS.wood);
  rect(ctx, -32, -h + 28, 64, 9, COLOURS.wood);
  ctx.restore();
}

/** A black range oven with a fire inside — the kitchen's worst idea. */
export function drawOven(ctx, x, y, flamePhase = 0) {
  ctx.save();
  ctx.translate(x, y);
  rect(ctx, -36, -64, 72, 64, '#343a40');
  rect(ctx, -36, -70, 72, 8, '#212529');
  for (const bx of [-24, 0, 24]) circle(ctx, bx, -66, 4, '#adb5bd');
  rect(ctx, -26, -52, 52, 36, '#16191c');
  const flicker = 1 + Math.sin(flamePhase * 9) * 0.15;
  poly(ctx, [[-16, -18], [-6, -18], [-11, -18 - 20 * flicker]], '#fb8500');
  poly(ctx, [[-2, -18], [10, -18], [4, -18 - 26 * flicker]], '#ffb703');
  poly(ctx, [[8, -18], [18, -18], [13, -18 - 15 * flicker]], '#fb8500');
  rect(ctx, -26, -14, 52, 4, '#495057');
  ctx.restore();
}

/** A carving knife, drawn pointing down — falling or waiting on a rack. */
export function drawKnife(ctx, x, y, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  poly(ctx, [[-4, 0], [5, 0], [3, 30], [-1, 36], [-3, 30]], COLOURS.steel);
  rect(ctx, -4, -13, 9, 13, COLOURS.woodDark);
  ctx.restore();
}

/** A corn cob pickup: gold kernels on a green husk. */
export function drawCorn(ctx, x, y, bobPhase = 0) {
  ctx.save();
  ctx.translate(x, y + Math.sin(bobPhase) * 3);
  ctx.rotate(-0.5);
  ellipse(ctx, 0, 0, 8, 17, COLOURS.gold);
  ctx.fillStyle = '#e36414';
  for (let r = -12; r <= 12; r += 6) {
    ctx.fillRect(-7, r, 14, 1.6);
  }
  poly(ctx, [[-6, 8], [-14, 20], [-2, 14]], '#588157');
  poly(ctx, [[6, 8], [14, 20], [2, 14]], '#7fb069');
  ctx.restore();
}

/** A slice of pumpkin pie: +1 feather, the run's rare kindness. */
export function drawPie(ctx, x, y, bobPhase = 0) {
  ctx.save();
  ctx.translate(x, y + Math.sin(bobPhase) * 3);
  poly(ctx, [[-16, 6], [16, 6], [0, -12]], '#e76f51');
  poly(ctx, [[-16, 6], [16, 6], [12, 10], [-12, 10]], '#dda448');
  circle(ctx, 0, -2, 5, '#ffffff');
  ctx.restore();
}

/** A chilli pepper: a burst of speed and a stamina refill. */
export function drawChili(ctx, x, y, bobPhase = 0) {
  ctx.save();
  ctx.translate(x, y + Math.sin(bobPhase) * 3);
  ctx.rotate(0.5);
  ctx.beginPath();
  ctx.ellipse(0, 2, 6, 15, 0.4, 0, Math.PI * 2);
  ctx.fillStyle = COLOURS.danger;
  ctx.fill();
  ctx.strokeStyle = '#588157';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(2, -12);
  ctx.quadraticCurveTo(6, -18, 11, -17);
  ctx.stroke();
  ctx.restore();
}

/** A mud puddle: no damage, but it slows the turkey to a wade. */
export function drawMud(ctx, x, y, w = 110) {
  ellipse(ctx, x, y - 3, w / 2, 9, '#6f4518');
  ellipse(ctx, x - w / 6, y - 5, w / 5, 5, '#8a5a24');
}

/** A wooden crate — kitchen cover, and a thing to jump. */
export function drawCrate(ctx, x, y, size = 52) {
  ctx.save();
  ctx.translate(x, y);
  rect(ctx, -size / 2, -size, size, size, '#b08968');
  ctx.strokeStyle = COLOURS.woodDark;
  ctx.lineWidth = 4;
  ctx.strokeRect(-size / 2, -size, size, size);
  ctx.beginPath();
  ctx.moveTo(-size / 2, -size);
  ctx.lineTo(size / 2, 0);
  ctx.moveTo(size / 2, -size);
  ctx.lineTo(-size / 2, 0);
  ctx.stroke();
  ctx.restore();
}

/** The Freedom Gate at the end of the lane: two posts and a banner. */
export function drawFreedomGate(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  rect(ctx, -70, -170, 12, 170, COLOURS.woodDark);
  rect(ctx, 58, -170, 12, 170, COLOURS.woodDark);
  rect(ctx, -78, -178, 156, 30, '#588157');
  ctx.fillStyle = COLOURS.cream;
  ctx.font = '900 19px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FREEDOM WOODS', 0, -156);
  for (const px of [-46, 0, 46]) {
    poly(ctx, [[px - 9, -148], [px + 9, -148], [px, -128]], '#386641');
  }
  ctx.restore();
}
