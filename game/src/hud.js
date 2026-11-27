// The heads-up display: everything the player reads while running —
// score and corn, the distance bar with its stage ticks and the farmer's
// marker creeping along it, feathers for lives, a stamina bar, and the
// farmer's alert eye. Banners announce stages and near misses; floating
// notices are the little score popups (+50, CLOSE!, SNEAKY!).

import { COLOURS, GOAL_M, PX_PER_M, STAGES, STAMINA, VIEW } from './config.js';

function panel(ctx, x, y, w, h, fill = 'rgba(40, 54, 24, 0.72)') {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fillStyle = fill;
  ctx.fill();
}

function feather(ctx, x, y, lost) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = lost ? 'rgba(255,255,255,0.25)' : '#e76f51';
  ctx.fill();
  ctx.strokeStyle = lost ? 'rgba(255,255,255,0.3)' : COLOURS.cream;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.lineTo(0, 13);
  ctx.stroke();
  ctx.restore();
}

export function drawHud(ctx, game) {
  const { turkey, farmer } = game;
  const metres = Math.min(GOAL_M, Math.floor(turkey.x / PX_PER_M));

  // Score block, top left.
  panel(ctx, 18, 16, 252, 86);
  ctx.fillStyle = COLOURS.cream;
  ctx.textAlign = 'left';
  ctx.font = '900 30px system-ui, sans-serif';
  ctx.fillText(String(game.score).padStart(6, '0'), 34, 54);
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.fillStyle = COLOURS.gold;
  ctx.fillText(`🌽 × ${game.corn}`, 34, 84);
  ctx.fillStyle = COLOURS.cream;
  ctx.fillText(`${metres} m`, 128, 84);

  // Feathers (lives), top right.
  panel(ctx, VIEW.width - 168, 16, 150, 52);
  for (let i = 0; i < 3; i += 1) feather(ctx, VIEW.width - 138 + i * 44, 42, i >= turkey.feathers);

  // Distance bar across the top centre: stages, the goal, and two markers
  // — the turkey's, and the farmer's creeping up behind it.
  const barX = 300;
  const barW = VIEW.width - 300 - 190;
  const barY = 30;
  panel(ctx, barX - 12, 16, barW + 24, 52);
  const stageW = barW / STAGES.length;
  STAGES.forEach((stage, i) => {
    ctx.fillStyle = ['#7fb069', '#dda448', '#a63d40'][i];
    ctx.fillRect(barX + i * stageW + 2, barY, stageW - 4, 12);
  });
  const turkeyMark = barX + (turkey.x / (GOAL_M * PX_PER_M)) * barW;
  const farmerMark = barX + Math.max(0, (farmer.x / (GOAL_M * PX_PER_M)) * barW);
  ctx.fillStyle = '#343a40';
  ctx.beginPath();
  ctx.moveTo(farmerMark, barY + 16);
  ctx.lineTo(farmerMark - 6, barY + 27);
  ctx.lineTo(farmerMark + 6, barY + 27);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(turkeyMark, barY + 16);
  ctx.lineTo(turkeyMark - 6, barY + 27);
  ctx.lineTo(turkeyMark + 6, barY + 27);
  ctx.closePath();
  ctx.fill();
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillStyle = COLOURS.cream;
  ctx.textAlign = 'right';
  ctx.fillText('FREEDOM WOODS →', barX + barW - 4, barY - 4 + 12);
  ctx.textAlign = 'center';

  // Stamina under the distance bar.
  const stW = 220;
  ctx.fillStyle = 'rgba(40, 54, 24, 0.72)';
  ctx.beginPath();
  ctx.roundRect(barX, 76, stW, 12, 6);
  ctx.fill();
  ctx.fillStyle = turkey.stamina > 25 ? '#ffb703' : COLOURS.danger;
  ctx.beginPath();
  ctx.roundRect(barX, 76, (stW * turkey.stamina) / STAMINA.max, 12, 6);
  ctx.fill();
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLOURS.cream;
  ctx.fillText('STAMINA', barX + stW + 10, 87);

  // The farmer's alert eye: it opens as he gets sure.
  const eyeX = VIEW.width - 84;
  const eyeY = 108;
  panel(ctx, eyeX - 66, eyeY - 26, 132, 52);
  ctx.save();
  ctx.translate(eyeX - 34, eyeY);
  ctx.beginPath();
  ctx.ellipse(0, 0, 17, 6 + farmer.alert * 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3, 0, 4 + farmer.alert * 2.5, 0, Math.PI * 2);
  ctx.fillStyle = farmer.alert > 0.55 ? COLOURS.danger : COLOURS.ink;
  ctx.fill();
  ctx.restore();
  ctx.font = '800 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = farmer.alert > 0.55 ? '#ff8fa3' : COLOURS.cream;
  const alertWord = farmer.state === 'search' ? 'SEARCHING' : farmer.alert > 0.55 ? 'SPOTTED!' : farmer.alert > 0.25 ? 'SUSPICIOUS' : 'UNAWARE';
  ctx.fillText(alertWord, eyeX - 8, eyeY + 5);
}

/** Centre-screen announcements: stage names, SPOTTED!, the verdicts. */
export function drawBanner(ctx, banner) {
  if (!banner || banner.t <= 0) return;
  const alpha = Math.min(1, banner.t / 0.6, (banner.total - banner.t) / 0.4 + 0.4);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.textAlign = 'center';
  ctx.font = '900 54px system-ui, sans-serif';
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(40, 54, 24, 0.85)';
  ctx.strokeText(banner.text, VIEW.width / 2, 210);
  ctx.fillStyle = banner.colour ?? COLOURS.cream;
  ctx.fillText(banner.text, VIEW.width / 2, 210);
  if (banner.sub) {
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.lineWidth = 7;
    ctx.strokeText(banner.sub, VIEW.width / 2, 248);
    ctx.fillStyle = '#ffd29d';
    ctx.fillText(banner.sub, VIEW.width / 2, 248);
  }
  ctx.restore();
}

/** Floating score popups that rise and fade where they happened. */
export function drawNotices(ctx, notices, camX) {
  ctx.save();
  ctx.textAlign = 'center';
  for (const n of notices) {
    const a = Math.max(0, 1 - n.t / n.total);
    ctx.globalAlpha = a;
    ctx.font = '900 21px system-ui, sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(40, 54, 24, 0.8)';
    const y = n.y - n.t * 44;
    ctx.strokeText(n.text, n.x - camX, y);
    ctx.fillStyle = n.colour;
    ctx.fillText(n.text, n.x - camX, y);
  }
  ctx.restore();
}
