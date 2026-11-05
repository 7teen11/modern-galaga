import { Game, GameSystem } from '../../../core/Game';
import { LocalizationService, i18n } from '../../../i18n';

/**
 * BossHealthBar - Dedicated top-viewport health bar for Void Dreadnought Climax Boss (US3).
 * Visually shifts into glowing crimson state with "ENRAGED" indicator when HP <= 50%.
 */
export class BossHealthBar implements GameSystem {
  private locService: LocalizationService;
  private currentHealth = 1200;
  private maxHealth = 1200;
  private isEnraged = false;
  private isVisible = false;
  private pulseTimer = 0;

  constructor(locService: LocalizationService = i18n) {
    this.locService = locService;
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
  }

  public updateHealth(current: number, max: number, enraged: boolean): void {
    this.currentHealth = Math.max(0, current);
    this.maxHealth = max;
    this.isEnraged = enraged;
  }

  public update(dt: number): void {
    if (!this.isVisible) return;
    this.pulseTimer = (this.pulseTimer + dt * 4) % (Math.PI * 2);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isVisible || this.maxHealth <= 0) return;

    ctx.save();

    const barWidth = 360;
    const barHeight = 12;
    const barX = (Game.LOGICAL_WIDTH - barWidth) / 2;
    const barY = 76;

    const hpRatio = Math.max(0, Math.min(1, this.currentHealth / this.maxHealth));

    // 1. Boss Name Header & Enrage Tag
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const bossName = this.locService.t('hell.bossName');
    if (this.isEnraged) {
      const pulseAlpha = 0.7 + Math.sin(this.pulseTimer) * 0.3;
      ctx.fillStyle = `rgba(255, 30, 70, ${pulseAlpha.toFixed(2)})`;
      ctx.fillText(
        `⚠ ${bossName} [ ${this.locService.t('hell.enraged')} ] ⚠`,
        Game.LOGICAL_WIDTH / 2,
        barY - 6
      );
    } else {
      ctx.fillStyle = '#ffaa33';
      ctx.fillText(bossName, Game.LOGICAL_WIDTH / 2, barY - 6);
    }

    // 2. Bar Outer Frame & Dark Background
    ctx.fillStyle = 'rgba(15, 0, 8, 0.85)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // 3. Health Fill Gradient
    if (hpRatio > 0) {
      const fillWidth = barWidth * hpRatio;
      const grad = ctx.createLinearGradient(barX, barY, barX + fillWidth, barY);

      if (this.isEnraged) {
        grad.addColorStop(0, '#ff0033');
        grad.addColorStop(0.5, '#ff2a70');
        grad.addColorStop(1, '#ff88aa');
      } else {
        grad.addColorStop(0, '#ff3300');
        grad.addColorStop(0.6, '#ffaa00');
        grad.addColorStop(1, '#ffdd44');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(barX, barY, fillWidth, barHeight);
    }

    // 4. Sci-Fi Tactical Frame & Divider Marks
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = this.isEnraged
      ? '#ff0055'
      : 'rgba(255, 170, 51, 0.8)';
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Midpoint marker (50% enrage line)
    const midX = barX + barWidth * 0.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(midX, barY);
    ctx.lineTo(midX, barY + barHeight);
    ctx.stroke();

    // 5. HP Number Overlay
    ctx.font = '9px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${Math.ceil(this.currentHealth)} / ${this.maxHealth}`,
      barX + barWidth - 6,
      barY + barHeight / 2
    );

    ctx.restore();
  }
}

