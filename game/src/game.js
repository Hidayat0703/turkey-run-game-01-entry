// Gobble Run's game: the state machine and the run itself.
//
// States: title → howto → play ⇄ paused → caught | escaped → title.
// The run is one stepPlay() call per fixed step: the turkey moves, the
// world drops its knives, the farmer thinks, and collisions turn all of
// that into score, notices and lost feathers. Rendering reads the same
// state and never changes it, which is what lets shots.js freeze real
// moments of play for the screenshots.

import {
  COLOURS, GOAL_M, GROUND_Y, PX_PER_M, SCORE, VIEW, stageAt,
} from './config.js';
import { Farmer } from './farmer.js';
import { drawBanner, drawHud, drawNotices } from './hud.js';
import { Turkey } from './player.js';
import { Sound } from './audio.js';
import { drawEndScreen, drawHowToScreen, drawTitleScreen } from './screens.js';
import { drawFarmer, drawTurkey } from './sprites.js';
import { KIND, World, drawBackground, drawEntity } from './world.js';

export const STATE_TITLE = 'title';
export const STATE_HOWTO = 'howto';
export const STATE_PLAY = 'play';
export const STATE_PAUSED = 'paused';
export const STATE_CAUGHT = 'caught';
export const STATE_ESCAPED = 'escaped';

const HAZARDS = [KIND.FENCE, KIND.OVEN, KIND.CRATE];

export class Game {
  constructor(seed = 7) {
    this.sound = new Sound();
    this.best = 0;
    try {
      this.best = Number(localStorage.getItem('gobble-run-best') ?? 0) || 0;
    } catch { /* a sandboxed frame may refuse storage; the best is a nicety */ }
    this.ui = {};
    this.resetRun(seed);
    this.state = STATE_TITLE;
  }

  resetRun(seed) {
    this.seed = seed;
    this.world = new World(seed);
    this.turkey = new Turkey();
    this.farmer = new Farmer();
    this.farmer.reset(this.turkey.x);
    this.score = 0;
    this.corn = 0;
    this.timeS = 0;
    this.lastMetre = 0;
    this.stageIndex = 0;
    this.banner = null;
    this.notices = [];
    this.shakeT = 0;
    this.overT = 0; // time since the run ended, for the end screens
  }

  startRun() {
    this.resetRun(this.seed + 1);
    this.state = STATE_PLAY;
    this.showBanner('RUN, TURKEY, RUN!', 'Reach the Freedom Woods — 900 m', COLOURS.gold);
    this.sound.ensure();
    this.sound.startMusic();
  }

  showBanner(text, sub, colour) {
    this.banner = { text, sub, colour, t: 2.4, total: 2.4 };
  }

  notice(text, x, y, colour = COLOURS.gold) {
    this.notices.push({ text, x, y, colour, t: 0, total: 1.15 });
  }

  get camX() {
    const goalPx = GOAL_M * PX_PER_M + 500;
    return Math.max(0, Math.min(goalPx - VIEW.width, this.turkey.x - 400));
  }

  get stage() {
    return stageAt(this.turkey.x / PX_PER_M);
  }

  update(dt, input) {
    // Clicks land on the buttons the last render drew; keys land at once.
    const ui = this.ui;
    this.ui = {};
    if (input.wasPressed('KeyM')) this.sound.toggleMute();

    switch (this.state) {
      case STATE_TITLE: {
        this.turkey.phase += dt * 2.2; // an idle shuffle on the title scene
        if (ui.start || input.wasPressed('Enter', 'Space')) this.startRun();
        else if (ui.how) this.state = STATE_HOWTO;
        break;
      }
      case STATE_HOWTO: {
        if (ui.back || input.wasPressed('Escape', 'Enter')) this.state = STATE_TITLE;
        break;
      }
      case STATE_PLAY: {
        if (input.wasPressed('Escape', 'KeyP')) {
          this.state = STATE_PAUSED;
          this.sound.stopMusic();
          break;
        }
        this.stepPlay(dt, input);
        break;
      }
      case STATE_PAUSED: {
        if (input.wasPressed('Escape', 'KeyP', 'Enter')) {
          this.state = STATE_PLAY;
          this.sound.startMusic();
        }
        break;
      }
      case STATE_CAUGHT:
      case STATE_ESCAPED: {
        this.overT += dt;
        if (ui.again || input.wasPressed('Enter')) this.startRun();
        else if (ui.title || input.wasPressed('Escape')) this.state = STATE_TITLE;
        break;
      }
      default: break;
    }

    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
    for (const n of this.notices) n.t += dt;
    this.notices = this.notices.filter((n) => n.t < n.total);
    this.shakeT = Math.max(0, this.shakeT - dt);
  }

  /** One fixed step of a live run: move, think, collide, score. */
  stepPlay(dt, input) {
    const { turkey, farmer, world } = this;
    this.timeS += dt;
    const wasHidden = turkey.hidden;
    const alertWasHigh = farmer.alert > 0.55;

    turkey.update(dt, input, world);
    if (turkey.justJumped) this.sound.gobble();
    world.update(dt, turkey.x);
    const stageIndex = STAGES_INDEX[this.stage.id];
    const events = farmer.update(dt, turkey, world, stageIndex);

    if (events.spotted) {
      this.sound.sting();
      this.notice('SPOTTED!', turkey.x + 30, turkey.y - 130, '#ff8fa3');
    }
    if (events.searched) this.sound.hmm();
    if (events.lost && alertWasHigh) {
      this.score += SCORE.sneakyEscape;
      this.notice(`SNEAKY! +${SCORE.sneakyEscape}`, turkey.x + 20, turkey.y - 120, '#7fb069');
    }
    if (events.grabbed) this.takeHit('net');
    if (!wasHidden && turkey.hidden) this.notice('HIDDEN', turkey.x, turkey.y - 110, '#ffd29d');

    this.collide();
    if (this.state !== STATE_PLAY) return; // a hit may have ended the run

    // Distance pays as it passes; stages pay as they are entered.
    const metres = Math.floor(turkey.x / PX_PER_M);
    if (metres > this.lastMetre) {
      this.score += (metres - this.lastMetre) * SCORE.perMetre;
      this.lastMetre = metres;
    }
    if (stageIndex !== this.stageIndex) {
      this.stageIndex = stageIndex;
      this.score += SCORE.stageClear;
      this.showBanner(this.stage.name.toUpperCase(), `Stage ${stageIndex + 1} of 3 — the farmer knows the shortcuts`, '#ffd29d');
    }

    // The gate at the end of the lane is the whole point.
    const gate = world.entities.find((e) => e.kind === KIND.GATE);
    if (gate && turkey.x >= gate.x) this.finishRun(true);
  }

  collide() {
    const { turkey, world } = this;
    const box = turkey.box;
    for (const e of world.inRange(turkey.x - 90, turkey.x + 90)) {
      if (e.taken || e.state === 'gone') continue;
      const left = e.x - e.w / 2;
      const right = e.x + e.w / 2;
      const overlapX = box.right > left + 6 && box.left < right - 6;

      if (HAZARDS.includes(e.kind)) {
        const top = GROUND_Y - e.h;
        const cleared = box.bottom <= top + 12;
        if (overlapX && !cleared && box.bottom > top + 12) {
          this.takeHit(e.kind);
          e.passed = true;
          return;
        }
        if (!e.passed && turkey.x - 30 > right) {
          e.passed = true;
          if (!cleared && box.bottom > top - 34) {
            this.score += SCORE.nearMiss;
            this.sound.nearMiss();
            this.notice(`CLOSE! +${SCORE.nearMiss}`, turkey.x + 16, turkey.y - 120, '#ffd29d');
          }
        }
      } else if (e.kind === KIND.KNIFE && e.state === 'falling') {
        const tip = e.dropY ?? 0;
        if (Math.abs(e.x - turkey.x) < 30 && tip > box.top && tip < box.bottom + 30) {
          this.takeHit('knife');
          e.state = 'gone';
          return;
        }
        if (!e.passed && tip >= GROUND_Y - 8) {
          e.passed = true;
          if (Math.abs(e.x - turkey.x) < 120) {
            this.score += SCORE.nearMiss;
            this.sound.nearMiss();
            this.notice(`CLOSE! +${SCORE.nearMiss}`, turkey.x + 16, turkey.y - 120, '#ffd29d');
          }
        }
      } else if (e.kind === KIND.CORN || e.kind === KIND.PIE || e.kind === KIND.CHILI) {
        if (overlapX && Math.abs(e.y - (turkey.y - 30)) < 62) {
          e.taken = true;
          if (e.kind === KIND.CORN) {
            this.corn += 1;
            this.score += SCORE.corn;
            this.sound.pop();
            this.notice(`+${SCORE.corn}`, e.x, e.y - 26, COLOURS.gold);
          } else if (e.kind === KIND.PIE) {
            turkey.feathers = Math.min(3, turkey.feathers + 1);
            this.score += SCORE.pie;
            this.sound.pop();
            this.notice(`PIE! +${SCORE.pie}`, e.x, e.y - 26, '#7fb069');
          } else {
            turkey.refillStamina(45);
            this.score += 25;
            this.sound.zip();
            this.notice('SPICY! +25', e.x, e.y - 26, '#ff8fa3');
          }
        }
      }
    }
  }

  takeHit(what) {
    const { turkey, farmer } = this;
    if (!turkey.takeHit()) return;
    this.sound.squawk();
    this.shakeT = 0.35;
    farmer.fallBack(turkey.x);
    const words = { net: 'THE NET!', oven: 'SCORCHED!', knife: 'SLICED!', fence: 'CRASHED!', crate: 'CRASHED!' };
    this.notice(words[what] ?? 'OUCH!', turkey.x + 10, turkey.y - 140, '#ff8fa3');
    if (turkey.feathers <= 0) this.finishRun(false);
  }

  finishRun(escaped) {
    this.state = escaped ? STATE_ESCAPED : STATE_CAUGHT;
    this.overT = 0;
    this.sound.stopMusic();
    this.sound.jingle(escaped);
    if (this.score > this.best) {
      this.best = this.score;
      try {
        localStorage.setItem('gobble-run-best', String(this.best));
      } catch { /* storage is a nicety, see the constructor */ }
    }
  }

  render(ctx, input, t) {
    const { turkey, farmer, world } = this;
    const camX = this.state === STATE_TITLE || this.state === STATE_HOWTO ? 0 : this.camX;
    ctx.save();
    if (this.shakeT > 0) {
      const s = this.shakeT * 14;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    drawBackground(ctx, this.stage.id, camX, VIEW.width, VIEW.height);
    for (const e of world.inRange(camX - 60, camX + VIEW.width + 60)) {
      if (e.kind !== KIND.HAY) drawEntity(ctx, e, camX, t);
    }
    // The farmer, then the turkey, then the hay over both — hiding in a
    // bale only reads if the bale is drawn in front of the hidden bird.
    drawFarmer(ctx, farmer.x - camX, farmer.y - farmer.lift, {
      phase: farmer.phase,
      state: farmer.state === 'search' ? 'search' : (farmer.x > turkey.x - 130 && this.state === STATE_PLAY ? 'grab' : 'chase'),
    });
    drawTurkey(ctx, turkey.x - camX, turkey.y, {
      phase: turkey.phase,
      ducking: turkey.ducking,
      hidden: turkey.hidden,
      flash: turkey.invincibleT > 0 && this.state === STATE_PLAY,
    });
    for (const e of world.inRange(camX - 60, camX + VIEW.width + 60)) {
      if (e.kind === KIND.HAY) drawEntity(ctx, e, camX, t);
    }
    ctx.restore();

    if (this.state === STATE_PLAY || this.state === STATE_PAUSED) {
      drawHud(ctx, this);
      drawNotices(ctx, this.notices, camX);
      drawBanner(ctx, this.banner);
      if (this.state === STATE_PAUSED) {
        ctx.fillStyle = 'rgba(23, 18, 8, 0.5)';
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
        ctx.fillStyle = COLOURS.cream;
        ctx.font = '900 52px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', VIEW.width / 2, 340);
        ctx.font = '600 20px system-ui, sans-serif';
        ctx.fillText('ESC or P to run again', VIEW.width / 2, 380);
      }
    } else if (this.state === STATE_TITLE) {
      this.ui = drawTitleScreen(ctx, this, input);
    } else if (this.state === STATE_HOWTO) {
      this.ui = drawHowToScreen(ctx, input);
    } else {
      // The endings get the scene to themselves; the stats panel on the
      // end screen carries the numbers the HUD would repeat.
      this.ui = drawEndScreen(ctx, this, input, t);
    }
  }
}

const STAGES_INDEX = { farm: 0, lane: 1, kitchen: 2 };
