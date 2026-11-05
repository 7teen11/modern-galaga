import { Game, GameModeState, GameSystem } from '../core/Game';
import { ScoreManager } from '../core/ScoreManager';
import { LeaderboardEntry } from '../services/LeaderboardClient';

/**
 * Title Screen & Game Over Summary Overlay Renderer (FR-010, User Story 5).
 * Displays final score, highest wave reached, personal best badge, and internal company Top 5 leaderboard.
 */
export class GameOverScreen implements GameSystem {
  private readonly scoreManager: ScoreManager;
  private readonly getGameState: () => GameModeState;
  private readonly getTopLeaderboard: () => LeaderboardEntry[];
  private readonly width: number;
  private readonly height: number;

  public isNewRecordOnLastRun = false;
  public lastSubmittedRank: number | null = null;
  private blinkTimer = 0;

  constructor(
    scoreManager: ScoreManager,
    getGameState: () => GameModeState,
    getTopLeaderboard: () => LeaderboardEntry[],
    width = Game.LOGICAL_WIDTH,
    height = Game.LOGICAL_HEIGHT
  ) {
    this.scoreManager = scoreManager;
    this.getGameState = getGameState;
    this.getTopLeaderboard = getTopLeaderboard;
    this.width = width;
    this.height = height;
  }

  public update(dt: number): void {
    this.blinkTimer += dt;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const state = this.getGameState();
    if (state !== GameModeState.TITLE && state !== GameModeState.GAME_OVER) {
      return;
    }

    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 16, 0.86)';
    ctx.fillRect(0, 46, this.width, this.height - 46);

    if (state === GameModeState.TITLE) {
      this.renderTitleScreen(ctx);
    } else {
      this.renderGameOverScreen(ctx);
    }

    this.renderLeaderboardTable(ctx, state === GameModeState.TITLE ? 370 : 420);
    ctx.restore();
  }

  private renderTitleScreen(ctx: CanvasRenderingContext2D): void {
    const cx = this.width * 0.5;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#00f0ff';
    ctx.font = '900 42px sans-serif';
    ctx.fillText('STAR VANGUARD', cx, 145);

    ctx.fillStyle = '#ff1e8a';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('INTERNAL COMPANY ARCADE CHAMPIONSHIP', cx, 175);

    // Feature highlights box
    ctx.fillStyle = 'rgba(0, 240, 255, 0.07)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.fillRect(cx - 210, 200, 420, 96);
    ctx.strokeRect(cx - 210, 200, 420, 96);

    ctx.fillStyle = '#e4f0ff';
    ctx.font = '13px sans-serif';
    ctx.fillText('• Bay 8 hướng mượt mà • Lướt đạn qua cánh tàu (45% Core Hitbox)', cx, 226);
    ctx.fillText('• Địch lượn theo đường cong Bézier • Hạ Commander nhận nâng cấp súng', cx, 250);
    ctx.fillText('• 3 Mạng chiến đấu • Đua điểm Endless trên Bảng xếp hạng nội bộ', cx, 274);

    if (Math.floor(this.blinkTimer * 2.5) % 2 === 0) {
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('NHẤN [ENTER] HOẶC [SPACE] ĐỂ XUẤT KÍCH', cx, 335);
    }
  }

  private renderGameOverScreen(ctx: CanvasRenderingContext2D): void {
    const cx = this.width * 0.5;
    const state = this.scoreManager.getState();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff1e8a';
    ctx.font = '900 40px sans-serif';
    ctx.fillText('MISSION OVER', cx, 130);

    if (this.isNewRecordOnLastRun) {
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('★ KỶ LỤC ĐIỂM CAO MỚI! // NEW HIGH SCORE! ★', cx, 160);
    }

    // Score & Stats Summary Panel
    ctx.fillStyle = 'rgba(12, 18, 42, 0.92)';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.fillRect(cx - 190, 178, 380, 165);
    ctx.strokeRect(cx - 190, 178, 380, 165);

    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    const leftX = cx - 160;
    const rightX = cx + 160;

    ctx.fillStyle = '#8be9fd';
    ctx.fillText('ĐIỂM ĐẠT ĐƯỢC (FINAL SCORE):', leftX, 212);
    ctx.fillText('KỶ LỤC CÁ NHÂN (HIGH SCORE):', leftX, 244);
    ctx.fillText('ĐỢT ĐỊCH ĐẠT ĐƯỢC (WAVE):', leftX, 276);
    ctx.fillText('TÀU ĐỊCH BẮN HẠ (KILLS):', leftX, 308);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(state.currentScore.toLocaleString(), rightX, 212);
    ctx.fillStyle = '#ffcc00';
    ctx.fillText(state.sessionHighScore.toLocaleString(), rightX, 244);
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(`WAVE ${state.currentWave}`, rightX, 276);
    ctx.fillStyle = '#00ff88';
    ctx.fillText(`${state.enemiesDefeatedCount}`, rightX, 308);

    if (this.lastSubmittedRank !== null) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`XẾP HẠNG CÔNG TY HIỆN TẠI: HẠNG #${this.lastSubmittedRank}`, cx, 332);
    }

    if (Math.floor(this.blinkTimer * 2.5) % 2 === 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 17px monospace';
      ctx.fillText('NHẤN [ENTER] HOẶC [R] ĐỂ CHƠI LẠI', cx, 382);
    }
  }

  private renderLeaderboardTable(ctx: CanvasRenderingContext2D, topY: number): void {
    const cx = this.width * 0.5;
    const entries = this.getTopLeaderboard().slice(0, 5);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('🏆 BẢNG XẾP HẠNG NỘI BỘ CÔNG TY (TOP 5)', cx, topY);

    const boxW = 460;
    const boxH = 175;
    const boxX = cx - boxW * 0.5;
    const boxY = topY + 14;

    ctx.fillStyle = 'rgba(8, 12, 28, 0.9)';
    ctx.strokeStyle = 'rgba(255, 204, 0, 0.35)';
    ctx.lineWidth = 1;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Table Headers
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#7c8db5';
    ctx.textAlign = 'left';
    ctx.fillText('HẠNG', boxX + 16, boxY + 24);
    ctx.fillText('PHI CÔNG (BỘ PHẬN)', boxX + 70, boxY + 24);
    ctx.textAlign = 'right';
    ctx.fillText('WAVE', boxX + 350, boxY + 24);
    ctx.fillText('ĐIỂM SỐ', boxX + 442, boxY + 24);

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const rowY = boxY + 52 + i * 26;

      ctx.textAlign = 'left';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = i === 0 ? '#ffcc00' : i === 1 ? '#00f0ff' : i === 2 ? '#00ff88' : '#e4f0ff';
      ctx.fillText(`#${e.rank}`, boxX + 16, rowY);
      ctx.fillText(`${e.playerName} (${e.department})`, boxX + 70, rowY);

      ctx.textAlign = 'right';
      ctx.fillText(`W${e.highestWave}`, boxX + 350, rowY);
      ctx.fillText(e.score.toLocaleString(), boxX + 442, rowY);
    }
  }
}

