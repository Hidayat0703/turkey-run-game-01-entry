// Gobble Run — every tuning number in one place.
//
// The world is measured in pixels; the HUD reports metres (PX_PER_M pixels
// to a metre). The run is GOAL_M metres long, split into three stages that
// change the scenery, the hazards and the farmer's temper.

export const VIEW = { width: 1280, height: 720 };
export const PX_PER_M = 40;
export const GOAL_M = 900;

export const STAGES = [
  { id: 'farm', name: 'Sunny Acres Farmyard', fromM: 0, toM: 300 },
  { id: 'lane', name: 'Harvest Lane', fromM: 300, toM: 600 },
  { id: 'kitchen', name: 'The Farmhouse Kitchen', fromM: 600, toM: 900 },
];

export function stageAt(metres) {
  for (const stage of STAGES) if (metres < stage.toM) return stage;
  return STAGES[STAGES.length - 1];
}

export const GROUND_Y = 604; // top of the ground the turkey runs on

export const TURKEY = {
  width: 74,
  height: 62,
  duckHeight: 40,
  cruiseSpeed: 265, // px/s, no key held
  hurrySpeed: 385, // px/s holding right — drains stamina
  sneakSpeed: 150, // px/s holding left
  gravity: 2100,
  jumpSpeed: 860,
  fastFall: 2600, // extra gravity while ducking in the air
  maxFeathers: 3,
  invincibleS: 1.6, // grace after a hit
};

export const STAMINA = {
  max: 100,
  drainPerS: 20, // while hurrying — about five seconds of sprint a tank
  regenPerS: 20, // while cruising
  hideRegenPerS: 30, // while hidden in hay
  chiliBoost: 45, // a chilli pepper refills this much
};

export const FARMER = {
  width: 62,
  height: 108,
  baseSpeed: [232, 246, 260], // per stage index — he knows the shortcuts
  sprintBoost: 84, // added at full alert: he closes, but a vault undoes it
  rubberBand: 0.55, // px/s gained per px he trails beyond 520, capped
  rubberBandCap: 90,
  visionRange: 430, // px ahead of him he can see the turkey
  alertRaisePerS: 0.7,
  alertDecayPerS: 0.38,
  searchAlertDecayPerS: 0.55,
  grabRange: 40,
  vaultCost: 0.42, // seconds lost hopping a fence or crate
};

export const SCORE = {
  perMetre: 2,
  corn: 50,
  pie: 150,
  nearMiss: 25,
  sneakyEscape: 40,
  stageClear: 200,
};

export const COLOURS = {
  skyTop: '#f7b733',
  skyBottom: '#fc4a1a',
  sun: '#fff3b0',
  grass: '#7fb069',
  grassDark: '#588157',
  dirt: '#9c6644',
  barnRed: '#a63d40',
  wood: '#7f5539',
  woodDark: '#5f4128',
  cream: '#fefae0',
  ink: '#283618',
  danger: '#d62828',
  gold: '#ffb703',
  kitchenWall: '#8d6e63',
  kitchenFloor: '#6d4c41',
  steel: '#ced4da',
};
