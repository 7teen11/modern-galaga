import { GameSystem, Game, GameModeState } from '../../../core/Game';
import { HellDirector } from '../HellDirector';
import { LocalizationService, i18n } from '../../../i18n';

/**
 * HellHUDTheme - Distinct crimson visual styling and live HUD overlays for Hell Mode.
 * Renders glowing crimson tactical corner accents, threat badges, and live speedrun timer
 * positioned below the 46px primary HUD bar so zero elements overlap.
 */
export class HellHUDTheme implements GameSystem {
  private director: HellDirector;
  private getGameState: () => GameModeState;
  private locService: LocalizationService;
  private pulseTimer = 0;

  constructor(
    director: HellDirector,
    getGameState: () => GameModeState,
    locService: LocalizationService = i18n
  ) {
    this.director = director;
    this.getGameState = getGameState;
    this.locService = locService;
  }

  public update(dt: number): void {
    if (!this.director.isHellMode()) return;
    this.pulseTimer = (this.pulseTimer + dt * 3) % (Math.PI * 2);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.director.isHellMode()) return;

    const state = this.getGameState();
    if (
      state !== GameModeState.PLAYING &&
      state !== GameModeState.RESPAWNING &&
      state !== GameModeState.PAUSED
    ) {
      return;
    }

    ctx.save();

    const w = Game.LOGICAL_WIDTH;
    const h = Game.LOGICAL_HEIGHT;
    const topBarHeight = 46;
    const pulseAlpha = 0.4 + Math.sin(this.pulseTimer) * 0.2;

    // 1. Crimson Tactical Corner Accents framing the combat viewport (below y = 46)
    ctx.strokeStyle = `rgba(255, 42, 85, ${pulseAlpha.toFixed(2)})`;
    ctx.lineWidth = 2;

    const cornerSize = 22;
    const margin = 6;
    const topMargin = topBarHeight + 4;

    // Top-Left (below HUD bar)
    ctx.beginPath();
    ctx.moveTo(margin, topMargin + cornerSize);
    ctx.lineTo(margin, topMargin);
    ctx.lineTo(margin + cornerSize, topMargin);
    ctx.stroke();

    // Top-Right (below HUD bar)
    ctx.beginPath();
    ctx.moveTo(w - margin - cornerSize, topMargin);
    ctx.lineTo(w - margin, topMargin);
    ctx.lineTo(w - margin, topMargin + cornerSize);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(margin, h - margin - cornerSize);
    ctx.lineTo(margin, h - margin);
    ctx.lineTo(margin + cornerSize, h - margin);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(w - margin - cornerSize, h - margin);
    ctx.lineTo(w - margin, h - margin);
    ctx.lineTo(w - margin, h - margin - cornerSize);
    ctx.stroke();

    // Subtle crimson glow below the 46px HUD bar divider
    const gradTop = ctx.createLinearGradient(0, topBarHeight, 0, topBarHeight + 16);
    gradTop.addColorStop(0, `rgba(255, 42, 85, ${0.22 * pulseAlpha})`);
    gradTop.addColorStop(1, 'rgba(255, 42, 85, 0)');
    ctx.fillStyle = gradTop;
    ctx.fillRect(0, topBarHeight, w, 16);

    // 2. Tactical "🔥 HELL [2X DMG]" Sub-Bar Pill (Top-Left below HUD bar, y = 52)
    const badgeX = 14;
    const badgeY = 52;
    const badgeW = 152;
    const badgeH = 18;

    ctx.fillStyle = 'rgba(40, 0, 12, 0.82)';
    ctx.strokeStyle = 'rgba(255, 42, 85, 0.8)';
    ctx.lineWidth = 1;
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff2a55';
    const isEn = this.locService.getLocale() === 'en';
    ctx.fillText(
      isEn ? '🔥 HELL MODE [2X DMG]' : '🔥 ĐỊA NGỤC [SÁT THƯƠNG x2]',
      badgeX + badgeW * 0.5,
      badgeY + badgeH * 0.5
    );

    // 3. Live Clear Time Display (Top-Right below HUD bar, y = 54)
    const formattedTime = this.director.getFormattedClearTime();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(`⏱ ${formattedTime}`, w - 14, 54);

    ctx.restore();
  }
}
