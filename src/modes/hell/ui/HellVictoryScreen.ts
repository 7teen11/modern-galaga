import { Game, GameSystem } from '../../../core/Game';
import { LocalizationService, i18n } from '../../../i18n';

export interface HellVictoryStats {
  clearTimeFormatted: string;
  score: number;
}

/**
 * HellVictoryScreen - Stage Victory celebration screen for Hell Mode (US3).
 */
export class HellVictoryScreen implements GameSystem {
  private locService: LocalizationService;
  private isVisible = false;
  private stats: HellVictoryStats = { clearTimeFormatted: '00:00.000', score: 0 };
  private onReturnToMenu?: () => void;
  private pulseTimer = 0;

  constructor(
    locService: LocalizationService = i18n,
    onReturnToMenu?: () => void
  ) {
    this.locService = locService;
    this.onReturnToMenu = onReturnToMenu;
    this.bindEvents();
  }

  private bindEvents(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.isVisible) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.hide();
        if (this.onReturnToMenu) {
          this.onReturnToMenu();
        }
      }
    });
  }

  public show(stats: HellVictoryStats): void {
    this.stats = stats;
    this.isVisible = true;
  }

  public hide(): void {
    this.isVisible = false;
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  public update(dt: number): void {
    if (!this.isVisible) return;
    this.pulseTimer = (this.pulseTimer + dt * 3) % (Math.PI * 2);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isVisible) return;

    ctx.save();

    const w = Game.LOGICAL_WIDTH;
    const h = Game.LOGICAL_HEIGHT;

    // Dark crimson backdrop overlay
    ctx.fillStyle = 'rgba(10, 0, 5, 0.85)';
    ctx.fillRect(0, 0, w, h);

    const centerX = w / 2;
    const pulseAlpha = 0.7 + Math.sin(this.pulseTimer) * 0.3;

    // 1. Victory Title
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillStyle = `rgba(255, 42, 85, ${pulseAlpha.toFixed(2)})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔥 ' + this.locService.t('hell.victory'), centerX, h * 0.3);

    // Subtitle
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = '#ffdd44';
    ctx.fillText('VOID DREADNOUGHT DESTROYED', centerX, h * 0.37);

    // 2. Stats Panel Box
    const boxW = 380;
    const boxH = 140;
    const boxX = (w - boxW) / 2;
    const boxY = h * 0.44;

    ctx.fillStyle = 'rgba(30, 5, 15, 0.8)';
    ctx.strokeStyle = '#ff2a55';
    ctx.lineWidth = 2;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Stats Texts
    ctx.font = '14px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e0e0e0';

    ctx.fillText(
      `${this.locService.t('hud.score')}:`,
      boxX + 24,
      boxY + 40
    );
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(
      `${this.stats.score.toLocaleString()}`,
      boxX + boxW - 24,
      boxY + 40
    );

    ctx.textAlign = 'left';
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText(
      `${this.locService.t('hell.clearTime', { time: '' }).replace(': ', '')}:`,
      boxX + 24,
      boxY + 75
    );
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffe600';
    ctx.fillText(
      this.stats.clearTimeFormatted,
      boxX + boxW - 24,
      boxY + 75
    );

    ctx.textAlign = 'left';
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText(
      'BOSS BONUS:',
      boxX + 24,
      boxY + 110
    );
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff2a55';
    ctx.fillText(
      '+10,000 PTS',
      boxX + boxW - 24,
      boxY + 110
    );

    // 3. Continue prompt
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha.toFixed(2)})`;
    ctx.fillText(
      '[ PRESS SPACE TO CONTINUE ]',
      centerX,
      h * 0.72
    );

    ctx.restore();
  }
}
