// Builds a shareable score-card PNG on an off-screen canvas (not the game
// canvas) and triggers a download — purely client-side, nothing uploaded.
const CARD_W = 800;
const CARD_H = 450;

export function downloadScoreCard({ worldName, characterName, nickname, score, timeBonus }) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, CARD_H);
  sky.addColorStop(0, '#6fb3f0');
  sky.addColorStop(1, '#cdeec4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  ctx.fillStyle = 'rgba(13,17,23,0.9)';
  ctx.fillRect(60, 60, CARD_W - 120, CARD_H - 120);
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 4;
  ctx.strokeRect(60, 60, CARD_W - 120, CARD_H - 120);

  const cx = CARD_W / 2;
  ctx.textAlign = 'center';

  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 30px ui-monospace, Consolas, monospace';
  ctx.fillText('SUPER ANATOMY BROS', cx, 118);

  ctx.fillStyle = '#fff';
  ctx.font = '18px ui-monospace, Consolas, monospace';
  ctx.fillText(worldName, cx, 155);

  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 64px ui-monospace, Consolas, monospace';
  ctx.fillText(String(score), cx, 250);

  ctx.fillStyle = '#9fb0d0';
  ctx.font = '14px ui-monospace, Consolas, monospace';
  ctx.fillText('SCORE', cx, 275);

  ctx.fillStyle = '#89e0ff';
  ctx.font = '18px ui-monospace, Consolas, monospace';
  const who = nickname ? `${nickname} · ${characterName}` : characterName;
  ctx.fillText(who, cx, 320);

  if (timeBonus > 0) {
    ctx.fillStyle = '#7de37b';
    ctx.font = '14px ui-monospace, Consolas, monospace';
    ctx.fillText(`+${timeBonus} time bonus`, cx, 345);
  }

  ctx.fillStyle = '#6b7688';
  ctx.font = '12px ui-monospace, Consolas, monospace';
  ctx.fillText(new Date().toLocaleDateString(), cx, 372);

  const link = document.createElement('a');
  link.download = `super-anatomy-bros-score-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
