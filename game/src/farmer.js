// The farmer: the chase. He runs behind the turkey with an alert meter
// for a brain.
//
// While he can see the turkey — it is not hidden in hay and it is inside
// his vision range — alert climbs and he sprints. While he cannot, alert
// drains; when a chase he was sure of falls apart, he stops at the last
// place he saw the turkey and searches, looking left and right (the "?"
// in sprites.js) while the turkey gets away. Fences, crates and ovens
// cost him a hop, which is how a clean jump buys real distance. He is
// never faster than the turkey's hurry for long: the rubber band only
// closes a hopeless gap, it does not win the race for him.

import { FARMER, GROUND_Y } from './config.js';
import { KIND } from './world.js';

export const FARMER_CHASE = 'chase';
export const FARMER_SEARCH = 'search';

export class Farmer {
  constructor() {
    this.reset(0);
  }

  reset(turkeyX) {
    this.x = turkeyX - 340;
    this.alert = 0.25;
    this.state = FARMER_CHASE;
    this.lastSeenX = turkeyX;
    this.searchT = 0;
    this.phase = 0;
    this.vaultT = 0;
    this.wasSure = false; // alert was high enough that losing it means a search
    this.events = { spotted: false, lost: false, grabbed: false, searched: false };
  }

  get y() { return GROUND_Y; }

  /** 0 while running flat, a hop arc while vaulting an obstacle. */
  get lift() {
    if (this.vaultT <= 0) return 0;
    const p = 1 - this.vaultT / FARMER.vaultCost;
    return Math.sin(p * Math.PI) * 46;
  }

  canSee(turkey) {
    if (turkey.hidden) return false;
    const gap = turkey.x - this.x;
    return gap > -70 && gap < FARMER.visionRange;
  }

  update(dt, turkey, world, stageIndex) {
    this.events = { spotted: false, lost: false, grabbed: false, searched: false };
    const seen = this.canSee(turkey);
    const sureBefore = this.alert > 0.55;

    if (seen) {
      this.lastSeenX = turkey.x;
      this.alert = Math.min(1, this.alert + FARMER.alertRaisePerS * dt);
      if (!sureBefore && this.alert > 0.55) this.events.spotted = true;
      if (this.state === FARMER_SEARCH) this.state = FARMER_CHASE;
    } else if (this.state === FARMER_SEARCH) {
      this.alert = Math.max(0, this.alert - FARMER.searchAlertDecayPerS * dt);
    } else {
      this.alert = Math.max(0, this.alert - FARMER.alertDecayPerS * dt);
    }
    if (sureBefore) this.wasSure = true;

    // Losing a sure chase: go to the last seen place and search it.
    if (this.state === FARMER_CHASE && this.wasSure && this.alert < 0.18 && !seen) {
      this.state = FARMER_SEARCH;
      this.searchT = 0;
      this.wasSure = false;
      this.events.lost = true;
    }

    let speed = FARMER.baseSpeed[stageIndex] + this.alert * FARMER.sprintBoost;
    const gap = turkey.x - this.x;
    if (gap > 420) speed += Math.min(FARMER.rubberBandCap, (gap - 420) * FARMER.rubberBand);

    if (this.state === FARMER_SEARCH) {
      const target = this.lastSeenX - 26;
      if (this.x < target) {
        this.x = Math.min(target, this.x + FARMER.baseSpeed[stageIndex] * 0.8 * dt);
      } else {
        this.searchT += dt;
        if (this.searchT === dt) this.events.searched = true;
        if (this.searchT > 1.7) {
          this.state = FARMER_CHASE;
          this.alert = Math.max(this.alert, 0.3);
        }
        speed = 0;
      }
    }

    if (speed > 0) {
      // Obstacles cost him a hop: a fence, crate or oven right ahead.
      if (this.vaultT <= 0) {
        const ahead = world.inRange(this.x + 20, this.x + 56)
          .find((e) => [KIND.FENCE, KIND.CRATE, KIND.OVEN].includes(e.kind));
        if (ahead) this.vaultT = FARMER.vaultCost;
      }
      if (this.vaultT > 0) {
        this.vaultT -= dt;
        speed *= 0.35;
      }
      this.x += speed * dt;
      this.phase += dt * (2 + speed * 0.05);
    }

    // The grab: close enough, in front of him, and the turkey has no grace.
    if (turkey.invincibleT <= 0 && gap > -6 && gap < FARMER.grabRange && Math.abs(turkey.y - GROUND_Y) < 46) {
      this.events.grabbed = true;
    }
    return this.events;
  }

  /** After a grab or a hit he falls back — a fair race, not a teleport. */
  fallBack(turkeyX) {
    this.x = Math.min(this.x, turkeyX - 300);
    this.alert = Math.min(this.alert, 0.35);
    this.state = FARMER_CHASE;
    this.wasSure = false;
  }
}
