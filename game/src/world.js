// The world: three stages of Thanksgiving countryside generated from a
// seed, plus the scenery painter that draws them.
//
// Generation walks the run metre by metre and deals each stage its own
// mix — fences, mud and hay in the farmyard; fences, crates and hay down
// the lane; ovens, crates and hanging carving knives in the kitchen.
// Corn is laid in little arcs over the jumps so a clean line reads as a
// reward path. Everything is placed from the run's seed, so the same seed
// always builds the same farm.

import { COLOURS, GOAL_M, GROUND_Y, PX_PER_M, STAGES, stageAt } from './config.js';
import { makeRng } from './random.js';
import {
  drawCorn, drawCrate, drawFence, drawFreedomGate, drawHayBale, drawKnife,
  drawMud, drawOven, drawPie, drawChili,
} from './sprites.js';

export const KIND = {
  FENCE: 'fence', OVEN: 'oven', CRATE: 'crate', MUD: 'mud', HAY: 'hay',
  CORN: 'corn', PIE: 'pie', CHILI: 'chili', KNIFE: 'knife', GATE: 'gate',
};

/** Hitbox sizes per kind, in pixels, feet on the ground line. */
export const SIZES = {
  fence: { w: 56, h: 56 },
  oven: { w: 66, h: 70 },
  crate: { w: 48, h: 52 },
  mud: { w: 110, h: 10 },
  hay: { w: 92, h: 64 },
  corn: { w: 26, h: 26 },
  pie: { w: 34, h: 22 },
  chili: { w: 24, h: 24 },
  knife: { w: 12, h: 38 },
  gate: { w: 140, h: 178 },
};

const KNIFE_HANG_Y = 210; // kitchen knives wait on their rack this high

export class World {
  constructor(seed = 1) {
    this.reset(seed);
  }

  reset(seed) {
    this.seed = seed;
    this.entities = [];
    this.generate();
  }

  generate() {
    const rng = makeRng(this.seed * 7919 + 13);
    const goalPx = GOAL_M * PX_PER_M;
    let kitchenCount = 0;
    for (const stage of STAGES) {
      const fromPx = stage.fromM * PX_PER_M + 500;
      const toPx = stage.toM * PX_PER_M - 300;
      let x = fromPx + rng.range(200, 420);
      while (x < toPx) {
        const roll = rng.next();
        if (stage.id === 'kitchen') {
          // Every third kitchen hazard is a knife, guaranteed: the falling
          // knives are the stage's signature and a seed must not starve it.
          kitchenCount += 1;
          if (kitchenCount % 3 === 0) this.add(KIND.KNIFE, x);
          else if (roll < 0.42) this.add(KIND.OVEN, x);
          else if (roll < 0.68) this.add(KIND.CRATE, x);
          else if (roll < 0.84) this.add(KIND.KNIFE, x);
          else this.add(KIND.HAY, x); // a sack of stuffing mix counts as cover
          x += rng.range(350, 570);
        } else {
          if (roll < 0.36) this.add(KIND.FENCE, x);
          else if (roll < 0.60) this.add(KIND.HAY, x);
          else if (roll < 0.72) this.add(KIND.MUD, x);
          else if (roll < 0.86 && stage.id === 'lane') this.add(KIND.CRATE, x);
          else this.add(KIND.FENCE, x);
          x += rng.range(390, 640);
        }
        // Corn arcs between hazards: three to five cobs on a jump line.
        if (rng.chance(0.55)) {
          const n = rng.int(3, 5);
          const startX = x + rng.range(30, 120);
          for (let i = 0; i < n; i += 1) {
            const arcY = Math.sin((i / (n - 1)) * Math.PI) * 74;
            this.add(KIND.CORN, startX + i * 44, GROUND_Y - 46 - arcY);
          }
          x = startX + n * 44 + rng.range(40, 140);
        }
        if (rng.chance(0.16)) this.add(KIND.CHILI, x + rng.range(0, 160), GROUND_Y - 44);
        if (rng.chance(0.10)) this.add(KIND.PIE, x + rng.range(0, 160), GROUND_Y - 40);
      }
    }
    this.add(KIND.GATE, goalPx + 60);
    this.entities.sort((a, b) => a.x - b.x);
  }

  add(kind, x, y = GROUND_Y) {
    const size = SIZES[kind];
    const entity = {
      kind, x, y, w: size.w, h: size.h,
      taken: false, // pickups
      state: kind === KIND.KNIFE ? 'hanging' : 'idle',
      vy: 0,
      passed: false, // near-miss bookkeeping
    };
    this.entities.push(entity);
    return entity;
  }

  /** Entities whose x falls in [x0, x1], in run order. */
  inRange(x0, x1) {
    return this.entities.filter((e) => e.x + e.w >= x0 && e.x - e.w <= x1);
  }

  /** The stage entity under a point, for hiding and wading checks. */
  coverAt(x, kind) {
    return this.entities.find((e) => e.kind === kind && Math.abs(e.x - x) < e.w / 2 + 18);
  }

  /** Kitchen knives let go of the rack as the turkey passes beneath. */
  update(dt, turkeyX) {
    for (const e of this.entities) {
      if (e.kind !== KIND.KNIFE) continue;
      if (e.state === 'hanging' && turkeyX > e.x - 90 && turkeyX < e.x + 30) {
        e.state = 'falling';
        e.vy = 60;
      } else if (e.state === 'falling') {
        e.vy += 2400 * dt;
        e.dropY = (e.dropY ?? KNIFE_HANG_Y) + e.vy * dt;
        if (e.dropY >= GROUND_Y - 6) {
          e.dropY = GROUND_Y - 6;
          e.state = 'stuck';
          e.stuckFor = 0;
        }
      } else if (e.state === 'stuck') {
        e.stuckFor += dt;
        if (e.stuckFor > 1.4) e.state = 'gone';
      }
    }
  }
}

export { KNIFE_HANG_Y };

/** Draw one entity at its world position (camera-relative). */
export function drawEntity(ctx, e, camX, t) {
  const x = e.x - camX;
  if (x < -180 || x > 1460) return;
  switch (e.kind) {
    case KIND.FENCE: drawFence(ctx, x, GROUND_Y); break;
    case KIND.OVEN: drawOven(ctx, x, GROUND_Y, t + e.x); break;
    case KIND.CRATE: drawCrate(ctx, x, GROUND_Y); break;
    case KIND.MUD: drawMud(ctx, x, GROUND_Y + 4); break;
    case KIND.HAY: drawHayBale(ctx, x, GROUND_Y); break;
    case KIND.CORN: if (!e.taken) drawCorn(ctx, x, e.y, t * 3 + e.x); break;
    case KIND.PIE: if (!e.taken) drawPie(ctx, x, e.y, t * 3 + e.x); break;
    case KIND.CHILI: if (!e.taken) drawChili(ctx, x, e.y, t * 3 + e.x); break;
    case KIND.KNIFE: {
      if (e.state === 'gone') break;
      const tipY = e.state === 'hanging' ? KNIFE_HANG_Y : (e.dropY ?? KNIFE_HANG_Y);
      // The rack stays on the wall; the knife's blade tip sits at tipY.
      ctx.fillStyle = COLOURS.woodDark;
      ctx.fillRect(x - 30, KNIFE_HANG_Y - 58, 60, 8);
      drawKnife(ctx, x, tipY - 49, e.state === 'falling' ? 0.06 : 0);
      break;
    }
    case KIND.GATE: drawFreedomGate(ctx, x, GROUND_Y); break;
    default: break;
  }
}

/** Stable per-segment scenery choices, so decoration never flickers. */
function decoRng(segment) {
  return makeRng(segment * 2654435761 % 2147483647 + 7);
}

export function drawBackground(ctx, stageId, camX, width, height) {
  if (stageId === 'kitchen') drawKitchen(ctx, camX, width, height);
  else drawOutdoors(ctx, camX, width, height, stageId === 'lane');
}

function drawOutdoors(ctx, camX, width, height, isLane) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#ff9e4f');
  sky.addColorStop(0.55, COLOURS.skyTop);
  sky.addColorStop(1, '#ffd29d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, GROUND_Y);

  // Low sun and a few slow clouds, far layer.
  ctx.fillStyle = COLOURS.sun;
  ctx.beginPath();
  ctx.arc(width - 240 - camX * 0.02 % 60, 128, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 243, 176, 0.5)';
  for (const [cx, cy, s] of [[180, 90, 1], [560, 60, 0.7], [980, 110, 1.2]]) {
    const ox = ((cx - camX * 0.05) % (width + 300)) - 150;
    ctx.beginPath();
    ctx.ellipse(ox < -140 ? ox + width + 300 : ox, cy, 52 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tree line and the barn, mid layer at half parallax.
  const mid = camX * 0.45;
  ctx.fillStyle = '#386641';
  const segW = 260;
  for (let sx = -segW; sx < width + segW; sx += segW) {
    const seg = Math.floor((mid + sx) / segW);
    const rng = decoRng(seg);
    const baseX = sx - ((mid % segW) + segW) % segW;
    for (let i = 0; i < 3; i += 1) {
      const tx = baseX + rng.range(10, 220);
      const th = rng.range(90, 170);
      ctx.fillStyle = rng.pick(['#386641', '#40916c', '#bc6c25']);
      ctx.beginPath();
      ctx.moveTo(tx - 34, GROUND_Y - 4);
      ctx.lineTo(tx, GROUND_Y - 4 - th);
      ctx.lineTo(tx + 34, GROUND_Y - 4);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (!isLane) {
    // The big red barn drifts by once in a while.
    const barnX = 700 - (camX * 0.45 % 4200);
    if (barnX > -320 && barnX < width + 100) {
      ctx.fillStyle = COLOURS.barnRed;
      ctx.fillRect(barnX, GROUND_Y - 130, 210, 130);
      ctx.beginPath();
      ctx.moveTo(barnX - 14, GROUND_Y - 130);
      ctx.lineTo(barnX + 105, GROUND_Y - 198);
      ctx.lineTo(barnX + 224, GROUND_Y - 130);
      ctx.closePath();
      ctx.fillStyle = '#7f1d1d';
      ctx.fill();
      ctx.fillStyle = COLOURS.cream;
      ctx.fillRect(barnX + 78, GROUND_Y - 72, 54, 72);
      ctx.strokeStyle = COLOURS.cream;
      ctx.lineWidth = 5;
      ctx.strokeRect(barnX + 78, GROUND_Y - 72, 54, 72);
      ctx.beginPath();
      ctx.moveTo(barnX + 78, GROUND_Y - 72);
      ctx.lineTo(barnX + 132, GROUND_Y);
      ctx.moveTo(barnX + 132, GROUND_Y - 72);
      ctx.lineTo(barnX + 78, GROUND_Y);
      ctx.stroke();
    }
  }

  // Ground: grass over dirt, with a worn running path.
  ctx.fillStyle = COLOURS.grass;
  ctx.fillRect(0, GROUND_Y, width, height - GROUND_Y);
  ctx.fillStyle = COLOURS.grassDark;
  ctx.fillRect(0, GROUND_Y, width, 8);
  ctx.fillStyle = '#dda448';
  ctx.fillRect(0, GROUND_Y + 26, width, height - GROUND_Y - 26);
  // Grass tufts and pumpkins pinned to world segments.
  const segW2 = 90;
  for (let sx = -segW2; sx < width + segW2; sx += segW2) {
    const seg = Math.floor((camX + sx) / segW2);
    const rng = decoRng(seg + 999);
    const baseX = sx - ((camX % segW2) + segW2) % segW2;
    if (rng.chance(0.5)) {
      const tx = baseX + rng.range(6, 70);
      ctx.strokeStyle = COLOURS.grassDark;
      ctx.lineWidth = 2.5;
      for (const off of [-5, 0, 5]) {
        ctx.beginPath();
        ctx.moveTo(tx + off, GROUND_Y + 22);
        ctx.quadraticCurveTo(tx + off * 1.6, GROUND_Y + 8, tx + off * 2.1, GROUND_Y + 2);
        ctx.stroke();
      }
    }
    if (rng.chance(0.16)) {
      const px = baseX + rng.range(14, 66);
      ctx.fillStyle = '#e36414';
      ctx.beginPath();
      ctx.ellipse(px, GROUND_Y + 52, 13, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#386641';
      ctx.fillRect(px - 2, GROUND_Y + 40, 4, 5);
    }
  }
}

function drawKitchen(ctx, camX, width, height) {
  // Wall, wainscot and a window onto the sunset the turkey is running for.
  ctx.fillStyle = '#a98467';
  ctx.fillRect(0, 0, width, GROUND_Y);
  ctx.fillStyle = '#7f5539';
  ctx.fillRect(0, GROUND_Y - 120, width, 120);
  const winX = 760 - (camX * 0.1 % 1600);
  if (winX > -240 && winX < width + 60) {
    ctx.fillStyle = '#ffd29d';
    ctx.fillRect(winX, 90, 190, 150);
    ctx.fillStyle = '#ff9e4f';
    ctx.beginPath();
    ctx.arc(winX + 130, 190, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#386641';
    ctx.fillRect(winX, 210, 190, 30);
    ctx.strokeStyle = COLOURS.woodDark;
    ctx.lineWidth = 8;
    ctx.strokeRect(winX, 90, 190, 150);
    ctx.beginPath();
    ctx.moveTo(winX + 95, 90);
    ctx.lineTo(winX + 95, 240);
    ctx.stroke();
  }
  // A shelf of jars and hanging pans, pinned to wall segments.
  const segW = 300;
  for (let sx = -segW; sx < width + segW; sx += segW) {
    const seg = Math.floor((camX * 0.6 + sx) / segW);
    const rng = decoRng(seg + 4242);
    const baseX = sx - (((camX * 0.6) % segW) + segW) % segW;
    ctx.fillStyle = COLOURS.woodDark;
    ctx.fillRect(baseX + 20, 150, 240, 8);
    for (let i = 0; i < 4; i += 1) {
      const jx = baseX + 36 + i * 56;
      ctx.fillStyle = rng.pick(['#bc6c25', '#6a994e', '#a63d40', '#dda448']);
      ctx.fillRect(jx, 116, 30, 34);
      ctx.fillStyle = '#495057';
      ctx.fillRect(jx + 3, 108, 24, 8);
    }
    if (rng.chance(0.7)) {
      const px = baseX + rng.range(60, 200);
      ctx.strokeStyle = '#343a40';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(px, 240);
      ctx.lineTo(px, 268);
      ctx.stroke();
      ctx.fillStyle = '#495057';
      ctx.beginPath();
      ctx.arc(px, 292, 23, 0, Math.PI * 2);
      ctx.fill();
    }
    // Wall dressing so the long wall is not bare: a clock in some
    // segments, a framed pumpkin portrait in others.
    if (rng.chance(0.45)) {
      const cx = baseX + rng.range(70, 210);
      ctx.fillStyle = COLOURS.cream;
      ctx.beginPath();
      ctx.arc(cx, 330, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLOURS.woodDark;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx, 330);
      ctx.lineTo(cx + 6, 312);
      ctx.moveTo(cx, 330);
      ctx.lineTo(cx + 15, 336);
      ctx.stroke();
    } else if (rng.chance(0.6)) {
      const fx = baseX + rng.range(50, 190);
      ctx.fillStyle = COLOURS.woodDark;
      ctx.fillRect(fx, 292, 76, 92);
      ctx.fillStyle = '#dda448';
      ctx.fillRect(fx + 6, 298, 64, 80);
      ctx.fillStyle = '#e36414';
      ctx.beginPath();
      ctx.ellipse(fx + 38, 344, 20, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#386641';
      ctx.fillRect(fx + 35, 324, 6, 8);
    }
  }
  // Floorboards and a checkered runner.
  ctx.fillStyle = COLOURS.kitchenFloor;
  ctx.fillRect(0, GROUND_Y, width, height - GROUND_Y);
  ctx.fillStyle = '#5d4037';
  for (let i = 0; i < 6; i += 1) ctx.fillRect(0, GROUND_Y + 12 + i * 18, width, 2);
  for (let sx = 0; sx < width + 40; sx += 40) {
    const seg = Math.floor((camX + sx) / 40);
    const baseX = sx - ((camX % 40) + 40) % 40;
    ctx.fillStyle = seg % 2 === 0 ? 'rgba(254, 250, 224, 0.20)' : 'rgba(40, 54, 24, 0.20)';
    ctx.fillRect(baseX, GROUND_Y + 30, 40, 20);
  }
}
