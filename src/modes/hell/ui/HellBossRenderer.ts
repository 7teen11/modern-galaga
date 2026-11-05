import { Game, GameSystem } from '../../../core/Game';
import { LocalizationService, i18n } from '../../../i18n';

export interface BossRenderState {
  x: number;
  y: number;
  width: number;
  height: number;
  hitFlashTimer: number;
  isEnraged: boolean;
  state: 'INTRO' | 'ACTIVE' | 'DYING' | 'HIDDEN';
  introTimer: number;
  dyingTimer: number;
}

/**
 * HellBossRenderer - Procedural vector rendering, siren warning alert, and explosion FX for Void Dreadnought (US3).
 */
export class HellBossRenderer implements GameSystem {
  private locService: LocalizationService;
  private glowTimer = 0;

  constructor(locService: LocalizationService = i18n) {
    this.locService = locService;
  }

  public update(dt: number): void {
    this.glowTimer = (this.glowTimer + dt * 5) % (Math.PI * 2);
  }

  public renderBoss(
    ctx: CanvasRenderingContext2D,
    state: BossRenderState
  ): void {
    if (state.state === 'HIDDEN') return;

    ctx.save();

    // 1. Warning Siren Overlay during INTRO
    if (state.state === 'INTRO') {
      const alpha = 0.5 + Math.sin(this.glowTimer * 2) * 0.4;
      ctx.fillStyle = `rgba(255, 20, 60, ${0.18 * alpha})`;
      ctx.fillRect(0, 0, Game.LOGICAL_WIDTH, Game.LOGICAL_HEIGHT);

      ctx.fillStyle = `rgba(255, 30, 70, ${alpha.toFixed(2)})`;
      ctx.font = 'bold 15px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        this.locService.t('hell.alertBoss', { name: this.locService.t('hell.bossName') }),
        Game.LOGICAL_WIDTH / 2,
        Game.LOGICAL_HEIGHT * 0.4
      );
    }

    // 2. Multi-stage Explosions during DYING
    if (state.state === 'DYING') {
      this.renderDeathExplosions(ctx, state);
    }

    // 3. Render Void Dreadnought Flagship
    const { x, y, width, height, hitFlashTimer, isEnraged } = state;
    const hw = width / 2;
    const hh = height / 2;

    ctx.translate(x, y);

    // Hit flash override
    const isHitFlashing = hitFlashTimer > 0;
    const hullFill = isHitFlashing
      ? '#ffffff'
      : isEnraged
      ? '#2a0815'
      : '#160c22';
    const armorStroke = isHitFlashing
      ? '#ffffff'
      : isEnraged
      ? '#ff2255'
      : '#9d4edd';

    // Engines Thruster Glow
    const engineGlow = 10 + Math.sin(this.glowTimer * 3) * 6;
    ctx.fillStyle = isEnraged ? '#ff0055' : '#00e5ff';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 12;

    // Left Thruster
    ctx.beginPath();
    ctx.moveTo(-hw * 0.55, -hh * 0.4);
    ctx.lineTo(-hw * 0.35, -hh * 0.4);
    ctx.lineTo(-hw * 0.45, -hh * 0.4 - engineGlow);
    ctx.closePath();
    ctx.fill();

    // Right Thruster
    ctx.beginPath();
    ctx.moveTo(hw * 0.35, -hh * 0.4);
    ctx.lineTo(hw * 0.55, -hh * 0.4);
    ctx.lineTo(hw * 0.45, -hh * 0.4 - engineGlow);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    // Heavy Plated Battleship Hull
    ctx.fillStyle = hullFill;
    ctx.strokeStyle = armorStroke;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    // Nose / Command prow pointing downward
    ctx.moveTo(0, hh * 0.95);
    // Lower right hull
    ctx.lineTo(hw * 0.3, hh * 0.6);
    ctx.lineTo(hw * 0.7, hh * 0.3);
    // Right wing tip & cannon mount
    ctx.lineTo(hw, 0);
    ctx.lineTo(hw * 0.85, -hh * 0.5);
    // Right rear
    ctx.lineTo(hw * 0.4, -hh * 0.8);
    // Rear center notch
    ctx.lineTo(0, -hh * 0.5);
    // Left rear
    ctx.lineTo(-hw * 0.4, -hh * 0.8);
    // Left wing tip
    ctx.lineTo(-hw * 0.85, -hh * 0.5);
    ctx.lineTo(-hw, 0);
    // Lower left hull
    ctx.lineTo(-hw * 0.7, hh * 0.3);
    ctx.lineTo(-hw * 0.3, hh * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Plasma Core in Center
    const coreGlow = 6 + Math.sin(this.glowTimer) * 4;
    ctx.fillStyle = isHitFlashing ? '#ffffff' : isEnraged ? '#ff0033' : '#ff00aa';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, coreGlow, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Left and Right Danmaku Cannons
    ctx.fillStyle = isHitFlashing ? '#ffffff' : '#2d1b4e';
    ctx.strokeStyle = armorStroke;
    ctx.lineWidth = 1.5;

    ctx.strokeRect(-hw * 0.8, -10, 16, 26);
    ctx.fillRect(-hw * 0.8, -10, 16, 26);

    ctx.strokeRect(hw * 0.8 - 16, -10, 16, 26);
    ctx.fillRect(hw * 0.8 - 16, -10, 16, 26);

    ctx.restore();
  }

  private renderDeathExplosions(
    ctx: CanvasRenderingContext2D,
    state: BossRenderState
  ): void {
    const elapsed = 2.5 - state.dyingTimer;
    const boomCount = Math.min(12, Math.floor(elapsed * 5) + 1);

    for (let i = 0; i < boomCount; i++) {
      const offsetX = Math.sin(i * 137.5) * (state.width * 0.4);
      const offsetY = Math.cos(i * 93.2) * (state.height * 0.4);
      const radius = 8 + ((i * 7) % 20);

      ctx.save();
      ctx.fillStyle = i % 2 === 0 ? '#ffcc00' : '#ff2255';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(state.x + offsetX, state.y + offsetY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

