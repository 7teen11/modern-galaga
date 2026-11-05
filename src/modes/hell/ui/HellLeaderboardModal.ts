import { Game, GameSystem } from '../../../core/Game';
import { LeaderboardClient } from '../../../services/LeaderboardClient';
import { HellLeaderboardClient } from '../HellLeaderboardClient';
import { LocalizationService, i18n } from '../../../i18n';
import { formatClearTime } from '../HellConfig';

export type LeaderboardTab = 'STANDARD' | 'HELL';

/**
 * HellLeaderboardModal - Dual-tab Leaderboard Modal supporting Standard and Hell Rankings (US4).
 */
export class HellLeaderboardModal implements GameSystem {
  private standardClient: LeaderboardClient;
  private hellClient: HellLeaderboardClient;
  private locService: LocalizationService;
  private isVisible = false;
  private activeTab: LeaderboardTab = 'HELL';
  private canvas: HTMLCanvasElement;

  constructor(
    canvas: HTMLCanvasElement,
    standardClient: LeaderboardClient,
    hellClient: HellLeaderboardClient,
    locService: LocalizationService = i18n
  ) {
    this.canvas = canvas;
    this.standardClient = standardClient;
    this.hellClient = hellClient;
    this.locService = locService;

    this.bindEvents();
  }

  private bindEvents(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.isVisible) return;

      if (e.code === 'Escape' || e.code === 'KeyB') {
        this.close();
      } else if (e.code === 'Tab' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        this.activeTab = this.activeTab === 'STANDARD' ? 'HELL' : 'STANDARD';
      }
    });

    this.canvas.addEventListener('click', (e: MouseEvent) => {
      if (!this.isVisible) return;

      const rect = this.canvas.getBoundingClientRect();
      const scaleX = Game.LOGICAL_WIDTH / rect.width;
      const scaleY = Game.LOGICAL_HEIGHT / rect.height;

      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      // Close button (Top-Right of modal)
      if (clickX >= 470 && clickX <= 510 && clickY >= 110 && clickY <= 145) {
        this.close();
        return;
      }

      // Tab Standard: x: 100-240, y: 155-185
      if (clickX >= 100 && clickX <= 240 && clickY >= 155 && clickY <= 185) {
        this.activeTab = 'STANDARD';
      }
      // Tab Hell: x: 260-440, y: 155-185
      else if (clickX >= 260 && clickX <= 440 && clickY >= 155 && clickY <= 185) {
        this.activeTab = 'HELL';
      }
    });
  }

  public open(defaultTab: LeaderboardTab = 'HELL'): void {
    this.activeTab = defaultTab;
    this.isVisible = true;
  }

  public close(): void {
    this.isVisible = false;
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  public toggle(): void {
    this.isVisible = !this.isVisible;
  }

  public update(_dt: number): void {
    // Static overlay
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isVisible) return;

    ctx.save();

    const w = Game.LOGICAL_WIDTH;
    const h = Game.LOGICAL_HEIGHT;

    // Dark backdrop
    ctx.fillStyle = 'rgba(5, 5, 12, 0.88)';
    ctx.fillRect(0, 0, w, h);

    // Modal Box
    const boxX = 60;
    const boxY = 100;
    const boxW = 480;
    const boxH = 580;

    ctx.fillStyle = 'rgba(15, 15, 25, 0.95)';
    ctx.strokeStyle = this.activeTab === 'HELL' ? '#ff2a55' : '#00f0ff';
    ctx.lineWidth = 2;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Close button [X]
    ctx.fillStyle = '#ff2a55';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', boxX + boxW - 25, boxY + 25);

    // Modal Title
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(
      this.activeTab === 'HELL'
        ? `🔥 ${this.locService.t('hell.rankings')}`
        : this.locService.t('hell.standardRankings'),
      w / 2,
      boxY + 30
    );

    // Tab Buttons
    const tabY = boxY + 58;

    // Tab 1: Standard
    const isStd = this.activeTab === 'STANDARD';
    ctx.fillStyle = isStd ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = isStd ? '#00f0ff' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boxX + 30, tabY, 190, 32);
    ctx.fillRect(boxX + 30, tabY, 190, 32);

    ctx.font = isStd ? 'bold 12px "Courier New", monospace' : '12px "Courier New", monospace';
    ctx.fillStyle = isStd ? '#00f0ff' : 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('STANDARD RANKINGS', boxX + 125, tabY + 16);

    // Tab 2: Hell
    const isHell = this.activeTab === 'HELL';
    ctx.fillStyle = isHell ? 'rgba(255, 42, 85, 0.25)' : 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = isHell ? '#ff2a55' : 'rgba(255, 255, 255, 0.2)';
    ctx.strokeRect(boxX + 260, tabY, 190, 32);
    ctx.fillRect(boxX + 260, tabY, 190, 32);

    ctx.font = isHell ? 'bold 12px "Courier New", monospace' : '12px "Courier New", monospace';
    ctx.fillStyle = isHell ? '#ff2a55' : 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('🔥 HELL RANKINGS', boxX + 355, tabY + 16);

    // Table Header
    const rowStartY = tabY + 55;
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'left';

    ctx.fillText('RK', boxX + 24, rowStartY);
    ctx.fillText('PILOT / DEPT', boxX + 60, rowStartY);
    ctx.textAlign = 'right';
    if (this.activeTab === 'HELL') {
      ctx.fillText('CLEAR TIME', boxX + 335, rowStartY);
      ctx.fillText('SCORE', boxX + boxW - 24, rowStartY);
    } else {
      ctx.fillText('WAVE', boxX + 335, rowStartY);
      ctx.fillText('SCORE', boxX + boxW - 24, rowStartY);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(boxX + 20, rowStartY + 8);
    ctx.lineTo(boxX + boxW - 20, rowStartY + 8);
    ctx.stroke();

    // Table Rows
    let listY = rowStartY + 26;
    if (this.activeTab === 'HELL') {
      const records = this.hellClient.getTopScores(8);
      for (const rec of records) {
        ctx.font = '12px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = rec.rank === 1 ? '#ffe600' : '#e0e0e0';
        ctx.fillText(`#${rec.rank}`, boxX + 24, listY);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(rec.playerName, boxX + 60, listY);

        ctx.font = '10px "Courier New", monospace';
        ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
        ctx.fillText(rec.department, boxX + 60, listY + 12);

        ctx.font = '12px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffaa33';
        ctx.fillText(formatClearTime(rec.clearTimeMs), boxX + 335, listY);

        ctx.fillStyle = '#00f0ff';
        ctx.fillText(rec.score.toLocaleString(), boxX + boxW - 24, listY);

        listY += 34;
      }
    } else {
      const records = this.standardClient.getTopScores(8);
      for (const rec of records) {
        ctx.font = '12px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = rec.rank === 1 ? '#ffe600' : '#e0e0e0';
        ctx.fillText(`#${rec.rank}`, boxX + 24, listY);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(rec.playerName, boxX + 60, listY);

        ctx.font = '10px "Courier New", monospace';
        ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
        ctx.fillText(rec.department, boxX + 60, listY + 12);

        ctx.font = '12px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffe600';
        ctx.fillText(`W${rec.highestWave}`, boxX + 335, listY);

        ctx.fillStyle = '#00f0ff';
        ctx.fillText(rec.score.toLocaleString(), boxX + boxW - 24, listY);

        listY += 34;
      }
    }

    // Modal Footer Hint
    ctx.textAlign = 'center';
    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(
      '[ TAB / ARROWS ]: Switch Mode   [ ESC ]: Close',
      w / 2,
      boxY + boxH - 20
    );

    ctx.restore();
  }
}
