// Keyboard and mouse state for the game.
//
// `held` answers "is it down right now"; `pressed` answers "did it go down
// since the last frame" and is cleared by the game loop each step. Mouse
// clicks are reported in logical canvas coordinates (the canvas is scaled
// to fit the window, so client coordinates are converted).

import { VIEW } from './config.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, clicked: false };

    addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.held.add(event.code);
      this.pressed.add(event.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    });
    addEventListener('keyup', (event) => this.held.delete(event.code));
    addEventListener('blur', () => this.held.clear());

    canvas.addEventListener('mousemove', (event) => {
      const point = this.toLogical(event);
      this.mouse.x = point.x;
      this.mouse.y = point.y;
    });
    canvas.addEventListener('mousedown', (event) => {
      const point = this.toLogical(event);
      this.mouse.x = point.x;
      this.mouse.y = point.y;
      this.mouse.clicked = true;
    });
  }

  toLogical(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW.width,
      y: ((event.clientY - rect.top) / rect.height) * VIEW.height,
    };
  }

  isHeld(...codes) {
    return codes.some((code) => this.held.has(code));
  }

  wasPressed(...codes) {
    return codes.some((code) => this.pressed.has(code));
  }

  /** Called once per rendered frame, after the step has read the edges. */
  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
