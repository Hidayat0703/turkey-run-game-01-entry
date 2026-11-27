// The screens around the run: title, how-to-play, and the two endings.
// Each is drawn over the world (the title idles over the farmyard; the
// endings freeze the moment they happened), and each offers real buttons
// the mouse can click as well as the keys the loop listens for.

import { COLOURS, VIEW } from './config.js';

/** A chunky autumn button. Returns true on the frame it is clicked. */
export function drawButton(ctx, input, x, y, w, h, label, opts = {}) {
  const hover = input.mouse.x >= x && input.mouse.x <= x + w && input.mouse.y >= y && input.mouse.y <= y + h;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y + (hover ? 2 : 5), w, h, 14);
  ctx.fillStyle = 'rgba(40, 54, 24, 0.55)';
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fillStyle = hover ? (opts.hot ?? '#ffb703') : (opts.fill ?? '#e36414');
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = COLOURS.ink;
  ctx.stroke();
  ctx.fillStyle = COLOURS.ink;
  ctx.font = `900 ${opts.size ?? 24}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + (opts.size ?? 24) * 0.36);
  ctx.restore();
  return hover && input.mouse.clicked;
}

function dim(ctx, alpha = 0.45) {
  ctx.fillStyle = `rgba(23, 18, 8, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function bigTitle(ctx, text, y, size, fill) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  ctx.lineWidth = size / 6;
  ctx.strokeStyle = COLOURS.ink;
  ctx.strokeText(text, VIEW.width / 2, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, VIEW.width / 2, y);
  ctx.restore();
}

export function drawTitleScreen(ctx, game, input) {
  dim(ctx, 0.25);
  // A speech bubble from the turkey standing in the scene below.
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(492, 408, 268, 54, 16);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(516, 460);
  ctx.lineTo(498, 512);
  ctx.lineTo(548, 462);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLOURS.ink;
  ctx.font = '800 21px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Not THIS Thanksgiving!', 626, 443);
  ctx.restore();

  bigTitle(ctx, 'GOBBLE RUN', 168, 108, COLOURS.gold);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillStyle = COLOURS.cream;
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(40, 54, 24, 0.8)';
  const sub = 'T H E   G R E A T   T U R K E Y   E S C A P E';
  ctx.strokeText(sub, VIEW.width / 2, 216);
  ctx.fillText(sub, VIEW.width / 2, 216);
  ctx.font = '600 20px system-ui, sans-serif';
  const pitch = 'Outrun the farmer. Dodge the ovens and the carving knives. Reach the Freedom Woods.';
  ctx.strokeText(pitch, VIEW.width / 2, 254);
  ctx.fillText(pitch, VIEW.width / 2, 254);
  ctx.restore();

  const start = drawButton(ctx, input, VIEW.width / 2 - 170, 470, 340, 62, '▶  START THE RUN', { size: 27 });
  const how = drawButton(ctx, input, VIEW.width / 2 - 130, 548, 260, 50, 'HOW TO PLAY', { size: 21, fill: '#dda448' });
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(254, 250, 224, 0.9)';
  ctx.fillText('← → pace · SPACE jump · ↓ duck — and hide in the hay · ENTER starts · M mutes', VIEW.width / 2, 648);
  if (game.best > 0) ctx.fillText(`Best score so far: ${game.best}`, VIEW.width / 2, 678);
  ctx.restore();
  return { start, how };
}

export function drawHowToScreen(ctx, input) {
  dim(ctx, 0.62);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(240, 84, 800, 540, 22);
  ctx.fillStyle = '#fefae0';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = COLOURS.ink;
  ctx.stroke();
  ctx.fillStyle = COLOURS.ink;
  ctx.textAlign = 'center';
  ctx.font = '900 38px system-ui, sans-serif';
  ctx.fillText('HOW TO PLAY', VIEW.width / 2, 140);
  ctx.textAlign = 'left';
  ctx.font = '600 21px system-ui, sans-serif';
  const lines = [
    ['🏃  Run', 'You run on your own. → hurries (burns stamina), ← slows down.'],
    ['🦘  Jump', 'SPACE or ↑. Fences, crates, ovens and mud are all jumpable —'],
    ['', 'the farmer has to hop them too, and it costs him time.'],
    ['🌾  Hide', 'Hold ↓ inside a hay bale to vanish. His eye closes, his alert'],
    ['', 'drains, and he stops to search the last place he saw you.'],
    ['🌽  Eat', 'Corn is +50, pie wins back a feather, chilli is a second wind.'],
    ['🔪  Beware', 'Ovens burn, kitchen knives drop, and his net ends the run —'],
    ['', 'three feathers lost and you are caught. 900 m is freedom.'],
    ['👁  His eye', 'Top right. SPOTTED! means run or hide — now.'],
  ];
  lines.forEach(([head, body], i) => {
    const y = 196 + i * 44;
    ctx.font = '800 21px system-ui, sans-serif';
    ctx.fillText(head, 292, y);
    ctx.font = '600 21px system-ui, sans-serif';
    ctx.fillText(body, 440, y);
  });
  ctx.restore();
  const back = drawButton(ctx, input, VIEW.width / 2 - 110, 552, 220, 50, '←  BACK', { size: 20, fill: '#dda448' });
  return { back };
}

export function drawEndScreen(ctx, game, input, t) {
  const escaped = game.state === 'escaped';
  dim(ctx, escaped ? 0.30 : 0.5);
  bigTitle(ctx, escaped ? 'ESCAPED!' : 'CAUGHT!', 170, 96, escaped ? '#7fb069' : COLOURS.danger);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillStyle = COLOURS.cream;
  const flavour = escaped
    ? 'Free as a bird — the Freedom Woods keep their own.'
    : 'The net comes down. Thanksgiving is back on the menu…';
  ctx.fillText(flavour, VIEW.width / 2, 216);

  // No actors are drawn here: the frozen scene behind the panel already
  // holds the real turkey and the real farmer at the moment it ended.
  ctx.beginPath();
  ctx.roundRect(VIEW.width / 2 - 250, 300, 500, 168, 16);
  ctx.fillStyle = 'rgba(40, 54, 24, 0.78)';
  ctx.fill();
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  const rows = [
    ['Final score', String(game.score)],
    ['Distance', `${Math.min(900, Math.floor(game.turkey.x / 40))} m of 900 m`],
    ['Corn eaten', `${game.corn}`],
    ['Time on the run', `${game.timeS.toFixed(1)} s`],
    ['Best score', String(Math.max(game.best, game.score))],
  ];
  rows.forEach(([label, value], i) => {
    const y = 340 + i * 27;
    ctx.fillStyle = '#ffd29d';
    ctx.fillText(label, VIEW.width / 2 - 220, y);
    ctx.fillStyle = COLOURS.cream;
    ctx.textAlign = 'right';
    ctx.fillText(value, VIEW.width / 2 + 220, y);
    ctx.textAlign = 'left';
  });
  ctx.restore();

  const again = drawButton(ctx, input, VIEW.width / 2 - 240, 574, 230, 56, '↻  RUN AGAIN', { size: 23 });
  const title = drawButton(ctx, input, VIEW.width / 2 + 10, 574, 230, 56, 'TITLE', { size: 23, fill: '#dda448' });
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(254, 250, 224, 0.85)';
  ctx.fillText('ENTER runs again · ESC goes to the title', VIEW.width / 2, 668);
  ctx.restore();
  return { again, title };
}
