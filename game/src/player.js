// The turkey: the player's runner. It cruises on its own; the player
// hurries it, slows it, jumps it, ducks it and hides it.
//
// Hiding is the stealth verb: duck while standing in a hay bale and the
// turkey all but vanishes (the farmer's alert drains — see farmer.js).
// Hurrying is the greedy verb: faster, but it burns the stamina that a
// late-run sprint to the Freedom Gate will want.

import { GROUND_Y, STAMINA, TURKEY } from './config.js';
import { KIND } from './world.js';

export class Turkey {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 130;
    this.y = GROUND_Y;
    this.vy = 0;
    this.grounded = true;
    this.ducking = false;
    this.hidden = false;
    this.inMud = false;
    this.feathers = TURKEY.maxFeathers;
    this.stamina = STAMINA.max;
    this.invincibleT = 0;
    this.phase = 0;
    this.speed = TURKEY.cruiseSpeed;
    this.justJumped = false;
    this.justLanded = false;
  }

  get width() { return TURKEY.width; }
  get height() { return this.ducking ? TURKEY.duckHeight : TURKEY.height; }
  /** Feet-to-head box the hazards test against. */
  get box() {
    return { left: this.x - 26, right: this.x + 26, top: this.y - this.height, bottom: this.y };
  }

  update(dt, input, world) {
    this.justJumped = false;
    this.justLanded = false;
    this.invincibleT = Math.max(0, this.invincibleT - dt);

    const wantDuck = input.isHeld('ArrowDown', 'KeyS');
    const wantHurry = input.isHeld('ArrowRight', 'KeyD') && this.stamina > 1;
    const wantSneak = input.isHeld('ArrowLeft', 'KeyA');

    this.ducking = wantDuck && this.grounded;
    this.hidden = this.ducking && Boolean(world.coverAt(this.x, KIND.HAY));

    // Speed: mud halves everything; hiding roots the turkey to the spot.
    let speed = TURKEY.cruiseSpeed;
    if (wantHurry) speed = TURKEY.hurrySpeed;
    if (wantSneak) speed = TURKEY.sneakSpeed;
    if (this.hidden) speed = 0;
    this.inMud = Boolean(world.coverAt(this.x, KIND.MUD));
    if (this.inMud) speed *= 0.55;
    this.speed = speed;
    this.x += speed * dt;

    // Stamina: hurry drains, everything else refills, hiding refills fast.
    if (wantHurry && !this.hidden && speed > 0) this.stamina -= STAMINA.drainPerS * dt;
    else if (this.hidden) this.stamina += STAMINA.hideRegenPerS * dt;
    else this.stamina += STAMINA.regenPerS * dt;
    this.stamina = Math.max(0, Math.min(STAMINA.max, this.stamina));

    // Jump and gravity; ducking in the air is a fast fall.
    if (this.grounded && input.wasPressed('Space', 'ArrowUp', 'KeyW') && !this.hidden) {
      this.vy = -TURKEY.jumpSpeed;
      this.grounded = false;
      this.justJumped = true;
    }
    if (!this.grounded) {
      const gravity = TURKEY.gravity + (wantDuck ? TURKEY.fastFall : 0);
      this.vy += gravity * dt;
      this.y += this.vy * dt;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.vy = 0;
        this.grounded = true;
        this.justLanded = true;
      }
    }

    this.phase += dt * (2 + this.speed * 0.045);
  }

  /** A hazard or the farmer got through: lose a feather, gain grace. */
  takeHit() {
    if (this.invincibleT > 0) return false;
    this.feathers -= 1;
    this.invincibleT = TURKEY.invincibleS;
    return true;
  }

  refillStamina(amount) {
    this.stamina = Math.min(STAMINA.max, this.stamina + amount);
  }
}
